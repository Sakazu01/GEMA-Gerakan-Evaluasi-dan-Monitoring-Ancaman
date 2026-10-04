import type { DisasterType, LocationSource, Report, Severity } from "@/types/report";

// Radius informasi komunitas tetap 500 meter untuk semua tingkat keparahan.
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
  rendah: { color: "#0D5D3A", textColor: "#FFFFFF", warningRadiusM: 500, label: "Indikasi visual ringan", radiusLabel: "jangkauan informasi 500 m", badgeBg: "#DCFCE7" },
  sedang: { color: "#FFBB00", textColor: "#0F172A", warningRadiusM: 500, label: "Indikasi visual sedang", radiusLabel: "jangkauan informasi 500 m", badgeBg: "#FEF3C7" },
  tinggi: { color: "#CF0003", textColor: "#FFFFFF", warningRadiusM: 500, label: "Indikasi visual tinggi", radiusLabel: "jangkauan informasi 500 m", badgeBg: "#FEE2E2" },
  kritis: { color: "#242424", textColor: "#FFFFFF", warningRadiusM: 500, label: "Indikasi visual kritis", radiusLabel: "jangkauan informasi 500 m", badgeBg: "#242424" },
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
export function severityStatusLabel(severity: Severity | null): string {
  return severity ? severityMap[severity].label : "Analisis belum tersedia";
}

