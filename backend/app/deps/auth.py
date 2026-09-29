from fastapi import Header, HTTPException

# ponytail: stub 401-only, belum verifikasi JWT sungguhan. Upgrade path: Checkpoint 6.
async def require_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Sesi anonim belum tersedia")
    raise NotImplementedError("Verifikasi JWT belum diimplementasikan (Checkpoint 6)")
