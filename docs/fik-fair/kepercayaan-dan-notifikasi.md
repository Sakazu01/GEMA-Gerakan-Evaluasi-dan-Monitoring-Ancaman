# Kepercayaan laporan dan notifikasi radius

Status 4 Oktober 2026: acuan kebijakan fitur yang diterapkan di branch `dev`. Layanan luar dan pilot belum diaktifkan. Kontrak field/status ada pada [data-dan-api.md](data-dan-api.md), bukti implementasi pada [hasil-implementasi.md](hasil-implementasi.md), dan keputusan produk lengkap pada [NOTULEN_EVALUASI.md](../../NOTULEN_EVALUASI.md).

## Prinsip keputusan

AI dan pencarian kemiripan menyiapkan bukti bagi petugas. Keduanya tidak menetapkan sebuah laporan benar atau palsu. Petugas melihat foto, lokasi dan waktu, penjelasan AI beserta keterbatasannya, laporan GEMA yang mirip, sumber web, serta tanggapan warga sebelum mengambil tindakan.

| Risiko | Perlindungan |
| --- | --- |
| Satu orang mengirim berkali-kali | Sesi anonim bertanda tangan, cooldown publish 180 detik per identitas, batas jaringan, dan idempotency |
| Foto internet atau kejadian lama | Kamera-only, SHA-256, perceptual hash, Google Vision Web Detection opsional, waktu/lokasi, dan bukti sumber untuk petugas |
| Foto yang sama dipakai pada beberapa laporan | Maksimal tiga laporan pembanding dengan foto, ID, waktu, lokasi, jarak, status, metode, dan skor |
| Provider AI/web gagal | Laporan tetap disimpan dan dikirim; status `unavailable` serta keterbatasan dicantumkan |
| Banyak akun memanipulasi suara | Satu jawaban aktif per akun/laporan, larangan self-vote, radius/waktu/akurasi server-side, quota, dan audit |
| Laporan nyata diserang suara Palsu | Palsu harus sedikitnya enam dan lebih banyak daripada Konfirmasi; laporan yang sudah ACCEPTED tidak dibatalkan otomatis |
| Satu laporan menimbulkan kepanikan peta | Marker umum baru muncul setelah responder menekan **Terima Laporan** |

## Alur bukti foto

1. Warga mengambil foto langsung dari kamera browser. UI produksi tidak menyediakan galeri atau file picker.
2. Draft privat disimpan sebelum panggilan AI/provider luar.
3. Gemini menjelaskan jenis, keparahan visual, kondisi lapangan, confidence, dan keterbatasan.
4. Backend membandingkan hash exact dan perceptual dengan laporan GEMA.
5. Jika provider dikonfigurasi, adapter web mencari halaman/gambar yang serupa dan menyimpan sumber teratas.
6. Sistem menyusun paket bukti Telegram. Kemiripan hanya menjadi sinyal konteks; dua warga dapat memotret kejadian yang sama secara sah.
7. Petugas dapat membuka halaman bukti privat dan menerima laporan dari Telegram.

Hasil web harus menyertakan URL halaman/sumber, judul, tanggal bila tersedia, tipe kecocokan, dan skor. Tanpa detail sumber, label “mirip dari internet” tidak cukup berguna dan tidak boleh dipakai sebagai vonis.

## Status dan visibilitas

| Keadaan | Notice radius | Marker/feed publik |
| --- | --- | --- |
| `draft` / sedang dianalisis | Tidak | Tidak |
| `active + PENDING` | Ya, jika eligible | Tidak |
| `held + under_review` | Tidak ada notice baru | Tidak |
| `active + ACCEPTED` | Ya | Ya |
| `closed` | Koreksi dapat dikirim ke penerima lama | Tidak |

AI relevant tidak mengubah status menjadi ACCEPTED. Dashboard pemerintah bersifat read-only; tombol Telegram adalah jalur keputusan responder pada alur utama.

## Konfirmasi warga sekitar

Pertanyaan pada notice mempunyai dua pilihan:

| Jawaban UI | Nilai API | Arti |
| --- | --- | --- |
| **Konfirmasi** | `seen` | Pengguna memeriksa kondisi di sekitar laporan dan menemukan tanda yang sesuai |
| **Palsu** | `not_observed` | Pengguna memeriksa area dan tidak menemukan tanda; catatan alasan wajib |

Aturannya:

