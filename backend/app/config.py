"""Backend settings.

backend/.env is loaded into the process environment at import time so the AI
services (cognit_ai, which read os.environ) can see ANTHROPIC_API_KEY etc.

SECRETS: the API key stays server-side only. It is deliberately NOT a field on
Settings, so it can never be serialised, logged or returned by an endpoint.
.env is gitignored; only the sanitised .env.example is committed.
"""

from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_DIR / ".env"

# Real environment variables win over .env (override=False).
load_dotenv(ENV_FILE, override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Comma-separated list of frontend origins allowed by CORS.
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Persistence. Empty = SQLite at backend/cognit.db; or a Supabase Postgres URL.
    database_url: str = ""

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
