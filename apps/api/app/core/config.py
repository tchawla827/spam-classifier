from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_SESSION_SECRET_KEY = "change-me-in-production"


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

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def strip_database_url(cls, v: object) -> Optional[str]:
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v

    # --- V2: Auth & Session ---
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    SESSION_SECRET_KEY: str = DEFAULT_SESSION_SECRET_KEY
    SESSION_EXPIRY_HOURS: int = 168
    SESSION_COOKIE_SAMESITE: str = "lax"
    SESSION_COOKIE_DOMAIN: Optional[str] = None

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
    ANON_CLASSIFY_LIMIT: int = 0          # requests allowed per window
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

    def uses_default_session_secret(self) -> bool:
        """Return True when the session secret is unset or left at the insecure default."""
        return self.SESSION_SECRET_KEY.strip() == DEFAULT_SESSION_SECRET_KEY

    def oauth_requires_secure_session_secret(self) -> bool:
        """Return True when OAuth-backed security features depend on the session secret."""
        google_enabled = bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)
        gmail_enabled = self.GMAIL_ENABLED and bool(
            self.GMAIL_CLIENT_ID and self.GMAIL_CLIENT_SECRET
        )
        return google_enabled or gmail_enabled

    def validate_runtime_secrets(self) -> None:
        """Fail fast on configurations that would rely on a known default secret."""
        if self.oauth_requires_secure_session_secret() and self.uses_default_session_secret():
            raise RuntimeError(
                "OAuth is configured but SESSION_SECRET_KEY is still set to the insecure default. "
                "Set a strong, unique SESSION_SECRET_KEY before starting the API."
            )

    @field_validator("SESSION_COOKIE_SAMESITE", mode="before")
    @classmethod
    def normalize_session_cookie_samesite(cls, v: object) -> str:
        if v is None:
            return "lax"
        normalized = str(v).strip().lower()
        if normalized not in {"lax", "strict", "none"}:
            raise ValueError("SESSION_COOKIE_SAMESITE must be one of: lax, strict, none")
        return normalized


settings = Settings()
