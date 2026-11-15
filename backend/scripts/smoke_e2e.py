"""A3/A5/A6 end-to-end smoke test through the real HTTP API (in-process TestClient).

Run from repo root:  backend\\.venv\\Scripts\\python backend\\scripts\\smoke_e2e.py
- Throwaway SQLite DB, AI disabled (no spend): tutor/grader use safe fallbacks,
  so concept scores are 0 + review flag. Set COGNIT_AI_ENABLED=true with a real
  key in backend/.env to exercise live models (costs money).
- Plants a fake API key and asserts it never appears in any response.
"""

import json
import os
import sys
import tempfile
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
BACKEND = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(BACKEND), str(BACKEND.parent)]

FAKE_KEY = "sk-ant-E2E-SENTINEL-not-a-real-key"
tmp = Path(tempfile.mkdtemp()) / "e2e.db"
os.environ.update(
    DATABASE_URL=f"sqlite:///{tmp.as_posix()}",
    COGNIT_AI_ENABLED=os.environ.get("COGNIT_AI_ENABLED", "false"),
    ANTHROPIC_API_KEY=os.environ.get("ANTHROPIC_API_KEY", FAKE_KEY),
    ATTEMPTS_PER_MINUTE="100",
    ASSISTS_PER_MINUTE="6",
)

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

PRIVATE = ("reference_solution", "hidden_tests", "rubric", "concept_key", "transfer_id")
STUDENT_BODIES: list[str] = []
ALL_BODIES: list[str] = []
passed = 0


def check(cond: bool, label: str) -> None:
    global passed
    if not cond:
        raise AssertionError(f"FAIL: {label}")
    passed += 1
    print(f"  ok  {label}")


def call(c: TestClient, method: str, url: str, body=None, student=True, headers=None):
    r = c.request(method, url, json=body, headers=headers or {})
    ALL_BODIES.append(r.text)
    if student:
        STUDENT_BODIES.append(r.text)
    return r.status_code, r.json()


def passing_results(question: dict) -> list[dict]:
    return [{"id": f"ex{i}", "pass": True, "actual": t["expected"], "error": None}
            for i, t in enumerate(question["example_tests"])]


