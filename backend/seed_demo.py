"""Fixture privat pada database demo terpisah, bukan laporan untuk feed publik.

Jalankan dari backend dengan DEMO_MODE=true: python seed_demo.py.
Tidak membuat sesi Auth, mengirim notifikasi, atau menjalankan analisis AI.
"""

from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.services.supabase_client import get_client

# Identitas fixture, bukan token Auth. Endpoint privat tetap memerlukan JWT valid.
DEMO_AUTHOR_ID = "11111111-1111-4111-8111-111111111111"


def _jam_lalu(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=n)).isoformat()


def _fake_author(n: int) -> str:
    return f"9{n:07d}-9999-4999-8999-999999999999"


def _konfirmasi_tambahan(prefix: str, lat: float, lng: float, n: int, disaster_type: str, label: str) -> list[dict]:
    """Fixture beberapa akun pada titik berdekatan; bukan bukti konfirmasi kejadian.

Semua fixture dikecualikan dari feed, nearby, density, dan chat publik.
"""
    return [
        {
            "id": f"{prefix}{i:02d}",
            "status": "active",
            "type": disaster_type,
            "severity": "rendah",
            "ai_summary": "Konfirmasi tambahan dari warga lain di lokasi yang sama.",
            "ai_reason": "Kejadian serupa dilaporkan oleh lebih dari satu pengguna.",
            "description": None,
            "details_json": {"type": disaster_type},
            "lat": lat,
            "lng": lng,
            "location_source": "demo",
            "location_label": label,
            "published_at": _jam_lalu(2 + i),
            "author_id": _fake_author(i + 1),
        }
        for i in range(n)
    ]


