# PRD MVP — GEMA

**Gerakan Evaluasi dan Monitoring Ancaman**
**Versi:** 2.5 — adaptasi implementasi dari PRD asli v2.1 (18 September 2026)
**Konteks:** Hack Day IFest UNPAD 2026, subtema *Accessibility*
**Status:** dokumen kerja tim — diupdate selama development, bukan spesifikasi beku

> File ini adalah **satu sumber kebenaran** buat kamu dan tim supaya konteksnya sama. PRD asli (`PRD_GEMA_MVP.md`, v2.1) masih valid untuk bagian produk/domain bencana/aksesibilitas — dokumen ini menyalin bagian yang masih berlaku dan **mengganti bagian arsitektur teknis** yang sudah diputuskan berbeda saat development jalan.

## 0. Perubahan dari PRD asli v2.1 (baca ini dulu)

| Topik | PRD asli v2.1 | Keputusan aktual (sekarang) | Kenapa |
|---|---|---|---|
| Bentuk aplikasi | Satu repo Next.js, Route Handlers jadi backend | **Dua folder terpisah**: `frontend/` (Next.js) dan `backend/` (Python FastAPI) | Permintaan tim — biar dua orang bisa kerja paralel tanpa bentrok file, dan salah satu anggota lebih familiar Python |
| Bahasa backend | TypeScript (Route Handlers) | **Python (FastAPI)** | Sama seperti di atas |
| Model AI | Gemini `gemini-2.5-flash` (fixed) | **Belum final** — kode ditulis generik (`backend/app/services/model.py`, `MODEL_API_KEY`), Gemini tetap rekomendasi default kalau butuh keputusan cepat | Provider belum tentu Gemini; jangan lock-in nama/env var ke satu vendor |
| Role/akses | Tidak ada role sama sekali di P0; "dashboard petugas" eksplisit **di luar MVP** | **Role switcher kosmetik** (Warga/Pemerintah) di pojok kiri-bawah, toggle `localStorage`, BUKAN autentikasi nyata | Tim mau bisa nunjukin dua sudut pandang dashboard dari awal buat demo, tanpa bangun login dulu |
| Dashboard Pemerintah | Tidak ada | **Read-only monitoring**: statistik + tabel semua laporan (termasuk `disputed_hidden`/`is_demo`), tanpa aksi tulis | Cukup buat demo, tidak butuh alat kerja petugas sungguhan |
| Env config | Satu `.env` per app (bagian dari satu repo) | **Per-folder**: `backend/.env` dan `frontend/.env.local`, tidak ada `.env` di root | Next.js cuma baca env dari folder sendiri; masing-masing service jadi self-contained |
| Pembagian kerja | 4 jalur (A/B/C/D) | **2 orang**: satu pegang `backend/`, satu pegang `frontend/` | Tim cuma 2 orang; boundary folder otomatis mencegah bentrok merge |
| Deploy | Opsional, localhost cukup | **Akan di-deploy** (Vercel utk frontend + Render/Railway/Fly utk backend) supaya juri bisa akses sendiri | Permintaan tim: juri harus bisa coba alurnya sendiri, bukan cuma nonton video |
| Kriteria AI tambahan | Severity cuma "penilaian visual sementara" | **Eksplisit**: `severity="tinggi"` = perlu evakuasi/respons SEGERA (mis. banjir dalam+arus deras), beda dari genangan biasa (`rendah`/`sedang`) | Permintaan tim — pastikan sistem bisa bedain kejadian mendesak vs tidak, bukan cuma "ada air di foto" |
| Platform target | Web responsif (implisit: desktop+mobile) | **Web app mobile-only**, BUKAN aplikasi native/APK — layout, ukuran font, dan interaksi (peta full-bleed, tombol mengambang, drawer) dirancang khusus utk viewport ~360–430px, TIDAK dioptimalkan untuk desktop | Warga cukup buka link di browser HP-nya saat kejadian, tanpa install apa pun (beda dari native app yang perlu download+izin dulu) — kecepatan lapor lebih penting daripada distribusi lewat app store. Warga cuma punya HP, bukan multi-device, jadi tidak perlu breakpoint desktop |
| Identitas sementara | "Belum ada" (ditulis sebagai placeholder nanti) | **Anonymous browser-id**: frontend generate id acak (`localStorage: gema:anon-id`), dikirim sebagai `Authorization: Bearer <id>` di setiap request; backend (`deps/auth.py`) terima apa adanya TANPA verifikasi | Supaya endpoint yang butuh `author_id`/`voter_id` (my-reports, vote, publish) bisa diuji & dipakai demo sebelum login sungguhan ada — bukan keamanan nyata, siapa pun bisa ganti id di localStorage |

