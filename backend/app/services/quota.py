"""Persistent atomic quotas. Raw IP addresses are never stored in buckets."""

import hashlib
import hmac

from fastapi import HTTPException, Request

from app.core.config import settings
from app.services.supabase_client import get_client

LIMITS = {"analyze": 5, "draft": 10, "submit": 3, "observation": 10, "abuse": 5, "chat": 10, "moderation": 30, "push": 10}


def enforce_quota(request: Request, user_id: str, scope: str) -> None:
    limit = LIMITS[scope]
    secret = settings.rate_limit_salt or settings.supabase_secret_key
    if not secret:
        raise HTTPException(503, "Layanan pembatasan belum dikonfigurasi")
    network = request.client.host if request.client else "unknown"
    digest = hmac.new(secret.encode(), network.encode(), hashlib.sha256).hexdigest()
    try:
        result = get_client().rpc("take_quota", {
            "p_scope": scope, "p_user": user_id, "p_network": digest,
            "p_limit": limit, "p_network_limit": limit * 20, "p_window_seconds": 600,
        }).execute().data
    except Exception:
        raise HTTPException(503, "Permintaan belum dapat diproses. Coba lagi.") from None
    if not result["allowed"]:
        retry = max(1, int(result["retry_after_seconds"]))
        raise HTTPException(429, "Terlalu banyak permintaan. Coba lagi setelah jeda.", headers={"Retry-After": str(retry)})


def enforce_model_budget():
    try:
        result = get_client().rpc("take_quota", {
            "p_scope": "model_daily", "p_user": "00000000-0000-0000-0000-000000000000", "p_network": "global",
            "p_limit": settings.model_daily_budget, "p_network_limit": settings.model_daily_budget,
            "p_window_seconds": 86400,
        }).execute().data
    except Exception:
        raise HTTPException(503, "Analisis belum tersedia; jalur laporan manual tetap tersedia.") from None
    if not result["allowed"]:
        raise HTTPException(429, "Analisis mencapai kapasitas harian; lanjutkan dengan laporan manual.", headers={"Retry-After": str(max(1,int(result["retry_after_seconds"])))})


def enforce_read_quota(request: Request):
    """Generous burst guard for expensive nearby reads; a failed quota store does not deny public data."""
    secret=settings.rate_limit_salt or settings.supabase_secret_key
    if not secret:return
    network=request.client.host if request.client else "unknown"
    digest=hmac.new(secret.encode(),network.encode(),hashlib.sha256).hexdigest()
    try:
        result=get_client().rpc("take_quota",{"p_scope":"read_nearby","p_user":"00000000-0000-0000-0000-000000000000",
            "p_network":digest,"p_limit":100000,"p_network_limit":2000,"p_window_seconds":60}).execute().data
    except Exception:return
    if not result["allowed"]:
        raise HTTPException(429,"Permintaan informasi sekitar terlalu sering. Coba lagi setelah jeda.",headers={"Retry-After":str(max(1,int(result["retry_after_seconds"])))})
