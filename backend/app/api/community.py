from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.config import settings
from app.deps.auth import require_user, require_moderator, require_staff
from app.schemas.requests import ObservationRequest, AbuseRequest, DecisionRequest
from app.services import reports
from app.services.clock import utcnow
from app.services.quota import enforce_quota
from app.services.supabase_client import get_client
from app.services.trust import proximity_eligible

router = APIRouter(tags=["community"])


def enabled():
    if not settings.community_enabled:
        raise HTTPException(503, "Konfirmasi komunitas belum tersedia")


@router.get("/session")
def session(request: Request, user_id: str = Depends(require_user)):
    roles = get_client().table("user_roles").select("role").eq("user_id", user_id).execute().data
    permanent = not getattr(request.state.auth_user, "is_anonymous", True)
    return {"user_id": user_id, "roles": [r["role"] for r in roles] if permanent else []}


@router.get("/reports/{report_id}/observation")
def own_observation(report_id: UUID, user_id: str = Depends(require_user)):
    rows = get_client().table("observations").select("value,source,observed_at,note,at_report_location,withdrawn_at").eq("report_id", str(report_id)).eq("user_id", user_id).is_("withdrawn_at", "null").execute().data
    return rows[0] if rows else None


@router.put("/reports/{report_id}/observation")
def observe(report_id: UUID, body: ObservationRequest, request: Request, user_id: str = Depends(require_user)):
    enabled()
    enforce_quota(request, user_id, "observation")
    row = reports.get_row(str(report_id))
    if not row:
        raise HTTPException(404, "Laporan tidak tersedia")
    payload = body.model_dump(mode="json")
    result = reports.rpc("save_observation", {"p_user": user_id, "p_report": str(report_id), "p_payload": payload,
        "p_proximity": proximity_eligible(row, payload.get("observer_location"), utcnow()), "p_withdraw": False})
    return result


@router.delete("/reports/{report_id}/observation")
def withdraw(report_id: UUID, request: Request, user_id: str = Depends(require_user)):
    enforce_quota(request, user_id, "observation")
    return reports.rpc("save_observation", {"p_user": user_id, "p_report": str(report_id), "p_payload": {}, "p_proximity": False, "p_withdraw": True})


@router.post("/reports/{report_id}/abuse")
def abuse(report_id: UUID, body: AbuseRequest, request: Request, user_id: str = Depends(require_user)):
    enforce_quota(request, user_id, "abuse")
    return reports.rpc("report_abuse", {"p_user": user_id, "p_report": str(report_id), "p_category": body.category, "p_reason": body.reason})


@router.get("/moderation/reports")
def queue(user_id: str = Depends(require_staff), limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0)):
    return reports.list_all_for_monitoring(limit, offset)


@router.get("/moderation/reports/{report_id}")
def private_detail(report_id: UUID, user_id: str = Depends(require_staff)):
    row = reports.get_row(str(report_id))
    if not row or row["status"] == "draft":
        raise HTTPException(404, "Laporan tidak tersedia")
    return reports.private_detail(row, moderator=True)


@router.post("/moderation/reports/{report_id}/decisions")
def decide(report_id: UUID, body: DecisionRequest, request: Request, user_id: str = Depends(require_moderator)):
    enforce_quota(request, user_id, "moderation")
    row = reports.rpc("moderate_report", {"p_actor": user_id, "p_report": str(report_id), "p_action": body.action,
        "p_reason": body.reason, "p_public_note": body.public_note, "p_version": body.expected_version,
        "p_observed": body.observed_at.isoformat() if body.observed_at else None,
        "p_radius": body.awareness_radius_m, "p_ttl": settings.report_active_ttl_hours})
    return reports._to_public(row)


@router.post("/moderation/outbox/{job_id}/retry")
def retry_unknown(job_id: UUID, request: Request, user_id: str = Depends(require_moderator)):
    enforce_quota(request, user_id, "moderation")
    return reports.rpc("retry_notification",{"p_actor":user_id,"p_job":str(job_id)})
