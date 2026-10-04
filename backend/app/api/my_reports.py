from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException
from app.deps.auth import require_user
from app.schemas.report import ReportOut
from app.schemas.requests import EditReportRequest
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


_LOCKED="Laporan sudah diterima responder atau tidak tersedia, jadi tidak bisa diubah atau dihapus lagi"


@router.patch("/my-reports/{report_id}",response_model=ReportOut)
def edit(report_id: UUID,body: EditReportRequest,user_id: str=Depends(require_user)):
    row=reports_service.edit_own(str(report_id),user_id,body.model_dump(exclude_unset=True))
    if not row:
        raise HTTPException(409,_LOCKED)
    return reports_service._to_public(row)


@router.delete("/my-reports/{report_id}",status_code=204)
def remove(report_id: UUID,user_id: str=Depends(require_user)):
    if not reports_service.delete_own(str(report_id),user_id):
        raise HTTPException(409,_LOCKED)