**Yang TIDAK berubah** (masih ikut PRD asli v2.1 apa adanya): cakupan bencana (banjir/longsor/kebakaran), bahasa produk (semua UI bahasa Indonesia), aturan bisnis (§9 di bawah — radius peringatan per severity §9.2, ambang sanggahan 3 akun, ambang bantuan 2 suara), prinsip aksesibilitas, larangan klaim berlebihan ("belum diverifikasi", bukan "terverifikasi"), dan seluruh 14 skenario penerimaan (AC-01 s.d. AC-14).

**Disclaimer:** ini MVP buat demo hackathon 1 hari, bukan produk produksi. Struktur dibuat minimal dan bertahap (lihat checkpoint di `.claude/plans/` kalau ada, atau `docs/PROGRESS.md`) — jangan tambah kompleksitas yang belum dibutuhkan checkpoint yang sedang dikerjakan.

## 1. Ringkasan produk

GEMA adalah **web app mobile-only** (bukan aplikasi native yang perlu diinstal) — warga cukup buka link di browser HP saat kejadian. GEMA membantu warga **melaporkan indikasi bencana dari foto**, melihat **laporan komunitas di peta dan daftar**, membaca **panduan keselamatan** saat dekat laporan berisiko tinggi, dan memberi **konfirmasi warga** soal kedatangan bantuan atau laporan yang diduga tidak benar. MVP menangani **banjir, tanah longsor, dan kebakaran** saja. Produk ini tidak mengirim petugas dan tidak mengeluarkan peringatan resmi. Untuk demo, backend mengirim notifikasi laporan ke satu grup Telegram responder yang dikonfigurasi tim; ini bukan integrasi resmi instansi. Tidak ada login di MVP ini — dua sudut pandang (warga/pemerintah) dipilih lewat **role switcher kosmetik** di pojok kiri-bawah (§2, §0); login sungguhan sengaja ditunda ke tahap "kalau produk ini dikembangkan penuh" (§3 — di luar MVP).

**Label peta:** "Laporan warga — belum diverifikasi". Lingkaran merah adalah **area perhatian sementara**, bukan batas bahaya resmi atau rute evakuasi. AI cuma menilai apa yang tampak di foto — tidak bisa memastikan waktu, lokasi, keaslian, atau kedatangan bantuan.

## 2. Pengguna

1. **Pelapor warga** — unggah foto, cek ringkasan AI, tambah data opsional, kirim.
2. **Warga sekitar** — baca laporan, area perhatian, tips keselamatan, hotline.
3. **Warga pemberi konfirmasi** — sampaikan bantuan sudah terlihat atau laporan tampak tidak benar.
4. **(Tambahan v2.2) Pemerintah** — role UI kosmetik yang lihat dashboard monitoring read-only. **Bukan pengguna dengan otentikasi nyata** — siapa pun bisa toggle ke role ini.

## 3. Ruang lingkup

### P0 — wajib selesai
Sama seperti PRD asli §4: beranda peta sebaran (marker + heatmap + area merah + daftar), buat laporan (foto→AI→tinjau→submit), filter gambar tidak relevan, area perhatian (dua kartu, radius mengikuti tingkat keparahan — §9.2), tips evakuasi statis, lacak tanggapan, hotline, sanggah laporan (3 akun → disembunyikan).

**Tambahan v2.2, di luar P0 PRD asli tapi sudah disepakati tim:** role switcher Warga/Pemerintah + dashboard Pemerintah read-only (statistik + tabel semua laporan). Ini kosmetik/demo, bukan fitur produksi — lihat §0 tabel di atas.

**Tambahan v2.5 — notifikasi responder Telegram untuk demo:** setelah laporan diterbitkan, backend mengirim ringkasan AI ke satu grup responder. Anggota grup dapat menekan **TERIMA LAPORAN** melalui tombol Telegram; webhook bersandi mencatat `responder_status=ACCEPTED` dan waktu penerimaan. Tracker pelapor menampilkan empat langkah yang dihubungkan garis, termasuk **Petugas Menuju Lokasi** sebagai langkah keempat. Saat status berubah menjadi `ACCEPTED`, langkah ketiga dan keempat menjadi hijau dan popup **LAPORAN DITERIMA PETUGAS MENUJU LOKASI** tampil selama 10 detik. Penerimaan bukan verifikasi kejadian, keberangkatan, atau kedatangan bantuan. Dashboard Pemerintah di web tetap read-only dan role switcher tetap kosmetik.

### P1 — setelah P0 stabil
Sama seperti PRD asli: search/filter di daftar, unggah ulang foto kalau analisis gagal, edit ringkasan AI sebelum submit, basemap satelit opsional.

### Di luar MVP
Login sungguhan, dispatch bantuan, verifikasi instansi, notifikasi push, chat, panggilan terintegrasi, rute evakuasi, prediksi bencana, integrasi BNPB/BPBD, deteksi gambar palsu forensik, proteksi akses nyata untuk role Pemerintah.

