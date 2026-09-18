"""Isi database dengan laporan DEMO. Jalankan: cd backend && python seed_demo.py

Semua baris ditandai is_demo=true dan dihapus dulu tiap kali dijalankan, jadi aman diulang
dan gampang dibersihkan sebelum lomba selesai (PRD §0: data simulasi tidak boleh dikira nyata).
"""

from datetime import datetime, timedelta, timezone

from app.services.supabase_client import get_client

# id tetap supaya /api/my-reports bisa diuji: pakai ini sebagai "Bearer <id>".
DEMO_AUTHOR_ID = "11111111-1111-4111-8111-111111111111"
_OTHER_VOTERS = [
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
]


def _jam_lalu(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=n)).isoformat()


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
]

# Laporan #1 dapat 2 suara "sudah terlihat" -> status bantuan jadi "terlihat" (PRD §9.3).
HELP_VOTES = [
    {"report_id": REPORTS[0]["id"], "voter_id": _OTHER_VOTERS[0], "value": "seen"},
    {"report_id": REPORTS[0]["id"], "voter_id": _OTHER_VOTERS[1], "value": "seen"},
    {"report_id": REPORTS[1]["id"], "voter_id": _OTHER_VOTERS[0], "value": "not_seen"},
]

# Laporan #4 disanggah 3 akun berbeda -> itu sebabnya statusnya disputed_hidden.
FALSE_VOTES = [
    {"report_id": REPORTS[3]["id"], "voter_id": voter} for voter in _OTHER_VOTERS
]


def main() -> None:
    client = get_client()

    client.table("reports").delete().eq("is_demo", True).execute()
    print("laporan DEMO lama dihapus")

    rows = [
        {**r, "author_id": DEMO_AUTHOR_ID, "is_demo": True, "photo_path": f"demo/{r['id']}.jpg"}
        for r in REPORTS
    ]
    client.table("reports").insert(rows).execute()
    client.table("help_votes").insert(HELP_VOTES).execute()
    client.table("false_votes").insert(FALSE_VOTES).execute()

    print(f"masuk: {len(rows)} laporan, {len(HELP_VOTES)} help_votes, {len(FALSE_VOTES)} false_votes")
    print(f"uji /api/my-reports pakai header: Authorization: Bearer {DEMO_AUTHOR_ID}")


if __name__ == "__main__":
    main()
