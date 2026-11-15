"""Teacher routes (DEMO ONLY: no auth, no real student data).

GET  /api/teacher/session/{id}  dashboard data
POST /api/teacher/review        override/approve concept score; append-only audit log
"""

from typing import Any, Optional
from sqlalchemy import select
from ..db.models import SessionRow
from sqlalchemy import select
from ..db.models import ConceptProbeRow

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from contracts.models import Envelope, TeacherReviewRequest, TeacherReviewResponse, TeacherSessionResponse

from .. import scoring
from ..db import repo
from ..db.database import get_db
from ..db.models import EvaluationRow, TeacherReviewRow
from ..errors import ApiError
from ..lookups import require_session

router = APIRouter(prefix="/api/teacher")


def _review_status(review: Optional[TeacherReviewRow]) -> str:
    if review is None:
        return "pending"
    return "overridden" if review.override_concept_score is not None else "approved" if review.approved else "pending"


def _effective(ev: Optional[EvaluationRow], review: Optional[TeacherReviewRow]) -> tuple[float, float]:
    """(effective_concept, effective_total) after the latest teacher review, if any."""
    if ev is None:
        return 0.0, 0.0
    override = review.override_concept_score if review else None
    concept = override if override is not None else ev.concept_score
    return concept, scoring.effective_score(ev.code_score, ev.concept_score, override)


def _mean(xs: list[float]) -> Optional[float]:
    return round(sum(xs) / len(xs), 1) if xs else None


@router.get("/sessions", response_model=Envelope[dict])
def teacher_roster(db: Session = Depends(get_db)) -> Envelope[dict]:
    """Prototype roster of recent sessions, using student-provided demo aliases."""
    rows = db.scalars(select(SessionRow).order_by(SessionRow.created_at.desc()).limit(100)).all()
    return Envelope(ok=True, data={"sessions": [
        {
            "session_id": row.id,
            "student_alias": row.student_alias,
            "stage": row.stage,
            "difficulty": row.difficulty,
            "questions_served": row.questions_served,
            "attempt_count": len(repo.list_attempts(db, row.id)),
            "created_at": row.created_at.isoformat(),
        } for row in rows
    ]})


