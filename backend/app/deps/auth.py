from fastapi import Header, HTTPException


async def require_user(authorization: str | None = Header(default=None)) -> str:
    """Ambil id pengguna dari header Authorization.

    ponytail: SEMENTARA token Bearer dipakai apa adanya sebagai id pengguna, TANPA
    verifikasi — artinya siapa pun bisa ngaku jadi siapa pun. Ini cuma supaya endpoint
    /api/my-reports bisa diuji sebelum login ada (PRD §6: identitas belum dibangun).
    Ganti dengan verifikasi JWT Supabase sungguhan begitu login masuk.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sesi belum tersedia")
    user_id = authorization.split(" ", 1)[1].strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Sesi belum tersedia")
    return user_id
