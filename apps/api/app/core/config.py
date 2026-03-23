from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    APP_NAME: str = "Spam Classifier API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:3000"
    ARTIFACT_BUNDLE_DIR: str = "ml/artifacts/bundle"
    DATABASE_URL: Optional[str] = None

    # --- V2: Auth & Session ---
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    SESSION_SECRET_KEY: str = "change-me-in-production"
    SESSION_EXPIRY_HOURS: int = 168

    # --- V2: Gmail ---
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REDIRECT_URI: str = "http://localhost:8000/api/v1/gmail/connect/callback"
    GMAIL_SCOPES: str = "https://www.googleapis.com/auth/gmail.readonly"

    # --- V2: General ---
    FRONTEND_URL: str = "http://localhost:3000"
    PERSONALIZATION_ENABLED: bool = True
    GMAIL_ENABLED: bool = True

    # --- Anonymous classification rate limit ---
    # Set ANON_CLASSIFY_LIMIT=0 to disable the gate entirely.
    ANON_CLASSIFY_LIMIT: int = 1          # requests allowed per window
    ANON_CLASSIFY_WINDOW_HOURS: int = 2   # rolling window length

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> str:
        if isinstance(v, str):
            if not v.strip():
                return "http://localhost:3000"
            # Ensure no extra formatting, just comma-separated
            return ",".join(origin.strip() for origin in v.split(",") if origin.strip())
        if v is None:
            return "http://localhost:3000"
        return str(v) if v else "http://localhost:3000"

    def get_cors_origins(self) -> list[str]:
        """Return parsed CORS origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
