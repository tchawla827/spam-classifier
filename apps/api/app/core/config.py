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
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