## 4. Prinsip produk

0. **Mobile-only** — produk ini HANYA didesain untuk dibuka di HP (viewport ~360–430px). Setiap layar (peta, form laporan, dashboard warga) dibangun full-bleed/mobile-first; tidak ada breakpoint desktop terpisah, jadi tampilan di layar lebar boleh terlihat sempit/tidak proporsional — itu bukan bug. Kecuali: dashboard Pemerintah (§3) tetap tabel biasa karena murni demo baca-baca, bukan alur warga.
1. **Aksesibilitas fungsi inti** — peta selalu ditemani daftar teks; status pakai kata+ikon, bukan warna saja; semua kontrol punya label dan urutan fokus logis.
2. **Bahasa tidak boleh melebihkan bukti** — pakai "indikasi", "berdasarkan foto", "dilaporkan warga", "belum terverifikasi". Hindari "bencana pasti terjadi", "zona aman", "bantuan resmi sudah tiba".
3. **Lokasi perkiraan** — izin lokasi diminta seperlunya; kalau ditolak, pilih titik manual. Peta publik membulatkan koordinat ~100m; pemeriksaan kedekatan pakai koordinat asli di server.
4. **Kartu mengambang bisa diminimalkan**, tidak mengunci layar, tidak menutupi atribusi peta/tombol aksi utama.
5. **Nomor darurat jelas asalnya** — 112 sebagai layanan darurat nasional, catat bahwa ketersediaan setempat perlu dicek.

## 5. Alur pengguna & AI

Ikuti PRD asli §6 dan §7 secara substansi (foto→lokasi→analisis→tinjau→submit; input khusus per jenis bencana dengan pilihan "Tidak tahu"; status UI wajib per §15 PRD asli). Yang berubah cuma implementasi teknis (§6 di bawah), bukan alurnya.

**Keluaran model AI** (skema tetap sama, provider belum final):
```text
validity: relevant | invalid | uncertain
disaster_type: flood | landslide | fire | null
severity: rendah | sedang | tinggi | kritis | null
summary_id: string <= 240 karakter | null
reason_id: string <= 120 karakter
```

**Kriteria `severity` (v2.3 — 4 tingkat, bukan 3):** setiap tingkat sekarang punya radius peringatan sendiri (lihat §9.2), bukan cuma satu ambang "tinggi" seperti versi sebelumnya:

| Tingkat | Label UI (badge warna) | Contoh visual | Radius peringatan |
|---|---|---|---|
| `rendah` | TERKENDALI (hijau) | Genangan dangkal tenang, sisa material kecil | Tidak ada — tidak pernah memicu peringatan |
| `sedang` | WASPADA (kuning) | Kejadian jelas terlihat tapi tidak bahaya langsung | 1 km |
| `tinggi` | BAHAYA (merah) | Bahaya besar butuh evakuasi SEGERA, cakupan lokal (satu jalan/bangunan) | 3 km |
| `kritis` | KRITIS (hitam) | Bahaya skala luas/regional (banyak rumah/jalan sekaligus) | 10 km |

Label UI di atas (`TERKENDALI`/`WASPADA`/`BAHAYA`/`KRITIS`) adalah string tetap yang dipakai di semua tempat severity ditampilkan ke warga (legenda beranda, badge daftar laporan, halaman detail) — didefinisikan satu tempat di `frontend/src/lib/demo-reports.ts` (`severityMap`). Jangan buat label baru di komponen lain; import dari sana.

Prompt model harus dikalibrasi ke ambang ini, dikombinasikan dengan input tambahan warga (`water_depth`, `current`, dll — lihat §11 data model), dan **bila ragu pilih tingkat yang lebih rendah** — jangan melebih-lebihkan skala. `severity != rendah` + `status=active` + umur <24 jam adalah pemicu area perhatian (§9.2); radiusnya mengikuti tabel di atas, bukan angka tunggal 300m lagi.

**Target eskalasi instansi (frontend-only, bukan integrasi nyata):** proposal awal tim (Tabel 4.1) punya kolom "Target Eskalasi Instansi" per tingkat keparahan. Ini **sudah diimplementasikan sebagai teks referensi murni di frontend** (`escalationTarget` di `frontend/src/lib/demo-reports.ts`, ditampilkan di kartu "Target eskalasi" pada halaman detail laporan — dipakai bersama oleh alur Warga dan drill-down Pemerintah) — **BUKAN penentu penerima notifikasi atau dispatch ke instansi**. Notifikasi v2.5 dikirim hanya ke grup responder demo yang dikonfigurasi tim. Pemetaannya: `rendah`→"Pemantau internal sistem", `sedang`→"Instansi penanggung jawab wilayah", `tinggi`→"Penambahan BASARNAS dan instansi teknis", `kritis`→"Eskalasi hingga tingkat komando nasional". Setiap tampilannya wajib disertai disclaimer bahwa ini referensi, bukan notifikasi yang benar-benar terkirim.

