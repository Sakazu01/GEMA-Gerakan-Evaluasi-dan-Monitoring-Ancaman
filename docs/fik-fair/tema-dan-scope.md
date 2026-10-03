# Tema, pengguna, dan batas pengembangan

Status: arah produk FIK FAIR 2026, acuan 3 Oktober 2026. Fitur inti sudah dibuat; mitra, uji lapangan, dan bukti rubrik tetap perlu dilengkapi.

## Posisi utama

**GEMA membantu warga dan pengelola komunitas memperoleh informasi bencana lokal yang lebih dapat ditelusuri, mengurangi penyebaran laporan meragukan, dan mengoordinasikan tindak lanjut awal.**

Tema utama lomba: **IGNITE — Inspiring Growth, Networking, Innovation, Technology, and Exploration**. Pilih kasus kedua: **Menembus Ketidakpastian: Inovasi Solutif untuk Komunitas Masa Depan**, dengan fokus Exploration, Resilience & Future Cities serta SDG 9, 11, dan 13.

| Hubungan tema | Penyesuaian GEMA | Bukti yang perlu ditampilkan |
| --- | --- | --- |
| Exploration | Menguji bagaimana warga membedakan laporan, bukti, dan kejadian terkini | Temuan wawancara dan pengujian alur |
| Resilience | Warga dapat memberi pengamatan, melihat pembaruan, dan melaporkan saat koneksi bermasalah | Demo konfirmasi; offline hanya jika sudah dibangun |
| Future Cities | Informasi lokal, lokasi yang cukup relevan, dan antrean tindak lanjut komunitas | Demo warga–moderator–responder dengan status akurat |
| SDG 9 | Infrastruktur pelaporan dan pencatatan keputusan | Arsitektur, kontrol akses, dan hasil uji |
| SDG 11 | Membantu kesiapsiagaan lingkungan tempat tinggal | Uji bersama warga/relawan komunitas pilot |
| SDG 13 | Mendukung adaptasi terhadap risiko terkait lingkungan | Skenario banjir atau longsor; bukan klaim semua kebakaran akibat iklim |

Kasus pertama, **Akses untuk Semua: Mengatasi Kesenjangan dan Menjelajah Solusi Inklusif**, bisa menjadi manfaat pendukung melalui bahasa sederhana, tampilan daftar, input lokasi manual, dan akses koneksi rendah. Jangan mengklaim dua kasus sebagai fokus setara tanpa masalah utama yang jelas.

## Pengguna pilot

Mulai dengan satu komunitas: misalnya warga satu kelurahan rawan banjir serta relawan/pengelola lingkungan yang bersedia melakukan triase. Lokasi dan mitra ini **belum ditetapkan**; contoh bukan bukti kemitraan.

- Warga pelapor: memberi waktu pengamatan, lokasi, dan bukti yang dimiliki.
- Warga sekitar: memberi pengamatan langsung atau menyebut informasi dari orang lain.
- Moderator komunitas: meninjau informasi yang bertentangan dan mencatat keputusan.
- Responder terdaftar: mengakui penerimaan laporan dan memperbarui tindakan yang benar-benar dilakukan.

Istilah “pemerintah” pada dashboard lama tidak membuktikan integrasi lembaga. Untuk pilot gunakan “Dashboard Pengelola” sampai ada mitra resmi.

## MVP yang dipilih

**Alur inti:** warga melapor → laporan netral tercatat → warga sekitar mendapat pemberitahuan dalam aplikasi → pengamatan terkumpul → moderator memutuskan → responder mencatat penerimaan.

| Wajib sebelum pilot publik | Lanjutan setelah fondasi lulus |
| --- | --- |
| Auth bertanda tangan dan hak akses moderator | Push, subscription, dan preferensi area |
| Waktu pengamatan, sumber foto, status bukti terpisah dari AI | Pengelompokan banyak laporan menjadi satu kejadian |
| Pembatasan spam dan pengaduan tanpa auto-hide tiga suara | Deteksi kemiripan foto lintas laporan |
| Konfirmasi warga dengan tiga pilihan dan sumber informasi | Offline draft dan pengiriman ulang yang lebih lengkap |
| Pemberitahuan dalam aplikasi dengan status data yang jelas | Integrasi lembaga, data cuaca, atau sumber resmi |
| Teks tracker sesuai tindakan sebenarnya; audit keputusan | Status berangkat/tiba dari responder yang terotorisasi |
| Data demo terpisah dan pengujian pengguna terdokumentasi | Evaluasi AI dengan dataset berlabel yang memadai |

