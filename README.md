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
