"""Engine + session factory.

DATABASE_URL empty -> SQLite file at backend/cognit.db.
Supabase: set DATABASE_URL=postgresql+psycopg://... and `pip install psycopg[binary]`.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from ..config import settings

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_URL = f"sqlite:///{(BACKEND_DIR / 'cognit.db').as_posix()}"

DATABASE_URL = settings.database_url or DEFAULT_SQLITE_URL
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE and ":memory:" not in DATABASE_URL:
    # e.g. sqlite:////data/cognit.db on a host's persistent disk: make sure the folder exists.
    Path(DATABASE_URL.split("sqlite:///", 1)[1]).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=not IS_SQLITE,
)

if IS_SQLITE:

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()


SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


@contextmanager
def db_session() -> Iterator[Session]:
    """Transaction scope: commit on success, rollback on error."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db() -> Iterator[Session]:
    """FastAPI dependency. ALWAYS use as Depends(get_db, scope="function").

    The default scope ends the dependency (i.e. commits) AFTER the response is sent, so
    a fast client could read stale data and a failed commit would still return 200.
    tests/test_db_commit_before_response.py enforces this.
    """
    with db_session() as db:
        yield db
