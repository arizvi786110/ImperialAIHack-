"""ORM tables. evaluations mirrors cognit_ai.ConceptGrade; sessions.learner_state
stores cognit_ai.adapt.LearnerState; mastery_state mirrors LearnerState.snapshot()."""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class SessionRow(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    student_alias: Mapped[str] = mapped_column(String(64))
    current_question_id: Mapped[str] = mapped_column(ForeignKey("problems.id"))
    stage: Mapped[str] = mapped_column(String(16))
    difficulty: Mapped[int] = mapped_column(Integer)
    allowed_help: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Serialised cognit_ai.adapt.LearnerState (see repo.load/save_learner_state).
    learner_state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    # Outcome of the latest attempt ('transfer'|'harder'|'same'|'remedial'), consumed by /api/next.
    last_reason: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    questions_served: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class ProblemRow(Base):
    """Full PrivateQuestion as JSON. Server-only: never return `data` directly."""

    __tablename__ = "problems"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSON)
    review_status: Mapped[str] = mapped_column(String(16), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AttemptRow(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("problems.id"))
    code: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text, default="")
    plan: Mapped[str] = mapped_column(Text, default="")
    client_test_results: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    client_tests_untrusted: Mapped[bool] = mapped_column(Boolean, default=True)
    # Server-decided: Hint or Plan Mode used on this question before submitting.
    assisted: Mapped[bool] = mapped_column(Boolean, default=False)
    # help_events as reported by the browser (context only; untrusted).
    client_help_events: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    # A6 idempotent submission: same key -> same stored response, no second grading.
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    response: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AssistanceEventRow(Base):
    __tablename__ = "assistance_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("problems.id"))
    attempt_id: Mapped[Optional[str]] = mapped_column(ForeignKey("attempts.id"), nullable=True)
    mode: Mapped[str] = mapped_column(String(16))
    query: Mapped[str] = mapped_column(Text)
    decision: Mapped[str] = mapped_column(String(8))
    reason_code: Mapped[str] = mapped_column(String(64))
    hint_level: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class EvaluationRow(Base):
    __tablename__ = "evaluations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), index=True)
    code_score: Mapped[float] = mapped_column(Float)  # 0-70 (functional 50 + edge 20)
    concept_score: Mapped[float] = mapped_column(Float)  # 0-30 = ConceptGrade.total
    provisional_score: Mapped[float] = mapped_column(Float)  # 0-100
    # ConceptGrade fields
    core_idea: Mapped[int] = mapped_column(Integer, default=0)  # 0-15
    complexity: Mapped[int] = mapped_column(Integer, default=0)  # 0-10
    edge_cases: Mapped[int] = mapped_column(Integer, default=0)  # 0-5
    rationale: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    review_required: Mapped[bool] = mapped_column(Boolean, default=False)
    flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    model_used: Mapped[str] = mapped_column(String(64), default="")
    provisional: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class MasteryStateRow(Base):
    __tablename__ = "mastery_state"
    __table_args__ = (UniqueConstraint("session_id", "skill"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    skill: Mapped[str] = mapped_column(String(64))
    # Mirrors LearnerState.snapshot()["mastery_by_skill"][skill]
    independent_transfer_correct: Mapped[int] = mapped_column(Integer, default=0)
    independent_transfer_total: Mapped[int] = mapped_column(Integer, default=0)
    assisted_mean: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    independent_mean: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    heuristic_mastery: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # heuristic, not validated
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class TeacherReviewRow(Base):
    """Append-only audit log. Never update or delete rows."""

    __tablename__ = "teacher_reviews"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), index=True)
    previous_concept_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    override_concept_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    approved: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    reviewer_note: Mapped[str] = mapped_column(Text)
    effective_score: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ConceptProbeRow(Base):
    """One conceptual follow-up per submitted attempt; never replaces objective code points."""
    __tablename__ = "concept_probes"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), unique=True, index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("problems.id"))
    question: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(32))
    answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)
    model_used: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
