"""Small persistent outbox worker; disabled until explicitly configured."""
import logging
from datetime import timedelta
from app.core.config import settings
from app.services.clock import utcnow
from app.services.supabase_client import get_client
from app.services import telegram

logger = logging.getLogger(__name__)


def deliver_telegram(job: dict):
    client = get_client()
    try:
        telegram.notify_report(job["report_id"])
    except telegram.TelegramError as error:
        ambiguous = getattr(error, "ambiguous", False)
        state = "unknown" if ambiguous else "failed" if job["attempts"] >= 5 else "retry"
        client.table("notification_outbox").update({
            "state": state, "last_error_code": "ambiguous_delivery" if ambiguous else "provider_unavailable",
            "next_attempt_at": (utcnow()+timedelta(seconds=min(3600, 30*2**job["attempts"]))).isoformat(), "lease_until": None,
        }).eq("id",job["id"]).eq("state","sending").execute()
    except Exception:
        # This includes persistence failure AFTER sending: never silently send it again.
        client.table("notification_outbox").update({"state":"unknown","last_error_code":"persistence_or_delivery_unknown","lease_until":None}).eq("id",job["id"]).execute()
    else:
        client.table("notification_outbox").update({"state":"sent","last_error_code":None,"lease_until":None}).eq("id",job["id"]).execute()


def cleanup():
    client = get_client()
    client.rpc("expire_reports").execute()
    client.rpc("queue_media_cleanup").execute()
    for job in client.table("media_cleanup_jobs").select("path,attempts").limit(50).execute().data:
        try:
            client.storage.from_("report-photos").remove([job["path"]])
            client.table("media_cleanup_jobs").delete().eq("path",job["path"]).execute()
        except Exception:
            client.table("media_cleanup_jobs").update({"attempts":job["attempts"]+1}).eq("path",job["path"]).execute()


def tick():
    cleanup()
    if settings.tele_api and settings.tele_chat_id:
        for job in get_client().rpc("claim_outbox",{"p_channel":"telegram","p_limit":10}).execute().data:
            deliver_telegram(job)
    if settings.push_enabled:
        from app.services.push import deliver_push
        for job in get_client().rpc("claim_outbox",{"p_channel":"push","p_limit":10}).execute().data:
            deliver_push(job)
