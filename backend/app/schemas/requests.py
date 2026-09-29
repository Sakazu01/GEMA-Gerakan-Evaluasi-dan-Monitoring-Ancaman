"""Bentuk body request. Dipisah dari report.py supaya file kontrak bersama Track B
(report.py) tetap cuma berisi bentuk keluaran."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.report import LocationSource


class FloodDetails(BaseModel):
    type: Literal["flood"]
    water_depth: Literal["<30cm", "30-100cm", ">100cm"] | None = None
    current: Literal["tenang", "deras"] | None = None


class LandslideDetails(BaseModel):
    type: Literal["landslide"]
    covered_area_m2: int | None = Field(default=None, ge=1, le=100_000)


class FireDetails(BaseModel):
    type: Literal["fire"]
    visibility: Literal["jelas", "terbatas", "sangat_rendah"] | None = None


# "Tidak tahu" dikirim sebagai null, bukan string bebas (PRD §11).
ReportDetails = FloodDetails | LandslideDetails | FireDetails


class PublishReportRequest(BaseModel):
    model_config = {"extra": "forbid"}

    draft_id: UUID  # 422 otomatis kalau bukan UUID valid, bukan 500 dari database.
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    location_source: LocationSource
    location_label: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    details: ReportDetails | None = None


class NearbyRequest(BaseModel):
    model_config = {"extra": "forbid"}

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy_m: float | None = None


class FalseVoteRequest(BaseModel):
    model_config = {"extra": "forbid"}

    reason: str | None = Field(default=None, max_length=200)


class HelpVoteRequest(BaseModel):
    model_config = {"extra": "forbid"}

    value: Literal["seen", "not_seen"]
