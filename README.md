# GEMA — Gerakan Evaluasi dan Monitoring Ancaman

Platform pelaporan bencana cepat: warga memotret kejadian, sistem menyiapkan analisis dan bukti kemiripan, petugas menerima laporan melalui Telegram, lalu status yang diterima tampil pada peta.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?logo=googlegemini&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**Tim Labtek V Ijo Lumut Kya** — Institut Teknologi Bandung

- Juan Oloando Simanungkalit
- Ariel Sitorus Cornelius
- Naomi Azzahra
- Wa Ode Amerta Lambelu Jamaluddin
- Endda Tsa Azzahra Syaifur

## Daftar Isi

- [Demo](#demo)
- [Tujuan](#tujuan)
- [Struktur](#struktur)
- [Prasyarat (Prerequisites)](#prasyarat-prerequisites)
- [Cara menjalankan (How to build & run)](#cara-menjalankan-how-to-build--run)
- [Dua tampilan peta](#dua-tampilan-peta)
- [Evaluasi model AI](#evaluasi-model-ai)
- [Chatbot GEMA AI](#chatbot-gema-ai)
- [Notifikasi responder Telegram](#notifikasi-responder-telegram)
- [Deploy](#deploy)

## Status implementasi FIK FAIR

Alur terbaru tersedia di branch `dev`. Warga memakai sesi anonim, mengambil foto langsung dari kamera, dan mengirim laporan tanpa form login. AI menjelaskan kondisi visual, mesin provenance membandingkan foto dengan laporan GEMA dan sumber web, sedangkan petugas tetap mengambil keputusan melalui Telegram. Warga dengan lokasi valid maksimal 500 meter dapat memilih **Konfirmasi** atau **Palsu**.

- [Hasil implementasi dan test](docs/fik-fair/hasil-implementasi.md)
- [Konfigurasi, migrasi, dan operasi](docs/fik-fair/operasional.md)
- [Indeks spesifikasi FIK FAIR](docs/fik-fair/README.md), [implementation.md](implementation.md), [revisi.md](revisi.md), [ui.md](ui.md)

Implementasi mencakup migrasi 011, grouping incident dasar, paket bukti Telegram, dashboard pemerintah read-only, dan pengujian lokal. Kredensial provider eksternal, deployment, kemitraan resmi, serta evaluasi lapangan tetap harus disiapkan pada lingkungan staging/produksi.

## Demo

Alamat deployment yang tercantum sebelumnya: https://amusing-communication-production-abe3.up.railway.app/. Perubahan baru belum dideploy atau diverifikasi pada alamat tersebut.

## Tujuan

GEMA membantu warga menyampaikan kondisi bencana secara singkat dan memberi petugas paket informasi yang dapat ditelusuri: foto kamera, waktu dan lokasi, analisis visual AI, kemiripan internal/web, serta tanggapan warga sekitar. Fokus FIK FAIR: **Menembus Ketidakpastian: Inovasi Solutif untuk Komunitas Masa Depan**, dalam tema IGNITE dan SDG 9, 11, 13.

## Struktur

```text
frontend/                 Next.js, Leaflet, kamera, pengamatan, dashboard pemerintah
backend/                  FastAPI, auth, quota, kebijakan, worker
backend/migrations/       001–011, termasuk storage privat, provenance, incident, dan voting
docs/fik-fair/            spesifikasi, hasil test, operasional, submission
```

## Prasyarat (Prerequisites)

- Node 24 untuk menjalankan seluruh suite test frontend; Python 3.11+.
- Supabase Auth, Postgres, dan Storage, dengan project staging untuk pemeriksaan awal.
- Gemini opsional untuk analisis visual; kegagalannya tidak menghapus laporan.
- Google Cloud Vision Web Detection opsional untuk pencarian kemiripan web; tanpa kredensial, laporan tetap dikirim dengan status provider tidak tersedia.
- Telegram dan Web Push opsional untuk pengiriman keluar; laporan tetap tersimpan jika provider sedang gagal.

## Cara menjalankan (How to build & run)

Jalankan migrasi yang belum diterapkan secara berurutan sampai **011**. Aktifkan anonymous sign-in, siapkan akun permanen dengan role `responder` atau `moderator` untuk akses riwayat pemerintah, lalu periksa bucket privat. Detail di [operasional](docs/fik-fair/operasional.md).

Salin contoh environment ke `backend/.env` dan `frontend/.env.local`, lalu isi di mesin Anda. Frontend memerlukan public Supabase URL/key; secret/service-role key hanya di backend.

Dari `backend/`:

```powershell
rtk proxy python -m venv .venv
rtk proxy .venv/Scripts/python.exe -m pip install -r requirements.txt
rtk proxy .venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000 --no-access-log
```

Dari `frontend/`:

```powershell
rtk proxy npm ci
rtk proxy npm run dev
```

Buka http://localhost:3000; health backend http://localhost:8000/health. Setelah konfigurasi staging terverifikasi, aktifkan WORKER_ENABLED untuk outbox dan cleanup.

## Dua tampilan peta

Beranda langsung membuka **Peta**. Laporan yang masih menunggu petugas dapat menghasilkan notice privat bagi warga sekitar, tetapi belum menjadi marker umum. Marker publik baru tampil sesudah responder menekan **Terima Laporan** di Telegram. Radius notice dan tanggapan komunitas tetap 500 meter untuk semua tingkat keparahan.

Kepadatan menghitung pelapor unik pada laporan aktif dalam kelompok 50 m, dengan warna biru dan angka. Tidak ada area kosong yang diberi label aman. Laporan berlaku 12 jam dari waktu pengamatan sebagai konfigurasi pilot; demo dan expired dikecualikan. Nearby mengambil kandidat sendiri di backend, dengan maksimal tiga notice, sehingga tidak bergantung 50 laporan pertama feed.

## Evaluasi model AI

Catatan spot-check berikut berasal dari dokumentasi sebelumnya dan dipertahankan sebagai riwayat. Perubahan ini tidak menjalankan ulang model pada foto tersebut atau menghasilkan benchmark baru.

Model yang dipakai saat ini: `gemini-3.1-flash-lite` (lihat `backend/app/services/model.py`) — hanya prompting + skema keluaran terstruktur, **bukan model yang di-fine-tune**. Angka dan fakta pada jawaban chatbot maupun label laporan selalu diambil dari data Supabase yang sebenarnya; model hanya menafsirkan maksud/isi foto.

Spot-check kecil (bukan benchmark statistik) memakai 3 foto di `backend/test/input/`, dengan ground truth ditentukan lewat tinjauan manual sebelum foto dikirim ke model:

| Foto | Jenis (tinjauan manual) | Prediksi model | Keparahan model | Cocok? |
|---|---|---|---|---|
| `test1.jpeg` | Banjir | Banjir | Tinggi | ✅ |
| `test2.jpeg` | Kebakaran | Kebakaran | Kritis | ✅ |
| `test3.jpeg` | Tanah longsor | Tanah longsor | Tinggi | ✅ |

Akurasi klasifikasi jenis bencana: 3/3 (100%). F1-score makro pada sampel ini: 1,0. **Catatan jujur:** n=3 dengan 1 sampel per kelas tidak cukup untuk mengukur performa secara statistik andal — ini demonstrasi cepat bahwa pipeline bekerja pada kasus yang jelas, bukan klaim benchmark formal. Untuk hasil yang benar-benar terukur, perlu set uji yang lebih besar dan beragam (termasuk foto ambigu/uncertain).

## Chatbot GEMA AI

Chatbot menjawab jumlah, daftar terbaru, dan ringkasan laporan aktif non-demo yang belum expired. Jawaban disusun dari data publik; AI menafsirkan maksud pertanyaan. Status bukti disebut per laporan, dan jumlah laporan tidak disamakan dengan jumlah kejadian unik. Chat memakai sesi Auth serta quota dan anggaran model bersama.

## Notifikasi responder Telegram

Publish menyimpan laporan dan event triase dalam transaksi; worker mengirim foto, analisis AI, keterbatasan, bukti kemiripan, dan ringkasan suara ke grup privat. Kesalahan provider yang diketahui dicoba ulang dengan backoff; hasil ambigu menjadi `unknown` dan masuk riwayat operasional.

Callback memeriksa secret, grup, pesan, dan pemetaan responder/role server. **ACCEPTED berarti laporan diterima responder.** Tracker memperbarui selama halaman aktif; prototipe belum menyimpan status berangkat/tiba.

Konfigurasi bot, pendaftaran responder, dan webhook HTTPS dijelaskan pada [operasional](docs/fik-fair/operasional.md). Tidak ada pesan nyata yang dikirim pada test otomatis.

## Pengamatan, draft, dan push

Notice memakai kalimat “Ada laporan ... di sekitar lokasi Anda” atau “di area yang Anda pantau”. Pengguna yang lolos pemeriksaan lokasi dapat memilih **Konfirmasi** atau **Palsu**. Enam suara Palsu yang lebih banyak daripada Konfirmasi menyembunyikan laporan yang masih menunggu petugas. Laporan yang sudah diterima petugas tidak dibatalkan otomatis dan petugas menerima pembaruan bukti.

Foto hanya dapat berasal dari kamera pada alur produksi. Draft disimpan sebelum AI. IndexedDB menyimpan draft lokal tujuh hari, dan mengirim draft yang sudah diajukan ketika aplikasi terbuka serta koneksi tersedia. Retry memakai idempotency key yang sama. Berkas maksimal 10 MiB, kompresi client, validasi/decode server, metadata dibersihkan, foto privat. Backend membatasi penerbitan menjadi satu laporan setiap 180 detik per identitas anonim, dengan batas jaringan tambahan.

Push memiliki service worker, VAPID, subscription, preferensi area, dan unsubscribe. Aktifkan setelah mengisi environment dan menguji provider. GPS browser tidak dipantau terus menerus saat web tertutup.

## Pengujian

Dari `backend/`:

```powershell
rtk proxy .venv/Scripts/python.exe -m unittest discover -s . -p test_*.py
rtk proxy .venv/Scripts/python.exe test_rules.py
rtk proxy .venv/Scripts/python.exe test_analyze.py
```

Dari `frontend/`:

```powershell
rtk proxy npm test
rtk proxy npm run lint
rtk proxy npm run build
rtk proxy npx playwright install chromium
rtk proxy npm run test:e2e
```

Test transaksi, migrasi legacy, dan konkurensi menggunakan PostgreSQL lokal disposable; petunjuk serta hasil pada [hasil implementasi](docs/fik-fair/hasil-implementasi.md). Test lokal bukan hasil uji pengguna atau integrasi layanan live.

## Deploy

Deployment sebelumnya menggunakan dua service Railway dengan root `frontend/` dan `backend/`. Untuk versi baru, terapkan migrasi dan konfigurasi Auth/role/storage di staging dahulu, lalu deploy backend dan frontend yang sesuai.

Isi public API/Supabase environment saat build frontend; isi secret Supabase, CORS_ORIGINS, RATE_LIMIT_SALT, flag komunitas/worker, dan credential opsional pada backend. Gunakan DEMO_MODE=false serta NEXT_PUBLIC_DEMO_MODE=false pada produksi. Backend Procfile mematikan access log query lokasi. Ikuti [pemeriksaan staging](docs/fik-fair/operasional.md#6-pemeriksaan-staging-sebelum-pilot) sebelum mengklaim fitur live.