Server tetap wajib validasi enum/panjang/kombinasi field — jangan percaya skor kepercayaan model sebagai fakta. Foto lama/dari internet/sintetis bisa lolos; sanggahan warga mengurangi risiko, bukan menyelesaikannya.

## 6. Arsitektur & stack (REWRITE dari PRD asli §8)

```text
frontend/  (Next.js App Router + TypeScript + Tailwind + Leaflet/Leaflet.heat)
  └─ HTTPS ──▶ backend/  (Python FastAPI)
                  ├─ validasi input & (nanti) JWT Supabase
                  ├─ model AI (provider belum final — lihat app/services/model.py)
                  └─ Supabase (Postgres + Storage privat)
```

Frontend dan backend adalah **dua project independen**, masing-masing dengan `.env` sendiri, dijalankan/di-deploy terpisah. Frontend memanggil backend lewat HTTP biasa (`NEXT_PUBLIC_API_URL`), bukan lewat Route Handlers Next.js.

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | UI, role switcher, peta, form laporan. Deploy ke Vercel. |
| Backend | Python + FastAPI | Semua endpoint REST (§10). Deploy ke platform yang auto-detect Python (Render/Railway/Fly — pilih satu, tanpa Docker/IaC kalau platform sudah cukup). |
| Peta | Leaflet 1.9.4 + Leaflet.heat 0.2.0 + tile OpenStreetMap | Sama seperti PRD asli — dynamic import no-SSR di Client Component. |
| Database & foto | Supabase Postgres + Storage bucket privat | RLS aktif, service/secret key cuma di backend. |
| Identitas | **Anonymous browser-id**, bukan Supabase anonymous sign-in maupun JWT. Frontend generate id acak sekali per browser (`localStorage: gema:anon-id`, lihat `frontend/src/lib/anon-id.ts`), dikirim tiap request lewat `Authorization: Bearer <id>`. Backend (`app/deps/auth.py: require_user()`) menerima id itu apa adanya sebagai `author_id`/`voter_id`, **tanpa verifikasi kriptografis** — ganti nanti dengan JWT Supabase begitu login sungguhan dibangun. | Role switcher (Warga/Pemerintah) BUKAN pengganti identitas/otentikasi. Anon-id juga bukan otentikasi — cuma cukup untuk fitur "laporan saya"/vote demo tetap konsisten per browser. |
| Model AI | Belum final provider-nya | Kode & env var generik (`model.py`, `MODEL_API_KEY`), bukan `gemini.py`/`GEMINI_API_KEY`. Implementasi saat ini pakai Gemini (`gemini-3.1-flash-lite`) lewat SDK `google-genai`. |
| Deploy | Vercel (frontend) + Render/Railway/Fly (backend) | Satu deployment cukup buat demo juri — tanpa staging/prod terpisah. |

**Peta — dua mode:** peta memakai **Leaflet** (`leaflet` 1.9.4) dan tile **OpenStreetMap**. Mode awal **Analisis AI** menampilkan severity laporan dan radius perhatian §9.2. Toggle **Kepadatan Laporan** menampilkan jumlah pelapor unik dalam 50 m, dihitung di backend dari koordinat asli tanpa mengirim koordinat/identitas asli ke browser (§9.5). Render peta ada di `frontend/src/components/ReportMapCanvas.tsx`, dynamic-import tanpa SSR lewat `ReportMap.tsx`.

### 6.1 Daftar dependency lengkap (per hari ini)

**Frontend** (`frontend/package.json`):
- `next` 16.3.5 (App Router), `react`/`react-dom` 19.2.8, `typescript` — kerangka & bahasa
- `tailwindcss` 4 + `@tailwindcss/postcss` — styling utility-class
- `leaflet` 1.9.4 + `@types/leaflet` — peta
- `leaflet.heat` 0.2.0 + `@types/leaflet.heat` — dependency lama; mode kepadatan sekarang memakai marker jumlah yang dapat dibaca langsung
- `lucide-react` — satu-satunya sumber ikon (tidak ada icon set lain, tidak bikin SVG custom kalau ikonnya sudah ada di sini)
- Font: **Plus Jakarta Sans** lewat `next/font/google` (§17.2) — bukan dependency npm terpisah

**Backend** (`backend/requirements.txt`):
- `fastapi` — kerangka REST API
- `uvicorn[standard]` — server ASGI
- `pydantic-settings` — baca `backend/.env` jadi objek config tervalidasi
- `python-multipart` — wajib supaya FastAPI bisa terima upload foto (`UploadFile`) di `/api/analyze`
- `supabase` (supabase-py) — client Postgres + Storage
- `google-genai` — SDK Gemini buat `services/model.py`

