from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from contracts.models import Envelope, SessionStartRequest, SessionStartResponse, SessionState

from ..data.questions import STARTING_QUESTION_ID
from ..db import repo
from ..db.database import get_db

router = APIRouter(prefix="/api/session")


@router.post("/start", response_model=Envelope[SessionStartResponse])
def start_session(req: SessionStartRequest, db: Session = Depends(get_db)) -> Envelope[SessionStartResponse]:
    question = repo.get_problem(db, STARTING_QUESTION_ID)
    if question is None:
        raise HTTPException(500, "QUESTION_BANK_EMPTY")
    # Hints and Plan Mode unlock only after the first attempt.
    state = SessionState(stage="attempt", difficulty=question.difficulty, allowed_help=["lookup"])
    row = repo.create_session(db, req.student_alias, question.id, state)
    return Envelope(
        ok=True,
        data=SessionStartResponse(session_id=row.id, question=question.to_public(), state=state),
    )


@router.get("/{session_id}", response_model=Envelope[SessionStartResponse])
def get_session(session_id: str, db: Session = Depends(get_db)) -> Envelope[SessionStartResponse]:
    """Reload saved progress (e.g. after a browser refresh). Same shape as /start."""
    row = repo.get_session(db, session_id)
    if row is None:
        raise HTTPException(404, "SESSION_NOT_FOUND")
    question = repo.get_problem(db, row.current_question_id)
    if question is None:
        raise HTTPException(500, "QUESTION_MISSING")
    return Envelope(
        ok=True,
        data=SessionStartResponse(session_id=row.id, question=question.to_public(), state=repo.session_state(row)),
    )
