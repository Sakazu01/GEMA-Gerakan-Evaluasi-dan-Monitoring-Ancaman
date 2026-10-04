from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class DisasterType(str, Enum):
    flood = "flood"
    landslide = "landslide"
    fire = "fire"


class Severity(str, Enum):
    """Indikasi visual AI, bukan tingkat risiko yang telah diverifikasi."""

    rendah = "rendah"
    sedang = "sedang"
    tinggi = "tinggi"
    kritis = "kritis"


class ReportStatus(str, Enum):
    draft = "draft"
    active = "active"
    disputed_hidden = "disputed_hidden"
    held = "held"
    closed = "closed"


class ResponderStatus(str, Enum):
    pending = "PENDING"
    accepted = "ACCEPTED"


class LocationSource(str, Enum):
    device = "device"
    map = "map"
    demo = "demo"


class HelpStatus(str, Enum):
    belum_ada_konfirmasi = "belum_ada_konfirmasi"
    belum_terlihat = "belum_terlihat"
    terlihat = "terlihat"


class ReportOut(BaseModel):
    """Proyeksi publik laporan. Bentuknya kembar dengan frontend/src/types/report.ts —
    jangan ubah salah satu tanpa koordinasi tim."""

    id: str
    status: ReportStatus
    responder_status: ResponderStatus
    type: DisasterType
    severity: Severity | None
    ai_summary: str | None
    ai_confidence: str | None = None
    ai_limitations: str | None = None
    description: str | None = None
    details: dict[str, Any] | None = None
    location_label: str
    location_source: LocationSource
    public_lat: float
    public_lng: float
    published_at: datetime | None = None
    created_at: datetime
    is_demo: bool
    help_status: HelpStatus
    seen_count: int
    not_seen_count: int
    false_vote_count: int
    verification_status: str = "unconfirmed"
    closure_reason: str | None = None
    ai_status: str = "not_requested"
    reported_type: DisasterType | None = None
    ai_disaster_type: DisasterType | None = None
    observed_at: datetime | None = None
    observation_time_known: bool = False
    photo_source: str = "none"
    expires_at: datetime | None = None
    verified_at: datetime | None = None
    public_verification_note: str | None = None
    version: int = 1
    observation_counts: dict[str, int] = Field(default_factory=dict)
    awareness_radius_m: int | None = None
    review_requested: bool = False
    provenance_status: str = "not_requested"
    internal_match_count: int = 0
    web_match_count: int = 0
