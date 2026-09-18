"""Daftarkan webhook dari backend/.env: python set_telegram_webhook.py https://api.example.com"""

import sys
from urllib.parse import urlparse

from app.core.config import settings
from app.services.telegram import _call

if __name__ == "__main__":
    if len(sys.argv) != 2 or urlparse(sys.argv[1]).scheme != "https" or not urlparse(sys.argv[1]).netloc:
        raise SystemExit("Gunakan URL dasar backend HTTPS publik, misalnya https://api.example.com")
    if not settings.tele_api or not settings.tele_chat_id or not settings.telegram_webhook_secret:
        raise SystemExit("Isi TELE_API, TELE_CHAT_ID, dan TELEGRAM_WEBHOOK_SECRET di backend/.env")
    url = sys.argv[1].rstrip("/") + "/api/telegram/webhook"
    _call("setWebhook", {
        "url": url,
        "secret_token": settings.telegram_webhook_secret,
        "allowed_updates": ["callback_query"],
    })
    print(f"Webhook Telegram terpasang: {url}")
