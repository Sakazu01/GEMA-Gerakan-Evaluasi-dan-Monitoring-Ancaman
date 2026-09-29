# PLAN — Eksekusi Paralel 2 Orang

Dokumen ini isinya **prompt siap-jalan** buat tiap tahap kerja. Copy-paste satu blok prompt ke sesi Claude Code (punya masing-masing orang), biarin dia kerja, review hasilnya, baru lanjut ke prompt berikutnya. Baca `PRD.md` dulu kalau butuh konteks produk lengkap.

## Aturan yang berlaku di SEMUA tahap (sudah ditulis di tiap prompt juga, tapi baca sekali di sini)

1. **Track A (backend/) dan Track B (frontend/) jalan paralel** — gak perlu saling nunggu selama masing-masing gak nyentuh folder orang lain.
2. **Satu-satunya hal yang perlu disepakati bareng**: bentuk data (`backend/app/schemas/report.py` ↔ `frontend/src/types/report.ts`) dan bentuk JSON tiap endpoint (lihat "Kontrak API" di bawah). Kalau salah satu mau ubah bentuk itu, **koordinasi dulu** sebelum jalan — jangan diam-diam.
3. **Setiap prompt di bawah cuma boleh nyentuh file di scope-nya.** Kalau Claude Code minta izin nyentuh file di luar scope, tolak dan tanya balik ke tim dulu.
4. **Tiap tahap = STOP setelah implement.** Jangan `git add`/`commit`/`push` sendiri. Selesai satu tahap → lapor balik → orang yang minta ngecek hasilnya (jalanin, `npm run lint`/`npm run build` atau `uvicorn`) → baru commit/push manual kalau oke.
5. **Ini MVP demo, bukan produksi** — kalau Claude Code mulai nambah abstraksi/dependency yang gak diminta prompt, stop dan suruh sederhanain.

## Kontrak API (contoh payload — pegangan bareng biar gak saling nunggu)

Backend dan frontend develop terpisah **berdasarkan bentuk JSON ini**, bukan berdasarkan kode satu sama lain.

**`GET /api/reports`** → array dari:
```json
{
  "id": "b6e1f2a0-0000-4000-8000-000000000001",
  "status": "active",
  "type": "flood",
  "severity": "tinggi",
  "ai_summary": "Genangan air lebih dari 1 meter dengan arus terlihat deras.",
  "description": "Air masuk ke rumah warga sejak siang.",
  "details": { "type": "flood", "water_depth": ">100cm", "current": "deras" },
  "location_label": "Sekitar Jl. Melati, RW 04",
  "location_source": "demo",
  "public_lat": -6.9147,
  "public_lng": 107.6098,
  "published_at": "2026-09-18T03:12:00Z",
  "created_at": "2026-09-18T03:10:00Z",
  "is_demo": true,
  "help_status": "belum_ada_konfirmasi",
  "seen_count": 0,
  "not_seen_count": 0,
  "false_vote_count": 0
}
```

**`POST /api/analyze`** response (kalau `validity="relevant"`):
```json
{
  "validity": "relevant",
  "draft_id": "b6e1f2a0-0000-4000-8000-000000000002",
  "type": "flood",
  "severity": "tinggi",
  "summary": "Genangan air lebih dari 1 meter dengan arus terlihat deras.",
  "reason": "Terlihat genangan dalam dan arus deras di jalan permukiman."
}
```
Kalau `invalid`/`uncertain`: `{ "validity": "invalid", "reason": "..." }` — tanpa `draft_id`/`type`/`severity`/`summary`.

**`POST /api/nearby`** response:
```json
{ "in_red": true, "nearest_report_id": "b6e1f2a0-...", "distance_m": 210 }
```

**`POST /api/reports/{id}/false-vote`** response:
```json
{ "false_vote_count": 2, "status": "active" }
```

**`POST /api/reports/{id}/help-vote`** response:
```json
{ "seen_count": 1, "not_seen_count": 0, "help_status": "belum_ada_konfirmasi" }
```

Kalau salah satu endpoint di atas ternyata butuh field tambahan pas dikerjain, update contoh ini di `plan.md` dan kabari satu tim di hari yang sama.

---

## Track A — Backend (`backend/`)

### A1 — Supabase: schema, RLS, endpoint baca

```
Baca PRD.md di root repo ini (terutama §9 aturan bisnis dan §11 model data) dan plan.md
bagian "Kontrak API". Tugas kamu:

1. Bikin migrasi SQL (folder backend/migrations/001_initial.sql) buat tabel reports,
   false_votes, help_votes sesuai PRD.md §11 — termasuk constraint, indeks
   (status, published_at), dan RLS aktif di semua tabel.
2. Isi backend/app/services/supabase_client.py — klien Supabase pakai secret key dari
   backend/.env (SUPABASE_URL, SUPABASE_SECRET_KEY).
3. Ganti stub 501 di backend/app/api/reports.py (GET /api/reports, GET /api/reports/{id})
   dan backend/app/api/my_reports.py jadi baca data asli dari Supabase, bentuk JSON
   response harus PERSIS sesuai contoh "GET /api/reports" di plan.md.

Batasan:
- JANGAN sentuh folder frontend/ sama sekali.
- Kalau ternyata perlu ubah bentuk field di backend/app/schemas/report.py, STOP dulu dan
  bilang ke saya — itu kontrak bersama sama frontend/src/types/report.ts.
- Ini MVP demo, jangan over-engineer: query langsung pakai supabase-py client, gak perlu
  ORM/repository pattern/migration tool tambahan.
- Setelah selesai: STOP. Jangan git add/commit/push. Kasih ringkasan file yang berubah
  dan tunggu saya cek dulu sebelum lanjut ke tahap A2.
```

