# GEMA — Gerakan Evaluasi dan Monitoring Ancaman

**Tim Labtek V Ijo Lumut Kya** — Institut Teknologi Bandung

- Juan Oloando Simanungkalit
- Ariel Sitorus Cornelius
- Naomi Azzahra
- Wa Ode Amerta Lambelu Jamaluddin
- Endda Tsa Azzahra Syaifur

## Tujuan

Aplikasi web yang membantu warga melaporkan indikasi bencana (banjir, tanah longsor, kebakaran) dari foto, melihat laporan komunitas lewat peta dan daftar, membaca panduan keselamatan di area berisiko, dan memberi konfirmasi soal kedatangan bantuan. Lihat [`PRD.md`](./PRD.md) untuk spesifikasi lengkap.

## Struktur

```
frontend/   Next.js — UI, peta, form laporan
backend/    FastAPI (Python) — semua endpoint API
```

## Cara menjalankan

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
uvicorn app.main:app --reload --port 8000
```
Buka http://localhost:8000/health untuk cek server hidup.

Sebelum menguji unggah laporan, jalankan file di `backend/migrations/` lewat Supabase SQL Editor secara berurutan: `001_initial.sql`, `002_severity_kritis.sql`, lalu `003_vote_functions.sql`. Untuk database yang sudah ada, jalankan migrasi yang belum diterapkan. Migrasi `002` wajib agar hasil AI dengan severity `kritis` bisa disimpan.

## Deploy

Frontend ke [Vercel](https://vercel.com) (root directory `frontend/`), backend ke platform yang auto-detect Python (Render/Railway/Fly — `backend/Procfile` sudah cukup untuk itu). Checklist supaya kedua sisi benar-benar bisa saling bicara setelah deploy:

1. Di Vercel, set `NEXT_PUBLIC_API_URL` ke URL backend yang sudah live (bukan `localhost`).
2. Di host backend, set `CORS_ORIGINS` ke URL frontend Vercel yang sudah live (bukan `localhost`) — request akan diblokir CORS kalau lupa ini.
3. Pastikan `DEMO_MODE=false` di `.env` backend produksi, supaya laporan yang benar-benar dikirim juri tidak ikut ditandai sebagai data contoh.
4. Isi `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, dan `MODEL_API_KEY` di `.env` backend produksi (nilai yang sama seperti `backend/.env.example`).
