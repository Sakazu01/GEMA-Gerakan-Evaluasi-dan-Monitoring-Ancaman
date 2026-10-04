"""Read-only configuration/service checks. Never prints credentials or report data."""
import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from dotenv import dotenv_values

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import settings  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


def configuration():
    front = dotenv_values(ROOT / "frontend" / ".env.local")
    return {
        "backend": {name: bool(getattr(settings, name)) for name in (
            "supabase_url", "supabase_secret_key", "rate_limit_salt", "model_api_key",
            "tele_api", "tele_chat_id", "telegram_webhook_secret", "vapid_private_key", "vapid_public_key")},
        "frontend": {name: bool(front.get(name)) for name in (
            "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")},
        "flags": {"demo": settings.demo_mode, "worker": settings.worker_enabled, "push": settings.push_enabled},
    }


def live_checks():
    if not settings.supabase_url or not settings.supabase_secret_key:
        return {"supabase": {"available": False, "code": "configuration_missing"}}
    parsed = urlsplit(settings.supabase_url)
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1")):
        return {"supabase": {"available": False, "code": "secure_url_required"}}
    paths = {
        "reports_schema": ("/rest/v1/reports", {"select": "id,status,observed_at,expires_at,verification_status,reported_type,photo_source,closed_at", "limit": "0"}),
        "observations_schema": ("/rest/v1/observations", {"select": "report_id,user_id,value,source,received_at", "limit": "0"}),
        "outbox_schema": ("/rest/v1/notification_outbox", {"select": "id,state,attempts,lease_until", "limit": "0"}),
        "moderator_roles_schema": ("/rest/v1/user_roles", {"select": "role", "limit": "0"}),
        "private_photo_bucket": ("/storage/v1/bucket/report-photos", None),
    }
    headers = {"apikey": settings.supabase_secret_key, "Authorization": f"Bearer {settings.supabase_secret_key}"}
    result = {}
    with httpx.Client(timeout=8, follow_redirects=False, trust_env=False) as client:
        for name, (path, params) in paths.items():
            try:
                response = client.get(settings.supabase_url.rstrip("/") + path, headers=headers, params=params)
                try:
                    body = response.json()
                except ValueError:
                    body = {}
                check = {"available": response.is_success, "http_status": response.status_code}
                if not response.is_success and isinstance(body, dict):
                    # Provider codes only; messages can contain URLs, credentials or private data.
                    code = body.get("code")
                    if isinstance(code, str) and code.isalnum() and len(code) < 40:
                        check["code"] = code
                if name == "private_photo_bucket" and response.is_success:
                    check["private"] = isinstance(body, dict) and body.get("public") is False
                result[name] = check
            except httpx.HTTPError as error:
                message = str(error).casefold()
                code = "dns_unavailable" if "getaddrinfo" in message or "name or service not known" in message else "tls_verification_failed" if "certificate_verify_failed" in message else "network_unavailable"
                result[name] = {"available": False, "code": code}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="GET-only checks against the configured Supabase")
    args = parser.parse_args()
    report = {"configuration": configuration()}
    if args.live:
        report["services"] = live_checks()
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
