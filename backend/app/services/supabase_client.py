from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache(maxsize=1)
def get_client() -> Client:
    """Klien Supabase pakai secret key — hanya di backend, tidak pernah di frontend."""
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SECRET_KEY belum diisi di backend/.env")
    return create_client(settings.supabase_url, settings.supabase_secret_key)
