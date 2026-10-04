"""Telegram triage with provenance and nearby-community evidence."""

import json
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings
from app.services.clock import utcnow
from app.services.supabase_client import get_client
from app.services.trust import observation_counts

WIB = timezone(timedelta(hours=7))
TYPE_NAMES = {"flood": "Banjir", "landslide": "Tanah longsor", "fire": "Kebakaran"}


class TelegramError(Exception):
    def __init__(self, message: str, ambiguous: bool = False):
        self.ambiguous = ambiguous
        super().__init__(message)


def _call(method: str, payload: dict[str, Any]) -> Any:
    if not settings.tele_api:
        raise TelegramError("TELE_API belum diisi")
    request = Request(f"https://api.telegram.org/bot{settings.tele_api}/{method}",
        data=json.dumps(payload).encode("utf-8"), headers={"Content-Type":"application/json"}, method="POST")
    try:
        with urlopen(request, timeout=8) as response:
            result=json.load(response)
    except HTTPError as error:
        try:detail=json.loads(error.read()).get("description","tidak ada detail dari Telegram")
        except Exception:detail="gagal membaca body error dari Telegram"
        raise TelegramError(f"{method} gagal (HTTP {error.code}): {detail}") from None
    except (URLError,TimeoutError,ValueError) as error:
        raise TelegramError(f"{method} gagal ({type(error).__name__})",ambiguous=True) from None
    if not result.get("ok"):
        raise TelegramError(f"{method} ditolak Telegram ({result.get('error_code','unknown')}: {result.get('description','-')})")
    return result["result"]


def _wib(value: str | datetime | None) -> str:
    if not value:return "Waktu tidak tersedia"
    moment=value if isinstance(value,datetime) else datetime.fromisoformat(value.replace("Z","+00:00"))
    return moment.astimezone(WIB).strftime("%d-%m-%Y %H:%M WIB")


def _report_with_evidence(report_id: str) -> dict[str, Any] | None:
    from app.services import reports
    row=reports.get_row(report_id)
    if not row:return None
    internal=[]
    matches=get_client().table("report_matches").select("matched_report_id,match_method,score,hamming_distance").eq("report_id",report_id).order("score",desc=True).limit(settings.provenance_result_limit).execute().data
    for match in matches:
        compared=reports.get_row(match["matched_report_id"])
        internal.append({**match,"location_label":compared.get("location_label") if compared else None,
            "observed_at":compared.get("observed_at") if compared else None,
            "published_at":compared.get("published_at") if compared else None})
    web=get_client().table("web_image_matches").select("source_page_url,source_image_url,title,match_type,score").eq("report_id",report_id).order("score",desc=True).limit(settings.provenance_result_limit).execute().data
    if internal and any(item["match_method"]=="sha256" for item in internal):label="Foto sama dengan laporan GEMA sebelumnya"
    elif internal:label="Foto mirip dengan laporan GEMA sebelumnya"
    elif web:label="Gambar mirip ditemukan di internet; perlu pemeriksaan petugas"
    elif row.get("provenance_status")=="complete":label="Tidak ditemukan kecocokan pada sumber yang diperiksa"
    else:label="Pemeriksaan foto belum tersedia"
    row["evidence"]={"label":label,"internal":internal,"web":web}
    row["community_counts"]=observation_counts(row,utcnow())
    return row


def _message(row: dict[str, Any]) -> str:
    reported_type=row.get("reported_type") or row.get("type")
    lines=["🚨 LAPORAN BENCANA BARU","Laporan warga — bukti untuk keputusan petugas",f"ID: {row['id']}","",
        f"Jenis menurut pelapor: {TYPE_NAMES.get(reported_type,reported_type) or 'belum dinyatakan'}",
        f"Indikasi visual AI: {row.get('severity') or 'belum tersedia'}",f"Lokasi: {row.get('location_label') or 'belum tersedia'}",
        f"Diamati: {_wib(row.get('observed_at'))}",f"Dikirim: {_wib(row.get('published_at'))}","","Analisis AI berdasarkan foto:",
        row.get("ai_summary") or "Analisis belum tersedia; laporan tetap diteruskan."]
    if row.get("ai_confidence"):lines.append(f"Keyakinan visual: {row['ai_confidence']}")
    if row.get("ai_limitations"):lines.append(f"Batas analisis: {row['ai_limitations']}")
    if row.get("description"):lines += ["","Keterangan warga:",row["description"]]
    evidence=row.get("evidence") or {}
    lines += ["","Pemeriksaan foto:",evidence.get("label") or "Pemeriksaan belum tersedia"]
    for item in (evidence.get("internal") or [])[:3]:
        lines.append(f"• GEMA {item['matched_report_id'][:8]} · {round(item['score']*100)}% · {item.get('location_label') or 'lokasi tidak tersedia'} · {_wib(item.get('observed_at') or item.get('published_at'))}")
    for item in (evidence.get("web") or [])[:3]:
        lines.append(f"• Web {round(item['score']*100)}% · {item.get('title') or item.get('source_page_url') or item.get('source_image_url')}")
    counts=row.get("community_counts") or {}
    lines += ["",f"Warga radius 500 m: {counts.get('direct_seen_nearby',0)} Konfirmasi · {counts.get('direct_not_observed_nearby',0)} Palsu"]
    if row.get("status")=="held":lines += ["","⚠️ Status bukti: diragukan/perlu pemeriksaan petugas"]
    if row.get("responder_status")=="ACCEPTED":
        lines += ["","Status: 🟢 LAPORAN DITERIMA",f"Diterima oleh: {row.get('accepted_by') or 'Petugas'}",f"Waktu: {_wib(row.get('accepted_at'))}"]
    else:lines += ["","Status: 🟡 MENUNGGU PETUGAS"]
    return "\n".join(lines)[:4000]


def _keyboard(row: dict[str, Any]) -> dict[str, Any]:
    buttons=[]
    if row.get("responder_status")!="ACCEPTED":buttons.append({"text":"✅ TERIMA LAPORAN","callback_data":f"accept_report:{row['id']}"})
    if settings.public_app_url:buttons.append({"text":"🔎 LIHAT BUKTI","url":settings.public_app_url.rstrip('/')+f"/pengelola/{row['id']}"})
    return {"inline_keyboard":[buttons] if buttons else []}


def notify_report(report_id: str) -> None:
    if not settings.tele_chat_id:raise TelegramError("TELE_CHAT_ID belum diisi")
    row=_report_with_evidence(report_id)
    if not row or row["status"] not in ("active","held") or row.get("is_demo"):return
    payload={"chat_id":settings.tele_chat_id,"text":_message(row),"link_preview_options":{"is_disabled":True},"reply_markup":_keyboard(row)}
    if row.get("telegram_message_id"):
        payload.update({"chat_id":row["telegram_chat_id"],"message_id":row["telegram_message_id"]})
        _call("editMessageText",payload);return
    sent=_call("sendMessage",payload)
    get_client().table("reports").update({"telegram_chat_id":str(sent["chat"]["id"]),"telegram_message_id":sent["message_id"]}).eq("id",report_id).in_("status",["active","held"]).is_("telegram_message_id","null").execute()


def answer_callback(callback_id: str,text: str) -> None:
    _call("answerCallbackQuery",{"callback_query_id":callback_id,"text":text})


def edit_accepted_message(row: dict[str, Any]) -> None:
    notify_report(row["id"])
