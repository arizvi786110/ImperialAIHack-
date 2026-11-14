"""Data access layer. Endpoints (A3) call these; nothing else touches ORM rows."""

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from contracts.models import PrivateQuestion, SessionState

from .database import Base, db_session, engine
from .models import (
    AssistanceEventRow,
    AttemptRow,
    EvaluationRow,
    MasteryStateRow,
    ProblemRow,
    SessionRow,
    TeacherReviewRow,
    new_id,
)

# ---------------------------------------------------------------- setup


def init_db(questions: dict[str, PrivateQuestion]) -> None:
    Base.metadata.create_all(engine)
    with db_session() as db:
        for q in questions.values():
            upsert_problem(db, q)


# ---------------------------------------------------------------- problems


def upsert_problem(db: Session, q: PrivateQuestion) -> None:
    row = db.get(ProblemRow, q.id)
    if row is None:
        db.add(ProblemRow(id=q.id, data=q.model_dump(mode="json"), review_status=q.review_status))
    else:
        row.data = q.model_dump(mode="json")
        row.review_status = q.review_status


def get_problem(db: Session, question_id: str) -> Optional[PrivateQuestion]:
    row = db.get(ProblemRow, question_id)
    return PrivateQuestion.model_validate(row.data) if row else None


# ---------------------------------------------------------------- sessions


def create_session(db: Session, student_alias: str, question_id: str, state: SessionState) -> SessionRow:
    row = SessionRow(
        id=new_id("s"),
        student_alias=student_alias,
        current_question_id=question_id,
        stage=state.stage,
        difficulty=state.difficulty,
        allowed_help=list(state.allowed_help),
    )
    db.add(row)
    db.flush()
    return row


def get_session(db: Session, session_id: str) -> Optional[SessionRow]:
    return db.get(SessionRow, session_id)


def session_state(row: SessionRow) -> SessionState:
    return SessionState(stage=row.stage, difficulty=row.difficulty, allowed_help=row.allowed_help)


def update_session(
    db: Session, row: SessionRow, *, state: Optional[SessionState] = None, current_question_id: Optional[str] = None
) -> SessionRow:
    if state is not None:
        row.stage = state.stage
        row.difficulty = state.difficulty
        row.allowed_help = list(state.allowed_help)
    if current_question_id is not None:
        row.current_question_id = current_question_id
    db.flush()
    return row


# ---------------------------------------------------------------- attempts


def add_attempt(
    db: Session,
    *,
    session_id: str,
    question_id: str,
    code: str,
    explanation: str = "",
    plan: str = "",
    client_test_results: Optional[list[dict[str, Any]]] = None,
    assisted: bool = False,
    idempotency_key: Optional[str] = None,
) -> AttemptRow:
    row = AttemptRow(
        id=new_id("a"),
        session_id=session_id,
        question_id=question_id,
        code=code,
        explanation=explanation,
        plan=plan,
        client_test_results=client_test_results or [],
        client_tests_untrusted=True,  # browser results are never trusted
        assisted=assisted,
        idempotency_key=idempotency_key,
    )
    db.add(row)
    db.flush()
    return row


def get_attempt(db: Session, attempt_id: str) -> Optional[AttemptRow]:
    return db.get(AttemptRow, attempt_id)


def list_attempts(db: Session, session_id: str) -> list[AttemptRow]:
    return list(db.scalars(select(AttemptRow).where(AttemptRow.session_id == session_id).order_by(AttemptRow.created_at)))


def count_attempts(db: Session, session_id: str, question_id: str) -> int:
    return len(
        db.scalars(
            select(AttemptRow.id).where(AttemptRow.session_id == session_id, AttemptRow.question_id == question_id)
        ).all()
    )


# ---------------------------------------------------------------- assistance events


