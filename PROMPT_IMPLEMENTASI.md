# Prompt Implementasi GEMA di Branch `dev`

Salin prompt berikut untuk menjalankan tahap implementasi.

---

Anda bekerja pada repository GEMA. Implementasikan seluruh kebutuhan dalam `NOTULEN_EVALUASI.md` pada branch `dev` dengan branch `main` sebagai acuan tampilan dan alur pengguna.

## Tujuan utama

Pertahankan UI dan pengalaman sederhana dari `main`: pengguna masuk tanpa form login, lokasi diminta, peta sekitar tampil, pengguna membuka kamera, mengambil foto, menambah deskripsi, lalu menekan satu tombol **Laporkan**. Di belakang layar, gunakan fondasi keamanan dan ketahanan yang sudah ada di `dev`.

## Aturan kerja wajib

1. Baca `AGENTS.md`, instruksi yang dirujuk olehnya, `NOTULEN_EVALUASI.md`, dan dokumentasi terkait sebelum mengubah kode.
2. Pastikan branch aktif adalah `dev`. Jangan mengubah branch `main`.
3. Periksa status worktree dan pertahankan seluruh perubahan lokal pengguna. Jangan memakai `git reset`, `git clean`, checkout seluruh folder dari `main`, atau operasi destruktif lainnya.
4. Gunakan `git show main:<path>` atau diff sebagai referensi. Port UI secara selektif; jangan menimpa fondasi auth, media privat, quota, outbox, push, audit, dan trust dari `dev`.
5. Aset `main` sudah berada di `dev`; verifikasi sebelum menyalin. Pertahankan `frontend/public/sw.js`.
6. Jangan mengirim pesan Telegram atau push nyata dari test.
7. Jangan menambahkan moderator sebagai tahap wajib. Telegram adalah tempat petugas menerima laporan; dashboard pemerintah hanya riwayat/pemantauan.
8. Jangan menampilkan klaim bahwa AI memastikan laporan benar atau palsu.
9. Kerjakan sampai implementasi, migrasi, test, dan dokumentasi konsisten. Jangan berhenti setelah membuat mock UI.

## Perilaku yang harus dibuat

### A. Pengalaman warga mengikuti `main`

- Beranda langsung berfokus pada peta dan laporan sekitar.
- Anonymous Supabase Auth dibuat di belakang layar tanpa form login.
- Minta lokasi perangkat ketika aplikasi dibuka; sediakan retry dan area manual jika izin ditolak.
- Gunakan komponen, gaya, aset, dan struktur visual `main` untuk beranda, report form, detail, tracker, dan dashboard.
- Tombol **Laporkan Bencana** membuka alur kamera.
- Foto hanya dari kamera langsung. Hapus galeri, file picker, drag-and-drop, serta pilihan `gallery`/`forwarded` dari alur warga.
- Tampilkan peringatan hukum dari `NOTULEN_EVALUASI.md` sebelum submit.
- Setelah foto, tampilkan preview, ambil ulang, lokasi, dan deskripsi opsional.
- Gunakan satu tombol **Laporkan**. Setelah ditekan, simpan draft terlebih dahulu, kemudian jalankan analisis dan pengiriman.
- Tampilkan progress yang manusiawi serta ID/status laporan setelah berhasil.

### B. Cooldown dan idempotency

- Ubah quota publish menjadi satu laporan per 180 detik per user anonim.
- Pertahankan batas jaringan berbasis HMAC sebagai batas sekunder yang lebih longgar.
- Kembalikan `429` dan `retry_after_seconds`; UI menampilkan sisa waktu.
- Retry dengan idempotency key dan payload sama mengembalikan laporan yang sama.
- Payload berbeda dengan key sama harus konflik dan tidak menerbitkan laporan.

### C. Analisis visual dan provenance

- Pertahankan analisis visual, tetapi keluarkan kondisi yang terlihat, keparahan, ringkasan, confidence/uncertainty, dan batas analisis.
- Gunakan SHA-256 dan perceptual hash milik `dev` untuk mencari laporan internal yang sama atau mirip.
- Simpan relasi match secara terstruktur. Kembalikan top match beserta ID, thumbnail privat/terotorisasi, jenis, waktu, lokasi, jarak, status, skor, dan alasan.
- Buat interface/provider adapter untuk pencarian kemiripan gambar di web. Implementasi pertama dapat menggunakan Google Cloud Vision Web Detection melalui environment/config, tetapi provider harus dapat diganti.
- Simpan source page URL, image URL/thumbnail bila aman, title, publication date bila tersedia, match type, dan score.
- Provider yang belum dikonfigurasi atau gagal tidak boleh menggagalkan laporan.
- Jangan otomatis menandai hoaks. Gunakan status bukti yang ditetapkan spesifikasi.

### D. Telegram dan status responder

- Perluas pesan Telegram dengan analisis AI, status provenance, top internal/web matches, jumlah Konfirmasi/Palsu, lokasi, waktu, dan deskripsi.
- Pertahankan tombol **TERIMA LAPORAN** dan tambahkan **LIHAT BUKTI** menuju detail privat petugas.
- Validasi webhook secret, chat, message, report, serta allowlist responder.
- Callback harus idempoten dan tercatat dalam audit.
- Setelah diterima petugas, status menjadi `accepted`, pesan Telegram diperbarui, dan marker tampil pada peta publik.
- Sebelum diterima, laporan berstatus `pending_response` dan tidak tampil sebagai marker umum, tetapi tetap dapat dibuka oleh penerima notice yang berhak.
- Kegagalan Telegram masuk outbox/retry dan tidak membatalkan penyimpanan laporan.

