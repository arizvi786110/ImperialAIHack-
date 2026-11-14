"""Data access layer. Endpoints (A3) call these; nothing else touches ORM rows."""

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from cognit_ai.adapt import Evidence, LearnerState
from contracts.models import ConceptGrade, PrivateQuestion, SessionState

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


def list_problems(db: Session) -> list[PrivateQuestion]:
    rows = db.scalars(select(ProblemRow).order_by(ProblemRow.created_at, ProblemRow.id))
    return [PrivateQuestion.model_validate(r.data) for r in rows]


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


# ---------------------------------------------------------------- learner state (cognit_ai.adapt)


def load_learner_state(row: SessionRow) -> LearnerState:
    d = row.learner_state or {}
    if not d:
        return LearnerState(difficulty=row.difficulty)
    return LearnerState(
        difficulty=d["difficulty"],
        evidence=[Evidence(**e) for e in d["evidence"]],
        pending_transfer=d["pending_transfer"],
        independent_streak=d["independent_streak"],
        last_skill=d["last_skill"],
        seen_question_ids=set(d["seen_question_ids"]),
    )


def save_learner_state(db: Session, row: SessionRow, state: LearnerState) -> None:
    row.learner_state = {
        "difficulty": state.difficulty,
        "evidence": [vars(e) for e in state.evidence],
        "pending_transfer": state.pending_transfer,
        "independent_streak": state.independent_streak,
        "last_skill": state.last_skill,
        "seen_question_ids": sorted(state.seen_question_ids),
    }
    row.difficulty = state.difficulty
    sync_mastery(db, row.id, state.snapshot())
    db.flush()


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
    client_help_events: Optional[list[dict[str, Any]]] = None,
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
        client_help_events=client_help_events or [],
        client_tests_untrusted=True,  # browser results are never trusted
        assisted=assisted,
        idempotency_key=idempotency_key,
    )
    db.add(row)
    db.flush()
    return row


def get_attempt(db: Session, attempt_id: str) -> Optional[AttemptRow]:
    return db.get(AttemptRow, attempt_id)


def get_attempt_by_key(db: Session, idempotency_key: str) -> Optional[AttemptRow]:
    return db.scalars(select(AttemptRow).where(AttemptRow.idempotency_key == idempotency_key)).first()


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
    grade: ConceptGrade,
    code_score: float,
    provisional_score: float,
    extra_flags: Optional[list[str]] = None,
) -> EvaluationRow:
    row = EvaluationRow(
        id=new_id("e"),
        attempt_id=attempt_id,
        code_score=code_score,
        concept_score=grade.total,
        provisional_score=provisional_score,
        core_idea=grade.core_idea,
        complexity=grade.complexity,
        edge_cases=grade.edge_cases,
        rationale=grade.rationale,
        confidence=grade.confidence,
        review_required=grade.review_required,
        flags=list(dict.fromkeys([*grade.flags, *(extra_flags or [])])),
        model_used=grade.model_used,
        provisional=grade.provisional,
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


def sync_mastery(db: Session, session_id: str, snapshot: dict[str, Any]) -> None:
    """Upsert mastery_state rows from LearnerState.snapshot() (called by save_learner_state)."""
    existing = {r.skill: r for r in get_mastery(db, session_id)}
    for skill, m in snapshot.get("mastery_by_skill", {}).items():
        row = existing.get(skill)
        if row is None:
            row = MasteryStateRow(session_id=session_id, skill=skill)
            db.add(row)
        row.independent_transfer_correct = m["independent_transfer_correct"]
        row.independent_transfer_total = m["independent_transfer_total"]
        row.assisted_mean = m["assisted_mean"]
        row.independent_mean = m["independent_mean"]
        row.heuristic_mastery = m["heuristic_mastery"]
    db.flush()


ASSISTED_MODES = ("hint", "plan")  # Lookup (docs) is approved informational help: not "assisted".


def used_assistance(db: Session, session_id: str, question_id: str) -> bool:
    """Server-side truth for 'assisted': any non-denied Hint/Plan on this question."""
    return any(
        e.question_id == question_id and e.mode in ASSISTED_MODES and e.decision != "deny"
        for e in list_assistance_events(db, session_id)
    )


def list_evaluations(db: Session, attempt_ids: list[str]) -> list[EvaluationRow]:
    if not attempt_ids:
        return []
    return list(
        db.scalars(select(EvaluationRow).where(EvaluationRow.attempt_id.in_(attempt_ids)).order_by(EvaluationRow.created_at))
    )


def count_hints(db: Session, session_id: str, question_id: str) -> int:
    """prior_hints for TutorService.assist (hint ladder level)."""
    return sum(
        1
        for e in list_assistance_events(db, session_id)
        if e.question_id == question_id and e.mode == "hint" and e.decision != "deny"
    )


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
