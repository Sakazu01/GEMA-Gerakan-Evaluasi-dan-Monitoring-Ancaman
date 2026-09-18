from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["nearby"])


@router.post("/nearby")
async def check_nearby():
    # TODO Checkpoint 8: hitung in_red pakai app.services.rules.haversine_distance_m (PRD §16.2).
    raise HTTPException(status_code=501, detail="Belum diimplementasikan")