Tidak ada ORM (query lewat `supabase-py` langsung), tidak ada state management library di frontend (cukup `useState`/Context bawaan React — lihat `role-context.tsx`, `demo-report-context.tsx`), tidak ada UI component library (semua elemen ditulis manual dengan Tailwind, cuma satu `ui/Card.tsx` generik).

**Batasan keamanan sementara yang harus dipahami tim:** role switcher itu murni state UI (`localStorage`) tanpa proteksi backend nyata. Endpoint yang nanti dipakai dashboard Pemerintah buat lihat laporan `disputed_hidden` (harusnya privat per §9.2 PRD asli) belum digate oleh role/JWT asli — ditandai `// ponytail:` di kode. Upgrade path: gate dengan role asli begitu ada login sungguhan.

## 7. Struktur repo (REWRITE dari PRD asli §20)

```text
GEMA-Gerakan-Evaluasi-dan-Monitoring-Ancaman/
├─ PRD.md                            # dokumen ini
├─ README.md                         # cara setup & run frontend+backend
├─ .gitignore
├─ frontend/
│  ├─ .env.example / .env.local      # NEXT_PUBLIC_* saja
│  └─ src/
│     ├─ app/                        # /, /report/new, /report/[id], /track, /hotline, /evakuasi
│     ├─ components/                 # ReportMap(+Canvas), ReportList, ReportDetail, ReportForm,
│     │                              # LocationPicker, ZoneCards, NavDrawer, RoleSwitcher,
│     │                              # ui/Card, dashboard/*
│     ├─ lib/                        # role-context.tsx, demo-report-context.tsx, api-client.ts,
│     │                              # anon-id.ts, geolocation.ts, demo-reports.ts (severityMap dll)
│     └─ types/report.ts             # kontrak tipe (kembar dengan backend/app/schemas)
└─ backend/
   ├─ .env.example / .env            # SUPABASE_*, MODEL_API_KEY, DEMO_MODE, CORS_ORIGINS
   ├─ requirements.txt
   └─ app/
      ├─ main.py                     # FastAPI app + CORS + router registration
      ├─ core/config.py              # baca backend/.env
      ├─ api/                        # analyze, reports, nearby, my_reports, votes
      ├─ schemas/report.py           # kontrak Pydantic (kembar dengan frontend/src/types)
      ├─ services/                   # model.py (AI), supabase_client.py, rules.py
      └─ deps/auth.py                # verifikasi JWT (nanti)
```

**Aturan koordinasi:** `frontend/src/types/report.ts` dan `backend/app/schemas/report.py` harus selalu sinkron bentuknya — kalau satu berubah, update yang satu lagi di hari yang sama.

## 8. Pembagian kerja (REWRITE dari PRD asli §22 — 2 orang)

| Orang | Tanggung jawab | Folder |
|---|---|---|
| **A — Backend** | Endpoint FastAPI, Supabase, integrasi model AI, aturan bisnis (jarak, vote, status) | `backend/` |
| **B — Frontend** | UI Next.js: peta, daftar, form, kedua dashboard, aksesibilitas | `frontend/` |

Boundary otomatis dari folder — kecil kemungkinan bentrok merge selama masing-masing tetap di foldernya.

## 9. Aturan bisnis & algoritma (dari PRD asli §16 — tidak berubah)

### 9.1 Siklus laporan
`draft` (AI relevan) → `active` (pemilik submit lokasi+isi) → `disputed_hidden` (3 sanggahan unik) → `active` lagi (pemulihan manual lewat dashboard database). Foto `invalid`/`uncertain` tidak pernah jadi `draft`.

### 9.2 Area perhatian
Hanya laporan `active`, `severity != rendah`, umur ≤24 jam. Jarak Haversine dari lokasi pengguna ke koordinat **asli** (bukan yang dibulatkan). `in_red=true` bila jarak berada dalam radius tingkat keparahan laporan itu sendiri: `sedang`=1km, `tinggi`=3km, `kritis`=10km (§5). Kalau ada beberapa laporan yang jaraknya masuk radius masing-masing, yang **paling dekat** menang (bukan yang severity-nya tertinggi). Lokasi pengguna dikirim di body request, tidak disimpan. Kalau lokasi belum akurat (>100m), minta pilih manual — `in_red` selalu `false` pada kondisi ini.

### 9.3 Status bantuan
`help_votes` satu nilai per `(report_id, voter_id)`. `seen≥2` dan `seen>not_seen` → "Bantuan dilaporkan terlihat oleh warga". `not_seen≥1` tanpa itu → "Ada warga yang melaporkan bantuan belum terlihat". Kurang dari itu → "Belum ada konfirmasi warga yang cukup".

### 9.4 Sanggahan
Hanya laporan `active` bisa disanggah, pemilik tidak bisa menyanggah laporan sendiri, satu suara per `(report_id, voter_id)`. Suara ke-3 dari akun berbeda → `disputed_hidden`, dalam satu transaksi SQL atomik.

