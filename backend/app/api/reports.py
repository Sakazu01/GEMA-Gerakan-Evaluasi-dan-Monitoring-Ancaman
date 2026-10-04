from datetime import datetime
from uuid import UUID
from fastapi import APIRouter,Depends,Header,HTTPException,Query,Request
from pydantic import BaseModel

from app.deps.auth import require_user,require_staff
from app.schemas.report import ReportOut
from app.schemas.requests import PublishReportRequest
from app.schemas.requests import NearbyRequest
from app.services import reports as reports_service
from app.services import provenance
from app.services.quota import enforce_quota
from app.services.clock import utcnow
from app.services.trust import proximity_eligible

router=APIRouter(tags=["reports"])


class DensityPoint(BaseModel):
    lat: float
    lng: float
    count: int


@router.get("/reports",response_model=list[ReportOut])
def list_reports(limit: int=Query(default=50,ge=1,le=50),cursor: datetime | None=None,cursor_id: UUID | None=None):
    if cursor and not cursor.tzinfo:raise HTTPException(422,"Cursor waktu harus menyertakan zona waktu")
    return reports_service.list_active(limit,cursor.isoformat() if cursor else None,str(cursor_id) if cursor_id else None)


@router.get("/reports/density",response_model=list[DensityPoint])
def density():
    return reports_service.list_density_points()


@router.get("/reports/all",response_model=list[ReportOut])
def monitoring(user_id: str=Depends(require_staff),limit: int=Query(default=50,ge=1,le=100),offset: int=Query(default=0,ge=0)):
    return reports_service.list_all_for_monitoring(limit,offset)


@router.get("/reports/{report_id}",response_model=ReportOut)
def detail(report_id: UUID):
    report=reports_service.get_active(str(report_id))
    if report is None:
        raise HTTPException(404,"Laporan tidak tersedia")
    return report


@router.post("/reports/{report_id}/nearby-evidence")
def nearby_evidence(report_id: UUID,body: NearbyRequest,user_id: str=Depends(require_user)):
    row=reports_service.get_row(str(report_id))
    if not row or row.get("is_demo") or row.get("status")!="active":
        raise HTTPException(404,"Laporan tidak tersedia")
    location={"lat":body.lat,"lng":body.lng,"accuracy_m":body.accuracy_m,"measured_at":body.measured_at}
    if body.location_mode!="device" or not proximity_eligible(row,location,utcnow()):
        raise HTTPException(403,"Lokasi perangkat harus berada dalam radius 500 meter")
    detail=reports_service.private_detail(row)
    return {"report":detail["report"],"description":detail["description"],"photo_url":detail["photo_url"],"photo_unavailable":detail["photo_unavailable"]}


@router.post("/reports")
def publish(req: PublishReportRequest,request: Request,key: str | None=Header(default=None,alias="Idempotency-Key"),user_id: str=Depends(require_user)):
    if key and (len(key)>128 or not key.strip()):
        raise HTTPException(422,"Idempotency key tidak valid")
    existing=reports_service.get_row(str(req.draft_id),user_id)
    # A lost successful response must be safely retryable during the cooldown.
    # The atomic submit RPC still verifies that the idempotency payload matches.
    if not existing or existing.get("status")=="draft":
        enforce_quota(request,user_id,"submit")
        # Provenance enriches the responder packet, but an unavailable external
        # provider must never prevent an emergency report from being persisted.
        try:
            provenance.inspect_draft(str(req.draft_id),user_id)
        except Exception:
            pass
    try:
        row,already=reports_service.publish_draft(user_id,req,key)
    except ValueError:
        raise HTTPException(422,"Lokasi demo tidak tersedia pada produksi") from None
    return {"id":row["id"],"status":row["status"],"verification_status":row["verification_status"],
            "published_at":row["published_at"],"already_published":already}
