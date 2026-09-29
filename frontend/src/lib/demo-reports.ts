import type { DisasterType, LocationSource, Report, Severity } from "@/types/report";

// Radius perhatian mengikuti PRD v2.3 dan harus sama dengan backend. Radiusnya dalam meter;
// radius heatmap Leaflet dalam piksel, sehingga keduanya tidak boleh disamakan.
export const heatmapRadiusPx = 25;
export const heatmapBlurPx = 15;
// Warna dan label persis sesuai desain Figma "Tool tip detail bencana"
// (https://www.figma.com/design/GEvmpaKV6swe0PCwgyaT2Z/GEMA?node-id=223-8863).
export const severityMap: Record<Severity, {
  color: string;
  textColor: string;
  warningRadiusM: number;
  label: string;
  radiusLabel: string;
  badgeBg: string;
}> = {
  rendah: { color: "#0D5D3A", textColor: "#FAFAFA", warningRadiusM: 0, label: "TERKENDALI", radiusLabel: "", badgeBg: "rgba(13, 93, 58, 0.22)" },
  sedang: { color: "#FFBB00", textColor: "#000000", warningRadiusM: 1000, label: "WASPADA", radiusLabel: "radius ±1 km", badgeBg: "#F0F0F0" },
  tinggi: { color: "#CF0003", textColor: "#FAFAFA", warningRadiusM: 3000, label: "BAHAYA", radiusLabel: "radius 3-5 km", badgeBg: "#FFD1D1" },
  kritis: { color: "#242424", textColor: "#FAFAFA", warningRadiusM: 10000, label: "KRITIS", radiusLabel: "radius >10 km", badgeBg: "#242424" },
};

export const severityOrder = ["rendah", "sedang", "tinggi", "kritis"] as const satisfies readonly Severity[];

// "TERKENDALI" saja (tanpa radius); yang lain "WASPADA (radius ±1 km)" dst.
export function severityStatusLabel(severity: Severity): string {
  const { label, radiusLabel } = severityMap[severity];
  return radiusLabel ? `${label} (${radiusLabel})` : label;
}

export const disasterNames: Record<DisasterType, string> = {
  flood: "Banjir",
  landslide: "Tanah longsor",
  fire: "Kebakaran",
};

// Sesuai badge jenis bencana di Figma; ikon dari public/disaster_icon (di-merge Track B).
export const disasterBadge: Record<DisasterType, { label: string; bg: string; icon: string }> = {
  flood: { label: "BANJIR", bg: "#1C64CF", icon: "/disaster_icon/flood.png" },
  landslide: { label: "LONGSOR", bg: "#82500D", icon: "/disaster_icon/landslide.png" },
  fire: { label: "KEBAKARAN", bg: "#C64D02", icon: "/disaster_icon/fire.png" },
};

// "Terakhir diperbaharui 15 menit lalu" dst. -- dibulatkan ke satuan waktu terdekat.
export function timeAgoLabel(iso: string, now = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "Baru saja diperbaharui";
  if (minutes < 60) return `Terakhir diperbaharui ${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Terakhir diperbaharui ${hours} jam lalu`;
  return `Terakhir diperbaharui ${Math.round(hours / 24)} hari lalu`;
}

// "Respons: Menunggu bantuan" dst. -- dari help_status yang sudah dihitung backend.
export const helpResponseLabel: Record<Report["help_status"], string> = {
  belum_ada_konfirmasi: "Menunggu bantuan",
  belum_terlihat: "Menunggu bantuan",
  terlihat: "Bantuan terlihat warga",
};

export const demoNow = Date.now();
const hoursAgo = (hours: number) => new Date(demoNow - hours * 60 * 60 * 1000).toISOString();

