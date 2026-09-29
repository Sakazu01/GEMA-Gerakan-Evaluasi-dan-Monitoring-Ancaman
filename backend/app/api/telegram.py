"""Webhook Telegram khusus callback tombol penerimaan laporan."""

import logging
from secrets import compare_digest
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException

from app.core.config import settings
from app.services import telegram as telegram_service

router = APIRouter(tags=["telegram"])
logger = logging.getLogger(__name__)


@router.post("/telegram/webhook")
def telegram_webhook(
    update: dict[str, Any],
    secret: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
) -> dict[str, bool]:
    if not settings.telegram_webhook_secret:
        raise HTTPException(503, "Webhook Telegram belum dikonfigurasi")
    if not secret or not compare_digest(secret, settings.telegram_webhook_secret):
        raise HTTPException(403, "Webhook Telegram tidak sah")

    callback = update.get("callback_query")
    if not isinstance(callback, dict) or not isinstance(callback.get("id"), str):
        return {"ok": True}  # Telegram bisa mengirim update lain; hanya callback yang relevan.

    answer = "Tombol tidak valid"
    try:
        data = callback.get("data")
        message = callback.get("message")
        if not isinstance(data, str) or not data.startswith("accept_report:") or not isinstance(message, dict):
            return {"ok": True}
        try:
            report_id = str(UUID(data.removeprefix("accept_report:")))
        except ValueError:
            return {"ok": True}
        chat = message.get("chat")
        message_id = message.get("message_id")
        if (not isinstance(chat, dict) or str(chat.get("id")) != settings.tele_chat_id
                or not isinstance(message_id, int)):
            answer = "Pesan bukan dari grup responder"
            return {"ok": True}

        user = callback.get("from")
        if not isinstance(user, dict) or not isinstance(user.get("id"), int):
            return {"ok": True}
        name = user.get("username") or user.get("first_name") or "Petugas"
        responder = f"{name} (ID {user['id']})"
        row, changed = telegram_service.accept_report(
            report_id, settings.tele_chat_id, message_id, responder
        )
        if row is None:
            answer = "Laporan tidak tersedia untuk diterima"
            return {"ok": True}
        answer = "Laporan diterima" if changed else "Laporan sudah diterima"
        try:
            telegram_service.edit_accepted_message(row)
        except Exception as error:
            # Status DB sudah benar. Klik ulang masih bisa mencoba memperbaiki pesan.
            logger.warning("Gagal mengedit pesan Telegram laporan %s (%s)", report_id, type(error).__name__)
        return {"ok": True}
    except Exception:
        answer = "Gagal memproses laporan, coba lagi"
        raise
    finally:
        try:
            telegram_service.answer_callback(callback["id"], answer)
        except Exception as error:
            logger.warning("Gagal menjawab callback Telegram (%s)", type(error).__name__)
