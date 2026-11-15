"""Live, three-round Socratic concept interview for judges and students."""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from cognit_ai.socratic_lab import SCENARIOS, evaluate_reply
from contracts.models import Envelope
from ..db.database import get_db
from ..db.models import SocraticLabRow, new_id
from ..errors import ApiError
from ..limits import rate_limit

router = APIRouter(prefix="/api/lab")
MAX_TURNS = 3

class StartRequest(BaseModel):
    skill: Literal["loops", "hashing", "complexity"]
    student_alias: str = Field(default="Demo Student", min_length=1, max_length=64)

class ReplyRequest(BaseModel):
    session_id: str = Field(min_length=4, max_length=40)
    answer: str = Field(min_length=3, max_length=600)

def _public(row: SocraticLabRow) -> dict:
    items = row.history or []
    scored = [x["score"] for x in items if x.get("score") is not None]
    return {
        "session_id": row.id,
        "student_alias": row.student_alias,
        "skill": row.skill,
        "title": SCENARIOS[row.skill]["title"],
        "descriptor": SCENARIOS[row.skill]["descriptor"],
        "question": row.current_question if row.turn < MAX_TURNS else None,
        "turn": row.turn,
        "max_turns": MAX_TURNS,
        "complete": row.turn >= MAX_TURNS,
        "history": items,
        "score": round(sum(scored) / (5 * MAX_TURNS) * 100) if len(scored) == MAX_TURNS else None,
        "review_required": len(scored) != MAX_TURNS or any(x.get("confidence", 0) < .75 for x in items),
    }

@router.get("/skills", response_model=Envelope[dict])
def skills() -> Envelope[dict]:
    return Envelope(ok=True, data={"skills": [
        {"id": k, "title": v["title"], "descriptor": v["descriptor"]}
        for k, v in SCENARIOS.items()
    ]})

@router.post("/start", response_model=Envelope[dict])
def start(req: StartRequest, db: Session = Depends(get_db)) -> Envelope[dict]:
    rate_limit("lab_start", "public", 30)
    row = SocraticLabRow(
        id=new_id("lab"), student_alias=req.student_alias.strip() or "Demo Student",
        skill=req.skill, current_question=SCENARIOS[req.skill]["opening"],
        history=[], turn=0,
    )
    db.add(row)
    db.flush()
    return Envelope(ok=True, data=_public(row))

@router.get("/session/{session_id}", response_model=Envelope[dict])
def restore(session_id: str, db: Session = Depends(get_db)) -> Envelope[dict]:
    row = db.get(SocraticLabRow, session_id)
    if row is None:
        raise ApiError(404, "LAB_SESSION_NOT_FOUND", "Interview not found.")
    return Envelope(ok=True, data=_public(row))

@router.post("/reply", response_model=Envelope[dict])
def reply(req: ReplyRequest, db: Session = Depends(get_db)) -> Envelope[dict]:
    row = db.get(SocraticLabRow, req.session_id)
    if row is None:
        raise ApiError(404, "LAB_SESSION_NOT_FOUND", "Interview not found.")
    if row.turn >= MAX_TURNS:
        return Envelope(ok=True, data=_public(row))
    rate_limit("lab_reply", row.id, 6)
    answer = req.answer.strip()
    if len(answer) < 3:
        raise ApiError(422, "ANSWER_TOO_SHORT", "Write a little more about your reasoning.")
    result = evaluate_reply(row.skill, row.current_question, answer, row.history or [], row.turn)
    history = list(row.history or [])
    history.append({
        "question": row.current_question, "answer": answer,
        "focus": result["focus"], "score": result["score"],
        "confidence": result["confidence"], "feedback": result["feedback"],
        "model_used": result["model_used"],
    })
    row.history = history
    row.turn = len(history)
    row.current_question = result["next_question"] if row.turn < MAX_TURNS else ""
    db.flush()
    return Envelope(ok=True, data=_public(row))

@router.get("/sessions", response_model=Envelope[dict])
def teacher_sessions(db: Session = Depends(get_db)) -> Envelope[dict]:
    # Only fictional student labels should ever be supplied to this public demo.
    rows = db.scalars(select(SocraticLabRow).order_by(SocraticLabRow.created_at.desc()).limit(30)).all()
    return Envelope(ok=True, data={"sessions": [
        {"session_id": x.id, "student_alias": x.student_alias, "skill": x.skill,
         "turn": x.turn, "complete": x.turn >= MAX_TURNS,
         "created_at": x.created_at.isoformat()} for x in rows
    ]})