- pengguna memiliki sesi anonim yang valid dan bukan pelapor;
- lokasi perangkat diperbarui maksimal 5 menit, akurasi maksimal 100 meter, dan jarak maksimal 500 meter;
- `observed_at`, lokasi, dan kedekatan divalidasi backend;
- satu identitas hanya dihitung sekali; mengganti pilihan memperbarui jawaban lama;
- riwayat perubahan tetap diaudit;
- pengguna tidak diarahkan mendekati sumber bahaya untuk memperoleh bukti.

Laporan `PENDING` disembunyikan sementara jika Palsu ≥6 dan Palsu > Konfirmasi. Sistem menghentikan notice baru, memperbarui Telegram, dan mempertahankan semua data untuk audit. Jika responder sudah menerima laporan, status ACCEPTED tetap berlaku dan suara warga menjadi bukti tambahan.

## Radius dan waktu

| Parameter | Nilai awal | Fungsi |
| --- | --- | --- |
| `CONFIRMATION_RADIUS_M` | 500 m | Radius notice dan hak tanggapan |
| `DEVICE_LOCATION_MAX_AGE_MIN` | 5 menit | Mencegah lokasi lama dianggap posisi saat ini |
| Akurasi perangkat | ≤100 m | Menolak lokasi yang terlalu tidak presisi |
| `REPORT_ACTIVE_TTL_HOURS` | 12 jam | Masa aktif awal sejak waktu pengamatan |
| `NOTICE_COOLDOWN_MIN` | 30 menit | Mengurangi pengulangan notice yang sama |
| `NEARBY_MAX_ITEMS` | 3 | Membatasi rentetan ajakan konfirmasi |

Radius 500 meter adalah jangkauan produk untuk informasi dan tanggapan, bukan batas aman ilmiah. Browser tidak memberikan GPS latar belakang terus-menerus. Sistem memakai lokasi terakhir yang diberikan saat aplikasi aktif atau area pantauan yang dipilih pengguna, dan harus memakai kata-kata yang sesuai dengan sumber lokasi itu.

Contoh notice:

> Belum dikonfirmasi. Ada laporan kebakaran sekitar 400 meter dari lokasi Anda. Buka detail lalu pilih Konfirmasi atau Palsu berdasarkan pemeriksaan langsung.

## Pencegahan spam

Publish dibatasi satu laporan setiap 180 detik per identitas anonim. Quota tersimpan di database agar reload, tab baru, atau beberapa instance backend tidak melewatinya. Retry idempoten dengan payload yang sama mengembalikan laporan yang sudah tercatat dan tidak membuat pesan Telegram ganda.

Alamat IP publik yang terlihat server boleh di-HMAC sebagai sinyal jaringan, bukan identitas manusia. IP mentah tidak perlu disimpan. Jaringan kantor, kampus, dan rumah dapat dipakai banyak orang, sehingga batas jaringan harus lebih longgar dan tidak menjadi dasar tunggal penolakan.

## Telegram dan dashboard pemerintah

Paket petugas berisi:

- ID, jenis, keparahan visual, lokasi, dan waktu;
- ringkasan AI, confidence, dan keterbatasan;
- status provenance internal/web;
- maksimal tiga laporan GEMA pembanding;
- maksimal tiga sumber web;
- jumlah Konfirmasi dan Palsu;
- tombol **Terima Laporan** dan tautan bukti bila `PUBLIC_APP_URL` tersedia.

Perubahan suara yang material mengedit/memperbarui informasi Telegram melalui outbox. Dashboard `/pengelola` menampilkan riwayat dan seluruh bukti, tanpa tahap persetujuan kedua.

## Privasi dan retensi

- Foto disimpan pada bucket privat dan dibuka melalui signed URL singkat untuk pemilik/staff atau warga yang lolos verifikasi radius.
- Endpoint publik hanya mengirim area dan koordinat yang dibulatkan; identitas pelapor, lokasi pengamat, dan IP tidak dibuka.
- Foto dapat memuat wajah atau nomor kendaraan; metadata dibersihkan dan geotag tidak ditampilkan.
- Draft perangkat disimpan maksimal 7 hari, draft server 24 jam, koordinat rinci pengamat 24 jam, dan foto laporan closed 30 hari setelah penutupan.
- Push memakai izin terpisah dari lokasi dan dapat dinonaktifkan. Unsubscribe tidak menghapus laporan pengguna.

## Batas implementasi

Pencarian web bergantung provider dan tidak mencakup seluruh internet. Perceptual hash dapat menghasilkan false positive maupun false negative. Anonymous Auth tidak membuktikan satu perangkat sama dengan satu manusia. Seluruh nilai awal perlu diuji dalam pilot dan tidak boleh dipasarkan sebagai jaminan bebas hoax atau jaminan respons darurat.
