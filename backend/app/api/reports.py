import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.deps.auth import require_user
from app.schemas.report import ReportOut
from app.schemas.requests import PublishReportRequest
from app.services import reports as reports_service
from app.services import telegram as telegram_service

router = APIRouter(tags=["reports"])
logger = logging.getLogger(__name__)


class DensityPoint(BaseModel):
    lat: float
    lng: float
    count: int

# Handler sengaja `def` (bukan `async def`): klien Supabase sinkron, jadi biar FastAPI
# jalanin di threadpool dan event loop tidak ikut ke-block.


@router.get("/reports", response_model=list[ReportOut])
def list_reports(limit: int = 50):
    if not 1 <= limit <= 50:
        raise HTTPException(status_code=400, detail="limit harus antara 1 dan 50")
    return reports_service.list_active(limit)


@router.get("/reports/density", response_model=list[DensityPoint])
def list_report_density():
    return reports_service.list_density_points()


# Harus didaftarkan SEBELUM /reports/{report_id} -- kalau tidak, "all" bakal dicoba
# di-parse sebagai UUID oleh route di bawahnya dan gagal 422.
@router.get("/reports/all", response_model=list[ReportOut])
def list_all_reports(user_id: str = Depends(require_user)):
    """Dashboard Pemerintah (PRD §3): semua laporan yang sudah terbit, termasuk
    disputed_hidden -- bukan cuma yang aktif seperti GET /reports biasa.
    Butuh Bearer seperti endpoint lain -- sebelumnya endpoint ini kebuka tanpa
    token sama sekali, jadi laporan yang sudah disembunyikan karena disanggah
    warga bisa dibaca siapa pun (ditemukan review keamanan)."""
    return reports_service.list_all_for_monitoring()


@router.get("/reports/{report_id}", response_model=ReportOut)
def get_report(report_id: UUID):
    report = reports_service.get_active(str(report_id))
    if report is None:
        # Draft dan laporan tersembunyi dijawab 404 — jangan bocorkan keberadaannya (PRD §9.1).
        raise HTTPException(status_code=404, detail="Laporan tidak tersedia")
    return report


@router.post("/reports")
def publish_report(req: PublishReportRequest, user_id: str = Depends(require_user)):
    try:
        row, sudah_terbit = reports_service.publish_draft(user_id, req)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if not row:
        raise HTTPException(status_code=404, detail="Draf tidak ditemukan")
    if not sudah_terbit:
        try:
            telegram_service.notify_report(row["id"])
        except Exception as error:
            # Publikasi tetap sukses walau konfigurasi, jaringan, atau Telegram gagal.
            detail = str(error) if isinstance(error, telegram_service.TelegramError) else type(error).__name__
            logger.warning("Laporan %s tersimpan, notifikasi Telegram gagal: %s", row["id"], detail)
    # Terbit dua kali mengembalikan laporan yang sama, bukan marker kedua (PRD §10).
    return {
        "id": row["id"],
        "status": row["status"],
        "published_at": row["published_at"],
        "already_published": sudah_terbit,
    }
