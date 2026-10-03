"""Persist a private draft before model analysis, including manual fallback."""
import logging
from datetime import datetime, timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field, model_validator

from app.deps.auth import require_user
from app.services import model as model_service, reports as reports_service
from app.services.media import read_photo
from app.services.quota import enforce_quota, enforce_model_budget
from app.services.supabase_client import get_client
from app.services.clock import utcnow
from app.schemas.requests import ReportDetails

router = APIRouter(tags=["drafts"])
logger = logging.getLogger(__name__)


class DraftPatch(BaseModel):
    model_config = {"extra": "forbid"}
    reported_type: str | None = Field(default=None, pattern="^(flood|landslide|fire)$")
    description: str | None = Field(default=None,max_length=500)
    lat: float | None = Field(default=None,ge=-90,le=90)
    lng: float | None = Field(default=None,ge=-180,le=180)
    location_label: str | None = Field(default=None,min_length=1,max_length=100)
    location_source: Literal["device","map"] | None = None
    observed_at: datetime | None = None
    observation_time_known: bool | None = None
    photo_source: Literal["camera","gallery","forwarded","none"] | None = None
    details: ReportDetails | None = None

    @model_validator(mode="after")
    def validate_time(self):
        if self.observed_at and (not self.observed_at.tzinfo or self.observed_at>utcnow()+timedelta(minutes=5)):
            raise ValueError("Waktu harus valid dengan zona waktu")
        if self.details and self.reported_type and self.details.type!=self.reported_type:
            raise ValueError("Detail tidak sesuai jenis laporan")
        return self


def analyze_draft(report_id: str,user_id: str):
    row=reports_service.get_row(report_id,user_id)
    if not row or row["status"]!="draft":
        raise HTTPException(404,"Draft tidak tersedia")
    if not row.get("photo_path"):
        return {"draft_id":report_id,"ai_status":"not_requested","reason":"Laporan manual akan ditinjau pengelola."}
    if row.get("ai_status") == "relevant":
        return {"draft_id":report_id,"ai_status":"relevant","type":row.get("ai_disaster_type"),"severity":row.get("severity"),"summary":row.get("ai_summary")}
    enforce_model_budget()
    claimed=get_client().rpc("claim_analysis",{"p_report":report_id,"p_user":user_id}).execute().data
    if not claimed:
        raise HTTPException(409,"Analisis lain masih berjalan")
    result=None
    try:
        photo=get_client().storage.from_(reports_service.PHOTO_BUCKET).download(row["photo_path"])
        result=model_service.analyze_photo(photo,"image/jpeg")
    except Exception as error:
        logger.warning("Analisis gagal (%s)",type(error).__name__)
    return reports_service.save_analysis(report_id,user_id,result)


@router.post("/reports/drafts")
def create_draft(request: Request,photo: UploadFile | None = None,client_id: UUID | None = Form(default=None),user_id: str = Depends(require_user)):
    enforce_quota(request,user_id,"draft")
    existing=reports_service.get_row(str(client_id),user_id) if client_id else None
    if existing:
        return {"draft_id":existing["id"],"ai_status":existing["ai_status"]}
    data,mime,sha,phash=read_photo(photo) if photo else (None,"image/jpeg",None,None)
    draft=reports_service.create_raw_draft(user_id,data,mime,sha,phash,str(client_id) if client_id else None)
    return {"draft_id":draft,"ai_status":"not_requested"}


@router.get("/reports/drafts/{draft_id}")
def get_draft(draft_id: UUID,user_id: str = Depends(require_user)):
    row=reports_service.get_row(str(draft_id),user_id)
    if not row or row["status"]!="draft":
        raise HTTPException(404,"Draft tidak tersedia")
    return {key:row.get(key) for key in ("id","ai_status","ai_disaster_type","severity","ai_summary","reported_type","description","created_at","lat","lng","location_label","location_source","observed_at","observation_time_known","photo_source","details_json")}


@router.patch("/reports/drafts/{draft_id}")
def patch_draft(draft_id: UUID,req: DraftPatch,request: Request,user_id: str = Depends(require_user)):
    enforce_quota(request,user_id,"draft")
    patch=req.model_dump(exclude_unset=True)
    if "details" in patch:patch["details_json"]=patch.pop("details")
    if "observed_at" in patch and patch["observed_at"]:patch["observed_at"]=patch["observed_at"].isoformat()
    if not patch:return {"draft_id":str(draft_id)}
    rows=get_client().table("reports").update(patch).eq("id",str(draft_id)).eq("author_id",user_id).eq("status","draft").gt("created_at",(utcnow()-timedelta(hours=24)).isoformat()).execute().data
    if not rows:
        raise HTTPException(404,"Draft tidak tersedia")
    return {"draft_id":str(draft_id)}


@router.post("/reports/drafts/{draft_id}/analyze")
def analyze_saved(draft_id: UUID,request: Request,user_id: str = Depends(require_user)):
    enforce_quota(request,user_id,"analyze")
    return analyze_draft(str(draft_id),user_id)


@router.post("/analyze")
def analyze(request: Request,photo: UploadFile,user_id: str = Depends(require_user)):
    # Backward-compatible adapter; uncertain/unavailable responses also contain a draft.
    enforce_quota(request,user_id,"analyze")
    data,mime,sha,phash=read_photo(photo)
    draft=reports_service.create_raw_draft(user_id,data,mime,sha,phash)
    return analyze_draft(draft,user_id)
