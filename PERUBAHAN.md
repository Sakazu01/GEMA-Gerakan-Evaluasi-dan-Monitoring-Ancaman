# Perubahan dari Proposal Penyisihan

Dokumen ini membandingkan proposal penyisihan GEMA (§4.1–4.6) dengan implementasi yang benar-benar dibangun, beserta alasan setiap penyimpangan. Tujuannya supaya tidak ada klaim proposal yang dianggap sudah terwujud padahal belum, dan sebaliknya — fitur yang ditambah di luar proposal juga tercatat.

Setiap section pada Tabel 4.2 proposal (Komponen, Fungsi, Pengguna) dibahas satu per satu di bawah, plus dua penambahan yang tidak ada di proposal sama sekali.

## Ringkasan cepat

| Komponen (Tabel 4.2 proposal) | Status | Catatan singkat |
|---|---|---|
| Modul pelaporan warga | Sebagian | Kamera langsung + GPS otomatis ada; antrean offline saat tanpa sinyal **tidak** ada |
| Mesin kecerdasan buatan | Sebagian | Jenis + keparahan ada; skor keyakinan numerik **tidak** diekspos |
| Peta sebaran bahaya | Sebagian + tambahan | Peta severity ada; ditambah mode Kepadatan Laporan yang tidak ada di proposal |
| Mesin ambang batas dan eskalasi | Referensi teks saja | Tidak ada paket eskalasi/ACK sungguhan ke instansi manapun |
| Mesin peringatan dini | **Tidak diimplementasikan** | Tidak ada broadcast ke warga terdaftar dalam radius |
| Dasbor operator | Sebagian | Read-only monitoring; tanpa antrean verifikasi, override, atau panel cuaca |
| Pelacak respons | Sebagian, disederhanakan | 1 event biner (diterima petugas via Telegram), bukan multi-tahap dispatch |
| Aksesibilitas offline-first | **Tidak diimplementasikan** | Tidak ada service worker/PWA/antrean sinkronisasi |
| Chatbot GEMA AI | ➕ Ditambah | Tidak ada di proposal manapun |
| Kepadatan pelapor di peta | ➕ Ditambah | Tidak ada di proposal manapun |

## 1. Modul pelaporan warga

**Proposal:** "Kamera langsung dengan galeri dikunci, perekaman GPS dan waktu otomatis, serta antrean laporan saat tanpa sinyal."

**Implementasi:** Kamera langsung (live `getUserMedia`, bukan cuma `capture` attribute — bekerja sama di desktop maupun mobile) dengan galeri terkunci (tidak ada opsi pilih dari galeri), GPS dan waktu terekam otomatis saat laporan diterbitkan — ini sesuai proposal.

**Yang tidak ada:** Antrean laporan saat offline (tanpa sinyal) **tidak diimplementasikan**. Tidak ada service worker, IndexedDB, atau mekanisme sinkronisasi ulang. Kalau koneksi terputus saat submit, laporan gagal — tidak disimpan lokal untuk dikirim ulang nanti.

**Alasan:** Offline-first yang sungguhan (background sync, conflict resolution saat foto+lokasi dikirim ulang) adalah pekerjaan infrastruktur tersendiri yang besar untuk skala hackathon; prioritas waktu diberikan ke alur inti (foto → AI → peta) yang harus berjalan solid dulu.

## 2. Mesin kecerdasan buatan

**Proposal:** "Menentukan jenis bencana... dan tingkat keparahan 1 sampai 4 beserta skor keyakinan."

**Implementasi:** Model (`gemini-3.1-flash-lite`, prompting + skema keluaran terstruktur — **bukan model yang di-fine-tune**) mengembalikan `disaster_type`, `severity` (rendah/sedang/tinggi/kritis — 4 tingkat sesuai proposal), `summary_id`, dan `reason_id`. Server tidak percaya keluaran model begitu saja — hasil divalidasi ulang (tipe dan severity harus salah satu nilai yang sah) sebelum disimpan.

**Yang tidak ada:** Tidak ada skor keyakinan numerik (mis. 0–100%) yang diekspos ke mana pun. Sebagai gantinya sistem memakai `validity` kategorikal (`relevant`/`uncertain`/`invalid`) sebagai penyaring kasar sebelum draft dibuat.

