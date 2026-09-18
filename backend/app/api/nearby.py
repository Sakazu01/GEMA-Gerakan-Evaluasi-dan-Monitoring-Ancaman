from fastapi import APIRouter, Depends

from app.deps.auth import require_user
from app.schemas.requests import NearbyRequest
from app.services import reports as reports_service
from app.services.rules import nearest_in_range

router = APIRouter(tags=["nearby"])

# PRD §9.2: lokasi dengan akurasi >100m dianggap belum cukup untuk klaim in_red.
MAX_ACCURACY_M = 100

_NOT_IN_RED = {"in_red": False, "nearest_report_id": None, "distance_m": None}


@router.post("/nearby")
def check_nearby(req: NearbyRequest, user_id: str = Depends(require_user)):
    if req.accuracy_m is not None and req.accuracy_m > MAX_ACCURACY_M:
        return _NOT_IN_RED

    candidates = reports_service.active_high_risk_candidates()
    found = nearest_in_range(req.lat, req.lng, candidates)
    if found is None:
        return _NOT_IN_RED
    report_id, distance = found
    return {"in_red": True, "nearest_report_id": report_id, "distance_m": round(distance)}
