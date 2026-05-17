from pathlib import Path

from pydantic import Field, AliasChoices, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "SMHUB"
    app_env: str = "development"
    auto_db_bootstrap: bool = True

    # Для Vercel/Neon предпочитаем direct/unpooled URL, если он доступен.
    database_url: str = Field(
        validation_alias=AliasChoices(
            "storage_database_url_unpooled",
            "storage_postgres_url_non_pooling",
            "postgres_url_non_pooling",
            "database_url",
            "postgres_url",
            "storage_database_url",
            "storage_postgres_url"
        )
    )

    @field_validator("database_url", mode="after")
    @classmethod
    def fix_postgres_url(cls, v: str) -> str:
        """SQLAlchemy требует postgresql:// вместо postgres://"""
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
