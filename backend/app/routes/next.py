"""POST /api/next: pick the next question with Shreyaa's select_next().

Order: vetted unseen bank question -> fresh vetted variant at the learner's level
-> mark session complete. Capped at settings.max_questions_per_session (no loops).
"""

import hashlib
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from cognit_ai import safe_variant, select_next
from cognit_ai.adapt import LearnerState
from contracts.models import Envelope, NextRequest, NextResponse, PrivateQuestion, SessionState

from ..config import settings
from ..db import repo
from ..db.database import get_db
from ..db.models import SessionRow
from ..errors import ApiError
from ..lookups import require_attempt, require_session

router = APIRouter()

TEMPLATE_BY_LEVEL = {1: "count_target", 2: "unique_count", 3: "first_repeat"}


def _fresh_variant(db: Session, session: SessionRow, ls: LearnerState) -> Optional[PrivateQuestion]:
    existing = {q.id for q in repo.list_problems(db)} | ls.seen_question_ids
    seed = int(hashlib.sha256(f"{session.id}:{session.questions_served}".encode()).hexdigest()[:8], 16) % 1_000_000
    try:
        q = safe_variant(TEMPLATE_BY_LEVEL.get(ls.difficulty, "count_target"), seed, existing)
    except ValueError:
        return None
    repo.upsert_problem(db, q)
    return q


def _response(db: Session, session: SessionRow, reason: str) -> NextResponse:
    q = repo.get_problem(db, session.current_question_id)
    return NextResponse(question=q.public(), reason=reason, state=repo.session_state(session))


@router.post("/api/next", response_model=Envelope[NextResponse])
def next_question(req: NextRequest, db: Session = Depends(get_db)) -> Envelope[NextResponse]:
    session = require_session(db, req.session_id)
    attempt = require_attempt(db, session, req.previous_attempt_id)
    reason = session.last_reason or "same"

    # Already moved on (double click / refresh) or finished: return current state, don't advance twice.
    if session.stage == "complete" or attempt.question_id != session.current_question_id:
        return Envelope(ok=True, data=_response(db, session, reason))

    ls = repo.load_learner_state(session)
    nq: Optional[PrivateQuestion] = None
    if session.questions_served < settings.max_questions_per_session:
        nq = select_next(ls, repo.list_problems(db), reason) or _fresh_variant(db, session, ls)

    if nq is None:
        repo.update_session(db, session, state=SessionState(stage="complete", difficulty=ls.difficulty, allowed_help=["lookup"]))
        return Envelope(ok=True, data=_response(db, session, reason))

    if nq.id == session.current_question_id:
        raise ApiError(500, "NEXT_LOOP", "Selector returned the current question.")

    stage = "transfer" if reason == "transfer" else "attempt"
    repo.update_session(
        db,
        session,
        state=SessionState(stage=stage, difficulty=ls.difficulty, allowed_help=["lookup"]),  # Hint/Plan re-lock until an attempt
        current_question_id=nq.id,
    )
    session.questions_served += 1
    db.flush()
    return Envelope(ok=True, data=NextResponse(question=nq.public(), reason=reason, state=repo.session_state(session)))
