from fastapi import APIRouter, Depends

from app.deps.auth import require_user
from app.schemas.report import ReportOut
from app.services import reports as reports_service

router = APIRouter(tags=["my-reports"])


@router.get("/my-reports", response_model=list[ReportOut])
def list_my_reports(user_id: str = Depends(require_user)):
    return reports_service.list_by_author(user_id)
