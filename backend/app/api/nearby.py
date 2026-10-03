"""Nearby is information reach, never a geofence proving danger or safety."""
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from app.core.config import settings
from app.schemas.requests import NearbyRequest
from app.services import reports as reports_service
from app.services.clock import utcnow
from app.services.rules import haversine_distance_m
from app.services.trust import moment,notice_radius
from app.services.quota import enforce_read_quota

router=APIRouter(tags=["nearby"])


def nearby(req: NearbyRequest):
    if not settings.community_enabled:
        raise HTTPException(503,"Informasi sekitar sedang dinonaktifkan. Daftar laporan tetap dapat dibaca.")
    now=utcnow()
    result={"data_as_of":now.isoformat(),"location_mode":req.location_mode,"items":[],"next_refresh_after_seconds":30,"location_valid":True}
    if req.location_mode=="device":
        measured=moment(req.measured_at)
        if not measured or measured<now-timedelta(minutes=settings.device_location_max_age_min) or measured>now+timedelta(minutes=5) or req.accuracy_m is None or req.accuracy_m>100:
            result["location_valid"]=False
            return result
    matches=[]
    for row in reports_service.active_high_risk_candidates():
        radius=notice_radius(row)
        if not radius or not row.get("observation_time_known") or not row.get("observed_at"):
            continue
        distance=haversine_distance_m(req.lat,req.lng,row["lat"],row["lng"])
        if distance<=radius:
            report=reports_service._to_public(row).model_dump(mode="json")
            matches.append({
                "report_id":row["id"],"reported_type":report["type"],"location_label":report["location_label"],
                "distance_m":round(distance),"observed_at":report["observed_at"],"verification_status":report["verification_status"],
                "notice_kind":"awareness" if report["verification_status"]=="confirmed" else "observation_invitation",
                "observation_counts":report["observation_counts"],"report":report,
            })
    matches.sort(key=lambda x:(x["verification_status"]!="confirmed", -(moment(x["report"].get("verified_at") or x["report"].get("published_at")).timestamp()),x["distance_m"]))
    result["items"]=matches[:3]
    return result


@router.post("/nearby")
def check_nearby(req: NearbyRequest,request: Request):
    enforce_read_quota(request)
    return nearby(req)


@router.get("/nearby")
def get_nearby(request: Request,lat: float=Query(ge=-90,le=90),lng: float=Query(ge=-180,le=180),accuracy_m: float | None=Query(default=None,ge=0,le=100000),measured_at: datetime | None=None,location_mode: Literal["device","area"]="area"):
    enforce_read_quota(request)
    return nearby(NearbyRequest(lat=lat,lng=lng,accuracy_m=accuracy_m,measured_at=measured_at,location_mode=location_mode))
