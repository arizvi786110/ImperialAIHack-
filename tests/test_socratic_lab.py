"""Smoke the full three-turn Socratic interview without paid model calls."""
from fastapi.testclient import TestClient
from backend.app.main import app

def test_lab_three_turns_and_teacher_evidence(monkeypatch):
    monkeypatch.setenv("COGNIT_AI_ENABLED", "false")
    with TestClient(app) as client:
        start = client.post("/api/lab/start", json={"skill":"loops","student_alias":"Orbit Demo"})
        assert start.status_code == 200, start.text
        first = start.json()["data"]
        assert first["turn"] == 0 and not first["complete"]
        assert first["question"] and first["question"].endswith("?")
        sid = first["session_id"]
        for i in range(3):
            result = client.post("/api/lab/reply", json={
                "session_id":sid,"answer":"I would test a small edge case, then compare the expected result."
            })
            assert result.status_code == 200, result.text
            state=result.json()["data"]
            assert state["turn"] == i+1
            assert len(state["history"]) == i+1
            assert state["history"][-1]["score"] is None
            assert state["history"][-1]["model_used"] == "vetted_fallback"
        assert state["complete"] and state["question"] is None
        assert state["review_required"]
        assert state["score"] is None

        second=client.get(f"/api/lab/session/{sid}")
        assert second.status_code == 200
        assert len(second.json()["data"]["history"]) == 3

        roster=client.get("/api/lab/sessions")
        assert roster.status_code == 200
        assert any(r["session_id"]==sid and r["student_alias"]=="Orbit Demo"
                   for r in roster.json()["data"]["sessions"])

        replay=client.post("/api/lab/reply",json={"session_id":sid,"answer":"Another answer"})
        assert replay.status_code == 200
        assert len(replay.json()["data"]["history"])==3

def test_lab_rejects_invalid_skill_and_short_answer(monkeypatch):
    monkeypatch.setenv("COGNIT_AI_ENABLED","false")
    with TestClient(app) as client:
        assert client.post("/api/lab/start",json={"skill":"unspecified","student_alias":"Demo"}).status_code == 422
        sid=client.post("/api/lab/start",json={"skill":"hashing","student_alias":"Demo"}).json()["data"]["session_id"]
        assert client.post("/api/lab/reply",json={"session_id":sid,"answer":"x"}).status_code == 422
        assert client.get("/api/lab/session/unknown").status_code == 404
