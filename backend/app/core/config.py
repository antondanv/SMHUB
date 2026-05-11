from pathlib import Path
from typing import Optional

from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "SMHUB"
    app_env: str = "development"

    # Ищем либо DATABASE_URL, либо STORAGE_DATABASE_URL (который создает Vercel для Neon)
    database_url: str = Field(validation_alias=AliasChoices("database_url", "storage_database_url"))
    
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
