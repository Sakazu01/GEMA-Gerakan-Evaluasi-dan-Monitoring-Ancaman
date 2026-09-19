# GEMA — Gerakan Evaluasi dan Monitoring Ancaman

Platform pelaporan bencana berbasis foto dan AI untuk warga, dengan peta komunitas real-time dan dashboard pemantauan untuk pemerintah.

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

## Demo

Aplikasi sudah live (tidak perlu di-build untuk mencoba): **https://amusing-communication-production-abe3.up.railway.app/**

## Tujuan

Aplikasi web yang membantu warga melaporkan indikasi bencana (banjir, tanah longsor, kebakaran) dari foto, melihat laporan komunitas lewat peta dan daftar, membaca panduan keselamatan di area berisiko, dan memberi konfirmasi soal kedatangan bantuan.

## Struktur

```
frontend/   Next.js — UI, peta, form laporan
backend/    FastAPI (Python) — semua endpoint API
```

## Prasyarat (Prerequisites)

- Node.js 20 atau lebih baru, npm
- Python 3.11 atau lebih baru, pip
- Akun [Supabase](https://supabase.com) (Postgres + Storage) — untuk menjalankan sendiri, buat project baru dan jalankan migrasi di `backend/migrations/`
- API key Gemini dari [Google AI Studio](https://aistudio.google.com/) untuk `MODEL_API_KEY`
- (Opsional) Bot Telegram untuk fitur notifikasi responder — lihat bagian [Notifikasi responder Telegram](#notifikasi-responder-telegram)

## Cara menjalankan (How to build & run)

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Buka http://localhost:3000.

**Backend:**
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows; `source .venv/bin/activate` di macOS/Linux
pip install -r requirements.txt
cp .env.example .env    # isi SUPABASE_URL, SUPABASE_SECRET_KEY, MODEL_API_KEY
uvicorn app.main:app --reload --port 8000
```
Buka http://localhost:8000/health untuk cek server hidup.

Sebelum menguji unggah laporan, jalankan file di `backend/migrations/` lewat Supabase SQL Editor secara berurutan: `001_initial.sql`, `002_severity_kritis.sql`, lalu `003_vote_functions.sql`, kemudian `004_telegram_responder.sql`. Untuk database yang sudah ada, jalankan migrasi yang belum diterapkan. Migrasi `002` wajib agar hasil AI dengan severity `kritis` bisa disimpan.

## Dua tampilan peta

Beranda warga terbuka pada **Analisis AI**. Gunakan toggle **Kepadatan Laporan** untuk melihat jumlah pelapor unik dari laporan aktif 24 jam terakhir dalam kelompok radius 50 m: hijau 0, kuning 1–2, merah 3–9, hitam 10 atau lebih. Angka pada titik menunjukkan jumlah; ukuran titik bertambah seiring jumlah. Ini kepadatan laporan warga **belum diverifikasi**, bukan tingkat keparahan atau batas bahaya. Backend menghitung dari koordinat asli dan hanya mengirim pusat yang dibulatkan serta jumlah. Perubahan mode tidak mengubah aturan area perhatian AI.

## Evaluasi model AI

Model yang dipakai saat ini: `gemini-3.1-flash-lite` (lihat `backend/app/services/model.py`) — hanya prompting + skema keluaran terstruktur, **bukan model yang di-fine-tune**. Angka dan fakta pada jawaban chatbot maupun label laporan selalu diambil dari data Supabase yang sebenarnya; model hanya menafsirkan maksud/isi foto.

Spot-check kecil (bukan benchmark statistik) memakai 3 foto di `backend/test/input/`, dengan ground truth ditentukan lewat tinjauan manual sebelum foto dikirim ke model:

| Foto | Jenis (tinjauan manual) | Prediksi model | Keparahan model | Cocok? |
|---|---|---|---|---|
| `test1.jpeg` | Banjir | Banjir | Tinggi | ✅ |
| `test2.jpeg` | Kebakaran | Kebakaran | Kritis | ✅ |
| `test3.jpeg` | Tanah longsor | Tanah longsor | Tinggi | ✅ |

Akurasi klasifikasi jenis bencana: 3/3 (100%). F1-score makro pada sampel ini: 1,0. **Catatan jujur:** n=3 dengan 1 sampel per kelas tidak cukup untuk mengukur performa secara statistik andal — ini demonstrasi cepat bahwa pipeline bekerja pada kasus yang jelas, bukan klaim benchmark formal. Untuk hasil yang benar-benar terukur, perlu set uji yang lebih besar dan beragam (termasuk foto ambigu/uncertain).

## Chatbot GEMA AI

Klik ikon **G** di kanan bawah untuk membuka chat, lalu klik **X** untuk menutupnya. Contoh pertanyaan: “Berapa laporan hari ini?”, “Berapa laporan banjir?”, dan “Tampilkan laporan terbaru.”

Frontend mengirim pertanyaan ke `POST /api/chat`. Backend membaca **laporan aktif non-demo** dari Supabase dan memakai `MODEL_API_KEY` yang sama dengan analisis foto untuk memahami maksud pertanyaan. Jumlah, daftar, dan ringkasan jawaban disusun dari data laporan yang dibaca, bukan angka buatan model. Hasil tetap berlabel **belum diverifikasi**; chatbot tidak memastikan keamanan lokasi, jumlah korban, atau kedatangan petugas. Endpoint hanya membaca data publik dan tidak memerlukan perubahan database.

## Notifikasi responder Telegram

Setelah migrasi `004_telegram_responder.sql`, isi `TELE_API` dan `TELE_CHAT_ID` yang sudah ada, lalu buat `TELEGRAM_WEBHOOK_SECRET` di `backend/.env`. Contoh membuat secret: `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Jangan masukkan nilai asli ke `.env.example` atau frontend.

Saat laporan diterbitkan, backend mengirim ringkasan AI ke grup Telegram responder. Laporan tetap tersimpan jika pengiriman Telegram gagal; kegagalannya muncul di log backend. Tombol **TERIMA LAPORAN** mengubah `responder_status` menjadi `ACCEPTED`, dan tracker warga memeriksa pembaruan setiap 10 detik selama halaman terbuka. Penerimaan berarti pesan diterima anggota grup responder, bukan laporan sudah diverifikasi atau bantuan sudah tiba. Siapa pun yang dapat menekan tombol di grup tersebut bisa menerimanya; batasi keanggotaan grup sebelum memakai data nyata.

Telegram memerlukan URL backend HTTPS publik. Jalankan backend melalui deployment atau tunnel (misalnya ngrok/Cloudflare Tunnel), lalu daftarkan URL dasarnya dari direktori `backend/`:

```powershell
.\.venv\Scripts\python.exe set_telegram_webhook.py https://NAMA-HOST-PUBLIK
```

URL webhook yang didaftarkan adalah `https://NAMA-HOST-PUBLIK/api/telegram/webhook`. Jika URL tunnel berubah, jalankan perintah itu lagi. Restart backend setelah mengubah `backend/.env`; frontend cukup dimuat ulang bila servernya sudah berjalan.

Uji manual: buka frontend sebagai warga, unggah foto dan terbitkan laporan, pastikan satu pesan bertombol muncul di grup, buka `/track` pada browser pelapor yang sama, tekan tombol di Telegram, lalu tunggu maksimal sekitar 10 detik. Langkah **Menunggu kabar** dan **Petugas Menuju Lokasi** menjadi hijau; popup **LAPORAN DITERIMA PETUGAS MENUJU LOKASI** tampil sekali selama 10 detik. Muat ulang halaman: popup tidak muncul lagi. Tekan tombol lama dua kali atau oleh dua anggota: hanya penerimaan pertama yang dicatat.

## Deploy

Live saat ini: **frontend dan backend sama-sama di [Railway](https://railway.com)**, sebagai dua service terpisah dalam satu project (root directory `frontend/` dan `backend/`). `backend/Procfile` sudah cukup untuk Railway auto-detect Python; frontend cukup `npm run build` + `npm start` (Railway auto-detect Next.js). Vercel juga bisa dipakai untuk frontend (root directory `frontend/`) kalau lebih nyaman — langkahnya sama, tinggal ganti host di checklist di bawah.

Checklist supaya kedua sisi benar-benar bisa saling bicara setelah deploy:

1. Di host frontend, set `NEXT_PUBLIC_API_URL` ke URL backend yang sudah live (bukan `localhost`).
2. Di host backend, set `CORS_ORIGINS` ke URL frontend yang sudah live (bukan `localhost`) — request akan diblokir CORS kalau lupa ini.
3. Pastikan `DEMO_MODE=false` di `.env` backend produksi, supaya laporan yang benar-benar dikirim juri tidak ikut ditandai sebagai data contoh.
4. Isi `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, dan `MODEL_API_KEY` di `.env` backend produksi (nilai yang sama seperti `backend/.env.example`).