### 9.5 Heatmap kepadatan
Mode peta awal adalah **Analisis AI**. Pada mode **Kepadatan Laporan**, backend mengelompokkan laporan `active` yang diterbitkan dalam 24 jam terakhir memakai koordinat asli: tiap laporan masuk ke satu kelompok yang pusatnya berjarak ≤50 m, lalu hanya `author_id` unik yang dihitung. Respons `GET /api/reports/density` hanya memuat pusat yang dibulatkan ke 3 desimal dan jumlah pelapor, tanpa identitas atau koordinat asli. Area tanpa laporan pada data yang dimuat berwarna hijau tipis; 1–2 pelapor kuning, 3–9 merah, ≥10 hitam. Angka pada marker dan ukurannya juga menyampaikan jumlah. Ini ukuran kepadatan laporan **belum diverifikasi**, bukan severity AI atau radius bahaya; kartu peringatan tetap hanya mengikuti §9.2.

## 10. Kontrak API (dari PRD asli §19 — endpoint sama, sekarang di FastAPI bukan Route Handler)

| Endpoint | Auth (implementasi sekarang: Bearer anon-id, lihat §6) | Fungsi |
|---|---|---|
| `POST /api/analyze` | Bearer anon-id | Upload foto → panggil model AI → `draft` kalau relevan |
| `POST /api/reports` | Bearer anon-id pemilik draft | Publish draft → `active`, idempoten per `draft_id`; upayakan notifikasi Telegram tanpa menggagalkan publikasi |
| `GET /api/reports` | Tidak wajib | Proyeksi publik laporan aktif (dipakai marker AI dan daftar) |
| `GET /api/reports/density` | Tidak wajib | Jumlah pelapor unik per kelompok 50 m dari laporan aktif 24 jam; hanya pusat dibulatkan dan jumlah |
| `GET /api/reports/{id}` | Opsional / Bearer anon-id pemilik | Detail laporan; pemilik bisa lihat status tersembunyi sendiri |
| `POST /api/nearby` | Bearer anon-id | Hitung `in_red` dari lokasi user (tidak disimpan) |
| `GET /api/my-reports` | Bearer anon-id | Semua laporan milik pengguna termasuk yang disembunyikan |
| `POST /api/reports/{id}/false-vote` | Bearer anon-id | Satu suara sanggah per pengguna, hitung ulang atomik |
| `POST /api/reports/{id}/help-vote` | Bearer anon-id | Simpan/replace `seen`/`not_seen` |
| `POST /api/telegram/webhook` | Header secret Telegram | Callback tombol responder; validasi chat/pesan, update `responder_status` atomik, edit pesan |

Aturan bersama: validasi berkas/enum/panjang di server (jangan percaya client), `author_id`/`voter_id` selalu dari header `Authorization` (bukan dari body) — **tapi ingat ini id anonim TANPA verifikasi kriptografis** (§6), jadi bukan jaminan identitas asli, cuma konsistensi per browser. `GET /api/reports` tidak boleh bocorkan `photo_path`/`author_id`/koordinat asli, waktu 24 jam pakai jam server.

## 11. Model data (dari PRD asli §18.1 — tidak berubah bentuknya)

Tabel `reports` (id, author_id, status, created_at, published_at, type, severity, ai_summary, ai_reason, lat/lng asli, location_source, location_label, description, details_json, photo_path, is_demo), `false_votes` (report_id, voter_id unik, reason, created_at), `help_votes` (report_id, voter_id unik, value, created_at). Kolom tambahan di `reports`: `responder_status` (`PENDING`/`ACCEPTED`), `accepted_at`, `accepted_by`, `telegram_chat_id`, `telegram_message_id`. Status ini terpisah dari `reports.status` dan `help_status`; proyeksi laporan publik hanya menambah `responder_status`, tidak mengungkap identitas responder atau ID pesan Telegram. RLS aktif di semua tabel, browser tidak dapat akses tulis langsung — semua lewat backend FastAPI dengan secret key.

`details_json` per jenis: banjir (`water_depth`: `<30cm`/`30-100cm`/`>100cm`/null, `current`: `tenang`/`deras`/null), longsor (`covered_area_m2`), kebakaran (`visibility`: `jelas`/`terbatas`/`sangat_rendah`/null). Nilai "Tidak tahu" disimpan `null`.

## 12. Aksesibilitas (dari PRD asli §9 — tidak berubah)

Target WCAG 2.2 AA untuk alur inti. Checklist: daftar teks selalu jadi alternatif penuh dari peta; kontras teks ≥4.5:1; target sentuh ≥44×44px; fokus terlihat; label eksplisit; marker/status tidak cuma pakai warna (selalu ada teks "Keparahan tinggi" dll); alur inti bisa selesai 200% zoom, keyboard-only, dan pembaca layar.

