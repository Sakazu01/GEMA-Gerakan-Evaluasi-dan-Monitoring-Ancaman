from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel


class DisasterType(str, Enum):
    flood = "flood"
    landslide = "landslide"
    fire = "fire"


class Severity(str, Enum):
    """4 tingkat keparahan, tiap tingkat punya radius peringatan sendiri (PRD §9.2):
    rendah tidak pernah memicu peringatan; sedang/tinggi/kritis makin luas radiusnya.
    `kritis` = bahaya skala luas/regional (bukan cuma satu titik parah), beda dari
    `tinggi` yang tetap SEGERA tapi cakupannya lebih lokal — lihat app/services/model.py."""

    rendah = "rendah"
    sedang = "sedang"
    tinggi = "tinggi"
    kritis = "kritis"


class ReportStatus(str, Enum):
    draft = "draft"
    active = "active"
    disputed_hidden = "disputed_hidden"


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
    severity: Severity
    ai_summary: str
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
