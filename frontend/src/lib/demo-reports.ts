import type { DisasterType, LocationSource, Report, Severity } from "@/types/report";

// Radius perhatian mengikuti PRD v2.3 dan harus sama dengan backend.
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

// Target eskalasi instansi per tingkat keparahan -- dari proposal tim (Tabel 4.1). Teks
// referensi murni di frontend, bukan aturan pengiriman grup Telegram responder.
// Teks ini tidak berarti instansi dalam daftar sudah menerima notifikasi.
export const escalationTarget: Record<Severity, string> = {
  rendah: "Pemantau internal sistem",
  sedang: "Instansi penanggung jawab wilayah",
  tinggi: "Penambahan BASARNAS dan instansi teknis",
  kritis: "Eskalasi hingga tingkat komando nasional",
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

// Satu sumber panduan keselamatan per jenis bencana -- dipakai di /evakuasi DAN di layar
// "Hasil Identifikasi" (ReportForm) supaya isinya tidak pernah dobel-tulis/berbeda.
export const disasterGuides: Record<DisasterType, { headline: string; do: string[]; dont: string[] }> = {
  flood: {
    headline: "Jauhi arus dan genangan dalam",
    do: [
      "Pindah ke tempat yang lebih tinggi jika aman dilakukan.",
      "Bawa obat, dokumen penting, dan telepon jika mudah dijangkau.",
      "Ikuti arahan dan jalur yang ditunjukkan petugas.",
    ],
    dont: [
      "Jangan menyeberangi arus banjir, walau terlihat dangkal.",
      "Jangan menyentuh peralatan listrik saat berada di air.",
      "Jangan kembali ke lokasi hanya untuk mengambil barang.",
    ],
  },
  landslide: {
    headline: "Jauhi jalur longsor",
    do: [
      "Menjauh dari lereng dan material yang masih bisa bergerak.",
      "Cari tempat terbuka/lapang jika aman dilakukan.",
      "Waspadai longsor susulan sebelum kembali ke lokasi.",
    ],
    dont: [
      "Jangan berlindung di bawah tebing atau tanah yang retak.",
      "Jangan kembali ke area longsor sebelum dinyatakan aman petugas.",
    ],
  },
  fire: {
    headline: "Jauhi api dan asap",
    do: [
      "Segera menjauh dari sumber api dan asap.",
      "Ikuti jalur keluar yang aman.",
      "Periksa listrik dan gas hanya jika bisa dilakukan tanpa mendekati bahaya.",
    ],
    dont: [
      "Jangan kembali untuk mengambil barang.",
      "Jangan gunakan lift saat evakuasi dari bangunan.",
    ],
  },
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

export type MapLocation = { lat: number; lng: number; label: string; source?: LocationSource; accuracy_m?: number };

// Titik kumpul CONTOH (bukan data resmi BPBD/pemda setempat) -- dipakai /evakuasi supaya
// panduan bisa menunjuk titik terdekat dari laporan yang dipilih, alih-alih placeholder
// kosong. Satu titik per klaster kota yang dipakai seed_demo.py agar selalu ada yang dekat.
export const titikKumpul: { name: string; city: string; lat: number; lng: number }[] = [
  { name: "Lapangan Gasibu", city: "Bandung", lat: -6.9018, lng: 107.6182 },
  { name: "GOR Hasanuddin", city: "Banjarmasin", lat: -3.3200, lng: 114.5900 },
  { name: "Lapangan Sanaman Mantikei", city: "Palangka Raya", lat: -2.2100, lng: 113.9200 },
  { name: "Alun-alun Kota Sampit", city: "Sampit", lat: -2.5350, lng: 112.9450 },
  { name: "Alun-alun Kapuas", city: "Pontianak", lat: -0.0280, lng: 109.3350 },
  { name: "Lapangan Blang Padang", city: "Banda Aceh", lat: 5.5500, lng: 95.3200 },
  { name: "Alun-alun Kota Lhokseumawe", city: "Lhokseumawe", lat: 5.1800, lng: 97.1500 },
  { name: "GOR H. Agus Salim", city: "Padang", lat: -0.9450, lng: 100.4150 },
  { name: "Lapangan Karebosi", city: "Makassar", lat: -5.1400, lng: 119.4100 },
  { name: "Stadion Maguwoharjo", city: "Sleman", lat: -7.7380, lng: 110.4210 },
  { name: "GOR Cenderawasih", city: "Jayapura", lat: -2.5330, lng: 140.7050 },
];

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestTitikKumpul(lat: number, lng: number) {
  return titikKumpul
    .map((point) => ({ point, distance_m: haversineM(lat, lng, point.lat, point.lng) }))
    .sort((a, b) => a.distance_m - b.distance_m)[0];
}

export function isWarningZoneReport(report: Report, now = Date.now()) {
  if (report.status !== "active" || !severityMap[report.severity].warningRadiusM || !report.published_at) {
    return false;
  }
  const age = now - new Date(report.published_at).getTime();
  return age >= 0 && age <= 24 * 60 * 60 * 1000;
}
