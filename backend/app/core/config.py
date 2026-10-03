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
    community_enabled: bool = True
    confirmation_radius_m: int = 500
    report_active_ttl_hours: int = 12
    observation_freshness_min: int = 30
    device_location_max_age_min: int = 10
    max_photo_bytes: int = 10 * 1024 * 1024
    rate_limit_salt: str = ""
    model_daily_budget: int = 200
    worker_enabled: bool = False
    worker_interval_seconds: int = 15
    telegram_responder_ids: str = ""
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_subject: str = "mailto:admin@example.com"
    push_enabled: bool = False
    push_allowed_hosts: str = "fcm.googleapis.com,updates.push.services.mozilla.com,web.push.apple.com"


settings = Settings()
