import os
from pathlib import Path

from pydantic import Field, AliasChoices, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "SMHUB"
    app_env: str = "development"
    auto_db_bootstrap: bool = True
    admin_registration_secret: str = ""
    first_admin_email: str = ""
    first_admin_password: str = ""
    first_admin_username: str = ""

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

    resend_api_key: str = ""
    resend_from: str = "onboarding@resend.dev"

    frontend_base_url: str = "http://localhost:5173"
    email_confirm_ttl_hours: int = 24
    password_reset_ttl_hours: int = 1

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def on_vercel(self) -> bool:
        """Запущены ли мы внутри Vercel-деплоя.

        Vercel всегда выставляет ``VERCEL=1`` в окружении функции. Локально
        (dev-сервер, docker) этой переменной нет, поэтому флаг удобно
        использовать, чтобы отличать «боевой» деплой от локального стенда.
        """
        return os.environ.get("VERCEL") == "1"

    @property
    def seed_demo_metrics(self) -> bool:
        """Заполнять ли seed-материалы накрученными метриками.

        Локально оставляем демонстрационные просмотры/лайки/рейтинги, а на
        Vercel стартуем «с нуля», как на реальном деплое.
        """
        return not self.on_vercel


settings = Settings()