Offline draft, pengiriman ulang, push opsional, serta hash/sinyal kemiripan kini sudah dibuat. Tabel di atas menyimpan urutan prioritas awal; status aktual ada di [hasil implementasi](hasil-implementasi.md). Pengelompokan incident, integrasi resmi, status berangkat/tiba, dan evaluasi pengguna/AI tetap roadmap. Test browser memakai mock layanan luar; backend dan transaksi PostgreSQL diuji lokal, dan integrasi staging masih perlu dilakukan.

## Yang tidak dijanjikan pada MVP

Tidak menjanjikan prediksi bencana, pembuktian otomatis keaslian foto, jaminan radius aman, pelacakan GPS terus-menerus saat web tertutup, dispatch nasional, atau lokasi evakuasi resmi yang belum diverifikasi. Jenis `fire` saat ini berarti kebakaran umum; klaim deteksi khusus karhutla memerlukan data dan evaluasi tersendiri.

## Rubrik dan bukti

Estimasi review sebelumnya **62/100, rentang 55–70**, bersifat indikatif berdasarkan proposal dan kode. Demonstrasi live, uji pengguna, dan seluruh aturan teknis belum terbukti. Angka ini bukan nilai panitia.

| Aspek | Bobot | Estimasi awal | Bukti perbaikan yang harus disiapkan |
| --- | ---: | ---: | --- |
| Kejelasan masalah dan relevansi tema/subtema | 15 | 12 | Satu masalah utama, komunitas pilot, hubungan case 2 |
| Efektivitas solusi | 20 | 13 | Alur laporan lama, laporan nyata, konflik pengamatan, dan kegagalan jaringan |
| Roadmap masa depan | 10 | 5 | Tahapan, dependensi, indikator keberhasilan, serta batas kemampuan |
| Riset dan pengujian bersama pengguna nyata | 10 | 1 | Catatan peserta, tugas, hasil, temuan, perubahan berdasarkan temuan |
| Kreativitas dan keunikan | 10 | 7 | Penjelasan manfaat pengamatan warga + moderasi, perbandingan berbukti |
| Komponen teknis wajib diterapkan | 15 | 10 | Checklist persyaratan resmi; demo komponen yang benar-benar berjalan |
| Alasan dan penggunaan teknologi | 10 | 8 | AI untuk interpretasi visual; backend untuk kebijakan; database untuk audit |
| Demonstrasi fungsional bagi pengguna | 10 | 6 | Demo dari input sampai tindak lanjut, bukan layar statis |
| **Total** | **100** | **62** | Perbarui hanya setelah bukti tersedia |

Dokumen yang diperiksa belum merinci semua komponen teknis wajib secara tegas. Salin checklist resmi terbaru ke [submission.md](submission.md) setelah diperoleh; jangan menganggap stack yang ada otomatis mendapat 15 poin.

## Ukuran keberhasilan

- Peserta dapat menjelaskan perbedaan “belum dikonfirmasi” dan “dikonfirmasi pengelola”.
- Peserta yang tidak tahu tidak dipaksa memberi jawaban negatif.
- Tidak ada aksi tiga pengaduan yang otomatis menghapus laporan dari feed.
- Gangguan API terlihat sebagai gangguan data, bukan “tidak ada bahaya”.
- Semua keputusan konfirmasi/penolakan punya aktor, waktu, alasan, dan jejak audit.
- Keberhasilan tidak hanya dihitung dari jumlah laporan; ukur penyelesaian tugas, pemahaman, waktu triase, dan kesalahan keputusan.

Target kuantitatif dan metode dicatat di [pengujian.md](pengujian.md). Dampak keselamatan di dunia nyata memerlukan pilot lebih panjang, bukan disimpulkan dari demo.