def add_assistance_event(
    db: Session,
    *,
    session_id: str,
    question_id: str,
    mode: str,
    query: str,
    decision: str,
    reason_code: str,
    hint_level: int = 0,
    attempt_id: Optional[str] = None,
) -> AssistanceEventRow:
    row = AssistanceEventRow(
        id=new_id("h"),
        session_id=session_id,
        question_id=question_id,
        attempt_id=attempt_id,
        mode=mode,
        query=query,
        decision=decision,
        reason_code=reason_code,
        hint_level=hint_level,
    )
    db.add(row)
    db.flush()
    return row


def list_assistance_events(db: Session, session_id: str) -> list[AssistanceEventRow]:
    return list(
        db.scalars(
            select(AssistanceEventRow)
            .where(AssistanceEventRow.session_id == session_id)
            .order_by(AssistanceEventRow.created_at)
        )
    )


# ---------------------------------------------------------------- evaluations


def add_evaluation(
    db: Session,
    *,
    attempt_id: str,
    code_score: float,
    concept_score: float,
    provisional_score: float,
    rationale: Optional[dict[str, Any]] = None,
    confidence: Optional[float] = None,
    needs_review: bool = False,
    flags: Optional[list[str]] = None,
    grader_model: Optional[str] = None,
) -> EvaluationRow:
    row = EvaluationRow(
        id=new_id("e"),
        attempt_id=attempt_id,
        code_score=code_score,
        concept_score=concept_score,
        provisional_score=provisional_score,
        rationale=rationale or {},
        confidence=confidence,
        needs_review=needs_review,
        flags=flags or [],
        grader_model=grader_model,
    )
    db.add(row)
    db.flush()
    return row


def latest_evaluation(db: Session, attempt_id: str) -> Optional[EvaluationRow]:
    return db.scalars(
        select(EvaluationRow).where(EvaluationRow.attempt_id == attempt_id).order_by(EvaluationRow.created_at.desc())
    ).first()


# ---------------------------------------------------------------- mastery


def get_mastery(db: Session, session_id: str) -> list[MasteryStateRow]:
    return list(db.scalars(select(MasteryStateRow).where(MasteryStateRow.session_id == session_id)))


def record_mastery_result(
    db: Session, *, session_id: str, skill: str, correct: bool, assisted: bool, mastery_estimate: Optional[float] = None
) -> MasteryStateRow:
    row = db.scalars(
        select(MasteryStateRow).where(MasteryStateRow.session_id == session_id, MasteryStateRow.skill == skill)
    ).first()
    if row is None:
        row = MasteryStateRow(
            session_id=session_id,
            skill=skill,
            independent_correct=0,
            independent_total=0,
            assisted_correct=0,
            assisted_total=0,
            mastery_estimate=0.0,
        )
        db.add(row)
    if assisted:
        row.assisted_total += 1
        row.assisted_correct += int(correct)
    else:
        row.independent_total += 1
        row.independent_correct += int(correct)
    if mastery_estimate is not None:
        row.mastery_estimate = mastery_estimate
    db.flush()
    return row


# ---------------------------------------------------------------- teacher reviews (append-only)


def add_teacher_review(
    db: Session,
    *,
    attempt_id: str,
    previous_concept_score: Optional[float],
    override_concept_score: Optional[float],
    approved: Optional[bool],
    reviewer_note: str,
    effective_score: float,
) -> TeacherReviewRow:
    row = TeacherReviewRow(
        id=new_id("r"),
        attempt_id=attempt_id,
        previous_concept_score=previous_concept_score,
        override_concept_score=override_concept_score,
        approved=approved,
        reviewer_note=reviewer_note,
        effective_score=effective_score,
    )
    db.add(row)
    db.flush()
    return row


def list_teacher_reviews(db: Session, attempt_id: str) -> list[TeacherReviewRow]:
    return list(
        db.scalars(
            select(TeacherReviewRow).where(TeacherReviewRow.attempt_id == attempt_id).order_by(TeacherReviewRow.created_at)
        )
    )
