"""Short conceptual interview after a submitted programming attempt.

A generated question is never treated as a verified coding task.
One probe per attempt, one graded response. Persistent across reloads.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from cognit_ai.concept_probes import evaluate, generate
from contracts.models import Envelope
from ..db.database import get_db
from ..db.models import ConceptProbeRow
from ..db import repo
from ..errors import ApiError
from ..limits import rate_limit
from ..config import settings
from ..lookups import require_session, require_attempt

router = APIRouter(prefix="/api/probe")

class ProbeRequest(BaseModel):
    session_id: str
    attempt_id: str

class AnswerRequest(ProbeRequest):
    answer: str = Field(min_length=1, max_length=1800)

def public(row: ConceptProbeRow) -> dict:
    return {
        "probe_id": row.id, "attempt_id": row.attempt_id,
        "question": row.question, "source": row.source,
        "answered": row.answer is not None,
        "answer": row.answer, "score": row.score,
        "confidence": row.confidence, "rationale": row.rationale,
        "needs_review": row.needs_review, "model_used": row.model_used,
    }

def _stored(db: Session, attempt_id: str) -> ConceptProbeRow | None:
    return db.scalars(select(ConceptProbeRow).where(ConceptProbeRow.attempt_id == attempt_id)).first()

@router.post("/start", response_model=Envelope[dict])
def start_probe(req: ProbeRequest, db: Session = Depends(get_db, scope="function")) -> Envelope[dict]:
    session = require_session(db, req.session_id)
    attempt = require_attempt(db, session, req.attempt_id)
    prior = _stored(db, attempt.id)
    if prior:
        return Envelope(ok=True, data=public(prior))
    rate_limit("probe", session.id, min(5, settings.assists_per_minute))
    # A student can only start a probe for their latest submitted attempt
    # on the current question. Old probes may still be read through /start.
    if session.current_question_id != attempt.question_id:
        raise ApiError(409, "QUESTION_MISMATCH", "Advance to your current question.")
    question = repo.get_problem(db, attempt.question_id)
    text, source = generate(question, attempt.explanation)
    row = ConceptProbeRow(
        id=repo.new_id("p"), session_id=session.id, attempt_id=attempt.id,
        question_id=question.id, question=text, source=source,
    )
    db.add(row)
    db.flush()
    return Envelope(ok=True, data=public(row))

@router.post("/answer", response_model=Envelope[dict])
def answer_probe(req: AnswerRequest, db: Session = Depends(get_db, scope="function")) -> Envelope[dict]:
    session = require_session(db, req.session_id)
    attempt = require_attempt(db, session, req.attempt_id)
    row = _stored(db, attempt.id)
    if row is None:
        raise ApiError(404, "PROBE_NOT_FOUND", "Start your follow-up first.")
    if row.answer is not None:
        return Envelope(ok=True, data=public(row))
    rate_limit("probe", session.id, min(5, settings.assists_per_minute))
    if session.current_question_id != attempt.question_id:
        raise ApiError(409, "QUESTION_MISMATCH", "This follow-up belongs to an earlier question.")
    question = repo.get_problem(db, attempt.question_id)
    grade = evaluate(question, row.question, req.answer)
    row.answer = req.answer
    row.score = grade["score"]
    row.confidence = grade["confidence"]
    row.rationale = grade["rationale"]
    row.needs_review = grade["needs_review"]
    row.model_used = grade["model_used"]
    db.flush()
    return Envelope(ok=True, data=public(row))
