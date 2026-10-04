# Menjalankan hasil implementasi GEMA

Status 4 Oktober 2026: perubahan kode tersedia di branch `dev`, belum diterapkan ke Supabase atau deployment publik. Hasil test ada di [hasil-implementasi.md](hasil-implementasi.md), sedangkan keputusan produk lengkap berada di [NOTULEN_EVALUASI.md](../../NOTULEN_EVALUASI.md).

## 1. Database dan identitas

1. Gunakan project Supabase staging yang terpisah dari publik. Backup database yang sudah berisi data sebelum migrasi.
2. Jalankan SQL di `backend/migrations/` berurutan dari 001 sampai **011**, hanya file yang belum diterapkan. Jangan menjalankan ulang migrasi yang sudah tercatat pada database berisi data.
3. Migrasi 005 menahan laporan legacy yang belum memiliki waktu pengamatan. Waktu unggah tidak dipakai untuk mengarang waktu kejadian. Identitas UUID lokal lama tidak otomatis menjadi pemilik sesi Auth baru.
4. Aktifkan anonymous sign-in pada Supabase Auth. Browser memakai publishable/anon key; backend memakai secret/service-role key dari project yang sama. Petugas dashboard memakai akun permanen melalui email dan kata sandi.
5. Migrasi 009 mengatur bucket `report-photos` menjadi privat pada Supabase. Pastikan tidak ada policy `storage.objects` lama yang memberi akses baca umum pada bucket tersebut. Uji URL publik lama: harus tidak dapat dibaca; preview baru melalui signed URL pemilik/pengelola, masa berlaku 60 detik.
6. Migrasi 010 mencatat `closed_at` di server dan memakai tanggal penutupan untuk retensi foto. Untuk closed legacy, tanggal diambil dari audit; jika tidak diketahui, jendela retensi dimulai saat migrasi. Tanggal publikasi tidak dianggap tanggal penutupan.
7. Migrasi 011 menambah provenance foto, relasi kemiripan internal/web, grouping incident, submit camera-only, aturan enam suara Palsu, dan penerimaan responder yang mengaktifkan marker publik.

Setelah membuat akun permanen pengelola, administrator memberi role menggunakan SQL Editor. Ganti UUID contoh dengan ID akun Auth yang benar:

```sql
insert into public.user_roles(user_id,role)
values('UUID-AKUN-PERMANEN','responder')
on conflict do nothing;
```

Jangan memberi role melalui `user_metadata` atau sakelar di browser. Backend memeriksa akun permanen dan tabel role saat membaca data privat maupun memutuskan laporan.

## 2. Environment dan server

Salin contoh environment, lalu isi di mesin/deployment Anda. Nilai rahasia tidak disimpan pada dokumentasi atau frontend.

| Lokasi | Isi wajib |
| --- | --- |
| `backend/.env` | SUPABASE_URL, SUPABASE_SECRET_KEY, CORS_ORIGINS, RATE_LIMIT_SALT yang acak |
| `frontend/.env.local` | NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY |
| AI opsional | MODEL_API_KEY; tanpa layanan AI laporan kamera tetap disimpan dan dikirim dengan status analisis unavailable |
| Provenance web opsional | WEB_IMAGE_PROVIDER=google_vision dan GOOGLE_VISION_API_KEY; gunakan `none` jika belum tersedia |
| Tautan Telegram | PUBLIC_APP_URL berisi origin frontend HTTPS agar tombol bukti membuka detail yang benar |
| Produksi | DEMO_MODE=false, NEXT_PUBLIC_DEMO_MODE=false; HTTPS untuk kamera/lokasi/push |

Dari `backend/`:

```powershell
rtk proxy python -m venv .venv
rtk proxy .venv/Scripts/python.exe -m pip install -r requirements.txt
rtk proxy .venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000 --no-access-log
```

Dari `frontend/`, gunakan Node 24 untuk suite test yang membaca TypeScript langsung:

```powershell
rtk proxy npm ci
rtk proxy npm run dev
```

Frontend dibuka pada `http://localhost:3000`, health backend pada `http://localhost:8000/health`. Environment `NEXT_PUBLIC_*` dibaca saat build; rebuild setelah menggantinya. Font dibundel lokal. Ubin peta tetap memerlukan jaringan; daftar teks tersedia tanpa ubin.

