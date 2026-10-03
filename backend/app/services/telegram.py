"""Notifikasi Telegram setelah laporan diterbitkan; token hanya dipakai di backend."""

import json
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings
from app.services.supabase_client import get_client

WIB = timezone(timedelta(hours=7))
TYPE_NAMES = {"flood": "Banjir", "landslide": "Tanah longsor", "fire": "Kebakaran"}


class TelegramError(Exception):
    def __init__(self, message: str, ambiguous: bool = False):
        self.ambiguous = ambiguous
        super().__init__(message)


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
    except HTTPError as error:
        # Telegram balas isi errornya sebagai JSON di body (bukan exception message) --
        # baca itu, bukan str(error)/error.url, supaya token di URL tidak pernah ke log.
        try:
            detail = json.loads(error.read()).get("description", "tidak ada detail dari Telegram")
        except Exception:
            detail = "gagal membaca body error dari Telegram"
        raise TelegramError(f"{method} gagal (HTTP {error.code}): {detail}") from None
    except (URLError, TimeoutError, ValueError) as error:
        # Exception urllib lain (mis. gagal konek/timeout) dapat mengandung URL (dan
        # token) di pesannya; jangan teruskan pesannya ke log, cukup jenis errornya.
        raise TelegramError(f"{method} gagal ({type(error).__name__})", ambiguous=True) from None
    if not result.get("ok"):
        raise TelegramError(f"{method} ditolak Telegram ({result.get('error_code', 'unknown')}: {result.get('description', '-')})")
    return result["result"]


def _wib(value: str | datetime | None) -> str:
    if not value:
        return "Waktu tidak tersedia"
    moment = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace("Z", "+00:00"))
    return moment.astimezone(WIB).strftime("%d-%m-%Y %H:%M WIB")


def _message(row: dict[str, Any]) -> str:
    reported_type = row.get("reported_type") or row.get("type")
    lines = [
        "LAPORAN WARGA UNTUK TRIASE",
        "Status bukti: " + row.get("verification_status", "unconfirmed"),
        f"ID: {row['id']}",
        "",
        f"Jenis menurut pelapor: {TYPE_NAMES.get(reported_type, reported_type) or 'belum dinyatakan'}",
        f"Indikasi visual AI: {row.get('severity') or 'belum tersedia'}",
        f"Lokasi: {row['location_label']}",
        f"Diamati: {_wib(row.get('observed_at'))}",
        f"Dikirim: {_wib(row.get('published_at'))}",
        "",
        "Analisis AI berdasarkan foto:",
        row.get("ai_summary") or "Analisis belum tersedia; laporan perlu ditinjau.",
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
        .select("id,status,type,reported_type,severity,location_label,published_at,observed_at,verification_status,ai_summary,description,telegram_message_id,is_demo")
        .eq("id", report_id).limit(1).execute()
    )
    if not result.data or result.data[0]["status"] not in ("active", "held") or result.data[0].get("is_demo"):
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
    }).eq("id", report_id).in_("status", ["active", "held"]).is_("telegram_message_id", "null").execute()


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