export const neutralSeverity = {color:"#64748B",textColor:"#FFFFFF",warningRadiusM:0,label:"Belum dikonfirmasi",radiusLabel:"",badgeBg:"#F1F5F9"};
export function visualStyle(severity:Severity|null){return severity?severityMap[severity]:neutralSeverity;}
export function mapStyle(report:Report){return report.verification_status==="confirmed"?visualStyle(report.severity):neutralSeverity;}
export function evidenceLabel(report:Report){return report.verification_status==="confirmed"?"Dikonfirmasi pengelola komunitas":report.verification_status==="under_review"?"Sedang ditinjau":"Belum dikonfirmasi";}
export function awarenessRadius(report:Report){return report.awareness_radius_m??(report.severity?severityMap[report.severity].warningRadiusM:0);}

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
export const disasterGuides: Record<DisasterType, { headline: string; do: string[]; dont: string[]; before: string[]; during: string[]; after: string[] }> = {
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
    before: [
      "Siapkan tas siaga berisi dokumen, obat, senter, dan air minum.",
      "Kenali jalur evakuasi dan tempat yang lebih tinggi di sekitar rumah.",
      "Simpan dokumen penting dalam wadah kedap air.",
      "Pantau informasi cuaca dari BMKG dan BPBD.",
    ],
    during: [
      "Matikan listrik dan gas jika masih aman dilakukan.",
      "Segera pindah ke tempat yang lebih tinggi.",
      "Hindari kabel listrik, tiang, dan air yang bergolak.",
      "Hubungi 112 jika ada orang yang terjebak.",
    ],
    after: [
      "Pulang hanya setelah petugas menyatakan aman.",
      "Pakai sepatu dan sarung tangan saat membersihkan rumah.",
      "Buang makanan dan air minum yang terendam banjir.",
      "Cuci tangan dan waspadai penyakit seperti diare dan leptospirosis.",
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
    before: [
      "Kenali tandanya: retakan tanah, pohon atau tiang yang miring, dan air sungai yang tiba-tiba keruh.",
      "Hindari tinggal atau membangun di dekat lereng curam.",
      "Pastikan saluran air di sekitar rumah tidak tersumbat.",
      "Tentukan jalur menjauh dari lereng bersama keluarga.",
    ],
    during: [
      "Segera menjauh dari jalur longsoran, lari ke samping dan bukan searah aliran tanah.",
      "Menuju tempat yang kokoh dan lapang.",
      "Jika terjebak, lindungi kepala dan tubuh Anda.",
      "Hubungi 112 atau 115 jika ada orang yang tertimbun.",
    ],
    after: [
      "Jangan masuk ke area longsor sebelum dinyatakan aman.",
      "Waspadai longsor susulan, terutama saat hujan.",
      "Laporkan kerusakan jalan dan jembatan kepada petugas.",
      "Periksa keluarga dan tetangga, beri pertolongan pertama bila perlu.",
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
    before: [
      "Periksa instalasi listrik dan selang gas secara berkala.",
      "Ketahui lokasi alat pemadam api ringan dan jalur keluar.",
      "Jangan menumpuk barang di dekat pintu dan jalur keluar.",
      "Simpan nomor pemadam kebakaran 113.",
    ],
    during: [
      "Berteriak dan ajak semua orang segera keluar.",
      "Merunduk di bawah asap dan tutup hidung dengan kain basah.",
      "Tutup pintu di belakang Anda untuk memperlambat api.",
      "Hubungi 113 setelah berada di tempat aman.",
      "Jika pakaian terbakar: berhenti, rebahkan diri, lalu berguling.",
    ],
    after: [
      "Jangan masuk kembali sebelum petugas menyatakan aman.",
      "Periksa kesehatan, terutama akibat asap, dan cari bantuan medis bila sesak.",
      "Jangan menyalakan listrik atau gas sebelum diperiksa.",
      "Laporkan kerusakan kepada petugas setempat.",
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

export type MapLocation = { lat: number; lng: number; label: string; source?: LocationSource; accuracy_m?: number; measured_at?: string };

// Titik kumpul CONTOH (bukan data resmi BPBD/pemda setempat) -- dipakai /evakuasi supaya
// panduan bisa menunjuk titik terdekat dari laporan yang dipilih, alih-alih placeholder
// kosong. Satu titik per klaster kota yang dipakai seed_demo.py agar selalu ada yang dekat.
export const titikKumpul: { name: string; city: string; lat: number; lng: number }[] = [
  { name: "Lapangan Gasibu", city: "Bandung", lat: -6.9018, lng: 107.6182 },
  { name: "Alun-alun Kota Bandung", city: "Bandung", lat: -6.9218, lng: 107.6071 },
  { name: "Lapangan Tegallega", city: "Bandung", lat: -6.9364, lng: 107.6013 },
  { name: "Lapangan Saparua", city: "Bandung", lat: -6.9112, lng: 107.6222 },
  { name: "Alun-alun Ujungberung", city: "Bandung", lat: -6.9100, lng: 107.7040 },
  { name: "Alun-alun Cimahi", city: "Cimahi", lat: -6.8721, lng: 107.5423 },
  { name: "Stadion Si Jalak Harupat", city: "Kabupaten Bandung", lat: -7.0281, lng: 107.5373 },
  { name: "Monumen Nasional (Monas)", city: "Jakarta Pusat", lat: -6.1754, lng: 106.8272 },
  { name: "Lapangan Banteng", city: "Jakarta Pusat", lat: -6.1699, lng: 106.8350 },
  { name: "Stadion Gelora Bung Karno", city: "Jakarta Pusat", lat: -6.2183, lng: 106.8018 },
  { name: "Stadion Patriot Candrabhaga", city: "Bekasi", lat: -6.2262, lng: 106.9954 },
  { name: "Lapangan Sempur", city: "Bogor", lat: -6.5895, lng: 106.7898 },
  { name: "Lapangan Simpang Lima", city: "Semarang", lat: -6.9903, lng: 110.4228 },
  { name: "Alun-alun Utara", city: "Yogyakarta", lat: -7.8030, lng: 110.3645 },
  { name: "Alun-alun Banjarnegara", city: "Banjarnegara", lat: -7.3970, lng: 109.6890 },
  { name: "Tugu Pahlawan", city: "Surabaya", lat: -7.2457, lng: 112.7378 },
  { name: "Taman Bungkul", city: "Surabaya", lat: -7.2915, lng: 112.7398 },
  { name: "Alun-alun Kota Malang", city: "Malang", lat: -7.9823, lng: 112.6308 },
  { name: "Lapangan Merdeka", city: "Medan", lat: 3.5897, lng: 98.6741 },
  { name: "Lapangan Imam Bonjol", city: "Padang", lat: -0.9486, lng: 100.3567 },
  { name: "Benteng Kuto Besak", city: "Palembang", lat: -2.9917, lng: 104.7664 },
  { name: "Lapangan Saburai", city: "Bandar Lampung", lat: -5.4300, lng: 105.2620 },
  { name: "Lapangan Puputan Badung", city: "Denpasar", lat: -8.6558, lng: 115.2166 },
  { name: "Lapangan Merdeka", city: "Ambon", lat: -3.6955, lng: 128.1830 },
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

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
  if (report.status !== "active" || report.is_demo || report.verification_status !== "confirmed" || !awarenessRadius(report) || !report.expires_at) {
    return false;
  }
  return new Date(report.expires_at).getTime() > now;
}
