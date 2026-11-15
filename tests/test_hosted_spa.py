"""Verify a single server serves the built React app and FastAPI together.

Run after: cd frontend && npm install && npm run build
This is HTTP/API verification, not an actual browser-Pyodide execution test.
"""
import os
from pathlib import Path

os.environ.setdefault("COGNIT_AI_ENABLED", "false")
from fastapi.testclient import TestClient
from backend.app.main import app, FRONTEND_DIST


def test_frontend_build_is_packaged():
    assert (FRONTEND_DIST / "index.html").is_file(), "Build the React app before hosting tests"
    assert (FRONTEND_DIST / "assets").is_dir()


def test_one_origin_serves_student_teacher_assets_and_api():
    with TestClient(app) as client:
        for route in ("/", "/student", "/teacher", "/student/"):
            response = client.get(route)
            assert response.status_code == 200, (route, response.text[:300])
            assert "text/html" in response.headers["content-type"]
        response = client.get("/health")
        assert response.status_code == 200
        result = client.post("/api/session/start", json={"student_alias": "team-demo"})
        assert result.status_code == 200
        data = result.json()["data"]
        assert data["question"]["title"] == "Count even numbers"
        assert "reference_solution" not in data["question"]
        session_id = data["session_id"]
        teacher = client.get(f"/api/teacher/session/{session_id}")
        assert teacher.status_code == 200
        assert teacher.json()["ok"] is True


def test_nonexistent_api_is_not_rewritten_as_react():
    with TestClient(app) as client:
        assert client.get("/api/no-such-route").status_code == 404
        assert client.get("/assets/nonexistent.js").status_code == 404