## 13. Kriteria penerimaan (dari PRD asli §10, AC-01 s.d. AC-14 — semua tetap berlaku)

Tambahan AC untuk v2.2:

| ID | Skenario | Hasil wajib |
|---|---|---|
| AC-15 | Foto banjir dalam (>100cm) + arus deras, cakupan lokal | `severity=tinggi`, area perhatian bisa terpicu dalam radius 3km |
| AC-16 | Foto genangan dangkal (<30cm) + tenang | `severity=rendah`, **tidak pernah** memicu area perhatian meski jaraknya dekat |
| AC-17 | Toggle role switcher Warga↔Pemerintah | Dashboard yang dirender berubah instan, tidak reload halaman, state peta lain tidak hilang |
| AC-18 | Foto bencana skala luas (banyak rumah/jalan sekaligus) | `severity=kritis`, area perhatian terpicu sampai radius 10km |
| AC-19 | Pengguna 5km dari laporan `tinggi` (radius 3km) tapi 5km dari laporan `kritis` (radius 10km) | Tidak terpicu oleh yang `tinggi`, tapi terpicu oleh yang `kritis` |

## 14. Urutan demo ke juri (dari PRD asli §12, ditambah role switcher)

1. Tunjukkan daftar+peta+heatmap DEMO, tekankan label "laporan warga, belum diverifikasi".
2. Toggle role switcher ke Pemerintah — tunjukkan dashboard monitoring beda sudut pandang, jelaskan ini read-only/demo.
3. Laporan valid: unggah foto banjir dalam, tunjukkan `severity=tinggi` terdeteksi, submit, muncul di peta+heatmap.
4. Penolakan: unggah foto tidak relevan — tidak ada ringkasan/marker.
5. Warga dekat area merah: lokasi simulasi DEMO, tunjukkan dua kartu + tips.
6. Crowdsourcing: dua sesi konfirmasi bantuan, tiga sesi sanggah sampai tersembunyi.
7. Aksesibilitas: satu alur via keyboard, tutup dengan batas produk (belum ada login/otentikasi asli, role switcher cuma demo).

## 15. Risiko (dari PRD asli §13, ditambah risiko v2.2)

Semua risiko PRD asli tetap berlaku (AI salah identifikasi, sanggahan palsu, area merah bukan bahaya sesungguhnya, warga salah kira bantuan resmi, koneksi/tile/API gagal, lokasi/foto sensitif). Tambahan:

| Risiko | Mitigasi MVP | Pekerjaan setelah lomba |
|---|---|---|
| Role switcher disalahpahami sebagai login sungguhan | Label jelas + dokumentasi bahwa ini toggle demo, bukan akun | Bangun autentikasi & otorisasi asli, gate dashboard Pemerintah dengan role dari JWT |
| Dashboard Pemerintah bisa diakses siapa saja (termasuk lihat laporan tersembunyi) | Dijelaskan eksplisit di README/PRD sebagai batasan sementara | Proteksi endpoint dengan role asli |

## 16. Referensi

