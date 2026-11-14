import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from contracts.models import (
    Envelope,
    SessionStartRequest,
    SessionStartResponse,
    SessionState,
)

from ..data.questions import QUESTIONS, STARTING_QUESTION_ID
from ..store import SESSIONS

router = APIRouter(prefix="/api/session")


@router.post("/start", response_model=Envelope[SessionStartResponse])
def start_session(req: SessionStartRequest) -> Envelope[SessionStartResponse]:
    question = QUESTIONS[STARTING_QUESTION_ID]
    session_id = f"s_{uuid.uuid4().hex[:12]}"
    # Hints and Plan Mode unlock only after the first attempt.
    state = SessionState(stage="attempt", difficulty=question.difficulty, allowed_help=["lookup"])

    SESSIONS[session_id] = {
        "session_id": session_id,
        "student_alias": req.student_alias,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "current_question_id": question.id,
        "state": state.model_dump(),
    }

    return Envelope(
        ok=True,
        data=SessionStartResponse(session_id=session_id, question=question.to_public(), state=state),
    )
