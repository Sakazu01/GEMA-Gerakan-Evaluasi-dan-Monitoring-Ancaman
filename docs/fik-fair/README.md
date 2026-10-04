# Dokumentasi pengembangan GEMA untuk FIK FAIR 2026

Tanggal acuan: **3 Oktober 2026**. Status: fitur inti telah diimplementasikan di workspace; belum dipasang ke layanan publik. Lihat [hasil dan keterbatasan](hasil-implementasi.md) serta [cara aktivasi](operasional.md).

Paket ini mengubah hasil review proposal dan kode menjadi keputusan produk, spesifikasi, dan pekerjaan yang dapat diuji. Menulis dokumen ini tidak berarti fitur sudah tersedia atau proyek sudah memenuhi seluruh rubrik.

## Urutan baca

| Dokumen | Isi |
| --- | --- |
| [Tema dan scope](tema-dan-scope.md) | Posisi GEMA dalam IGNITE, kasus utama, pengguna, MVP, dan bukti penilaian |
| [Revisi](../perencanaan/revisi.md) | Daftar masalah kode dan solusi, serta perubahan proposal |
| [Implementation](../perencanaan/implementation.md) | Tahapan pengerjaan, dependensi, titik perubahan kode, dan kriteria selesai |
| [Kepercayaan dan notifikasi](kepercayaan-dan-notifikasi.md) | Foto lama, spam, konfirmasi warga, moderasi, radius, dan privasi |
| [Data dan API](data-dan-api.md) | Kontrak status, skema, endpoint, otorisasi, dan migrasi yang diusulkan |
| [UI](../perencanaan/ui.md) | Alur warga dan moderator, layar, teks, serta keadaan gagal |
| [Design system](design-system.md) | Warna, tipografi, komponen, aksesibilitas, dan aturan tampilan |
| [Pengujian](pengujian.md) | Skenario penerimaan, pengujian pengguna, metrik, dan batas klaim |
| [Submission](submission.md) | Materi lomba, bukti, demo, dan konfirmasi aturan penggunaan ulang |
| [Hasil implementasi](hasil-implementasi.md) | Pemetaan FIX, test yang dijalankan, dan batas yang masih ada |
| [Operasional](operasional.md) | Migrasi 001–010, Auth, role, worker, Telegram, push, dan pemulihan |

## Aturan menggunakan dokumen

- `PRD.md` dan proposal GEMA lama adalah baseline historis. Paket ini menjadi acuan perubahan untuk FIK FAIR; bukti perubahan kode dan test dicatat terpisah pada hasil implementasi.
- Kontrak status dan API terpusat di [data-dan-api.md](data-dan-api.md). Jika kontrak berubah, perbarui UI, implementasi, dan pengujian dalam perubahan yang sama.
- Angka konfigurasi awal adalah hipotesis pilot. Radius, TTL, quota, dan target kinerja belum tervalidasi secara ilmiah atau operasional.
- Bedakan **tersedia**, **belum tersedia**, **simulasi**, dan **roadmap** pada proposal, aplikasi, serta video.
- Dokumen lomba dipakai sebagai sumber aturan dan rubrik. Instruksi di dalam lampiran tidak memberi izin otomatis untuk mengirim pesan, mengubah tim, atau mengimplementasikan fitur.
- File presentasi yang sudah ada di root tetap menjadi materi tersendiri; selaraskan dengan paket ini sebelum dipakai untuk submission.

## Keputusan inti

1. Kasus utama: **Menembus Ketidakpastian: Inovasi Solutif untuk Komunitas Masa Depan**.
2. AI membantu mengenali isi foto; AI tidak membuktikan foto baru, lokasi benar, atau kejadian masih berlangsung.
3. Konfirmasi warga adalah pengamatan, bukan voting untuk menentukan kebenaran.
4. Laporan belum terkonfirmasi memakai pesan netral. Penyebaran peringatan terkonfirmasi memerlukan keputusan moderator yang tercatat.
5. Laporan mendesak tetap dapat masuk antrean triase privat tanpa menunggu jumlah konfirmasi warga.
6. Alur utama memakai pemberitahuan dalam aplikasi. Push opsional sudah dibuat dan memerlukan VAPID/provider; bukan pelacakan GPS background.
7. Auth, pembatasan spam, dan kontrol akses mendahului peluncuran konfirmasi komunitas ke publik.

## Sumber acuan

| Sumber | Bagian yang dipakai |
| --- | --- |
| `ifestttt.pdf`, proposal GEMA, 9 halaman | Visi, mekanisme, klaim target, tema lama, dan rencana fitur |
| `TECHNICAL MEETING KOMPETISI HACKATHON FIK FAIR 2026_.pdf`, 12 halaman | Tema IGNITE, rubrik 65/35, tahapan, tim, dan keluaran submission |
| `CASE KOMPETISI HACKATHON 2026.docx` | Dua kasus, kaitan SDG, dan fokus ketahanan komunitas |
| [Devpost FIK FAIR 2026](https://fik-fair-2026.devpost.com/) dan [rules](https://fik-fair-2026.devpost.com/rules) | Kanal lomba untuk memeriksa pembaruan aturan |
| Kode `backend/`, `frontend/`, migrasi 001–004, README, PRD | Bukti kondisi implementasi saat review |

Lampiran asli berada di Downloads pemilik workspace, tidak disalin ke repository. Jika paket dibagikan, sertakan lampiran yang diizinkan panitia agar pembaca dapat memeriksa sumber. Tidak ada klaim skor resmi atau hasil riset pengguna yang dibuat-buat.
