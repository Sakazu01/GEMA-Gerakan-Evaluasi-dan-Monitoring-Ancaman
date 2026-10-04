from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request
from supabase_auth.errors import AuthApiError

from app.services.supabase_client import get_client


def require_user(request: Request, authorization: str | None = Header(default=None)) -> str:
    """Validate the JWT at Supabase Auth, never trust a client-supplied identity."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sesi belum tersedia")
    token = authorization.split(" ", 1)[1].strip()
    if len(token) > 8192 or token.count(".") != 2:
        raise HTTPException(401, "Sesi tidak sah")
    try:
        response = get_client().auth.get_user(token)
        user = response.user
        if not user:
            raise ValueError("missing_user")
        user_id = str(UUID(str(user.id)))
    except AuthApiError:
        raise HTTPException(401, "Sesi tidak sah atau kedaluwarsa") from None
    except ValueError:
        raise HTTPException(401, "Sesi tidak sah") from None
    except Exception:
        raise HTTPException(503, "Verifikasi sesi belum tersedia. Coba lagi.") from None
    request.state.auth_user = user
    return user_id


def require_moderator(request: Request, user_id: str = Depends(require_user)) -> str:
    if getattr(request.state.auth_user, "is_anonymous", True):
        raise HTTPException(403, "Gunakan akun pengelola permanen")
    try:
        rows = get_client().table("user_roles").select("role").eq("user_id", user_id).eq("role", "moderator").execute().data
    except Exception:
        raise HTTPException(503, "Hak akses belum dapat diperiksa") from None
    if not rows:
        raise HTTPException(403, "Akses pengelola diperlukan")
    return user_id


def require_staff(request: Request, user_id: str = Depends(require_user)) -> str:
    """Permanent government/responder account for private read-only evidence."""
    if getattr(request.state.auth_user, "is_anonymous", True):
        raise HTTPException(403, "Gunakan akun petugas permanen")
    try:
        rows = get_client().table("user_roles").select("role").eq("user_id", user_id).in_("role", ["moderator", "responder"]).execute().data
    except Exception:
        raise HTTPException(503, "Hak akses belum dapat diperiksa") from None
    if not rows:
        raise HTTPException(403, "Akses petugas diperlukan")
    return user_id
