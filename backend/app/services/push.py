"""Optional push delivery; never assumes continuous background browser GPS."""
import json
from datetime import timedelta

import requests
from pywebpush import webpush, WebPushException

from app.api.push import valid_endpoint
from app.core.config import settings
from app.services import reports
from app.services.clock import utcnow
from app.services.rules import haversine_distance_m
from app.services.supabase_client import get_client
from app.services.trust import active_public, moment, notice_radius


class NoRedirectSession(requests.Session):
    def request(self, method, url, **kwargs):
        kwargs["allow_redirects"] = False
        return super().request(method, url, **kwargs)


def deliver_push(job: dict):
    client = get_client()
    report = reports.get_row(job["report_id"])
    now = utcnow()
    # A newer decision supersedes an older queued notification.
    if not report or job.get("payload", {}).get("version") != report["version"]:
        client.table("notification_outbox").update({"state": "sent", "lease_until": None,
            "last_error_code": "superseded"}).eq("id", job["id"]).execute()
        return
    eligible = active_public(report, now) and notice_radius(report) is not None
    correction = not eligible
    offset = 0
    ambiguous = False
    failed = False
    while True:
        batch = client.table("push_subscriptions").select("*").eq("enabled", True).order("id").range(offset, offset+99).execute().data
        for sub in batch:
            previous = client.table("push_deliveries").select("state,sent_at,report_version").eq("subscription_id", sub["id"]).eq("report_id", report["id"]).order("created_at", desc=True).limit(1).execute().data
            if correction and not previous:
                continue
            if not correction:
                updated = moment(sub["location_updated_at"])
                age = timedelta(minutes=settings.device_location_max_age_min) if sub["location_mode"] == "device" else timedelta(days=30)
                if not updated or updated > now+timedelta(minutes=5) or updated < now-age or (sub["location_mode"] == "device" and (sub.get("accuracy_m") is None or sub["accuracy_m"] > 100)):
                    continue
                if haversine_distance_m(sub["lat"], sub["lng"], report["lat"], report["lng"]) > notice_radius(report):
                    continue
                # Each queued version is a publication or a moderator/status update.
                # A downgrade back to unconfirmed is also a material correction.
                # Per-version recipient claims deduplicate retries; do not suppress corrections.
            if not valid_endpoint(sub["endpoint"]):
                continue
            claimed = reports.rpc("claim_push_delivery", {"p_subscription": sub["id"], "p_report": report["id"], "p_version": report["version"]})
            if not claimed:
                state = client.table("push_deliveries").select("state").eq("subscription_id", sub["id"]).eq("report_id", report["id"]).eq("report_version", report["version"]).execute().data
                ambiguous = ambiguous or bool(state and state[0]["state"] in ("unknown", "sending"))
                continue
            verification_label = {
                "confirmed": "Dikonfirmasi petugas",
                "under_review": "Sedang ditinjau",
            }.get(report.get("verification_status"), "Belum dikonfirmasi")
            payload = {
                "title": "Pembaruan laporan GEMA" if correction else "Ada laporan di area yang Anda pantau",
                "body": "Status laporan berubah. Baca informasi terbaru." if correction else f"{verification_label}. Ada laporan dalam radius 500 meter. Buka detail lalu pilih Konfirmasi atau Palsu berdasarkan pemeriksaan langsung.",
                "url": f"/report/{report['id']}", "tag": f"gema:{report['id']}",
            }
            state, error_code = "sent", None
            try:
                with NoRedirectSession() as session:
                    session.trust_env = False
                    response = webpush({"endpoint": sub["endpoint"], "keys": sub["keys"]}, json.dumps(payload),
                        vapid_private_key=settings.vapid_private_key, vapid_claims={"sub": settings.vapid_subject},
                        timeout=8, ttl=300, requests_session=session)
                    if not 200 <= response.status_code < 300:
                        state, error_code = "failed", f"http_{response.status_code}"
            except WebPushException as error:
                if error.response is not None and error.response.status_code in (404, 410):
                    client.table("push_subscriptions").update({"enabled": False}).eq("id", sub["id"]).execute()
                    state, error_code = "failed", "subscription_expired"
                else:
                    state = "unknown" if error.response is None else "failed"
                    error_code = "network_unknown" if error.response is None else f"http_{error.response.status_code}"
            except Exception:
                state, error_code = "unknown", "network_unknown"
            ambiguous = ambiguous or state == "unknown"
            failed = failed or (state == "failed" and error_code != "subscription_expired")
            client.table("push_deliveries").update({"state": state, "sent_at": now.isoformat() if state == "sent" else None,
                "lease_until": None, "last_error_code": error_code}).eq("subscription_id", sub["id"]).eq("report_id", report["id"]).eq("report_version", report["version"]).execute()
        if len(batch) < 100:
            break
        offset += 100
    final_state = "unknown" if ambiguous else ("retry" if failed and job["attempts"] < 5 else "failed" if failed else "sent")
    client.table("notification_outbox").update({
        "state": final_state, "lease_until": None,
        "next_attempt_at": (now+timedelta(seconds=min(900, 30*2**job["attempts"]))).isoformat(),
        "last_error_code": "delivery_unknown" if ambiguous else "provider_rejected" if failed else None,
    }).eq("id", job["id"]).execute()
