from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["reports"])


@router.get("/reports")
async def list_reports():
    # TODO Checkpoint 6: proyeksi publik laporan aktif dari Supabase.
    raise HTTPException(status_code=501, detail="Belum diimplementasikan")


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    # TODO Checkpoint 6: detail laporan aktif; pemilik bisa lihat status tersembunyi sendiri.
    raise HTTPException(status_code=501, detail="Belum diimplementasikan")


@router.post("/reports")
async def publish_report():
    # TODO Checkpoint 7: aktifkan draft -> active, idempoten berdasarkan draft_id.
    raise HTTPException(status_code=501, detail="Belum diimplementasikan")
