"""Fixture privat pada database demo terpisah, bukan laporan untuk feed publik.

Jalankan dari folder backend dengan DEMO_MODE=true: python -m scripts.seed_demo [--showcase].
Tidak membuat sesi Auth, mengirim notifikasi, atau menjalankan analisis AI.
"""

import math
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import settings  # noqa: E402
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


# (nama area, lat, lng, jenis dominan, titik tersebar, pelapor di titik panas)
_SEBARAN = [
    ("Dago, Bandung", -6.8860, 107.6130, "landslide", 4, 7),
    ("Cihampelas, Bandung", -6.8970, 107.6040, "flood", 4, 3),
    ("Buah Batu, Bandung", -6.9460, 107.6350, "flood", 3, 11),
    ("Ujungberung, Bandung", -6.9150, 107.7060, "landslide", 3, 2),
    ("Lembang, Bandung Barat", -6.8120, 107.6180, "landslide", 3, 0),
    ("Dayeuhkolot, Kabupaten Bandung", -6.9830, 107.6280, "flood", 5, 14),
    ("Baleendah, Kabupaten Bandung", -7.0010, 107.6270, "flood", 3, 5),
    ("Kampung Melayu, Jakarta Timur", -6.2260, 106.8630, "flood", 4, 9),
    ("Kemang, Jakarta Selatan", -6.2650, 106.8100, "flood", 3, 3),
    ("Penjaringan, Jakarta Utara", -6.1250, 106.7900, "flood", 3, 0),
    ("Bekasi Utara", -6.2000, 106.9900, "flood", 4, 6),
    ("Bogor Selatan", -6.6200, 106.8000, "landslide", 4, 4),
    ("Tangerang Kota", -6.1780, 106.6300, "fire", 3, 0),
    ("Semarang Utara", -6.9570, 110.4200, "flood", 4, 12),
    ("Banjarnegara, Jawa Tengah", -7.4000, 109.6900, "landslide", 3, 8),
    ("Sleman, DI Yogyakarta", -7.7326, 110.4204, "landslide", 3, 0),
    ("Surabaya Timur", -7.2800, 112.7800, "flood", 3, 2),
    ("Malang Kota", -7.9800, 112.6300, "fire", 2, 0),
    ("Banda Aceh", 5.5483, 95.3238, "flood", 2, 0),
    ("Medan Deli", 3.6800, 98.7000, "flood", 3, 3),
    ("Padang Barat", -0.9500, 100.3500, "landslide", 3, 5),
    ("Pekanbaru", 0.5070, 101.4478, "fire", 4, 10),
    ("Jambi Kota", -1.6101, 103.6131, "fire", 3, 6),
    ("Palembang Ilir", -2.9760, 104.7750, "fire", 3, 12),
    ("Bandar Lampung", -5.4290, 105.2610, "flood", 2, 0),
    ("Pontianak Kota", -0.0263, 109.3425, "fire", 3, 9),
    ("Palangka Raya", -2.2100, 113.9200, "fire", 4, 14),
    ("Banjarmasin Timur", -3.3194, 114.5908, "fire", 3, 4),
    ("Samarinda Ulu", -0.5022, 117.1536, "flood", 3, 0),
    ("Makassar Panakkukang", -5.1477, 119.4327, "flood", 3, 6),
    ("Manado", 1.4748, 124.8421, "landslide", 3, 7),
    ("Palu Barat", -0.9000, 119.8600, "flood", 2, 0),
    ("Jayapura", -2.5330, 140.7181, "flood", 2, 3),
    ("Kupang", -10.1772, 123.6070, "fire", 2, 0),
    ("Mataram", -8.5833, 116.1167, "landslide", 2, 0),
    ("Denpasar", -8.6500, 115.2167, "flood", 2, 0),
    ("Ambon", -3.6954, 128.1814, "landslide", 2, 0),
]


def build_showcase_rows(now: datetime | None = None, seed: int = 2026) -> list[dict]:
    """Titik simulasi untuk demo peta: aktif, diterima, tanpa hasil AI atau foto palsu.

    Semua baris berlabel DEMO dan is_demo=true; hanya tampil bila DEMO_SHOWCASE=true.
    """
    now = now or datetime.now(timezone.utc)
    rng = random.Random(seed)
    max_hours = min(9.0, settings.report_active_ttl_hours - 1)
    rows = []
    for name, lat, lng, dominant, scatter, hot in _SEBARAN:
        points = [(lat + rng.uniform(-0.0002, 0.0002), lng + rng.uniform(-0.0002, 0.0002), dominant) for _ in range(hot)]
        for _ in range(scatter):
            angle, radius = rng.uniform(0, 2 * math.pi), rng.uniform(0.004, 0.02)
            kind = dominant if rng.random() < 0.7 else rng.choice(("flood", "landslide", "fire"))
            points.append((lat + radius * math.sin(angle), lng + radius * math.cos(angle), kind))
        for plat, plng, kind in points:
            index = len(rows) + 1
            observed = now - timedelta(hours=rng.uniform(0.5, max_hours))
            published = observed + timedelta(minutes=5)
            rows.append({
                "id": str(uuid5(NAMESPACE_URL, f"gema-showcase/{index}")),
                "status": "active", "type": kind, "reported_type": kind, "severity": None,
                "ai_status": "not_requested", "ai_summary": None, "ai_reason": None,
                "description": None, "details_json": {"type": kind},
                "lat": round(plat, 6), "lng": round(plng, 6),
                "location_source": "demo", "location_label": f"Sekitar {name}",
                "published_at": published.isoformat(), "observed_at": observed.isoformat(),
                "observation_time_known": True,
                "expires_at": (observed + timedelta(hours=settings.report_active_ttl_hours)).isoformat(),
                "verification_status": "unconfirmed", "closure_reason": None,
                "photo_path": None, "photo_source": "none", "risk_flags": ["demo_fixture"],
                "author_id": _fake_author(1000 + index), "is_demo": True,
                "responder_status": "ACCEPTED", "accepted_at": published.isoformat(), "accepted_by": "Simulasi demo",
            })
    return rows


def main() -> None:
    if not settings.demo_mode:
        raise SystemExit("Seed ditolak: gunakan database demo terpisah dengan DEMO_MODE=true.")
    client = get_client()

    client.table("reports").delete().eq("is_demo", True).execute()
    print("laporan DEMO lama dihapus")

    showcase = build_showcase_rows() if "--showcase" in sys.argv else []
    rows = [] if showcase else build_demo_rows()
    # Dua kelompok punya kolom berbeda; PostgREST mengisi kolom yang absen dengan null, jadi tidak dicampur.
    for group in (rows, showcase):
        for start in range(0, len(group), 100):
            client.table("reports").insert(group[start:start + 100]).execute()

    print(f"masuk: {len(rows)} fixture DEMO privat dan {len(showcase)} titik simulasi")
    if showcase:
        print("titik simulasi tampil di peta hanya bila backend dijalankan dengan DEMO_SHOWCASE=true")
    else:
        print("fixture tidak terlihat di feed/nearby/density/chat publik")
    print("UUID fixture bukan token login. Gunakan Auth nyata dan alur laporan di staging untuk demo UI.")


if __name__ == "__main__":
    main()
