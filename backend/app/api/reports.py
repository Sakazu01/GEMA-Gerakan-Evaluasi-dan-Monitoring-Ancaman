from datetime import datetime
from uuid import UUID
from fastapi import APIRouter,Depends,Header,HTTPException,Query,Request
from pydantic import BaseModel

from app.deps.auth import require_user,require_moderator
from app.schemas.report import ReportOut
from app.schemas.requests import PublishReportRequest
from app.services import reports as reports_service
from app.services.quota import enforce_quota

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
def monitoring(user_id: str=Depends(require_moderator),limit: int=Query(default=50,ge=1,le=100),offset: int=Query(default=0,ge=0)):
    return reports_service.list_all_for_monitoring(limit,offset)


@router.get("/reports/{report_id}",response_model=ReportOut)
def detail(report_id: UUID):
    report=reports_service.get_active(str(report_id))
    if report is None:
        raise HTTPException(404,"Laporan tidak tersedia")
    return report


@router.post("/reports")
def publish(req: PublishReportRequest,request: Request,key: str | None=Header(default=None,alias="Idempotency-Key"),user_id: str=Depends(require_user)):
    if key and (len(key)>128 or not key.strip()):
        raise HTTPException(422,"Idempotency key tidak valid")
    enforce_quota(request,user_id,"submit")
    try:
        row,already=reports_service.publish_draft(user_id,req,key)
    except ValueError:
        raise HTTPException(422,"Lokasi demo tidak tersedia pada produksi") from None
    return {"id":row["id"],"status":row["status"],"verification_status":row["verification_status"],
            "published_at":row["published_at"],"already_published":already}
