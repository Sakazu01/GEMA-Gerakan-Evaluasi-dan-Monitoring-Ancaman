"""Cek kecil untuk aturan yang gampang salah. Jalankan: cd backend && python test_rules.py"""

from app.schemas.report import HelpStatus
from app.services.rules import help_status_from_counts


def test_help_status_from_counts():
    # PRD §9.3: satu suara "sudah terlihat" sengaja TIDAK cukup.
    assert help_status_from_counts(0, 0) == HelpStatus.belum_ada_konfirmasi
    assert help_status_from_counts(1, 0) == HelpStatus.belum_ada_konfirmasi
    assert help_status_from_counts(2, 0) == HelpStatus.terlihat
    # Seri 2 vs 2 juga belum cukup: syaratnya seen > not_seen.
    assert help_status_from_counts(2, 2) == HelpStatus.belum_terlihat
    assert help_status_from_counts(3, 2) == HelpStatus.terlihat
    assert help_status_from_counts(0, 1) == HelpStatus.belum_terlihat


def test_projeksi_publik():
    """Baris DB (bentuk balikan PostgREST) -> kontrak publik di plan.md."""
    from app.services.reports import _to_public

    row = {
        "id": "b6e1f2a0-0000-4000-8000-000000000001",
        "author_id": "rahasia-jangan-bocor",
        "status": "active",
        "type": "flood",
        "severity": "tinggi",
        "ai_summary": "Genangan air lebih dari 1 meter dengan arus terlihat deras.",
        "ai_reason": "Terlihat genangan dalam dan arus deras.",
        "description": "Air masuk ke rumah warga sejak siang.",
        "details_json": {"type": "flood", "water_depth": ">100cm", "current": "deras"},
        "location_label": "Sekitar Jl. Melati, RW 04",
        "location_source": "demo",
        "lat": -6.914744,
        "lng": 107.609812,
        "photo_path": "rahasia/foto.jpg",
        "published_at": "2026-09-18T03:12:00Z",
        "created_at": "2026-09-18T03:10:00Z",
        "is_demo": True,
        "false_votes": [{"voter_id": "a"}, {"voter_id": "b"}],
        "help_votes": [{"value": "seen"}, {"value": "seen"}, {"value": "not_seen"}],
    }
    out = _to_public(row).model_dump()

    # Koordinat dibulatkan ~100 m (PRD §9.2), koordinat asli tidak ikut keluar.
    assert out["public_lat"] == -6.915, out["public_lat"]
    assert out["public_lng"] == 107.61, out["public_lng"]
    # Field rahasia tidak boleh muncul di proyeksi publik.
    for bocor in ("author_id", "photo_path", "ai_reason", "lat", "lng"):
        assert bocor not in out, bocor
    # Hitungan suara + status bantuan (2 seen > 1 not_seen -> terlihat).
    assert (out["seen_count"], out["not_seen_count"], out["false_vote_count"]) == (2, 1, 2)
    assert out["help_status"] == "terlihat"
    assert out["details"] == {"type": "flood", "water_depth": ">100cm", "current": "deras"}



def test_nearest_in_range():
    """Radius per severity (proposal tim): rendah=tidak pernah, sedang=1km,
    tinggi=3km, kritis=10km. Uji tepat di ambangnya, bukan cuma jauh/dekat."""
    from app.services.rules import haversine_distance_m, nearest_in_range

    USER_LAT, USER_LNG = -6.9000, 107.6000

    def titik_berjarak(m):
        # geser lurus ke utara sejauh m meter (perkiraan cukup untuk uji ambang).
        import math
        from app.services.rules import _EARTH_RADIUS_M
        return USER_LAT + math.degrees(m / _EARTH_RADIUS_M), USER_LNG

    # "rendah" 50m saja tetap TIDAK memicu in_red.
    lat, lng = titik_berjarak(50)
    assert nearest_in_range(USER_LAT, USER_LNG, [
        {"id": "r1", "lat": lat, "lng": lng, "severity": "rendah", "published_at": "2026-01-01"}
    ]) is None

    # "sedang" pas di 999m masuk, di 1001m tidak.
    lat_in, lng_in = titik_berjarak(999)
    lat_out, lng_out = titik_berjarak(1001)
    assert nearest_in_range(USER_LAT, USER_LNG, [
        {"id": "s-in", "lat": lat_in, "lng": lng_in, "severity": "sedang", "published_at": "2026-01-01"}
    ])[0] == "s-in"
    assert nearest_in_range(USER_LAT, USER_LNG, [
        {"id": "s-out", "lat": lat_out, "lng": lng_out, "severity": "sedang", "published_at": "2026-01-01"}
    ]) is None

    # "kritis" di 9km masuk (beda dari "tinggi" yang cuma sampai 3km).
    lat9, lng9 = titik_berjarak(9_000)
    assert nearest_in_range(USER_LAT, USER_LNG, [
        {"id": "t", "lat": lat9, "lng": lng9, "severity": "tinggi", "published_at": "2026-01-01"},
        {"id": "k", "lat": lat9, "lng": lng9, "severity": "kritis", "published_at": "2026-01-01"},
    ])[0] == "k"

    # Dua kandidat dalam radius -> yang PALING DEKAT menang, bukan yang severity tertinggi.
    lat_close, lng_close = titik_berjarak(500)
    lat_far, lng_far = titik_berjarak(2_500)
    result = nearest_in_range(USER_LAT, USER_LNG, [
        {"id": "jauh-tinggi", "lat": lat_far, "lng": lng_far, "severity": "tinggi", "published_at": "2026-01-01"},
        {"id": "dekat-sedang", "lat": lat_close, "lng": lng_close, "severity": "sedang", "published_at": "2026-01-01"},
    ])
    assert result[0] == "dekat-sedang"

    # Haversine: 1 derajat lintang ~= 111.32 km (patokan umum, toleransi 1%).
    d = haversine_distance_m(0, 0, 1, 0)
    assert 110_000 < d < 112_000, d


if __name__ == "__main__":
    test_help_status_from_counts()
    test_projeksi_publik()
    test_nearest_in_range()
    print("ok")
