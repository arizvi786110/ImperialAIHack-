import sys
from pathlib import Path

# Make the repo-root `contracts` package importable when running from backend/.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.exceptions import RequestValidationError  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from starlette.exceptions import HTTPException as StarletteHTTPException  # noqa: E402

from contextlib import asynccontextmanager  # noqa: E402

from .config import settings  # noqa: E402
from .data.questions import QUESTIONS  # noqa: E402
from .db import repo  # noqa: E402
from .routes import health, session  # noqa: E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    repo.init_db(QUESTIONS)  # create tables + seed question bank
    yield


app = FastAPI(title="COGNIT API", version="0.1.0", lifespan=lifespan)

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


app.include_router(health.router)
app.include_router(session.router)
