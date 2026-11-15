"""POST /api/attempt: save attempt -> AI concept grade -> score -> learner state."""

from typing import Optional

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from cognit_ai import GraderService
from contracts.models import AttemptRequest, AttemptResponse, Envelope

from .. import progress, scoring
from ..config import settings
from ..db import repo
from ..db.database import get_db
from ..errors import ApiError
from ..limits import check_session_budget, rate_limit
from ..lookups import require_current_question, require_session

router = APIRouter()

ALWAYS_FLAGS = ["client_tests_untrusted", "server_tests_not_run"]


def _next_action(reason: str, attempts_on_question: int) -> str:
    if reason == "transfer":
        return "transfer"  # assisted success -> independent transfer task
    if reason == "remedial":
        # First miss: suggest Plan Mode and a retry; after that, move on to a remedial task.
        return "plan" if attempts_on_question <= 1 else "next"
    return "next"  # 'harder' or 'same'


def _feedback(s: scoring.AttemptScore, rationale: str) -> str:
    return (
        f"Example tests: {s.tests.passed}/{s.tests.total} passed in your browser (provisional). "
        f"Code {s.code_score}/{scoring.CODE_MAX}, explanation {s.concept_score}/{scoring.CONCEPT_MAX}. "
        f"{rationale}"
    ).strip()


@router.post("/api/attempt", response_model=Envelope[AttemptResponse])
def submit_attempt(
    req: AttemptRequest,
    db: Session = Depends(get_db),
    idempotency_key: Optional[str] = Header(default=None, max_length=64),
) -> Envelope[AttemptResponse]:
    # A6: a retried/double-clicked submit with the same key returns the original result.
    if idempotency_key:
        prior = repo.get_attempt_by_key(db, idempotency_key)
        if prior is not None:
            if prior.session_id != req.session_id or prior.response is None:
                raise ApiError(409, "IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key belongs to another request.")
            return Envelope(ok=True, data=AttemptResponse.model_validate(prior.response))

    session = require_session(db, req.session_id)
    question = require_current_question(db, session, req.question_id)
    rate_limit("attempt", session.id, settings.attempts_per_minute)
    check_session_budget("attempt", len(repo.list_attempts(db, session.id)))

    assisted = repo.used_assistance(db, session.id, question.id)
    attempt = repo.add_attempt(
        db,
        session_id=session.id,
        question_id=question.id,
        code=req.code,
        explanation=req.explanation,
        plan=req.plan,
        client_test_results=[r.model_dump(by_alias=True) for r in req.client_test_results],
        client_help_events=[e.model_dump() for e in req.help_events],
        assisted=assisted,
        idempotency_key=idempotency_key,
    )

    # Concept grade (separate AI call; safe fallback + review flag if unavailable).
    tests = scoring.summarise_tests(question, req.client_test_results)
    grade = GraderService().grade(question, explanation=req.explanation, code=req.code, test_summary=tests.as_dict())
    score = scoring.score_attempt(question, req.client_test_results, grade.total)
    flags = list(dict.fromkeys([*ALWAYS_FLAGS, *grade.flags] + (["assisted"] if assisted else [])))
    repo.add_evaluation(db, attempt_id=attempt.id, grade=grade, code_score=score.code_score,
                        provisional_score=score.total, extra_flags=flags)

    # Learner state (Shreyaa's adapt.py decides transfer/harder/same/remedial).
    # Preview only: the real state is updated once per question, in /api/next.
    reason, snapshot = progress.preview(session, question, score.total, assisted)
    session.last_reason = reason
    session.allowed_help = ["lookup", "plan", "hint"]  # unlocked after the first attempt

    response = AttemptResponse(
        attempt_id=attempt.id,
        provisional_score=score.total,
        code_score=score.code_score,
        concept_score=score.concept_score,
        flags=flags,
        feedback=_feedback(score, grade.rationale),
        mastery_snapshot=snapshot,
        next_action=_next_action(reason, repo.count_attempts(db, session.id, question.id)),
    )
    attempt.response = response.model_dump(mode="json")
    db.flush()
    return Envelope(ok=True, data=response)
