"""Notifikasi Telegram setelah laporan diterbitkan; token hanya dipakai di backend."""

import json
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from app.core.config import settings
from app.services.supabase_client import get_client

WIB = timezone(timedelta(hours=7))
TYPE_NAMES = {"flood": "Banjir", "landslide": "Tanah longsor", "fire": "Kebakaran"}


class TelegramError(Exception):
    pass


def _call(method: str, payload: dict[str, Any]) -> Any:
    if not settings.tele_api:
        raise TelegramError("TELE_API belum diisi")
    request = Request(
        f"https://api.telegram.org/bot{settings.tele_api}/{method}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=8) as response:
            result = json.load(response)
    except (URLError, TimeoutError, ValueError) as error:
        # Exception urllib dapat mengandung URL (dan token); jangan teruskan pesannya ke log.
        raise TelegramError(f"{method} gagal ({type(error).__name__})") from None
    if not result.get("ok"):
        raise TelegramError(f"{method} ditolak Telegram ({result.get('error_code', 'unknown')})")
    return result["result"]


def _wib(value: str | datetime | None) -> str:
    if not value:
        return "Waktu tidak tersedia"
    moment = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace("Z", "+00:00"))
    return moment.astimezone(WIB).strftime("%d-%m-%Y %H:%M WIB")


def _message(row: dict[str, Any]) -> str:
    lines = [
        "🚨 LAPORAN BENCANA BARU",
        "Laporan warga — belum diverifikasi",
        f"ID: {row['id']}",
        "",
        f"Jenis bencana: {TYPE_NAMES.get(row['type'], row['type'])}",
        f"Keparahan: {row['severity'].capitalize()}",
        f"Lokasi: {row['location_label']}",
        f"Waktu: {_wib(row['published_at'])}",
        "",
        "Analisis AI berdasarkan foto:",
        row["ai_summary"],
    ]
    if row.get("description"):
        lines += ["", "Keterangan warga:", row["description"]]
    if row.get("responder_status") == "ACCEPTED":
        lines += ["", "Status: 🟢 LAPORAN DITERIMA",
                  f"Diterima oleh: {row.get('accepted_by') or 'Petugas'}",
                  f"Waktu: {_wib(row.get('accepted_at'))}"]
    else:
        lines += ["", "Status: 🟡 MENUNGGU PETUGAS"]
    return "\n".join(lines)


def notify_report(report_id: str) -> None:
    if not settings.tele_chat_id:
        raise TelegramError("TELE_CHAT_ID belum diisi")
    result = (
        get_client().table("reports")
        .select("id, status, type, severity, location_label, published_at, ai_summary, description, telegram_message_id")
        .eq("id", report_id).limit(1).execute()
    )
    if not result.data or result.data[0]["status"] != "active":
        return
    row = result.data[0]
    if row.get("telegram_message_id"):
        return
    sent = _call("sendMessage", {
        "chat_id": settings.tele_chat_id,
        "text": _message(row),
        "link_preview_options": {"is_disabled": True},
        "reply_markup": {"inline_keyboard": [[{
            "text": "✅ TERIMA LAPORAN",
            "callback_data": f"accept_report:{report_id}",
        }]]},
    })
    # Laporan sudah disimpan. Bila pencatatan ID pesan gagal, error hanya tercatat
    # oleh route; warga tetap mendapat respons sukses dari submit.
    get_client().table("reports").update({
        "telegram_chat_id": str(sent["chat"]["id"]),
        "telegram_message_id": sent["message_id"],
    }).eq("id", report_id).eq("status", "active").is_("telegram_message_id", "null").execute()


def accept_report(report_id: str, chat_id: str, message_id: int, responder: str) -> tuple[dict[str, Any] | None, bool]:
    """UPDATE bersyarat Postgres: hanya satu callback yang bisa mengubah PENDING."""
    patch = {
        "responder_status": "ACCEPTED",
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "accepted_by": responder[:160],
    }
    table = get_client().table("reports")
    result = (table.update(patch).eq("id", report_id).eq("status", "active")
              .eq("responder_status", "PENDING").eq("telegram_chat_id", chat_id)
              .eq("telegram_message_id", message_id).execute())
    if result.data:
        return result.data[0], True
    existing = (get_client().table("reports").select("*").eq("id", report_id)
                .eq("telegram_chat_id", chat_id).eq("telegram_message_id", message_id)
                .limit(1).execute())
    if existing.data and existing.data[0]["responder_status"] == "ACCEPTED":
        return existing.data[0], False
    return None, False


def answer_callback(callback_id: str, text: str) -> None:
    _call("answerCallbackQuery", {"callback_query_id": callback_id, "text": text})


def edit_accepted_message(row: dict[str, Any]) -> None:
    _call("editMessageText", {
        "chat_id": row["telegram_chat_id"],
        "message_id": row["telegram_message_id"],
        "text": _message(row),
        "link_preview_options": {"is_disabled": True},
        "reply_markup": {"inline_keyboard": []},
    })