@router.get("/session/{session_id}", response_model=Envelope[TeacherSessionResponse])
def teacher_session(session_id: str, db: Session = Depends(get_db)) -> Envelope[TeacherSessionResponse]:
    session = require_session(db, session_id)
    attempts = repo.list_attempts(db, session.id)
    evals: dict[str, EvaluationRow] = {e.attempt_id: e for e in repo.list_evaluations(db, [a.id for a in attempts])}

    attempt_rows: list[dict[str, Any]] = []
    latest_per_question: dict[str, dict[str, Any]] = {}
    review_flags: list[dict[str, Any]] = []
    for a in attempts:
        q = repo.get_problem(db, a.question_id)
        ev = evals.get(a.id)
        reviews = repo.list_teacher_reviews(db, a.id)
        latest_review = reviews[-1] if reviews else None
        eff_concept, eff_total = _effective(ev, latest_review)
        row = {
            "attempt_id": a.id,
            "question_id": a.question_id,
            "title": q.title if q else a.question_id,
            "difficulty": q.difficulty if q else 1,
            "skill_tags": q.skill_tags if q else [],
            "assisted": a.assisted,
            "created_at": a.created_at.isoformat(),
            "code": a.code,
            "explanation": a.explanation,
            "plan": a.plan,
            "client_test_results": a.client_test_results,
            "evaluation": None if ev is None else {
                "code_score": ev.code_score,
                "concept_score": ev.concept_score,
                "core_idea": ev.core_idea,
                "complexity": ev.complexity,
                "edge_cases": ev.edge_cases,
                "provisional_score": ev.provisional_score,
                "rationale": ev.rationale,
                "confidence": ev.confidence,
                "review_required": ev.review_required,
                "flags": ev.flags,
                "model_used": ev.model_used,
            },
            "review_status": _review_status(latest_review),
            "effective_concept_score": eff_concept,
            "effective_score": eff_total,
            "reviews": [
                {
                    "review_id": r.id,
                    "previous_concept_score": r.previous_concept_score,
                    "override_concept_score": r.override_concept_score,
                    "approved": r.approved,
                    "reviewer_note": r.reviewer_note,
                    "effective_score": r.effective_score,
                    "created_at": r.created_at.isoformat(),
                }
                for r in reviews
            ],
        }
        attempt_rows.append(row)
        latest_per_question[a.question_id] = row  # attempts are in time order
        if ev is not None and ev.review_required and latest_review is None:
            review_flags.append({"attempt_id": a.id, "question_id": a.question_id, "flags": ev.flags,
                                 "confidence": ev.confidence, "rationale": ev.rationale})

    # Independent concept probes are a second measure of reasoning, not
    # additional points in the original 100-point rubric.
    for row in attempt_rows:
        probe = db.scalars(select(ConceptProbeRow).where(ConceptProbeRow.attempt_id == row["attempt_id"])).first()
        row["concept_probe"] = None if probe is None else {
            "question": probe.question, "source": probe.source,
            "answer": probe.answer, "score": probe.score, "confidence": probe.confidence,
            "rationale": probe.rationale, "needs_review": probe.needs_review,
            "model_used": probe.model_used,
        }

    # Difficulty-weighted overall score over the latest attempt per question.
    per_q = [
        {"question_id": qid, "difficulty": r["difficulty"], "weight": scoring.weight(r["difficulty"]),
         "score": r["effective_score"], "assisted": r["assisted"]}
        for qid, r in latest_per_question.items()
    ]
    achieved = sum(p["score"] * p["weight"] for p in per_q)
    maximum = sum(100 * p["weight"] for p in per_q)
    score_breakdown = {
        "per_question": per_q,
        "weighted_achieved": round(achieved, 1),
        "weighted_max": round(maximum, 1),
        "overall_percent": round(100 * achieved / maximum, 1) if maximum else None,
        "note": "Provisional: code points come from untrusted browser example tests; weights are prototype choices.",
    }

    mastery = {
        m.skill: {
            "independent_transfer_correct": m.independent_transfer_correct,
            "independent_transfer_total": m.independent_transfer_total,
            "assisted_mean": m.assisted_mean,
            "independent_mean": m.independent_mean,
            "heuristic_mastery": m.heuristic_mastery,
        }
        for m in repo.get_mastery(db, session.id)
    }

    assisted_scores = [r["effective_score"] for r in attempt_rows if r["assisted"]]
    independent_scores = [r["effective_score"] for r in attempt_rows if not r["assisted"]]
    a_mean, i_mean = _mean(assisted_scores), _mean(independent_scores)
    assisted_vs_independent = {
        "assisted": {"count": len(assisted_scores), "mean_score": a_mean},
        "independent": {"count": len(independent_scores), "mean_score": i_mean},
        "transfer_gap": round(a_mean - i_mean, 1) if a_mean is not None and i_mean is not None else None,
        "note": "Descriptive only. 'Assisted' = Hint or Plan Mode used on that question; docs lookup is not counted.",
    }

    help_log = [
        {"event_id": e.id, "question_id": e.question_id, "attempt_id": e.attempt_id, "mode": e.mode,
         "query": e.query, "decision": e.decision, "reason_code": e.reason_code, "hint_level": e.hint_level,
         "created_at": e.created_at.isoformat()}
        for e in repo.list_assistance_events(db, session.id)
    ]

    return Envelope(ok=True, data=TeacherSessionResponse(
        attempts=attempt_rows,
        score_breakdown=score_breakdown,
        mastery_by_skill=mastery,
        assisted_vs_independent=assisted_vs_independent,
        help_log=help_log,
        review_flags=review_flags,
    ))


@router.post("/review", response_model=Envelope[TeacherReviewResponse])
def teacher_review(req: TeacherReviewRequest, db: Session = Depends(get_db)) -> Envelope[TeacherReviewResponse]:
    attempt = repo.get_attempt(db, req.attempt_id)
    if attempt is None:
        raise ApiError(404, "ATTEMPT_NOT_FOUND", "No attempt with that id.")
    ev = repo.latest_evaluation(db, attempt.id)
    if ev is None:
        raise ApiError(409, "NOT_GRADED", "This attempt has no evaluation to review.")
    if req.override_concept_score is None and req.approved is None:
        raise ApiError(422, "EMPTY_REVIEW", "Provide override_concept_score and/or approved.")
    if not req.reviewer_note.strip():
        raise ApiError(422, "NOTE_REQUIRED", "A reviewer note is required for the audit log.")

    reviews = repo.list_teacher_reviews(db, attempt.id)
    previous_concept, _ = _effective(ev, reviews[-1] if reviews else None)
    effective = scoring.effective_score(ev.code_score, ev.concept_score, req.override_concept_score)

    row = repo.add_teacher_review(  # append-only audit record
        db,
        attempt_id=attempt.id,
        previous_concept_score=previous_concept,
        override_concept_score=req.override_concept_score,
        approved=req.approved,
        reviewer_note=req.reviewer_note.strip(),
        effective_score=effective,
    )
    return Envelope(ok=True, data=TeacherReviewResponse(review_status=_review_status(row), effective_score=effective))