### E. Notifikasi radius 500 meter

- Gunakan fondasi push `dev` dan service worker yang ada.
- Radius produk adalah 500 meter.
- Subscription device hanya eligible jika lokasi cukup baru dan akurasinya memenuhi konfigurasi awal: maksimal 5 menit dan 100 meter.
- Jelaskan izin notifikasi secara terpisah dari izin lokasi.
- Isi push menggunakan bahasa **Ada laporan ... di sekitar Anda**, bukan pernyataan kejadian pasti.
- Dedup per report/version dan kirim koreksi material kepada penerima sebelumnya.
- Jangan mengklaim GPS background kontinu.

### F. Suara Konfirmasi/Palsu

- Ubah observation UI menjadi dua pilihan: **Konfirmasi** dan **Palsu**.
- Tolak self-vote.
- Validasi session, jarak <=500 meter, waktu lokasi, akurasi, dan rate limit di backend.
- Satu user satu suara aktif per laporan; perubahan pilihan melakukan update dan membuat history.
- Terapkan transisi `community_disputed` hanya jika `Palsu >= 6` dan `Palsu > Konfirmasi`, dengan seluruh suara eligible.
- Saat disputed, hentikan notice baru dan sembunyikan laporan dari publik tanpa menghapus data; kirim pembaruan ke Telegram.
- Jika petugas sudah menerima laporan, jangan batalkan otomatis. Kirim pembaruan bukti kepada petugas.

### G. Peta, dashboard, dan incident

- Marker umum muncul setelah petugas menerima laporan.
- Marker menampilkan status responder dan jenis/keparahan.
- Heatmap hanya berasal dari beberapa laporan atau incident yang telah dikelompokkan, bukan dari satu laporan.
- Pertahankan hubungan ke laporan asal ketika grouping/merge dilakukan.
- Dashboard pemerintah mengikuti visual `main`, bersifat read-only untuk riwayat, dan menampilkan seluruh bukti serta tindakan petugas.
- Hilangkan moderator sebagai langkah wajib dari alur pengguna dan operasional utama. Endpoint/komponen legacy boleh dipertahankan sementara hanya jika diperlukan untuk migrasi dan tidak tampil dalam alur final.

### H. Privasi dan ketahanan

- Pertahankan validasi JWT Supabase, bucket privat, signed URL pendek, sanitasi media, batas ukuran/decode/dimensi, dan stripping metadata.
- Jangan mengekspos author ID, IP, path storage, koordinat presisi, alasan privat, atau secret pada endpoint publik.
- Simpan laporan sebelum AI/provider eksternal.
- AI/web/push/Telegram failure mempunyai status eksplisit dan fallback.
- Semua perubahan penting masuk audit.
- Gunakan migration baru setelah migration terakhir; jangan mengedit migration produksi lama.

## Strategi implementasi

Kerjakan secara berurutan dan jaga aplikasi tetap dapat dijalankan setelah setiap tahap:

1. Audit diff `main..dev` dan petakan komponen yang akan diport.
2. Samakan UX frontend dengan `main` sambil mempertahankan auth/API aman `dev`.
3. Implementasikan cooldown 180 detik dan camera-only.
4. Tambahkan data model serta API provenance internal/web.
5. Perluas Telegram dan status map.
6. Implementasikan radius push serta Konfirmasi/Palsu.
7. Jadikan dashboard pemerintah read-only dan selesaikan grouping/heatmap.
8. Perbarui `.env.example`, README/runbook, migration, dan dokumentasi.

## Verifikasi minimum

- Jalankan unit dan integration test backend yang relevan.
- Jalankan lint/typecheck/build frontend.
- Jalankan browser test dengan media device mock untuk alur kamera.
- Tambahkan test cooldown tepat sebelum/sesudah 180 detik.
- Tambahkan test duplicate exact/perceptual dan hasil pembanding lengkap.
- Tambahkan test provider web success/no-result/timeout/unconfigured.
- Tambahkan test radius 499/500/501 meter, lokasi basi, akurasi buruk, self-vote, vote update, dan threshold 6 Palsu versus Konfirmasi.
- Tambahkan test Telegram idempotency dan marker hanya setelah accepted.
- Tambahkan test bahwa endpoint publik tidak membocorkan foto privat/koordinat presisi.
- Gunakan mock/fake transport pada seluruh layanan eksternal.

## Hasil akhir yang harus dilaporkan

- Ringkasan perubahan berdasarkan alur pengguna.
- Daftar file utama dan migration baru.
- Penjelasan apa yang dipindahkan dari `main` dan apa yang dipertahankan dari `dev`.
- Hasil seluruh test/check yang dijalankan.
- Konfigurasi eksternal yang masih perlu diisi, tanpa mengklaim integrasi aktif sebelum benar-benar diuji.
- Risiko atau keterbatasan yang masih tersisa.

Jadikan `NOTULEN_EVALUASI.md` sebagai source of truth. Jika kode lama bertentangan dengan dokumen tersebut, migrasikan perilakunya dengan kompatibilitas data yang aman.

---
