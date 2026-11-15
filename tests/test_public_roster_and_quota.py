"""Public teacher roster and durable API quotas. No paid model calls."""
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from cognit_ai.call_quota import reserve_call, ModelQuotaExceeded


def test_public_student_teacher_roster():
    with TestClient(app) as client:
        start = client.post("/api/session/start", json={"student_alias": "Student A"})
        assert start.status_code == 200, start.text
        session_id = start.json()["data"]["session_id"]
        roster = client.get("/api/teacher/sessions")
        assert roster.status_code == 200, roster.text
        entries = roster.json()["data"]["sessions"]
        assert any(x["session_id"] == session_id and x["student_alias"] == "Student A" for x in entries)


def test_global_model_call_limit_is_persistent(monkeypatch, tmp_path: Path):
    path = tmp_path / "quota.db"
    monkeypatch.setenv("COGNIT_AI_QUOTA_DB", str(path))
    monkeypatch.setenv("COGNIT_AI_DAILY_CALL_CAP", "2")
    monkeypatch.setenv("COGNIT_AI_MINUTE_CALL_CAP", "2")
    monkeypatch.setenv("COGNIT_AI_TOTAL_CALL_CAP", "2")
    reserve_call()
    reserve_call()
    with pytest.raises(ModelQuotaExceeded):
        reserve_call()
    assert sqlite3.connect(str(path)).execute("SELECT COUNT(*) FROM model_calls").fetchone()[0] == 2
