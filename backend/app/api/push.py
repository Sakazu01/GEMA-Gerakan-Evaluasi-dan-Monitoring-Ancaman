import base64
from datetime import datetime, timedelta
from urllib.parse import urlsplit

from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import settings
from app.deps.auth import require_user
from app.services.clock import utcnow
from app.services.quota import enforce_quota
from app.services.supabase_client import get_client

router = APIRouter(tags=["push"])


class SubscriptionRequest(BaseModel):
    model_config = {"extra": "forbid"}
    endpoint: str = Field(max_length=2048)
    keys: dict[str, str]
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    location_mode: str = Field(pattern="^(device|area)$")
    location_updated_at: datetime
    accuracy_m: float | None = Field(default=None, ge=0, le=100000)


def valid_endpoint(endpoint: str) -> bool:
    try:
        url = urlsplit(endpoint)
        allowed = {host.strip() for host in settings.push_allowed_hosts.split(",")}
        return url.scheme == "https" and url.hostname in allowed and not url.username and not url.password and url.port in (None,443) and not url.fragment
    except ValueError:
        return False


@router.get("/push/config")
def config():
    return {"enabled": settings.push_enabled and bool(settings.vapid_public_key and settings.vapid_private_key), "public_key": settings.vapid_public_key if settings.push_enabled else None}


@router.post("/push/subscriptions")
def subscribe(body: SubscriptionRequest, request: Request, user_id: str = Depends(require_user)):
    enforce_quota(request, user_id, "push")
    if not settings.push_enabled or not settings.vapid_private_key:
        raise HTTPException(503, "Notifikasi push belum dikonfigurasi")
    try:
        valid = valid_endpoint(body.endpoint)
        auth = base64.urlsafe_b64decode(body.keys["auth"] + "===")
        key = base64.urlsafe_b64decode(body.keys["p256dh"] + "===")
        ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), key)
        valid = valid and len(auth) == 16 and len(key) == 65 and set(body.keys) == {"auth","p256dh"}
    except (ValueError, KeyError):
        valid = False
    if not valid:
        raise HTTPException(422, "Subscription tidak valid atau provider belum didukung")
    now = utcnow()
    updated = body.location_updated_at
    if not updated.tzinfo or updated > now+timedelta(minutes=5) or updated < now-timedelta(days=30):
        raise HTTPException(422, "Perbarui lokasi/area pemantauan")
    if body.location_mode == "device" and (updated < now-timedelta(minutes=settings.device_location_max_age_min) or body.accuracy_m is None or body.accuracy_m>100):
        raise HTTPException(422, "Lokasi perangkat perlu diperbarui")
    from app.services.reports import rpc
    rpc("save_push_subscription",{"p_user":user_id,"p_payload":body.model_dump(mode="json")})
    return {"subscribed": True}


class UnsubscribeRequest(BaseModel):
    endpoint: str = Field(max_length=2048)


@router.delete("/push/subscriptions")
def unsubscribe(body: UnsubscribeRequest, user_id: str = Depends(require_user)):
    get_client().table("push_subscriptions").delete().eq("user_id",user_id).eq("endpoint",body.endpoint).execute()
    return {"unsubscribed": True}
