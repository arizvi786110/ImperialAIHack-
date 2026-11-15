"""Regression: the DB transaction must commit BEFORE the HTTP response is sent.

FastAPI's default for `yield` dependencies ends them after the response is sent, so a
fast client (e.g. Submit -> immediate session reload or Next) could read stale data or
get ATTEMPT_NOT_FOUND, and a failed commit would be reported to the client as 200 OK.
Every route therefore uses Depends(get_db, scope="function").
"""
import asyncio
import json

from fastapi.routing import APIRoute

from backend.app.data.questions import QUESTIONS
from backend.app.db import repo
from backend.app.db.database import SessionLocal, get_db
from backend.app.db.models import SessionRow
from backend.app.main import app


def _db_dependencies(dependant):
    for dep in dependant.dependencies:
        if dep.call is get_db:
            yield dep
        yield from _db_dependencies(dep)


def _api_routes(routes):
    """APIRoutes, including those inside included routers (newer FastAPI wraps them)."""
    for route in routes:
        if isinstance(route, APIRoute):
            yield route
        inner = getattr(route, "original_router", None) or getattr(route, "router", None)
        if inner is not None and hasattr(inner, "routes"):
            yield from _api_routes(inner.routes)


def test_every_route_commits_before_responding():
    found = [(route.path, dep.scope) for route in _api_routes(app.routes) for dep in _db_dependencies(route.dependant)]
    assert len(found) >= 10, f"expected every DB route to be inspected, found {found}"
    offenders = [path for path, scope in found if scope != "function"]
    assert not offenders, f"routes that would commit after responding: {offenders}"


def test_session_is_in_db_when_response_body_is_sent():
    repo.init_db(QUESTIONS)
    body = json.dumps({"student_alias": "commit-order"}).encode()
    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST",
        "path": "/api/session/start", "raw_path": b"/api/session/start", "query_string": b"", "root_path": "",
        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
        "client": ("test", 1), "server": ("test", 80), "scheme": "http",
    }
    seen = {}

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        if message["type"] == "http.response.body" and message.get("body"):
            session_id = json.loads(message["body"])["data"]["session_id"]
            with SessionLocal() as other_connection:  # sees only committed data
                seen["committed"] = other_connection.get(SessionRow, session_id) is not None

    asyncio.run(app(scope, receive, send))
    assert seen.get("committed") is True, "response was sent before the session was committed"