### A2 — Model AI + submit flow

```
Baca PRD.md §5 (kriteria severity/urgensi — penting: bedain kejadian yang butuh evakuasi
SEGERA dari yang cuma genangan biasa) dan plan.md bagian "Kontrak API". Tugas kamu:

1. Isi backend/app/services/model.py — panggilan ke model AI (pilih provider yang paling
   gampang diakses tim; Gemini boleh jadi default kalau belum ada pilihan lain). Baca
   key dari MODEL_API_KEY di backend/.env. Skema keluaran wajib:
   validity/disaster_type/severity/summary_id/reason_id — validasi lagi di server,
   jangan percaya mentah-mentah keluaran model.
2. Ganti stub 501 di backend/app/api/analyze.py: validasi MIME (jpeg/png/webp) dan
   ukuran (<=3MB) SEBELUM panggil model, lalu simpan draft kalau relevant. Response
   harus sesuai contoh "POST /api/analyze" di plan.md.
3. Ganti stub 501 di backend/app/api/reports.py bagian POST: publish draft jadi active,
   idempoten berdasarkan draft_id (submit dua kali = balikin laporan yang sama, gak
   bikin dua marker).

Batasan:
- JANGAN sentuh folder frontend/.
- Kalau perlu ubah backend/app/schemas/report.py, STOP dan bilang ke saya dulu.
- MVP demo — jangan bikin retry/queue/caching, satu request langsung ke model cukup.
- Setelah selesai: STOP. Jangan push. Kasih ringkasan dan tunggu saya cek sebelum A3.
```

### A3 — Nearby + voting

```
Baca PRD.md §9.2-9.4 (aturan area merah 300m, status bantuan, sanggahan) dan plan.md
bagian "Kontrak API". Tugas kamu:

1. Isi backend/app/services/rules.py — fungsi jarak Haversine.
2. Ganti stub 501 di backend/app/api/nearby.py (POST /api/nearby): hitung in_red dari
   lokasi yang dikirim di body (JANGAN disimpan ke database), pakai koordinat ASLI
   laporan (bukan yang dibulatkan). Response sesuai contoh di plan.md.
3. Ganti stub 501 di backend/app/api/votes.py (false-vote & help-vote): satu suara per
   (report_id, voter_id), sanggahan ke-3 dari akun berbeda ubah status jadi
   disputed_hidden — ini HARUS satu transaksi SQL atomik (pakai fungsi Postgres/RPC),
   biar dua vote barengan gak bikin hitungan salah.

Batasan:
- JANGAN sentuh folder frontend/.
- MVP demo — gak perlu message queue/event system, transaksi SQL biasa cukup.
- Setelah selesai: STOP. Jangan push. Kasih ringkasan dan tunggu saya cek. Ini titik
  terakhir Track A sebelum tahap integrasi bareng Track B.
```

---

## Track B — Frontend (`frontend/`)

### B1 — Peta, daftar, area merah (dummy data)

```
Baca PRD.md §6 dan §9.2 (area perhatian merah) dan plan.md bagian "Kontrak API" — pakai
bentuk data yang sama persis kayak contoh "GET /api/reports" di sana buat dummy data kamu.
Tugas kamu:

1. Isi frontend/src/components/ReportMap.tsx — Leaflet + Leaflet.heat, WAJIB dynamic
   import (ssr:false) karena plugin ini pakai `window`.
2. Isi frontend/src/components/ReportList.tsx, ZoneCards.tsx, LocationPicker.tsx.
3. Semua pakai array dummy Report[] in-memory (5-10 item, is_demo:true, variasi
   jenis/severity) — JANGAN fetch ke backend, itu belum giliran (nanti di tahap
   integrasi C1).
4. Render lewat frontend/src/components/dashboard/WargaDashboard.tsx yang sudah ada.
   Pakai komponen Card/DashboardLayout yang sudah ada, jangan bikin komponen kartu baru.

Batasan:
- JANGAN sentuh folder backend/.
- Kalau perlu ubah frontend/src/types/report.ts, STOP dulu dan bilang ke saya — itu
  kontrak bersama sama backend/app/schemas/report.py.
- MVP demo — jangan tambah state management library, React state biasa cukup.
- `npm run lint` dan `npm run build` harus lolos sebelum kamu bilang selesai.
- Setelah selesai: STOP. Jangan push. Kasih ringkasan dan tunggu saya cek sebelum B2.
```

