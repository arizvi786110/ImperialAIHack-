"""Shared 'load or fail cleanly' helpers for routes."""

from sqlalchemy.orm import Session

from contracts.models import PrivateQuestion

from .db import repo
from .db.models import AttemptRow, SessionRow
from .errors import ApiError


def require_session(db: Session, session_id: str) -> SessionRow:
    row = repo.get_session(db, session_id)
    if row is None:
        raise ApiError(404, "SESSION_NOT_FOUND", "No session with that id.")
    return row


def require_current_question(db: Session, session: SessionRow, question_id: str) -> PrivateQuestion:
    if session.stage == "complete":
        raise ApiError(409, "SESSION_COMPLETE", "This session is complete.")
    if question_id != session.current_question_id:
        raise ApiError(409, "QUESTION_MISMATCH", "That is not the session's current question.")
    q = repo.get_problem(db, question_id)
    if q is None:
        raise ApiError(500, "QUESTION_MISSING", "Current question is missing from the bank.")
    return q


def require_attempt(db: Session, session: SessionRow, attempt_id: str) -> AttemptRow:
    a = repo.get_attempt(db, attempt_id)
    if a is None or a.session_id != session.id:
        raise ApiError(404, "ATTEMPT_NOT_FOUND", "No attempt with that id in this session.")
    return a
