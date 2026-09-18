"""Aturan bisnis murni (tanpa I/O) — lihat PRD.md §9. Dites di backend/test_rules.py."""

import math

from app.schemas.report import HelpStatus


def help_status_from_counts(seen: int, not_seen: int) -> HelpStatus:
    """PRD §9.3: butuh >=2 suara "sudah terlihat" DAN lebih banyak dari "belum terlihat".
    Satu suara sengaja tidak cukup — jangan sampai UI terdengar lebih yakin dari buktinya."""
    if seen >= 2 and seen > not_seen:
        return HelpStatus.terlihat
    if not_seen >= 1:
        return HelpStatus.belum_terlihat
    return HelpStatus.belum_ada_konfirmasi


_EARTH_RADIUS_M = 6_371_000


def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Jarak garis lurus antar dua koordinat, dalam meter."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(a))


# Radius peringatan per tingkat keparahan (proposal tim, gantikan angka tunggal 300m).
# "rendah" sengaja tidak ada radius -- tidak pernah memicu kartu keselamatan, laporan
# tetap tampil biasa di peta/daftar.
RADIUS_BY_SEVERITY_M: dict[str, float | None] = {
    "rendah": None,
    "sedang": 1_000,
    "tinggi": 3_000,
    "kritis": 10_000,
}


def nearest_in_range(
    user_lat: float, user_lng: float, candidates: list[dict]
) -> tuple[str, float] | None:
    """candidates: list of {id, lat, lng, severity, published_at}. Balikin (report_id,
    distance_m) untuk yang PALING DEKAT dan berada dalam radius sesuai tingkat
    keparahannya sendiri, atau None kalau tidak ada satu pun yang masuk (PRD §9.2:
    kalau jarak sama, yang lebih baru menang)."""
    best: tuple[str, float, str] | None = None
    for c in candidates:
        radius = RADIUS_BY_SEVERITY_M.get(c["severity"])
        if radius is None:
            continue
        distance = haversine_distance_m(user_lat, user_lng, c["lat"], c["lng"])
        if distance > radius:
            continue
        if best is None or distance < best[1] or (
            distance == best[1] and c["published_at"] > best[2]
        ):
            best = (c["id"], distance, c["published_at"])
    return (best[0], best[1]) if best else None
