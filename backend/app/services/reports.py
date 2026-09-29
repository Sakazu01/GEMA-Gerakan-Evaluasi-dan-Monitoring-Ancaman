"""Baca laporan dari Supabase dan ubah jadi proyeksi publik (plan.md "Kontrak API")."""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.schemas.report import ReportOut
from app.schemas.requests import PublishReportRequest
from app.services.model import AnalyzeResult
from app.services.rules import help_status_from_counts
from app.services.supabase_client import get_client

# Suara ikut ditarik lewat embed PostgREST supaya tetap satu query (bukan N+1);
# penghitungannya di Python karena jumlah data demo kecil.
_SELECT = "*, false_votes(voter_id), help_votes(value)"

# PRD §9.2: koordinat publik dibulatkan ~100 m. Koordinat asli tidak pernah keluar server.
_PUBLIC_COORD_DECIMALS = 3


def _to_public(row: dict[str, Any]) -> ReportOut:
    """Sengaja membuang lat/lng asli, author_id, photo_path, dan ai_reason."""
    values = [vote["value"] for vote in row.get("help_votes") or []]
    seen_count = values.count("seen")
    not_seen_count = values.count("not_seen")
    return ReportOut(
        id=row["id"],
        status=row["status"],
        type=row["type"],
        severity=row["severity"],
        ai_summary=row["ai_summary"],
        description=row.get("description"),
        details=row.get("details_json"),
        location_label=row["location_label"],
        location_source=row["location_source"],
        public_lat=round(row["lat"], _PUBLIC_COORD_DECIMALS),
        public_lng=round(row["lng"], _PUBLIC_COORD_DECIMALS),
        published_at=row.get("published_at"),
        created_at=row["created_at"],
        is_demo=row["is_demo"],
        help_status=help_status_from_counts(seen_count, not_seen_count),
        seen_count=seen_count,
        not_seen_count=not_seen_count,
        false_vote_count=len(row.get("false_votes") or []),
    )