Lihat PRD asli `PRD_GEMA_MVP.md` §24 untuk daftar referensi teknis lengkap (Next.js, Supabase, Leaflet, WCAG, dll). Tambahan buat v2.2: dokumentasi deploy [Vercel](https://vercel.com/docs) untuk frontend Next.js, dan platform backend Python pilihan tim (Render/Railway/Fly — pilih salah satu saat Checkpoint 9).

## 17. Tampilan (UI/UX) — dokumentasi dari yang SUDAH dibangun

Bagian ini menulis ulang tampilan yang sudah ada di kode jadi satu referensi, bukan proposal baru. Kalau mau ubah tampilan, ubah dulu di sini baru di kode (atau sebaliknya, tapi jaga keduanya tetap sinkron) — supaya tidak ada lagi elemen UI yang "tiba-tiba muncul" tanpa tercatat.

### 17.1 Prinsip visual
Produk ini alat keselamatan, bukan situs pemasaran: legibilitas dan kecepatan baca di HP murah lebih penting daripada dekorasi. Kosakata status (TERKENDALI/WASPADA/BAHAYA/KRITIS) sengaja meniru istilah siaga resmi Indonesia (gaya BMKG/BNPB), bukan label generik. Semua berlaku untuk alur **warga** (mobile-only, §4.0); dashboard **Pemerintah** sengaja dikecualikan — itu tabel data biasa buat demo baca-baca, bukan produk mobile.

### 17.2 Design tokens

| Token | Nilai | Dipakai untuk |
|---|---|---|
| Brand / hijau | `#0D5D3A` | Header, tombol utama, link, badge keparahan `rendah` (TERKENDALI) |
| Latar / kertas | `#F7F6E4` | Latar seluruh app (`globals.css`, satu warna konsisten di semua layar warga) |
| Bahaya / merah | `#CF0003` | CTA utama "Laporkan Bencana", badge keparahan `tinggi` (BAHAYA) |
| Peringatan / kuning | `#FFBB00` | Badge keparahan `sedang` (WASPADA) |
| Kritis / hitam | `#242424` | Badge keparahan `kritis` (KRITIS) |
| Teks | skala `slate-900/700/600` Tailwind | Hierarki teks di atas latar kertas |

Semua token warna severity+jenis bencana didefinisikan **satu tempat**: `frontend/src/lib/demo-reports.ts` (`severityMap`, `disasterBadge`). Komponen lain wajib import dari sana, jangan hardcode hex baru.

**Tipografi:** satu keluarga font, **Plus Jakarta Sans** (`next/font/google`, variable `--font-jakarta`), dipakai untuk semua teks (display maupun body) — dipilih karena buatan kolektif Indonesia (Jakarta Smart City) dan sangat terbaca di layar kecil, bukan default Geist/Inter. Angka yang bisa berubah lebar digit (koordinat lat/lon) pakai utility `tabular-nums` supaya layout tidak "loncat".

**Ikon:** hanya `lucide-react` — jangan tambah icon set lain atau bikin SVG custom kalau ikonnya sudah tersedia di sana.

**Bentuk & target sentuh:** kartu konten `rounded-lg border shadow-sm` (komponen `ui/Card.tsx`); badge/chip status `rounded-full`; semua elemen interaktif minimal `44×44px` (kelas `min-h-11`/`min-w-11`) sesuai §12 aksesibilitas.

### 17.3 Layar per halaman (alur warga)

| Halaman | Isi utama |
|---|---|
| `/` (Beranda Warga) | Hero peta full-bleed (header hijau + logo GEMA, search area, overlay lat/lon, tombol zoom +/−, tombol hotline, CTA merah mengambang "Laporkan Bencana"). Di bawah peta (scroll): nav aksi (Buat laporan/Lacak tanggapan/Hotline), kartu "Area perhatian" (§9.2) kalau ada laporan dekat, kartu legenda 4 tingkat keparahan, daftar laporan aktif sebagai baris (ikon jenis + badge keparahan + lokasi + chevron) yang diklik → `/report/{id}`. |
| Drawer menu (hamburger) | `NavDrawer`: link Peta Sebaran Bencana / Lacak Respons / Hotline + footer kredit tim. |
| `/report/new` | Dua langkah state machine: **capture** (layar hijau penuh, tombol shutter bulat, pratinjau foto, tombol "Pilih foto") → **review "Hasil Identifikasi"** (badge jenis bencana berwarna + ikon, lokasi & waktu, tips keselamatan, ringkasan AI, `LocationPicker` + mini-peta, field spesifik per jenis bencana dengan pilihan radio termasuk "Tidak tahu", textarea deskripsi, tombol "Unggah"). |
| `/report/{id}` | Badge jenis bencana + badge keparahan (+ badge DEMO kalau relevan), judul, ringkasan AI & keterangan warga, baris info berikon (lokasi/waktu/detail teknis per jenis), kartu "Kabar bantuan" yang warnanya berubah sesuai `help_status` (netral/kuning/hijau). |
| `/track` | Daftar laporan milik anon-id sendiri (termasuk yang `disputed_hidden`). |
| `/hotline`, `/evakuasi` | Halaman statis teks (nomor darurat, panduan evakuasi). |
| Dashboard Pemerintah (toggle role) | **Layout berbeda total** dari alur warga — `DashboardLayout` desktop-style: kartu statistik + tabel semua laporan (scroll horizontal). Bukan mobile-first, karena murni demo baca-baca (§3, §4.0). |

### 17.4 Komponen & aturan reuse

- `severityMap` / `disasterBadge` (`lib/demo-reports.ts`) — satu-satunya sumber warna+label severity/jenis bencana. Dipakai di legenda, daftar laporan, badge detail, popup peta.
- `ui/Card.tsx` — kartu generik, dipakai di semua kartu konten kecuali baris daftar laporan (yang sengaja dibuat lebih ramping, gaya baris-klik bukan kartu).
- `RoleSwitcher` — fixed `bottom-4 left-4 z-50` di semua halaman (lewat `layout.tsx`). **Aturan wajib:** elemen baru di dekat pojok kiri-bawah (CTA, tombol submit, dst.) harus dikasih clearance (`pb-20`/`bottom-20` atau lebih) supaya tidak ketutupan chip ini — ini sudah kejadian berulang kali selama development.
- `ReportMap` / `ReportMapCanvas` — satu komponen peta dipakai ulang untuk mode heatmap+marker (beranda) maupun mode pilih-titik-saja (`pickerOnly`, dipakai di form laporan).