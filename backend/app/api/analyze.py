import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.deps.auth import require_user
from app.services import model as model_service
from app.services import reports as reports_service

router = APIRouter(tags=["analyze"])
logger = logging.getLogger(__name__)

MAX_BYTES = 3 * 1024 * 1024  # PRD §11: satu foto, maksimal 3 MB.
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
# Tanda tangan byte, biar tidak cuma percaya Content-Type dari klien.
_MAGIC = {
    "image/jpeg": lambda b: b[:3] == b"\xff\xd8\xff",
    "image/png": lambda b: b[:8] == b"\x89PNG\r\n\x1a\n",
    "image/webp": lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP",
}


@router.post("/analyze")
def analyze(photo: UploadFile, user_id: str = Depends(require_user)):
    if photo.content_type not in ALLOWED_MIME:
        raise HTTPException(400, "Format foto harus JPEG, PNG, atau WebP.")

    data = photo.file.read()
    if not data:
        raise HTTPException(400, "Berkas foto kosong.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Ukuran foto melebihi 3 MB.")
    if not _MAGIC[photo.content_type](data):
        raise HTTPException(400, "Isi berkas tidak cocok dengan format yang diklaim.")

    try:
        result = model_service.analyze_photo(data, photo.content_type)
    except Exception as error:
        # Catat jenis/kode galat saja; jangan log kunci, prompt, atau isi foto.
        logger.warning("Analisis AI gagal: %s (kode=%s)", type(error).__name__, getattr(error, "code", "-"))
        raise HTTPException(503, "Analisis belum tersedia. Coba lagi nanti.") from None

    # Server tidak percaya begitu saja keluaran model (PRD §5).
    relevan = (
        result.validity == "relevant"
        and result.disaster_type in {"flood", "landslide", "fire"}
        and result.severity in {"rendah", "sedang", "tinggi", "kritis"}
        and result.summary_id
        and len(result.summary_id) <= 240
    )
    if not relevan:
        # Tanpa ringkasan, tanpa draft, tanpa foto tersimpan (PRD §9.1).
        validity = result.validity if result.validity != "relevant" else "uncertain"
        return {"validity": validity, "reason": result.reason_id[:120]}

    try:
        draft_id = reports_service.create_draft(user_id, result, data, photo.content_type)
    except Exception:
        logger.exception("Gagal menyimpan draft hasil analisis")
        raise HTTPException(503, "Analisis selesai, tetapi draf gagal disimpan. Hubungi pengelola.")
    return {
        "validity": "relevant",
        "draft_id": draft_id,
        "type": result.disaster_type,
        "severity": result.severity,
        "summary": result.summary_id,
        "reason": result.reason_id[:120],
    }
