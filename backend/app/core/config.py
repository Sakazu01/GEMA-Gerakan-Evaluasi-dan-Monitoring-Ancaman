from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env ada di backend/ sendiri (self-contained, gak bergantung struktur di luar folder ini).
# backend/app/core/config.py -> core -> app -> backend.
BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_ENV_FILE, extra="ignore")

    supabase_url: str = ""
    supabase_secret_key: str = ""
    model_api_key: str = ""
    demo_mode: bool = False
    cors_origins: str = "http://localhost:3000"
    tele_api: str = ""
    tele_chat_id: str = ""
    telegram_webhook_secret: str = ""


settings = Settings()