**Alasan:** Skor keyakinan numerik dari proposal awalnya dipakai untuk memprioritaskan antrean verifikasi di Dasbor Operator (lihat §6) — karena antrean verifikasi itu sendiri tidak dibangun, skor keyakinan tidak punya konsumen yang jelas, jadi tidak diminta dari model.

## 3. Peta sebaran bahaya

**Proposal:** "Peta wilayah berwarna empat tingkat yang berubah sesuai skor komposit."

**Implementasi:** Mode **Analisis AI** menampilkan marker per laporan dengan warna sesuai tingkat keparahan (hijau/kuning/merah/hitam) dan lingkaran radius peringatan — sesuai proposal.

**Catatan soal "mulai dari kuning, bukan hijau":** Radius/lingkaran peringatan di peta memang hanya digambar mulai dari tingkat **Sedang (kuning)** ke atas — tingkat **Rendah (hijau)** punya `warningRadiusM = 0` sehingga tidak pernah menggambar lingkaran apa pun. Ini sebenarnya konsisten dengan Tabel 4.1 proposal sendiri (Rendah = "Tidak ada siaran"), tapi konsekuensinya: dari sisi visual peta, tidak ada "status hijau" yang benar-benar terlihat berbeda dari keadaan tanpa laporan sama sekali — laporan rendah tetap muncul sebagai marker, tapi tanpa zona peringatan.

## 4. Mesin ambang batas dan eskalasi

**Proposal:** "Memicu pengiriman paket eskalasi ke instansi sesuai matriks perutean, lengkap dengan log dan konfirmasi penerimaan."

**Implementasi:** Kartu "Target Eskalasi" pada halaman detail laporan menampilkan teks instansi yang *seharusnya* menangani berdasarkan tingkat keparahan (persis mengikuti Tabel 4.1 proposal), dengan disclaimer eksplisit di UI: *"Referensi jalur eskalasi berdasarkan tingkat keparahan — bukan notifikasi yang benar-benar terkirim ke instansi manapun."*

**Yang tidak ada:** Tidak ada pengiriman paket eskalasi sungguhan ke sistem instansi manapun (BASARNAS, BNPB, dst.), tidak ada log pengiriman, dan tidak ada mekanisme ACK/konfirmasi penerimaan dari instansi.

**Alasan:** Integrasi dengan sistem instansi pemerintah sungguhan (API, EDI, atau bahkan kontak resmi) berada di luar jangkauan sebuah tim mahasiswa dalam waktu hackathon — instansi tersebut tidak menyediakan endpoint publik untuk diintegrasikan. Kartu referensi ini sengaja dibuat transparan sebagai *placeholder* yang jujur, bukan pura-pura sudah terhubung.

## 5. Mesin peringatan dini

**Proposal:** "Mengirim peringatan kepada warga terdaftar yang berada dalam radius ancaman."

**Implementasi:** **Tidak diimplementasikan sama sekali.** Warga hanya bisa melihat radius peringatan secara pasif kalau mereka *membuka aplikasi* dan lokasi mereka kebetulan masuk radius laporan aktif (lewat `/api/nearby`, dicek saat itu juga, bukan pemberitahuan proaktif).

**Alasan:** Modul ini butuh: (1) sistem akun/registrasi warga supaya ada "warga terdaftar" yang bisa dikirimi apa pun, (2) kanal pengiriman push notification (WhatsApp Business API, SMS gateway, atau web push dengan service worker) yang semuanya berbayar atau butuh proses approval/infrastruktur yang tidak realistis untuk demo hackathon tanpa anggaran, dan (3) geofencing latar belakang di perangkat warga. Ketiganya di luar jangkauan tim dalam waktu dan anggaran yang tersedia.

## 6. Dasbor operator

**Proposal:** "Antrean verifikasi, skor keyakinan, status eskalasi, dan panel risiko berbasis cuaca."

**Implementasi:** Dashboard Pemerintah menampilkan statistik ringkasan (per jenis/status/keparahan), daftar "Perlu perhatian" (laporan aktif tinggi/kritis + yang disanggah warga), dan tabel semua laporan (termasuk yang disembunyikan karena sanggahan) — read-only.