REPORTS = [
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000001",
        "status": "active",
        "type": "flood",
        "severity": "tinggi",
        "ai_summary": "Genangan air melebihi satu meter dengan arus terlihat deras di jalan permukiman.",
        "ai_reason": "Air menutupi hampir seluruh badan jalan dan arus terlihat kuat.",
        "description": "Air masuk ke rumah warga sejak siang.",
        "details_json": {"type": "flood", "water_depth": ">100cm", "current": "deras"},
        "lat": -6.891474,
        "lng": 107.610812,
        "location_source": "demo",
        "location_label": "Sekitar Jl. Ganesha, Bandung",
        "published_at": _jam_lalu(2),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000002",
        "status": "active",
        "type": "flood",
        "severity": "rendah",
        "ai_summary": "Genangan air dangkal di tepi jalan, permukaan air terlihat tenang.",
        "ai_reason": "Air hanya menutupi sebagian bahu jalan.",
        "description": None,
        "details_json": {"type": "flood", "water_depth": "<30cm", "current": "tenang"},
        "lat": -6.893210,
        "lng": 107.612455,
        "location_source": "demo",
        "location_label": "Sekitar Jl. Dago, Bandung",
        "published_at": _jam_lalu(5),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000003",
        "status": "active",
        "type": "fire",
        "severity": "sedang",
        "ai_summary": "Asap tebal terlihat mengepul dari bangunan, jarak pandang sekitar terbatas.",
        "ai_reason": "Asap pekat terlihat jelas, sumber api tidak tampak di foto.",
        "description": "Asap terlihat dari kejauhan.",
        "details_json": {"type": "fire", "visibility": "terbatas"},
        "lat": -6.887900,
        "lng": 107.615300,
        "location_source": "demo",
        "location_label": "Sekitar Jl. Cikapayang, Bandung",
        "published_at": _jam_lalu(8),
    },
    {
        # Sengaja tersembunyi: buat membuktikan dia TIDAK muncul di daftar publik.
        "id": "b6e1f2a0-0000-4000-8000-000000000004",
        "status": "disputed_hidden",
        "type": "landslide",
        "severity": "tinggi",
        "ai_summary": "Material tanah menutup sebagian badan jalan di area lereng.",
        "ai_reason": "Tanah dan batuan terlihat menumpuk di jalur jalan.",
        "description": None,
        "details_json": {"type": "landslide", "covered_area_m2": 120},
        "lat": -6.880100,
        "lng": 107.620900,
        "location_source": "demo",
        "location_label": "Sekitar Punclut, Bandung",
        "published_at": _jam_lalu(20),
    },
    # --- Sebaran nasional (PRD §0: data simulasi) -- biar peta terasa hidup, bukan cuma
    # Bandung. Kalimantan sengaja lebih padat kebakaran (karhutla musiman nyata di sana),
    # Aceh untuk banjir. Jangan tambah lebih banyak lagi -- ini secukupnya buat demo.
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000005",
        "status": "active",
        "type": "fire",
        "severity": "kritis",
        "ai_summary": "Kebakaran lahan gambut meluas dengan asap tebal menutupi beberapa desa.",
        "ai_reason": "Api dan asap terlihat menyebar luas di banyak titik sekaligus.",
        "description": "Warga beberapa desa mulai mengungsi karena kabut asap.",
        "details_json": {"type": "fire", "visibility": "sangat_rendah"},
        "lat": -3.3194, "lng": 114.5908,
        "location_source": "demo", "location_label": "Sekitar Banjarmasin, Kalimantan Selatan",
        "published_at": _jam_lalu(3),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000006",
        "status": "active",
        "type": "fire",
        "severity": "tinggi",
        "ai_summary": "Kebakaran lahan gambut dengan kobaran api terlihat di satu area perkebunan.",
        "ai_reason": "Api besar terlihat jelas di satu lokasi, belum menyebar ke pemukiman.",
        "description": None,
        "details_json": {"type": "fire", "visibility": "terbatas"},
        "lat": -2.2096, "lng": 113.9213,
        "location_source": "demo", "location_label": "Sekitar Palangka Raya, Kalimantan Tengah",
        "published_at": _jam_lalu(6),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000007",
        "status": "active",
        "type": "fire",
        "severity": "sedang",
        "ai_summary": "Asap dari pembakaran lahan terlihat di pinggir jalan lintas provinsi.",
        "ai_reason": "Asap sedang terlihat, sumber api kecil dan lokal.",
        "description": None,
        "details_json": {"type": "fire", "visibility": "terbatas"},
        "lat": -2.5330, "lng": 112.9501,
        "location_source": "demo", "location_label": "Sekitar Sampit, Kalimantan Tengah",
        "published_at": _jam_lalu(10),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000008",
        "status": "active",
        "type": "fire",
        "severity": "tinggi",
        "ai_summary": "Kebakaran hutan dengan kobaran api besar mendekati jalan utama.",
        "ai_reason": "Kobaran api tinggi terlihat jelas dekat akses jalan.",
        "description": "Petugas pemadam sudah menuju lokasi.",
        "details_json": {"type": "fire", "visibility": "terbatas"},
        "lat": -0.0263, "lng": 109.3425,
        "location_source": "demo", "location_label": "Sekitar Pontianak, Kalimantan Barat",
        "published_at": _jam_lalu(14),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000009",
        "status": "active",
        "type": "flood",
        "severity": "tinggi",
        "ai_summary": "Banjir merendam permukiman dengan arus deras terlihat di beberapa ruas jalan.",
        "ai_reason": "Air tinggi dan arus deras terlihat jelas di area padat penduduk.",
        "description": "Beberapa keluarga mengungsi ke masjid terdekat.",
        "details_json": {"type": "flood", "water_depth": ">100cm", "current": "deras"},
        "lat": 5.5483, "lng": 95.3238,
        "location_source": "demo", "location_label": "Sekitar Banda Aceh, Aceh",
        "published_at": _jam_lalu(4),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000010",
        "status": "active",
        "type": "flood",
        "severity": "sedang",
        "ai_summary": "Genangan air terlihat di beberapa titik jalan setelah hujan deras.",
        "ai_reason": "Genangan cukup luas tapi arus masih tenang.",
        "description": None,
        "details_json": {"type": "flood", "water_depth": "30-100cm", "current": "tenang"},
        "lat": 5.1801, "lng": 97.1507,
        "location_source": "demo", "location_label": "Sekitar Lhokseumawe, Aceh",
        "published_at": _jam_lalu(12),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000011",
        "status": "active",
        "type": "landslide",
        "severity": "tinggi",
        "ai_summary": "Longsor menutup jalur utama dengan material tanah dan pohon tumbang.",
        "ai_reason": "Material longsor besar menutup akses jalan utama.",
        "description": None,
        "details_json": {"type": "landslide", "covered_area_m2": 90},
        "lat": -0.9471, "lng": 100.4172,
        "location_source": "demo", "location_label": "Sekitar Padang, Sumatera Barat",
        "published_at": _jam_lalu(7),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000012",
        "status": "active",
        "type": "flood",
        "severity": "sedang",
        "ai_summary": "Banjir menggenangi kawasan pesisir setelah air laut pasang bercampur hujan.",
        "ai_reason": "Genangan cukup luas di area pesisir, arus tidak deras.",
        "description": None,
        "details_json": {"type": "flood", "water_depth": "30-100cm", "current": "tenang"},
        "lat": -5.1477, "lng": 119.4327,
        "location_source": "demo", "location_label": "Sekitar Makassar, Sulawesi Selatan",
        "published_at": _jam_lalu(9),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000013",
        "status": "active",
        "type": "landslide",
        "severity": "sedang",
        "ai_summary": "Material tanah longsor kecil menutup sebagian bahu jalan pegunungan.",
        "ai_reason": "Longsoran kecil, belum menutup seluruh badan jalan.",
        "description": None,
        "details_json": {"type": "landslide", "covered_area_m2": 20},
        "lat": -7.7326, "lng": 110.4204,
        "location_source": "demo", "location_label": "Sekitar Sleman, DI Yogyakarta",
        "published_at": _jam_lalu(16),
    },
    {
        "id": "b6e1f2a0-0000-4000-8000-000000000014",
        "status": "active",
        "type": "flood",
        "severity": "tinggi",
        "ai_summary": "Banjir merendam permukiman sekitar sungai dengan arus terlihat deras.",
        "ai_reason": "Air tinggi dan arus deras terlihat di sepanjang bantaran sungai.",
        "description": None,
        "details_json": {"type": "flood", "water_depth": ">100cm", "current": "deras"},
        "lat": -2.5330, "lng": 140.7181,
        "location_source": "demo", "location_label": "Sekitar Jayapura, Papua",
        "published_at": _jam_lalu(18),
    },
] + _konfirmasi_tambahan(
    "b6e1f2a0-2000-4000-8000-0000000000", -3.3194, 114.5908, 9, "fire", "Sekitar Banjarmasin, Kalimantan Selatan",
) + _konfirmasi_tambahan(
    "b6e1f2a0-3000-4000-8000-0000000000", -2.5330, 112.9501, 3, "fire", "Sekitar Sampit, Kalimantan Tengah",
)

