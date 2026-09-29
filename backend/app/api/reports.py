from fastapi import APIRouter, Depends, HTTPException

from app.deps.auth import require_user
from app.schemas.report import ReportOut
from app.schemas.requests import PublishReportRequest
from app.services import reports as reports_service

router = APIRouter(tags=["reports"])

# Handler sengaja `def` (bukan `async def`): klien Supabase sinkron, jadi biar FastAPI
# jalanin di threadpool dan event loop tidak ikut ke-block.


@router.get("/reports", response_model=list[ReportOut])
def list_reports(limit: int = 50):
    if not 1 <= limit <= 50:
        raise HTTPException(status_code=400, detail="limit harus antara 1 dan 50")
    return reports_service.list_active(limit)


@router.get("/reports/{report_id}", response_model=ReportOut)
def get_report(report_id: str):
    report = reports_service.get_active(report_id)
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
    # Terbit dua kali mengembalikan laporan yang sama, bukan marker kedua (PRD §10).
    return {
        "id": row["id"],
        "status": row["status"],
        "published_at": row["published_at"],
        "already_published": sudah_terbit,
    }
