from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["my-reports"])


@router.get("/my-reports")
async def list_my_reports():
    # TODO Checkpoint 6: laporan milik pemilik JWT, termasuk yang disembunyikan.
    raise HTTPException(status_code=501, detail="Belum diimplementasikan")
