"""POST /api/next: commit the current question's outcome, then pick the next one.

Order: Shreyaa's select_next() over the vetted bank -> (transfer pending) a linked
transfer variant via make_transfer_variant() -> a fresh vetted variant for the
learner's skill/level -> mark session complete. Capped at
settings.max_questions_per_session (no loops); double-click safe.
"""

import hashlib
from typing import Optional
from sqlalchemy import select
from ..db.models import ConceptProbeRow
from cognit_ai.question_router import propose

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from cognit_ai import safe_variant, select_next
from cognit_ai.adapt import LearnerState
from cognit_ai.question_variants import TEMPLATES, make_transfer_variant
from contracts.models import Envelope, NextRequest, NextResponse, PrivateQuestion, SessionState

from .. import progress
from ..config import settings
from ..db import repo
from ..db.database import get_db
from ..db.models import SessionRow
from ..errors import ApiError
from ..lookups import require_attempt, require_session

router = APIRouter()


def _seed(session: SessionRow, salt: str = "") -> int:
    return int(hashlib.sha256(f"{session.id}:{session.questions_served}:{salt}".encode()).hexdigest()[:8], 16) % 1_000_000


def _used_ids(db: Session, ls: LearnerState) -> set[str]:
    return {q.id for q in repo.list_problems(db)} | ls.seen_question_ids


def _pending_from(ls: LearnerState) -> Optional[str]:
    p = ls.skill_progress.get(ls.last_skill)
    return p.pending_transfer_from if p else None


def _transfer_variant(db: Session, session: SessionRow, ls: LearnerState, source_id: str) -> Optional[PrivateQuestion]:
    source = repo.get_problem(db, source_id)
    if source is None:
        return None
    try:
        return make_transfer_variant(source, _seed(session, "transfer"), _used_ids(db, ls))
    except ValueError:
        # Source isn't template-based (e.g. a hand-written question): fall back to a
        # different same-skill template, explicitly linked as its transfer.
        return _fresh_variant(db, session, ls, transfer_from=source)


def _fresh_variant(db: Session, session: SessionRow, ls: LearnerState,
                   transfer_from: Optional[PrivateQuestion] = None) -> Optional[PrivateQuestion]:
    skill = ls.last_skill
    level = ls.skill_progress[skill].difficulty if skill in ls.skill_progress else ls.difficulty
    ranked = sorted(
        TEMPLATES.items(),
        key=lambda kv: (kv[1]["skill"] != skill, kv[1]["difficulty"] != level),
    )
    for template_id, t in ranked:
        if transfer_from is not None and (
            t["signature"] == transfer_from.function_signature or t["skill"] not in transfer_from.skill_tags
        ):
            continue
        try:
            return safe_variant(template_id, _seed(session, template_id), _used_ids(db, ls),
                                transfer_id=transfer_from.id if transfer_from else None)
        except ValueError:
            continue
    return None


def _agent_variant(db: Session, session: SessionRow, ls: LearnerState) -> Optional[PrivateQuestion]:
    """Let Claude choose an approved task family only when explicitly enabled."""
    if not ls.last_skill:
        return None
    attempts = repo.list_attempts(db, session.id)
    if not attempts:
        return None
    recent = attempts[-1]
    previous = repo.get_problem(db, recent.question_id)
    probe = db.scalars(select(ConceptProbeRow).where(ConceptProbeRow.attempt_id == recent.id)).first()
    skill = ls.last_skill
    progress = ls.skill_progress.get(skill)
    difficulty = progress.difficulty if progress else ls.difficulty
    template, _ = propose(
        skill=skill, difficulty=difficulty,
        previous_question=previous.statement if previous else "",
        previous_explanation=recent.explanation,
        probe_answer=probe.answer if probe else None,
        probe_score=probe.score if probe else None,
    )
    if template is None:
        return None
    try:
        return safe_variant(template, _seed(session, "agent:" + template), _used_ids(db, ls))
    except ValueError:
        return None


def _current(db: Session, session: SessionRow, reason: str) -> NextResponse:
    q = repo.get_problem(db, session.current_question_id)
    return NextResponse(question=q.public(), reason=reason, state=repo.session_state(session))


@router.post("/api/next", response_model=Envelope[NextResponse])
def next_question(req: NextRequest, db: Session = Depends(get_db, scope="function")) -> Envelope[NextResponse]:
    session = require_session(db, req.session_id)
    attempt = require_attempt(db, session, req.previous_attempt_id)

    # Already moved on (double click / refresh) or finished: return current state, don't advance twice.
    if session.stage == "complete" or attempt.question_id != session.current_question_id:
        return Envelope(ok=True, data=_current(db, session, session.last_reason or "same"))

    reason = progress.commit_current(db, session) or "same"
    ls = repo.load_learner_state(session)
    pending = _pending_from(ls)

    nq: Optional[PrivateQuestion] = None
    if session.questions_served < settings.max_questions_per_session:
        # A model may choose among validated templates, never invent an unchecked
        # Python program. Keep the original selector as the deterministic fallback.
        if not pending:
            nq = _agent_variant(db, session, ls)
        if nq is None:
            nq = select_next(ls, repo.list_problems(db), reason)
        if nq is None and pending:
            nq = _transfer_variant(db, session, ls, pending)
        if nq is None and not pending:
            nq = _fresh_variant(db, session, ls)

    if nq is None:
        repo.update_session(db, session, state=SessionState(stage="complete", difficulty=ls.difficulty, allowed_help=["lookup"]))
        return Envelope(ok=True, data=_current(db, session, reason))

    if nq.id == session.current_question_id or nq.id in ls.seen_question_ids:
        raise ApiError(500, "NEXT_LOOP", "Selector returned an already-seen question.")

    repo.upsert_problem(db, nq)
    stage = "transfer" if pending and nq.transfer_id == pending else "attempt"
    repo.update_session(
        db,
        session,
        state=SessionState(stage=stage, difficulty=ls.difficulty, allowed_help=["lookup"]),  # Hint/Plan re-lock until an attempt
        current_question_id=nq.id,
    )
    session.questions_served += 1
    db.flush()
    return Envelope(ok=True, data=NextResponse(question=nq.public(), reason=reason, state=repo.session_state(session)))
