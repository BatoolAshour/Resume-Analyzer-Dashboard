"""Settings, loaded from environment variables / a .env file.

The .env file may live in backend/ or at the repository root.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent

APP_VERSION = "2.0.0"
ALLOWED_EXTENSIONS = (".pdf", ".docx", ".txt")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    groq_api_key: str | None = None

    # NOTE: gpt-oss-20b is NOT free — $0.075/1M input, $0.30/1M output tokens.
    groq_model: str = "openai/gpt-oss-20b"
    # Optional per-task overrides; each falls back to groq_model.
    groq_model_ats_check: str | None = None
    groq_model_skills: str | None = None
    groq_model_scoring: str | None = None
    groq_model_recommendations: str | None = None
    groq_model_report: str | None = None

    # gpt-oss models spend part of the budget reasoning before they answer, so
    # keep this generous. Set GROQ_REASONING_EFFORT to an empty string when
    # switching to a model that does not support the parameter.
    groq_max_tokens: int = 3500
    # The full audit report returns much longer JSON than the other tasks.
    groq_report_max_tokens: int = 6000
    groq_reasoning_effort: str = "low"
    groq_timeout_seconds: float = 60.0
    # Retries on rate limits and transient errors (the SDK waits as the provider
    # asks). The full report sends three calls at once, so allow a few.
    groq_max_retries: int = 4

    max_upload_mb: int = 5
    max_resume_chars: int = 24_000
    max_job_description_chars: int = 12_000

    # Comma-separated list of origins allowed to call the API.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def model_ats_check(self) -> str:
        return self.groq_model_ats_check or self.groq_model

    @property
    def model_skills(self) -> str:
        return self.groq_model_skills or self.groq_model

    @property
    def model_scoring(self) -> str:
        return self.groq_model_scoring or self.groq_model

    @property
    def model_recommendations(self) -> str:
        return self.groq_model_recommendations or self.groq_model

    @property
    def model_report(self) -> str:
        return self.groq_model_report or self.groq_model


@lru_cache
def get_settings() -> Settings:
    return Settings()