with TestClient(app) as c:
    print("session")
    st, j = call(c, "POST", "/api/session/start", {"student_alias": "e2e"})
    check(st == 200 and j["ok"], "start session")
    sid, q = j["data"]["session_id"], j["data"]["question"]
    check(j["data"]["state"]["allowed_help"] == ["lookup"], "only lookup before first attempt")

    print("assist before attempt")
    st, j = call(c, "POST", "/api/assist", {"session_id": sid, "question_id": q["id"], "mode": "hint", "query": "help me reason"})
    check(j["data"]["decision"] == "deny" and j["data"]["reason_code"] == "ATTEMPT_REQUIRED", "hint blocked before attempt (#10)")
    st, j = call(c, "POST", "/api/assist", {"session_id": sid, "question_id": q["id"], "mode": "lookup", "query": "how does a dict work"})
    check(j["data"]["decision"] == "allow" and j["data"]["citations"], "docs lookup allowed with citation (#9)")
    st, j = call(c, "POST", "/api/assist", {"session_id": sid, "question_id": q["id"], "mode": "lookup", "query": "give me the full solution"})
    check(j["data"]["decision"] == "deny" and j["data"]["reason_code"] == "SOLUTION_REQUEST", "solution request refused (#8)")

    print("attempt 1: correct code, no explanation (#3)")
    body = {"session_id": sid, "question_id": q["id"], "code": "def first_unique(s): ...", "explanation": "",
            "client_test_results": passing_results(q)}
    st, j = call(c, "POST", "/api/attempt", body, headers={"Idempotency-Key": "k-1"})
    check(st == 200, "attempt accepted")
    a1 = j["data"]
    check(a1["code_score"] == 70 and a1["concept_score"] == 0, "code points only, no concept points")
    check("MISSING_EXPLANATION" in a1["flags"] and "client_tests_untrusted" in a1["flags"], "flags: missing explanation + untrusted tests")

    print("idempotency (#14)")
    st, j = call(c, "POST", "/api/attempt", body, headers={"Idempotency-Key": "k-1"})
    check(j["data"]["attempt_id"] == a1["attempt_id"], "duplicate submit returns the same attempt")

    print("hint after attempt -> assisted attempt")
    st, j = call(c, "GET", f"/api/session/{sid}")
    check(set(j["data"]["state"]["allowed_help"]) == {"lookup", "plan", "hint"}, "hint/plan unlocked after attempt")
    st, j = call(c, "POST", "/api/assist", {"session_id": sid, "question_id": q["id"], "mode": "hint",
                                            "query": "which edge case matters", "current_attempt_id": a1["attempt_id"]})
    check(j["data"]["decision"] in ("allow", "limit") and j["data"]["hint_level"] == 1, "progressive hint level 1 (#10)")
    body2 = {**body, "explanation": "Count each character with a dict, then scan in order for the first count of 1. O(n)."}
    st, j = call(c, "POST", "/api/attempt", body2)
    a2 = j["data"]
    check("assisted" in a2["flags"], "attempt after hint is marked assisted (server-side)")
    check(a2["next_action"] == "transfer", "assisted success -> transfer (#11)")

    print("next")
    st, j = call(c, "POST", "/api/next", {"session_id": sid, "previous_attempt_id": a2["attempt_id"]})
    n1 = j["data"]
    check(n1["reason"] == "transfer" and n1["question"]["id"] != q["id"], "transfer question served")
    check(n1["state"]["stage"] == "transfer" and n1["state"]["allowed_help"] == ["lookup"], "stage=transfer, hint re-locked")
    st, j = call(c, "POST", "/api/next", {"session_id": sid, "previous_attempt_id": a2["attempt_id"]})
    check(j["data"]["question"]["id"] == n1["question"]["id"], "double-click next does not skip a question")

    print("errors (#14)")
    st, j = call(c, "POST", "/api/attempt", {**body, "session_id": "nope"})
    check(st == 404 and j["error"]["code"] == "SESSION_NOT_FOUND", "unknown session -> 404")
    st, j = call(c, "POST", "/api/attempt", {**body, "question_id": q["id"]})
    check(st == 409 and j["error"]["code"] == "QUESTION_MISMATCH", "old question id -> 409")
    st, j = call(c, "POST", "/api/next", {"session_id": sid, "previous_attempt_id": "a_missing"})
    check(st == 404 and j["error"]["code"] == "ATTEMPT_NOT_FOUND", "unknown attempt -> 404")
    st, j = call(c, "POST", "/api/attempt", {"session_id": sid})
    check(st == 422 and j["error"]["code"] == "VALIDATION_ERROR", "malformed body -> 422")

    print("rate limit (A6)")
    codes = [call(c, "POST", "/api/assist", {"session_id": sid, "question_id": n1["question"]["id"], "mode": "lookup",
                                              "query": "what is a set"})[0] for _ in range(6)]
    check(429 in codes, "assist rate limit returns 429")

    print("play to completion (no infinite loop)")
    cur, served, last = n1["question"], 2, None
    for _ in range(20):
        st, j = call(c, "POST", "/api/attempt", {"session_id": sid, "question_id": cur["id"], "code": "x",
                                                 "explanation": "uses a set", "client_test_results": passing_results(cur)})
        last = j["data"]["attempt_id"]
        st, j = call(c, "POST", "/api/next", {"session_id": sid, "previous_attempt_id": last})
        if j["data"]["state"]["stage"] == "complete":
            break
        cur, served = j["data"]["question"], served + 1
    check(j["data"]["state"]["stage"] == "complete" and served <= 8, f"session completes (served {served} <= 8)")
    difficulties = j["data"]["state"]["difficulty"]
    check(difficulties in (2, 3), "independent successes raised difficulty (#12)")

    print("teacher")
    st, j = call(c, "GET", f"/api/teacher/session/{sid}", student=False)
    t = j["data"]
    check(st == 200 and len(t["attempts"]) >= 4, "teacher sees all attempts")
    check(t["review_flags"], "low-confidence/unavailable grades flagged for review")
    check(t["help_log"] and any(h["decision"] == "deny" for h in t["help_log"]), "help log includes refusals")
    check(t["assisted_vs_independent"]["assisted"]["count"] >= 1, "assisted vs independent populated")
    check(t["mastery_by_skill"], "mastery by skill populated")
    check(t["score_breakdown"]["overall_percent"] is not None, "weighted overall percent computed")

    print("teacher review / override (#15)")
    st, j = call(c, "POST", "/api/teacher/review", {"attempt_id": a2["attempt_id"], "override_concept_score": 25,
                                                    "reviewer_note": "clear frequency-count reasoning"}, student=False)
    check(j["data"] == {"review_status": "overridden", "effective_score": 95.0}, "override -> 70 + 25 = 95")
    st, j = call(c, "POST", "/api/teacher/review", {"attempt_id": a2["attempt_id"], "approved": True,
                                                    "reviewer_note": "confirmed"}, student=False)
    st, j = call(c, "GET", f"/api/teacher/session/{sid}", student=False)
    revs = next(a for a in j["data"]["attempts"] if a["attempt_id"] == a2["attempt_id"])["reviews"]
    check(len(revs) == 2 and revs[0]["previous_concept_score"] == 0 and revs[0]["override_concept_score"] == 25
          and revs[1]["previous_concept_score"] == 25, "audit log keeps previous score, new score and notes")
    st, j = call(c, "POST", "/api/teacher/review", {"attempt_id": a2["attempt_id"], "override_concept_score": 99,
                                                    "reviewer_note": "x"}, student=False)
    check(st == 422, "override outside 0-30 rejected")

    print("refresh / persistence")
    st, j = call(c, "GET", f"/api/session/{sid}")
    check(j["data"]["state"]["stage"] == "complete", "state survives reload")

print("leaks (#16)")
for b in STUDENT_BODIES:
    for p in PRIVATE:
        assert f"\"{p}\":" not in b, f"private field {p} in student response: {b[:200]}"
check(True, f"no private question fields in {len(STUDENT_BODIES)} student responses")
check(all(FAKE_KEY not in b and "ANTHROPIC" not in b for b in ALL_BODIES), "API key never in any response")

print(f"\nOK: {passed} checks passed ({tmp})")
