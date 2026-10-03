"""Bentuk body request. Dipisah dari report.py supaya file kontrak bersama Track B
(report.py) tetap cuma berisi bentuk keluaran."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

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
    reported_type: Literal["flood", "landslide", "fire"]
    observed_at: datetime | None = None
    observation_time_known: bool = True
    photo_source: Literal["camera", "gallery", "forwarded", "none"] = "none"
    photo_captured_at: datetime | None = None

    @model_validator(mode="after")
    def validate_context(self):
        if self.observation_time_known and self.observed_at is None:
            raise ValueError("Isi waktu pengamatan atau pilih tidak tahu")
        if self.details and self.details.type != self.reported_type:
            raise ValueError("Detail tidak sesuai jenis laporan")
        for value in (self.observed_at, self.photo_captured_at):
            if value is not None and value.tzinfo is None:
                raise ValueError("Waktu harus menyertakan zona waktu")
        return self


class NearbyRequest(BaseModel):
    model_config = {"extra": "forbid"}

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0, le=100000)
    location_mode: Literal["device", "area"] = "device"
    measured_at: datetime | None = None


class FalseVoteRequest(BaseModel):
    model_config = {"extra": "forbid"}

    reason: str | None = Field(default=None, max_length=200)


class HelpVoteRequest(BaseModel):
    model_config = {"extra": "forbid"}

    value: Literal["seen", "not_seen"]


class ObserverLocation(BaseModel):
    model_config = {"extra": "forbid"}
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy_m: float = Field(ge=0, le=100000)
    measured_at: datetime


class ObservationRequest(BaseModel):
    model_config = {"extra": "forbid"}
    value: Literal["seen", "not_observed", "unsure"]
    source: Literal["direct", "secondhand"] | None = None
    observed_at: datetime | None = None
    note: str | None = Field(default=None, max_length=500)
    at_report_location: bool | None = None
    observer_location: ObserverLocation | None = None

    @model_validator(mode="after")
    def validate_observation(self):
        if self.value != "unsure" and (not self.source or not self.observed_at):
            raise ValueError("Isi sumber dan waktu pengamatan")
        if self.value == "not_observed" and (not self.at_report_location or not self.note or not self.note.strip()):
            raise ValueError("Nyatakan keberadaan di lokasi dan konteks pengamatan")
        if self.value == "not_observed" and self.source != "direct":
            raise ValueError("Tidak melihat saat berada di lokasi harus merupakan pengamatan langsung")
        times = [self.observed_at, self.observer_location.measured_at if self.observer_location else None]
        if any(t is not None and t.tzinfo is None for t in times):
            raise ValueError("Waktu harus menyertakan zona waktu")
        if self.value == "unsure":
            self.source = None
            self.observed_at = None
            self.observer_location = None
        if self.source == "secondhand":
            self.observer_location = None
        if self.value != "not_observed":
            self.at_report_location = None
        return self


class AbuseRequest(BaseModel):
    model_config = {"extra": "forbid"}
    category: Literal["old_photo", "wrong_location", "spam", "privacy", "other"]
    reason: str = Field(min_length=1, max_length=500)


class DecisionRequest(BaseModel):
    model_config = {"extra": "forbid"}
    action: Literal["confirm", "release", "hold", "review", "resolve", "refute", "expire", "reopen"]
    reason: str = Field(min_length=10, max_length=1000)
    public_note: str | None = Field(default=None, max_length=500)
    expected_version: int = Field(ge=1)
    observed_at: datetime | None = None
    awareness_radius_m: int | None = Field(default=None, ge=100, le=10000)

    @model_validator(mode="after")
    def validate_time(self):
        if self.observed_at is not None and self.observed_at.tzinfo is None:
            raise ValueError("Waktu harus menyertakan zona waktu")
        return self