def list_active(limit: int) -> list[ReportOut]:
    res = (
        get_client()
        .table("reports")
        .select(_SELECT)
        .eq("status", "active")
        .order("published_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [_to_public(row) for row in res.data]


def get_active(report_id: str) -> ReportOut | None:
    res = (
        get_client()
        .table("reports")
        .select(_SELECT)
        .eq("id", report_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    return _to_public(res.data[0]) if res.data else None


def list_by_author(author_id: str) -> list[ReportOut]:
    """Laporan milik pengguna, termasuk yang disembunyikan karena sanggahan (PRD §10).
    Draft sengaja tidak ikut: belum punya lokasi, dan PRD §9.1 melarangnya tampil."""
    res = (
        get_client()
        .table("reports")
        .select(_SELECT)
        .eq("author_id", author_id)
        .in_("status", ["active", "disputed_hidden"])
        .order("created_at", desc=True)
        .execute()
    )
    return [_to_public(row) for row in res.data]


# --- tulis: draft (A2) ---

# Bucket ini dibuat SEKALI secara manual di dashboard Supabase (Storage -> New bucket,
# nama "report-photos", public OFF) -- bukan tugas kode ini. Kalau upload gagal dengan
# pesan "Bucket not found", itu tandanya bucket belum dibuat, bukan bug di sini.
PHOTO_BUCKET = "report-photos"
_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def create_draft(author_id: str, result: AnalyzeResult, photo: bytes, mime: str) -> str:
    """Simpan foto + baris draft. Hanya dipanggil kalau AI bilang relevant (PRD §9.1)."""
    # Nama acak, bukan nama file pengguna (PRD §11).
    path = f"{author_id}/{uuid4()}.{_EXT[mime]}"
    client = get_client()
    client.storage.from_(PHOTO_BUCKET).upload(
        path, photo, {"content-type": mime}
    )
    row = {
        "author_id": author_id,
        "status": "draft",
        "type": result.disaster_type,
        "severity": result.severity,
        "ai_summary": result.summary_id,
        "ai_reason": result.reason_id,
        "photo_path": path,
        "is_demo": settings.demo_mode,
    }
    try:
        res = client.table("reports").insert(row).execute()
    except Exception:
        # Jangan tinggalkan foto yatim bila insert draft ditolak database.
        try:
            client.storage.from_(PHOTO_BUCKET).remove([path])
        except Exception:
            pass
        raise
    return res.data[0]["id"]


def publish_draft(author_id: str, req: PublishReportRequest) -> tuple[dict[str, Any], bool]:
    """Draft -> active. Mengembalikan (baris, sudah_pernah_terbit).

    Idempoten: submit draft yang sama dua kali mengembalikan laporan yang sama, bukan
    bikin marker kedua (PRD §10).
    """
    res = (
        get_client()
        .table("reports")
        .select("id, status, published_at, author_id, type")
        .eq("id", str(req.draft_id))
        .eq("author_id", author_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        return {}, False
    row = res.data[0]
    if row["status"] == "active":
        return row, True
    if row["status"] != "draft":
        raise ValueError("status_tidak_bisa_diterbitkan")
    if req.details is not None and req.details.type != row["type"]:
        raise ValueError("details_tidak_cocok_jenis")

    patch = {
        "status": "active",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "lat": req.lat,
        "lng": req.lng,
        "location_source": req.location_source.value,
        "location_label": req.location_label,
        "description": req.description,
        "details_json": req.details.model_dump() if req.details else None,
    }
    out = (
        get_client()
        .table("reports")
        .update(patch)
        .eq("id", str(req.draft_id))
        .eq("status", "draft")  # jaga-jaga kalau ada dua request barengan
        .execute()
    )
    return (out.data[0] if out.data else row), False


def active_high_risk_candidates() -> list[dict[str, Any]]:
    """Laporan aktif <=24 jam yang punya radius peringatan (severity bukan 'rendah').
    Dipakai untuk cek in_red -- lihat app.services.rules.RADIUS_BY_SEVERITY_M."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    res = (
        get_client()
        .table("reports")
        .select("id, lat, lng, severity, published_at")
        .eq("status", "active")
        .neq("severity", "rendah")
        .gte("published_at", cutoff)
        .execute()
    )
    return res.data


# --- tulis: vote (A3) ---


class VoteError(Exception):
    """Bungkus error dari fungsi Postgres (cast_false_vote/cast_help_vote) jadi kode
    yang bisa dipetakan api/votes.py ke status HTTP yang tepat."""

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def _call_vote_rpc(function_name: str, params: dict[str, Any]) -> dict[str, Any]:
    """Panggil salah satu fungsi Postgres di migrations/003_vote_functions.sql dan
    balikin baris hasilnya. Kalau fungsi itu RAISE EXCEPTION (mis. 'already_voted'),
    Supabase membungkusnya jadi APIError -- pesannya persis sama teks yang di-raise,
    tersedia lewat exc.message, jadi tinggal dipetakan ke VoteError.code apa adanya.
    """
    try:
        res = get_client().rpc(function_name, params).execute()
    except Exception as e:
        raise VoteError(getattr(e, "message", None) or "unknown_error") from e
    return res.data[0]


def cast_false_vote(report_id: str, voter_id: str, reason: str | None) -> dict[str, Any]:
    row = _call_vote_rpc(
        "cast_false_vote",
        {"p_report_id": report_id, "p_voter_id": voter_id, "p_reason": reason},
    )
    return {"false_vote_count": row["false_vote_count"], "status": row["result_status"]}


def cast_help_vote(report_id: str, voter_id: str, value: str) -> dict[str, Any]:
    row = _call_vote_rpc(
        "cast_help_vote",
        {"p_report_id": report_id, "p_voter_id": voter_id, "p_value": value},
    )
    seen, not_seen = row["seen_count"], row["not_seen_count"]
    return {
        "seen_count": seen,
        "not_seen_count": not_seen,
        "help_status": help_status_from_counts(seen, not_seen).value,
    }