def build_demo_rows(now: datetime | None = None) -> list[dict]:
    """Sesuaikan fixture lama ke skema 005+, tanpa mengarang hasil AI/foto/konfirmasi."""
    now = now or datetime.now(timezone.utc)
    rows = []
    for fixture in REPORTS:
        observed = datetime.fromisoformat(fixture["published_at"])
        expires = observed + timedelta(hours=settings.report_active_ttl_hours)
        held = fixture["status"] == "disputed_hidden"
        status = "held" if held else "closed" if expires <= now else "active"
        rows.append({
            **fixture,
            "author_id": fixture.get("author_id", DEMO_AUTHOR_ID),
            "is_demo": True,
            "status": status,
            "closure_reason": "expired" if status == "closed" else None,
            "verification_status": "under_review" if held else "unconfirmed",
            "reported_type": fixture["type"],
            "observed_at": observed.isoformat(),
            "observation_time_known": True,
            "expires_at": expires.isoformat(),
            "photo_path": None,
            "photo_source": "none",
            "ai_status": "not_requested",
            "ai_summary": None,
            "ai_reason": None,
            "severity": None,
            "risk_flags": ["demo_fixture"],
            "location_label": f"DEMO — {fixture['location_label']}",
        })
    return rows


def main() -> None:
    if not settings.demo_mode:
        raise SystemExit("Seed ditolak: gunakan database demo terpisah dengan DEMO_MODE=true.")
    client = get_client()

    client.table("reports").delete().eq("is_demo", True).execute()
    print("laporan DEMO lama dihapus")

    rows = build_demo_rows()
    client.table("reports").insert(rows).execute()

    print(f"masuk: {len(rows)} fixture DEMO; tidak terlihat di feed/nearby/density/chat publik")
    print("UUID fixture bukan token login. Gunakan Auth nyata dan alur laporan di staging untuk demo UI.")


if __name__ == "__main__":
    main()
