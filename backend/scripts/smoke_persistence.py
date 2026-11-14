"""A2 smoke test: real cognit_ai services -> every table -> reopen DB -> read back.

Run from repo root:  backend\\.venv\\Scripts\\python backend\\scripts\\smoke_persistence.py
- Uses a throwaway SQLite file (demo DB untouched).
- AI calls disabled (no API spend): tutor/grader use their safe fallbacks.
- Plants a fake API key and asserts it never reaches the DB or the API.
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent
sys.path[:0] = [str(BACKEND), str(REPO)]

tmp = Path(tempfile.mkdtemp()) / "smoke.db"
FAKE_KEY = "sk-ant-SMOKE-TEST-SENTINEL-not-a-real-key"
os.environ.update(DATABASE_URL=f"sqlite:///{tmp.as_posix()}", COGNIT_AI_ENABLED="false", ANTHROPIC_API_KEY=FAKE_KEY)

from cognit_ai import AssistRequest, Evidence, GraderService, TutorService  # noqa: E402
from contracts.models import SessionState  # noqa: E402
from app.data.questions import QUESTIONS, STARTING_QUESTION_ID  # noqa: E402
from app.db import repo  # noqa: E402
from app.db.database import db_session, engine  # noqa: E402

repo.init_db(QUESTIONS)
QID = STARTING_QUESTION_ID

with db_session() as db:
    q = repo.get_problem(db, QID)
    s = repo.create_session(db, "smoke", QID, SessionState(stage="attempt", difficulty=1, allowed_help=["lookup"]))
    a = repo.add_attempt(db, session_id=s.id, question_id=QID, code="def first_unique(s): return -1",
                         explanation="count each char then scan for the first with count 1",
                         client_test_results=[{"id": "t1", "pass": False}])

    req = AssistRequest(session_id=s.id, question_id=QID, mode="lookup", query="how does a dict work",
                        current_attempt_id=a.id)
    resp = TutorService().assist(req, q.public(), prior_attempts=1, prior_hints=repo.count_hints(db, s.id, QID))
    repo.add_assistance_event(db, session_id=s.id, question_id=QID, mode=req.mode, query=req.query,
                              decision=resp.decision, reason_code=resp.reason_code, hint_level=resp.hint_level,
                              attempt_id=a.id)

    grade = GraderService().grade(q, explanation=a.explanation, code=a.code, test_summary={"passed": 0, "total": 1})
    repo.add_evaluation(db, attempt_id=a.id, grade=grade, code_score=0, provisional_score=grade.total,
                        extra_flags=["client_tests_untrusted"])

    ls = repo.load_learner_state(s)
    reason = ls.record(Evidence(question_id=QID, skill=q.skill_tags[0], difficulty=q.difficulty, score=85, assisted=True))
    repo.save_learner_state(db, s, ls)
    repo.update_session(db, s, state=SessionState(stage="transfer", difficulty=ls.difficulty, allowed_help=["lookup", "plan", "hint"]))

    repo.add_teacher_review(db, attempt_id=a.id, previous_concept_score=grade.total, override_concept_score=24,
                            approved=True, reviewer_note="explanation is sound", effective_score=24)
    sid, aid = s.id, a.id

engine.dispose()  # simulate a restart

with db_session() as db:
    s = repo.get_session(db, sid)
    assert s and s.stage == "transfer" and "hint" in s.allowed_help, "session"
    assert len(QUESTIONS) == 4 and all(repo.get_problem(db, k) for k in QUESTIONS), "problems seeded"
    assert repo.get_problem(db, QID).review_status == "vetted", "vetted"
    assert [x.id for x in repo.list_attempts(db, sid)] == [aid], "attempts"
    assert repo.get_attempt(db, aid).client_tests_untrusted is True, "untrusted flag"
    ev_help = repo.list_assistance_events(db, sid)
    assert len(ev_help) == 1 and ev_help[0].decision == "allow", "assistance_events"
    ev = repo.latest_evaluation(db, aid)
    assert ev and ev.review_required and "GRADER_UNAVAILABLE" in ev.flags and "client_tests_untrusted" in ev.flags, "evaluations"
    ls = repo.load_learner_state(s)
    assert reason == "transfer" and ls.pending_transfer and QID in ls.seen_question_ids, "learner_state round-trip"
    m = repo.get_mastery(db, sid)
    assert len(m) == 1 and m[0].skill == "hashing" and m[0].assisted_mean == 85.0, "mastery_state"
    r = repo.list_teacher_reviews(db, aid)
    assert len(r) == 1 and r[0].override_concept_score == 24, "teacher_reviews"

engine.dispose()

# --- secrets checks ---
assert FAKE_KEY.encode() not in tmp.read_bytes(), "API key leaked into database"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

with TestClient(app) as client:
    bodies = [client.get("/health").text,
              client.post("/api/session/start", json={"student_alias": "x"}).text,
              client.get(f"/api/session/{sid}").text,
              client.get("/openapi.json").text]
for b in bodies:
    assert FAKE_KEY not in b and "ANTHROPIC" not in b, "API key/env leaked in API response"
for b in bodies[:3]:  # real responses (openapi.json is schema only)
    for private in ("reference_solution", "hidden_tests", "rubric", "concept_key", "transfer_id"):
        assert private not in b, f"private field {private} leaked to client"

tracked = subprocess.run(["git", "ls-files"], cwd=REPO, capture_output=True, text=True).stdout.split()
assert not [f for f in tracked if f.endswith(".env") or f.endswith(".db")], ".env or .db is tracked by git"
hits = subprocess.run(["git", "grep", "-lE", r"sk-ant-[A-Za-z0-9_-]{20,}"], cwd=REPO, capture_output=True, text=True).stdout
assert hits.strip() in ("", "backend/scripts/smoke_persistence.py"), f"possible real key committed in: {hits}"

engine.dispose()
print(f"OK: 7 tables persisted + reloaded with real cognit_ai services; no key leaks ({tmp})")
