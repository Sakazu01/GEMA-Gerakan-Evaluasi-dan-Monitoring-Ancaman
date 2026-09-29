from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class DisasterType(str, Enum):
    flood = "flood"
    landslide = "landslide"
    fire = "fire"


class Severity(str, Enum):
    """`tinggi` = perlu evakuasi/respons SEGERA (mis. banjir dalam + arus deras), bukan
    sekadar "kelihatan besar di foto". Ini membedakan kejadian mendesak dari genangan biasa
    (rendah/sedang) — lihat app/services/model.py dan PRD §16.2 (pemicu area perhatian merah)."""

    rendah = "rendah"
    sedang = "sedang"
    tinggi = "tinggi"


class ReportStatus(str, Enum):
    draft = "draft"
    active = "active"
    disputed_hidden = "disputed_hidden"


class ReportOut(BaseModel):
    """Proyeksi publik laporan — sesuai kontrak GET /api/reports di PRD §19."""

    id: str
    status: ReportStatus
    type: DisasterType
    severity: Severity
    ai_summary: str
    description: str | None = None
    location_label: str
    public_lat: float
    public_lng: float
    published_at: datetime | None = None
    created_at: datetime
    is_demo: bool