Setelah migrasi dan pemeriksaan staging berhasil, gunakan `COMMUNITY_ENABLED=true` serta `WORKER_ENABLED=true`. Worker dalam proses FastAPI menjalankan penutupan expired, cleanup media, dan outbox. Untuk pemulihan, `COMMUNITY_ENABLED=false` menghentikan input pengamatan; `WORKER_ENABLED=false` menghentikan worker. Ini tidak mengembalikan autentikasi UUID atau auto-hide lama.

Samakan batas body proxy minimal 11 MiB untuk multipart berkas 10 MiB. Batas aplikasi menghentikan body tanpa Content-Length juga. Atur timeout dan pembatasan koneksi pada hosting. Access log produksi pada Procfile dimatikan agar query lokasi tidak tercetak; request ID tetap ada pada respons error.

Publish dibatasi satu laporan setiap 180 detik per identitas anonim. Batas jaringan yang lebih longgar tetap melindungi jaringan bersama; nearby mempunyai batas burst baca terpisah. Kegagalan store quota baca tidak memblokir baca publik. IP memakai alamat peer yang diterima server, tidak mempercayai header X-Forwarded-For dari client. Bila hosting memakai proxy, konfigurasi daftar proxy tepercaya pada Uvicorn/hosting agar seluruh warga tidak dianggap satu peer proxy; jangan mempercayai semua alamat tanpa memeriksa akses langsung ke backend.

## 3. Telegram privat, opsional

Isi TELE_API, TELE_CHAT_ID, TELEGRAM_WEBHOOK_SECRET. Daftarkan setiap responder yang diizinkan sebagai role server dan pemetaan Telegram:

```sql
insert into public.user_roles(user_id,role)
values('UUID-RESPONDER','responder') on conflict do nothing;
insert into public.telegram_responders(telegram_user_id,user_id,label)
values(123456789,'UUID-RESPONDER','Responder pilot')
on conflict(telegram_user_id) do update set user_id=excluded.user_id,label=excluded.label;
```

TELEGRAM_RESPONDER_IDS dapat membatasi ID tambahan, tetapi tidak menggantikan pemetaan di database. Backend memeriksa secret webhook, grup, pesan, dan identitas responder.

Daftarkan webhook HTTPS melalui `rtk proxy .venv/Scripts/python.exe set_telegram_webhook.py https://HOST-BACKEND` dari folder backend. Langkah ini benar-benar mengubah konfigurasi bot; gunakan bot/grup pilot tim, dan lakukan hanya ketika layanan tersebut siap.

Submit menyimpan laporan dan antrean dalam satu transaksi. Worker mengirim triase tanpa menunda respons warga. ACCEPTED berarti **laporan diterima responder**, belum menyatakan berangkat atau tiba.

## 4. Web Push, opsional

Siapkan pasangan VAPID untuk tim dan isi VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT yang sesuai, lalu PUSH_ENABLED=true dan WORKER_ENABLED=true. Private key hanya di server. Browser menerima public key melalui `/api/push/config`.

Pengguna membuka preferensi notifikasi, memilih area/lokasi, lalu mengaktifkan dengan izin browser. Unsubscribe tersedia. Lokasi perangkat untuk klaim “sekitar Anda” berlaku 5 menit dengan akurasi ≤100 m; area pilihan berlaku 30 hari dan tidak dianggap posisi fisik. Radius pengiriman produk tetap 500 meter. Browser tidak dipantau GPS terus menerus di background.

Provider default: FCM, Mozilla, Apple. Server hanya mengirim ke hostname HTTPS yang diizinkan dan tidak mengikuti redirect. Perubahan status/penutupan memberi pembaruan kepada penerima sebelumnya. Versi antrean yang sudah digantikan tidak dikirim sebagai informasi lama.

## 5. Operasi harian dan pemulihan