**Yang tidak ada:**
- Tidak ada antrean verifikasi atau kemampuan operator meng-override hasil AI.
- Tidak ada panel risiko berbasis cuaca (tidak ada integrasi API cuaca sama sekali).
- Skor keyakinan tidak ada (lihat §2).
- **Toggle peran Warga/Pemerintah bersifat kosmetik** — hanya state di `localStorage` browser, tanpa autentikasi atau otorisasi backend yang sungguhan. Siapa pun bisa mengklik toggle dan "menjadi" Pemerintah di perangkat sendiri; endpoint `/api/reports/all` di baliknya hanya butuh token Bearer yang sama seperti endpoint warga (bukan role check sungguhan).

**Alasan:** Membangun sistem login + role-based access control yang aman adalah pekerjaan tersendiri yang besar; dashboard ini dibangun sebagai demonstrasi *tampilan* yang akan dibutuhkan operator, bukan sistem produksi dengan kontrol akses nyata. Panel cuaca membutuhkan API cuaca berbayar/berlangganan yang tidak jadi prioritas dibanding alur inti pelaporan.

## 7. Pelacak respons

**Proposal:** "Menampilkan perjalanan laporan dari masuk hingga tim diberangkatkan."

**Implementasi:** Halaman `/track` menampilkan status laporan warga sendiri, termasuk status penerimaan petugas. Status penerimaan berasal dari **satu event biner**: petugas menekan tombol "TERIMA LAPORAN" di grup Telegram, yang mengubah `responder_status` dari `PENDING` menjadi `ACCEPTED`. Tracker menampilkan 4 langkah bertahap secara visual, tapi hanya 2 kondisi nyata di baliknya (belum diterima / sudah diterima) — bukan pelacakan multi-tahap sungguhan (mis. "tim berangkat", "tim tiba di lokasi") dengan lokasi GPS petugas real-time.

**Alasan:** Melacak "perjalanan" tim responder sungguhan butuh aplikasi/perangkat di sisi petugas yang mengirim update lokasi — itu di luar cakupan MVP warga-facing ini. Telegram dipilih sebagai kanal notifikasi ke petugas karena gratis dan cepat dibangun, dengan konsekuensi granularitas status yang jauh lebih sederhana dari yang tersirat proposal.

## 8. Penambahan di luar proposal

Dua fitur berikut **tidak ada di proposal manapun** dan ditambahkan setelah proposal diajukan:

1. **Chatbot GEMA AI** — tanya-jawab berbasis laporan aktif publik non-demo. Model hanya menafsirkan maksud pertanyaan; jumlah, daftar, dan ringkasan jawaban selalu disusun dari data Supabase yang sebenarnya (bukan dikarang model). Lihat bagian [Chatbot GEMA AI](./README.md#chatbot-gema-ai) di README.
2. **Mode Kepadatan Laporan** pada peta — dimensi analisis baru berdasarkan *jumlah pelapor unik* dalam radius 50 m (bukan cuma tingkat keparahan AI seperti proposal). Ini melengkapi peta severity yang sudah ada, bukan menggantikannya.

## Target terukur proposal — status

Proposal (§3) menetapkan empat target: foto tampil di peta < 10 detik, inferensi AI < 5 detik, akurasi klasifikasi ≥ 80%, dan eskalasi/peringatan terkirim < 60 detik tanpa tindakan manual.

- **Akurasi klasifikasi:** Spot-check kecil (n=3 foto, lihat [Evaluasi model AI](./README.md#evaluasi-model-ai) di README) menunjukkan 3/3 benar. Ini **konsisten** dengan target ≥80%, tapi n=3 terlalu kecil untuk jadi bukti statistik yang valid atas klaim tersebut.
- **Waktu tampil di peta / waktu inferensi:** Tidak diukur secara formal (tidak ada logging latency terstruktur); secara kualitatif terasa cepat (hitungan detik) saat pengujian manual, tapi tidak ada angka yang bisa dipertanggungjawabkan di sini.
- **Eskalasi/peringatan < 60 detik tanpa tindakan manual:** Notifikasi Telegram ke grup responder terkirim otomatis segera setelah laporan diterbitkan (tanpa tindakan manual), jadi bagian ini tercapai — tapi hanya untuk satu grup Telegram tetap, bukan eskalasi geotargeted ke instansi yang berbeda-beda sesuai lokasi/jenis bencana seperti tersirat proposal.
