from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SMHUB"
    APP_ENV: str = "development"
    
    database_url: str = "postgresql://postgres:postgres@localhost:5432/smhub_db"
    
    SECRET_KEY: str = "change_me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
