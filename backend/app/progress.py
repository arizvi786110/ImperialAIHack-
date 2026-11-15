"""Bridge between attempts and Shreyaa's LearnerState (cognit_ai.adapt).

adapt.LearnerState.record() accepts each question ONCE. Students may retry a
question, so:
- /api/attempt  -> preview(): record on a throwaway copy to get the likely
                   outcome + snapshot for feedback; nothing is saved.
- /api/next     -> commit_current(): record the LATEST attempt on the current
                   question into the real state and save it.
"""

import copy
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import select
from .db.models import ConceptProbeRow

from cognit_ai.adapt import Evidence, LearnerState
from contracts.models import PrivateQuestion

from .db import repo
from .db.models import SessionRow


def _evidence(session: SessionRow, question: PrivateQuestion, score: float, assisted: bool) -> Evidence:
    return Evidence(
        question_id=question.id,
        skill=question.skill_tags[0] if question.skill_tags else "general",
        difficulty=question.difficulty,
        score=max(0.0, min(100.0, float(score))),
        assisted=assisted,
        transfer=session.stage == "transfer",
    )


def preview(session: SessionRow, question: PrivateQuestion, score: float, assisted: bool) -> tuple[str, dict]:
    ls: LearnerState = copy.deepcopy(repo.load_learner_state(session))
    if question.id in ls.seen_question_ids:  # already committed (shouldn't happen): report current state
        return session.last_reason or "same", ls.snapshot()
    reason = ls.record(_evidence(session, question, score, assisted))
    return reason, ls.snapshot()


def commit_current(db: Session, session: SessionRow) -> Optional[str]:
    """Record the latest attempt on the current question. Returns the reason, or None if nothing to commit."""
    ls = repo.load_learner_state(session)
    qid = session.current_question_id
    if qid in ls.seen_question_ids:
        return session.last_reason
    attempts = [a for a in repo.list_attempts(db, session.id) if a.question_id == qid]
    if not attempts:
        return None
    latest = attempts[-1]
    ev = repo.latest_evaluation(db, latest.id)
    question = repo.get_problem(db, qid)
    progress_score = ev.provisional_score if ev else 0.0
    probe = db.scalars(select(ConceptProbeRow).where(ConceptProbeRow.attempt_id == latest.id)).first()
    # Confirming the right output without explaining a counterexample is not
    # enough evidence for promotion. A confident, low-scored interview can
    # block promotion, but cannot alter the recorded 100-point assessment score.
    if (probe is not None and probe.score is not None and probe.score < 8
            and probe.confidence is not None and probe.confidence >= 0.75
            and not probe.needs_review):
        progress_score = min(progress_score, 69.0)
    reason = ls.record(_evidence(session, question, progress_score, latest.assisted))
    repo.save_learner_state(db, session, ls)
    session.last_reason = reason
    return reason
