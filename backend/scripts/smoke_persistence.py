"""A2 smoke test: write one row to every table, reopen the DB, read it all back.

Run from backend/:  .venv\\Scripts\\python scripts\\smoke_persistence.py
Uses a throwaway SQLite file so the demo DB is untouched.
"""

import os
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(BACKEND), str(BACKEND.parent)]

tmp = Path(tempfile.mkdtemp()) / "smoke.db"
os.environ["DATABASE_URL"] = f"sqlite:///{tmp.as_posix()}"

from contracts.models import SessionState  # noqa: E402
from app.data.questions import QUESTIONS, STARTING_QUESTION_ID  # noqa: E402
from app.db import repo  # noqa: E402
from app.db.database import db_session, engine  # noqa: E402

repo.init_db(QUESTIONS)

with db_session() as db:
    s = repo.create_session(db, "smoke", STARTING_QUESTION_ID, SessionState(stage="attempt", difficulty=1, allowed_help=["lookup"]))
    a = repo.add_attempt(db, session_id=s.id, question_id=STARTING_QUESTION_ID, code="def first_unique(s): return -1",
                         explanation="count then scan", client_test_results=[{"id": "t1", "pass": False}])
    repo.add_assistance_event(db, session_id=s.id, question_id=STARTING_QUESTION_ID, mode="lookup",
                              query="what is Counter", decision="allow", reason_code="DOCS_LOOKUP", attempt_id=a.id)
    repo.add_evaluation(db, attempt_id=a.id, code_score=20, concept_score=18, provisional_score=38,
                        confidence=0.7, needs_review=True, flags=["client_tests_untrusted"])
    repo.record_mastery_result(db, session_id=s.id, skill="hashing", correct=False, assisted=False)
    repo.update_session(db, s, state=SessionState(stage="plan", difficulty=1, allowed_help=["lookup", "plan", "hint"]))
    repo.add_teacher_review(db, attempt_id=a.id, previous_concept_score=18, override_concept_score=24,
                            approved=True, reviewer_note="explanation stronger than grader judged", effective_score=44)
    sid, aid = s.id, a.id

engine.dispose()  # simulate a restart: drop all connections

with db_session() as db:
    s = repo.get_session(db, sid)
    assert s and s.stage == "plan" and "hint" in s.allowed_help, "session"
    assert repo.get_problem(db, STARTING_QUESTION_ID).reference_solution, "problem private fields stored"
    assert [x.id for x in repo.list_attempts(db, sid)] == [aid], "attempts"
    assert repo.get_attempt(db, aid).client_tests_untrusted is True, "untrusted flag"
    assert len(repo.list_assistance_events(db, sid)) == 1, "assistance_events"
    ev = repo.latest_evaluation(db, aid)
    assert ev and ev.concept_score == 18 and ev.needs_review, "evaluations"
    m = repo.get_mastery(db, sid)
    assert len(m) == 1 and m[0].independent_total == 1 and m[0].independent_correct == 0, "mastery_state"
    r = repo.list_teacher_reviews(db, aid)
    assert len(r) == 1 and r[0].previous_concept_score == 18 and r[0].override_concept_score == 24, "teacher_reviews"

engine.dispose()
print(f"OK: all 7 tables persisted and reloaded ({tmp})")
