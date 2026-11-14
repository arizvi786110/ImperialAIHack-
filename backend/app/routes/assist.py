"""POST /api/assist: Lookup / Plan Mode / Hint via Shreyaa's bounded tutor.

The tutor only ever sees the PUBLIC question. Every request is logged, including refusals.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from cognit_ai import TutorService
from contracts.models import AssistRequest, AssistResponse, Envelope

from ..config import settings
from ..db import repo
from ..db.database import get_db
from ..limits import check_session_budget, rate_limit
from ..lookups import require_attempt, require_current_question, require_session

router = APIRouter()


@router.post("/api/assist", response_model=Envelope[AssistResponse])
def assist(req: AssistRequest, db: Session = Depends(get_db)) -> Envelope[AssistResponse]:
    session = require_session(db, req.session_id)
    question = require_current_question(db, session, req.question_id)
    if req.current_attempt_id:
        attempt = require_attempt(db, session, req.current_attempt_id)
        if attempt.question_id != question.id:
            req = req.model_copy(update={"current_attempt_id": None})  # attempt for another question doesn't unlock help
    rate_limit("assist", session.id, settings.assists_per_minute)
    check_session_budget("assist", len(repo.list_assistance_events(db, session.id)))

    result = TutorService().assist(
        req,
        question.public(),
        prior_attempts=repo.count_attempts(db, session.id, question.id),
        prior_hints=repo.count_hints(db, session.id, question.id),
    )
    repo.add_assistance_event(
        db,
        session_id=session.id,
        question_id=question.id,
        attempt_id=req.current_attempt_id,
        mode=req.mode,
        query=req.query,
        decision=result.decision,
        reason_code=result.reason_code,
        hint_level=result.hint_level,
    )
    return Envelope(ok=True, data=result)