| Kondisi | Tindakan |
| --- | --- |
| Laporan menunggu petugas | Periksa paket Telegram: foto, analisis AI, keterbatasan, sumber web, laporan mirip, lokasi/waktu, dan suara warga; tekan **Terima Laporan** bila ditindaklanjuti |
| Enam suara Palsu | Laporan pending disembunyikan dan Telegram diperbarui; laporan ACCEPTED tidak dibatalkan otomatis |
| Dashboard pemerintah | Gunakan `/pengelola` sebagai riwayat dan pemeriksaan bukti; keputusan operasional utama tetap melalui Telegram |
| Outbox retry | Kegagalan provider yang diketahui dicoba ulang dengan backoff, maksimal 5 percobaan |
| Outbox unknown | Periksa provider/grup dahulu. Tombol retry pengelola mencatat audit dan menjelaskan risiko pesan ganda; tidak ada retry otomatis pada hasil ambigu |
| Draft offline | Buka aplikasi atau reconnect; hanya draft yang telah diminta dikirim yang disinkronkan. Lokal tersimpan ≠ server menerima |
| Draft server berumur >24 jam | Setelah server memastikan `draft_expired`, client membuat draft server baru sekali dari data lokal. Waktu pengamatan asli tetap dipakai; data lama tetap held. Kegagalan jaringan ambigu memakai ID dan idempotency key yang sama |
| Draft server sudah dihapus | Buka draft perangkat, periksa Laporan Saya, lalu pilih Buat draft baru dari data ini. Data baru tersimpan lokal dan perlu submit eksplisit; waktu asli dipertahankan |
| Layanan AI/anggaran habis | Lanjut laporan manual untuk review; hasil AI nullable |
| Media gagal dibuka | Perbarui signed URL; laporan dan tinjauan tetap tersedia |

Retention: draft lokal 7 hari, draft server 24 jam, koordinat pengamat 24 jam, foto laporan closed 30 hari setelah penutupan. Audit keputusan tidak dibersihkan otomatis, sehingga melampaui minimum 90 hari. Cleanup melepaskan referensi dan membuat tugas penghapusan atomik sebelum menghapus storage; kegagalan penghapusan dapat diulang. Jika storage berhasil menerima upload ketika database tidak dapat memastikan insert, periksa orphan melalui inventaris storage dan referensi database sebelum menghapusnya. Jangan menghapus saat database tidak dapat diperiksa.

Anonymous Auth membatasi akun/sesi, belum membuktikan satu manusia. CAPTCHA/aturan penyalahgunaan provider dan pengamatan pilot perlu disesuaikan setelah pola trafik diketahui. Hash persis/dHash hanya membandingkan terhadap gambar yang pernah tersimpan; foto berita yang sama sekali belum dikenal tetap memerlukan verifikasi konteks.

## 6. Pemeriksaan staging sebelum pilot

Gunakan lingkungan/grup tim dengan data yang jelas berlabel simulasi. Jalankan alur warga → izin lokasi → kamera → submit → paket Telegram → responder accepted → marker peta. Uji pula foto identik/mirip, provider web unavailable, cooldown 180 detik, suara Konfirmasi/Palsu, serta enam suara Palsu. Coba sesi warga pada endpoint staff: harus ditolak. Coba URL foto publik: tidak boleh terbaca. Putuskan jaringan dan pastikan draft dapat dipulihkan.

Pengujian otomatis menggunakan mock layanan luar dan PostgreSQL lokal. Anonymous Auth, storage Supabase, push provider, bot Telegram nyata, dan deployment belum diuji live pada perubahan ini. Jangan mengklaim akurasi AI, dampak anti-hoax, mitra resmi, atau kesiapan layanan darurat dari test otomatis.

`backend/seed_demo.py` hanya untuk fixture database demo terpisah dan menolak berjalan tanpa `DEMO_MODE=true`. Fixture selalu `is_demo=true`, tidak masuk feed/nearby/density/chat publik, tidak membuat hasil AI atau foto palsu, dan tidak mengirim notifikasi. UUID fixture bukan token Auth. Untuk demonstrasi UI, gunakan alur laporan nyata pada project staging tim yang terisolasi dari publik; jangan mengganti filter demo di deployment publik.

## 7. Diagnostik konfigurasi tanpa perubahan layanan

Dari root repo, `rtk proxy backend/.venv/Scripts/python.exe backend/check_readiness.py` menampilkan keberadaan konfigurasi, tanpa nilai rahasia. Tambahkan `--live` untuk GET pada skema Supabase dengan limit 0 serta metadata bucket; tidak mengambil isi laporan, membuat akun, mengubah database, atau mengirim notifikasi.

Pemeriksaan laptop pada 3 Oktober: salt quota telah dibuat pada `backend/.env` yang ignored; frontend `.env.local` belum tersedia; VAPID belum tersedia; worker/push tetap false. Hostname proyek Supabase dari konfigurasi gagal DNS, sementara `supabase.com` dan `example.com` berhasil. Ini belum membuktikan apakah project dipause, dihapus, atau URL berubah. Periksa project aktif dan Project URL pada dashboard, kemudian isi publishable/anon key frontend. Jangan memakai secret key backend pada frontend. Koneksi UI sesi ini tidak menyediakan browser pribadi yang dapat dikendalikan; Chromium lokal dipakai untuk test terisolasi.
