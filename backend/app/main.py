import sys
import os
import hmac
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fastapi import FastAPI, Request, HTTPException  # noqa: E402
from fastapi.exceptions import RequestValidationError  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse, FileResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from starlette.exceptions import HTTPException as StarletteHTTPException  # noqa: E402

from contextlib import asynccontextmanager  # noqa: E402
from .config import settings  # noqa: E402
from .data.questions import QUESTIONS  # noqa: E402
from .db import repo  # noqa: E402
from .routes import assist, attempt, health, next, session, teacher, probe, lab  # noqa: E402

@asynccontextmanager
async def lifespan(_: FastAPI):
    repo.init_db(QUESTIONS)
    yield

app = FastAPI(title="COGNIT API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"ok": False, "error": {"code": code, "message": message}})

@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return _error(exc.status_code, exc.detail["code"], exc.detail.get("message", exc.detail["code"]))
    code = exc.detail if isinstance(exc.detail, str) and exc.detail.isupper() else f"HTTP_{exc.status_code}"
    return _error(exc.status_code, code, str(exc.detail))

@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", []))
    return _error(422, "VALIDATION_ERROR", f"{loc}: {first.get('msg', 'invalid request')}")

@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception) -> JSONResponse:
    return _error(500, "INTERNAL_ERROR", "Unexpected server error")

for router in (health, session, attempt, assist, next, teacher, probe, lab):
    app.include_router(router.router)

# The production Docker image includes the Vite build here. Local development
# continues to use Vite at localhost:5173 with /api proxying to FastAPI.
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
if FRONTEND_DIST.joinpath("index.html").is_file():
    if FRONTEND_DIST.joinpath("assets").is_dir():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    @app.get("/student", include_in_schema=False)
    @app.get("/teacher", include_in_schema=False)
    def frontend_index() -> FileResponse:
        return FileResponse(FRONTEND_DIST / "index.html", media_type="text/html")

    @app.get("/favicon.svg", include_in_schema=False)
    def frontend_favicon() -> FileResponse:
        return FileResponse(FRONTEND_DIST / "favicon.svg", media_type="image/svg+xml")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend_fallback(path: str) -> FileResponse:
        # Only SPA navigation falls through. API/health/docs typos stay 404.
        if path.startswith(("api/", "health", "docs", "openapi", "redoc", "assets/")):
            raise HTTPException(status_code=404, detail="NOT_FOUND")
        return FileResponse(FRONTEND_DIST / "index.html", media_type="text/html")
