from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Comma-separated list of frontend origins allowed by CORS.
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # AI (used by Shreya's services; never sent to the client).
    anthropic_api_key: str = ""
    tutor_model: str = "claude-sonnet-5-5"
    grader_model: str = "claude-fable-5-2"

    # Persistence (A2). Empty = in-memory store.
    database_url: str = ""

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