### B2 — Dashboard Pemerintah (dummy data)

```
Baca plan.md bagian "Kontrak API" dan pakai dummy data yang sama kayak yang dipakai di
B1 (Report[] in-memory). Tugas kamu:

1. Isi frontend/src/components/dashboard/PemerintahDashboard.tsx: kartu statistik
   (total laporan per jenis/status/severity, jumlah 24 jam terakhir) + tabel semua
   laporan TERMASUK yang disputed_hidden/is_demo. Read-only — TIDAK ada tombol aksi
   apa pun (tidak ada pulihkan/hapus/edit).
2. Pakai komponen Card/DashboardLayout yang sudah ada.

Batasan:
- JANGAN sentuh folder backend/.
- MVP demo — jangan bikin komponen tabel generik/reusable dulu, satu tabel biasa cukup
  buat dashboard ini.
- `npm run lint` dan `npm run build` harus lolos.
- Setelah selesai: STOP. Jangan push. Kasih ringkasan dan tunggu saya cek sebelum B3.
```

### B3 — Form laporan dengan AI mock

```
Baca PRD.md §5 (alur foto->analisis->tinjau->submit, input khusus per jenis bencana)
dan plan.md bagian "Kontrak API" (bentuk response "POST /api/analyze"). Tugas kamu:

1. Isi frontend/src/components/ReportForm.tsx: upload foto (validasi MIME/size di
   sisi UI juga, meski nanti tetap divalidasi ulang di backend), tombol "Analisis
   foto" yang manggil FUNGSI MOCK LOKAL (bukan backend asli) yang niru bentuk response
   POST /api/analyze dari plan.md — kembalikan hasil acak/tetap yang masuk akal.
2. Halaman tinjau: tampilkan jenis+severity+ringkasan dari hasil mock, input khusus
   sesuai jenis bencana (kedalaman air/arus utk banjir, dll — PRD.md §5), tombol kirim
   yang nyimpen ke state lokal/dummy list (gabung ke data yang dipakai B1/B2).

Batasan:
- JANGAN sentuh folder backend/.
- JANGAN panggil backend sungguhan dulu — itu tahap integrasi (C1).
- `npm run lint` dan `npm run build` harus lolos.
- Setelah selesai: STOP. Jangan push. Kasih ringkasan dan tunggu saya cek. Ini titik
  terakhir Track B sebelum tahap integrasi bareng Track A.
```

---

## Setelah A dan B selesai solo

### C1 — Integrasi: sambungkan frontend ke backend asli

```
Baca PRD.md dan plan.md bagian "Kontrak API". Backend sudah punya endpoint asli
(pastikan backend nyala duluan: `cd backend && uvicorn app.main:app --reload`, cek
http://localhost:8000/health). Tugas kamu:

1. Di frontend/src/lib/api-client.ts, pastikan NEXT_PUBLIC_API_URL nunjuk ke backend
   lokal (http://localhost:8000, dari frontend/.env.local).
2. Ganti dummy data di WargaDashboard/PemerintahDashboard/ReportList/ReportMap dengan
   fetch asli ke GET /api/reports (dan GET /api/reports/{id} di halaman detail) lewat
   apiFetch. JANGAN ubah tampilan/komponen, cuma ganti sumber datanya.
3. Ganti fungsi mock di ReportForm dengan panggilan asli ke POST /api/analyze lalu
   POST /api/reports.
4. Test end-to-end: upload 1 foto asli, submit, cek laporan muncul di peta+daftar
   setelah refresh.

Batasan:
- MVP demo — kalau ada mismatch bentuk data antara backend dan frontend, PERBAIKI
  di kode masing-masing sesuai kontrak di plan.md, jangan bikin lapisan adapter/mapper
  tambahan buat "menjembatani" bentuk yang beda.
- Setelah selesai: STOP. Jangan push. Kasih ringkasan dan tunggu saya cek sebelum C2.
```

### C2 — Deploy biar juri bisa coba sendiri

```
Baca PRD.md §6 (arsitektur & deploy). Tugas kamu:

1. Deploy frontend/ ke Vercel (Next.js native support, gak perlu config tambahan
   selain root directory = frontend/).
2. Deploy backend/ ke satu platform yang auto-detect Python (Render/Railway/Fly —
   pilih satu, JANGAN bikin Dockerfile/IaC kalau platformnya udah cukup dari
   requirements.txt).
3. Set environment variable di dashboard masing-masing platform sesuai
   backend/.env.example dan frontend/.env.example — JANGAN commit .env asli ke git.
4. Update CORS_ORIGINS di backend biar include domain frontend yang di-deploy.
   Update NEXT_PUBLIC_API_URL di frontend biar nunjuk ke URL backend yang di-deploy.
5. Test alur lengkap dari URL publik (bukan localhost).

Batasan:
- Satu deployment aja cukup buat demo juri — gak perlu staging/prod terpisah, gak
  perlu custom domain.
- Setelah selesai: STOP. Jangan push kode lain di luar yang diminta di sini. Laporkan
  URL yang jadi dan tunggu saya cek sebelum dianggap kelar.
```
