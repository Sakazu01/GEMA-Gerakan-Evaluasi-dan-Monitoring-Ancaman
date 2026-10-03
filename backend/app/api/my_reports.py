from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException
from app.deps.auth import require_user
from app.schemas.report import ReportOut
from app.services import reports as reports_service

router=APIRouter(tags=["my-reports"])


@router.get("/my-reports",response_model=list[ReportOut])
def mine(user_id: str=Depends(require_user)):
    return reports_service.list_by_author(user_id)


@router.get("/my-reports/{report_id}")
def own_detail(report_id: UUID,user_id: str=Depends(require_user)):
    row=reports_service.get_row(str(report_id),user_id)
    if not row or row["status"]=="draft":
        raise HTTPException(404,"Laporan tidak tersedia")
    return reports_service.private_detail(row)