// Satu sumber data dummy untuk B1, B2, dan B3. Semua koordinat di sini adalah lokasi demo.
export const demoReports: Report[] = [
  {
    id: "b6e1f2a0-0000-4000-8000-000000000001",
    status: "active",
    type: "flood",
    severity: "tinggi",
    ai_summary: "Genangan diperkirakan lebih dari 1 meter dengan arus terlihat deras.",
    description: "Air masuk ke rumah warga sejak siang.",
    details: { type: "flood", water_depth: ">100cm", current: "deras" },
    location_label: "Sekitar Jl. Asia Afrika, Bandung",
    location_source: "demo",
    public_lat: -6.9216,
    public_lng: 107.6071,
    published_at: hoursAgo(2),
    created_at: hoursAgo(2.1),
    is_demo: true,
    help_status: "belum_ada_konfirmasi",
    seen_count: 0,
    not_seen_count: 0,
    false_vote_count: 0,
  },
  {
    id: "b6e1f2a0-0000-4000-8000-000000000002",
    status: "active",
    type: "landslide",
    severity: "sedang",
    ai_summary: "Material tanah terlihat menutup sebagian akses jalan.",
    description: "Warga diminta berhati-hati saat melintas.",
    details: { type: "landslide", covered_area_m2: 25 },
    location_label: "Sekitar Dago Atas, Bandung",
    location_source: "demo",
    public_lat: -6.8679,
    public_lng: 107.6208,
    published_at: hoursAgo(5),
    created_at: hoursAgo(5.2),
    is_demo: true,
    help_status: "belum_terlihat",
    seen_count: 0,
    not_seen_count: 1,
    false_vote_count: 0,
  },
  {
    id: "b6e1f2a0-0000-4000-8000-000000000003",
    status: "active",
    type: "fire",
    severity: "tinggi",
    ai_summary: "Asap tebal terlihat dan jarak pandang tampak sangat rendah.",
    description: "Asap terlihat dari beberapa bangunan sekitar.",
    details: { type: "fire", visibility: "sangat_rendah" },
    location_label: "Sekitar Jl. Braga, Bandung",
    location_source: "demo",
    public_lat: -6.9178,
    public_lng: 107.6098,
    published_at: hoursAgo(1),
    created_at: hoursAgo(1.1),
    is_demo: true,
    help_status: "terlihat",
    seen_count: 2,
    not_seen_count: 0,
    false_vote_count: 0,
  },
  {
    id: "b6e1f2a0-0000-4000-8000-000000000004",
    status: "active",
    type: "flood",
    severity: "rendah",
    ai_summary: "Genangan dangkal tampak di tepi jalan; arus tidak terlihat deras.",
    description: null,
    details: { type: "flood", water_depth: "<30cm", current: "tenang" },
    location_label: "Sekitar Alun-alun Bandung",
    location_source: "demo",
    public_lat: -6.9219,
    public_lng: 107.6065,
    published_at: hoursAgo(3),
    created_at: hoursAgo(3.1),
    is_demo: true,
    help_status: "belum_ada_konfirmasi",
    seen_count: 0,
    not_seen_count: 0,
    false_vote_count: 0,
  },
  {
    id: "b6e1f2a0-0000-4000-8000-000000000005",
    status: "active",
    type: "landslide",
    severity: "tinggi",
    ai_summary: "Material longsor besar terlihat dekat permukiman.",
    description: "Akses jalan masih tertutup material.",
    details: { type: "landslide", covered_area_m2: 120 },
    location_label: "Sekitar Ciumbuleuit, Bandung",
    location_source: "demo",
    public_lat: -6.8755,
    public_lng: 107.6046,
    published_at: hoursAgo(28),
    created_at: hoursAgo(28.2),
    is_demo: true,
    help_status: "belum_ada_konfirmasi",
    seen_count: 0,
    not_seen_count: 0,
    false_vote_count: 1,
  },
  {
    id: "b6e1f2a0-0000-4000-8000-000000000007",
    status: "active",
    type: "flood",
    severity: "kritis",
    ai_summary: "Banjir luas terlihat menutup banyak rumah dan beberapa ruas jalan.",
    description: "Simulasi kejadian skala luas untuk menguji radius perhatian 10 km.",
    details: { type: "flood", water_depth: ">100cm", current: "deras" },
    location_label: "Sekitar Bandung Timur (DEMO)",
    location_source: "demo",
    public_lat: -6.955,
    public_lng: 107.688,
    published_at: hoursAgo(1.5),
    created_at: hoursAgo(1.6),
    is_demo: true,
    help_status: "belum_ada_konfirmasi",
    seen_count: 0,
    not_seen_count: 0,
    false_vote_count: 0,
  },
  {
    id: "b6e1f2a0-0000-4000-8000-000000000006",
    status: "disputed_hidden",
    type: "fire",
    severity: "sedang",
    ai_summary: "Asap terlihat di sekitar bangunan, tetapi laporan sedang disanggah warga.",
    description: null,
    details: { type: "fire", visibility: "terbatas" },
    location_label: "Sekitar Jl. Cihampelas, Bandung",
    location_source: "demo",
    public_lat: -6.8938,
    public_lng: 107.6049,
    published_at: hoursAgo(4),
    created_at: hoursAgo(4.1),
    is_demo: true,
    help_status: "belum_ada_konfirmasi",
    seen_count: 0,
    not_seen_count: 0,
    false_vote_count: 3,
  },
];

export type MapLocation = { lat: number; lng: number; label: string; source?: LocationSource; accuracy_m?: number };

export function isWarningZoneReport(report: Report, now = Date.now()) {
  if (report.status !== "active" || !severityMap[report.severity].warningRadiusM || !report.published_at) {
    return false;
  }
  const age = now - new Date(report.published_at).getTime();
  return age >= 0 && age <= 24 * 60 * 60 * 1000;
}

// ponytail: B1 memakai koordinat publik dummy. Saat C1, ambil hasil /api/nearby
// yang menghitung jarak dari koordinat asli di server.
export function nearestWarningZone(reports: Report[], location: MapLocation) {
  const radians = Math.PI / 180;
  let nearest: { report: Report; distance_m: number } | null = null;
  for (const report of reports) {
    if (!isWarningZoneReport(report)) continue;
    const dLat = (report.public_lat - location.lat) * radians;
    const dLng = (report.public_lng - location.lng) * radians;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(location.lat * radians) * Math.cos(report.public_lat * radians) *
      Math.sin(dLng / 2) ** 2;
    const distance_m = 2 * 6371000 * Math.asin(Math.sqrt(a));
    if (distance_m <= severityMap[report.severity].warningRadiusM &&
      (!nearest || distance_m < nearest.distance_m)) {
      nearest = { report, distance_m };
    }
  }
  return nearest;
}
