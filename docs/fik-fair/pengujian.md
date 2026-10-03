# Pengujian, bukti, dan indikator keberhasilan

Status: rencana pengujian dan baseline review dipertahankan untuk jejak. Hasil setelah implementasi dan batas pengujian aktual ada di [hasil-implementasi.md](hasil-implementasi.md). Uji pengguna dan layanan nyata belum dijalankan.

## Baseline saat review sebelumnya

| Pemeriksaan lokal | Hasil | Batas |
| --- | --- | --- |
| Backend `test_rules.py` | Lulus | Menguji aturan/proyeksi lama; bukan bukti anti-hoax baru |
| Backend `test_analyze.py` | Lulus | Kasus lokal/mock; bukan benchmark akurasi model |
| Backend `test_telegram.py` | Lulus | Mock, termasuk simulasi jaringan gagal; tidak mengirim pesan nyata |
| Backend `test_chat.py` | 2 lulus, 1 gagal | Fixture 19 September 2026 tidak mengendalikan clock endpoint “hari ini” |
| Frontend empat file `node --test` | 2 lulus, 2 gagal | Referensi export `demoReports`/file `mock-analyze.ts` tidak tersedia |
| Frontend lint | Lulus | Bukan audit aksesibilitas atau perilaku live |
| Frontend TypeScript noEmit | Lulus | Bukan bukti deployment atau end-to-end |

Catatan berasal dari review kode sebelum paket dokumentasi ini. Pembuatan file Markdown tidak menjalankan ulang atau memperbaiki test tersebut. Build produksi dan smoke test deployment perlu dicatat terpisah saat implementasi.

## Acceptance test rencana

| ID | Skenario | Hasil yang wajib |
| --- | --- | --- |
| T-01 | Bearer UUID palsu, signature salah, token expired, issuer/audience salah | Mutasi ditolak 401; pemilik tidak dapat diganti dari body |
| T-02 | Warga memakai sakelar role atau memanggil endpoint moderator langsung | 403; data held/identitas privat tidak terbuka |
| T-03 | Nearby/report API gagal atau timeout | UI error/stale; tidak menyatakan kosong/aman |
| T-04 | Kandidat nearby berada di luar 50 laporan feed | Notice tetap memakai ringkasan dari backend |
| T-05 | Foto lama/forwarded, waktu tidak diketahui, AI relevant | Tidak auto-confirm; held bila memenuhi sinyal review; tidak ada notice pasti |
| T-06 | Quota habis, restart layanan, dua worker, user jaringan bersama | Quota tetap berlaku; 429 informatif; baca tetap tersedia; tidak blok semua pengguna shared Wi-Fi tanpa alasan |
| T-07 | Tiga pengaduan dan banyak seen pada satu laporan | Tidak auto-hide/confirm; antrean dan audit tersedia |
| T-08 | Callback penerimaan satu/dua responder, unauthorized Telegram user | ACCEPTED sekali; UI hanya diterima; unauthorized tidak mengubah laporan |
| T-09 | Jawaban seen/not_observed/unsure, direct/secondhand, update/cabut | Agregat sesuai makna; satu akun tidak dihitung dua kali; unsure bukan bantahan |
| T-10 | Demo, expired, held, lokasi kedaluwarsa, area manual, batas radius tepat | Notice sesuai eligibility; semua query aktif konsisten; manual area tidak disebut posisi fisik |
| T-11 | Dua moderator memutuskan versi sama; confirmed diberi pengaduan | Satu konflik 409; tidak overwrite; pengaduan tidak mencabut konfirmasi otomatis |
| T-12 | Owner/moderator membuka held; pengguna umum membuka ID sama | Jalur privat bekerja, jalur publik tidak membocorkan alasan/media |
| T-13 | AI timeout/uncertain/invalid tanpa hasil valid | Draft ada; hasil nullable; submit manual masuk review tanpa hasil AI palsu |
| T-14 | Double click, retry identik, key sama payload berbeda | Satu laporan/outbox; hasil sama untuk retry; konflik 409 bila payload berbeda |
| T-15 | Telegram gagal sebelum kirim, timeout ambigu, gagal simpan message ID | Laporan tidak hilang; retry/unknown tercatat; tidak mengklaim exactly-once |
| T-16 | Offline draft, reconnect, refresh, local storage quota penuh | Lokal/terkirim dibedakan; retry tidak duplikat; kegagalan simpan terlihat |
| T-17 | MIME palsu, berkas >10 MiB/body >11 MiB, dimensi ekstrem, manual demo fallback | Upload ditolak terbatas tanpa baca tak terbatas; field lain terjaga; demo tidak menjadi input produksi |
| T-18 | Keyboard, dialog tersembunyi, zoom, reduced motion, peta tanpa mouse | Fokus benar, elemen tersembunyi tidak tabbable, daftar dapat menyelesaikan tugas |
| T-19 | Retention cleanup saat media direferensikan dan saat worker crash | Media aktif tidak terhapus salah; cleanup dapat diulang; audit tanpa raw koordinat |
| T-20 | Tanggal UTC/WIB melewati tengah malam dan clock test tetap | Feed/chat/expiry konsisten; tidak bergantung tanggal mesin test |

Test backend memakai clock yang dapat diinjeksikan dan fixture database khusus. Mock AI/Telegram untuk test otomatis; uji integrasi nyata hanya pada lingkungan/grup tim yang disediakan untuk itu. Jangan mengirim notifikasi bencana simulasi ke publik.

## Perintah baseline

Jalankan dari directory yang disebutkan; semua command mengikuti RTK workspace. Perintah berikut mencakup suite lokal yang telah diperbarui. Test browser dan transaksi database tercantum pada hasil implementasi.

Dari `backend/`:

```powershell
rtk proxy .venv/Scripts/python.exe test_rules.py
rtk proxy .venv/Scripts/python.exe test_analyze.py
rtk proxy .venv/Scripts/python.exe test_telegram.py
rtk proxy .venv/Scripts/python.exe -m unittest test_chat
```

Dari `frontend/`:

```powershell
rtk proxy npm test
rtk proxy npm run lint
rtk proxy node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Setelah implementasi, jalankan test yang relevan dan build sesuai package script. Catat commit, environment, tanggal, command, hasil, dan failure tersisa. Jangan menghapus test yang gagal hanya untuk memperoleh status hijau tanpa menilai relevansinya.

## Pengujian pengguna nyata

Pilot awal yang diusulkan: **5–8 warga dan 1–2 pengelola/relawan**, direkrut di komunitas yang menjadi target. Sampel kecil berguna untuk masalah kegunaan, tidak membuktikan dampak populasi atau akurasi model.

Gunakan laporan fiktif yang diberi label simulasi dan foto yang diizinkan. Sampaikan bahwa ini uji prototipe, bukan informasi darurat. Minta persetujuan pencatatan; gunakan ID peserta anonim pada laporan.

| ID | Tugas | Pertanyaan evaluasi |
| --- | --- | --- |
| U-01 | Melihat notice belum terkonfirmasi | Apakah peserta memahami bahwa baru ada laporan, bukan kepastian? |
| U-02 | Berada dalam radius tetapi tidak tahu kondisi | Apakah peserta memilih unsure tanpa merasa harus mencari lokasi? |
| U-03 | Mendengar informasi dari warga lain | Apakah peserta membedakan secondhand dan direct? |
| U-04 | Melihat pengamatan bertentangan | Apakah peserta menghindari menyimpulkan hoax/aman hanya dari angka? |
| U-05 | Membuat laporan foto lama/koneksi gagal | Apakah sumber/waktu dan status tersimpan/terkirim dipahami? |
| U-06 | Pengelola menerima laporan mendesak yang belum pasti | Apakah triase dan keputusan beralasan dapat dilakukan? |
| U-07 | Membaca tracker ACCEPTED | Apakah peserta memahami diterima belum berarti petugas berangkat? |

Catat keberhasilan tanpa bantuan, waktu tugas, kesalahan, kutipan dengan izin, serta revisi yang dilakukan. Jangan mengarahkan peserta dengan jawaban yang diharapkan. Jika tidak bisa merekrut sebelum submission, nyatakan belum diuji, bukan mengganti pengguna nyata dengan anggota tim atau test otomatis.

Template catatan:

```text
Sesi/tanggal/versi:
ID dan profil peserta:
Persetujuan pencatatan:
Tugas dan skenario:
Berhasil tanpa bantuan: ya/tidak
Waktu dan kesalahan:
Pemahaman status, sumber, dan radius:
Temuan:
Perubahan berdasarkan temuan:
Hasil uji ulang (jika ada):
```

## Metrik dan target awal

| Metrik | Definisi | Target/interpretasi |
| --- | --- | --- |
| Pemahaman status | Peserta membedakan belum dikonfirmasi, dikonfirmasi pengelola, dan diterima responder | Hipotesis awal ≥80%; laporkan n/N karena sampel kecil |
| Penyelesaian tugas | Tugas selesai tanpa bantuan / tugas dicoba | Target awal ≥80%; jelaskan tugas yang gagal |
| Kepanikan akibat bahasa | Peserta menafsirkan notice unconfirmed sebagai kepastian kejadian | Target 0 pada uji; jika terjadi, revisi bahasa sebelum pilot |
| Konsistensi audit | Keputusan moderator dengan aktor/waktu/alasan / semua keputusan | 100% dalam acceptance test |
| Publish latency | Request submit sampai respons persisten, tanpa menunggu Telegram | Laporkan p50/p95, jaringan, n; target ditetapkan setelah baseline |
| AI latency | Request analisis sampai hasil; timeout dihitung failure | Target lama <5 s belum terbukti; tidak janji karena timeout model saat review 30 s |
| Notice latency | Publish eligible sampai notice terlihat pada web aktif | Polling rencana 30 s + latency; bukan SLA push/offline |
| Moderation latency | Submit/flag sampai keputusan manusia | Ukur jam operasional; jangan klaim responder 24/7 tanpa mitra |
| False positive/negative AI | Per kelas pada dataset berlabel dan split evaluasi | Target lama ≥80% belum terukur; laporan harus menjelaskan dataset dan confusion matrix |

Tidak mengukur keberhasilan anti-hoax dari banyaknya laporan ditolak. Penolakan yang salah dapat merugikan laporan nyata; catat koreksi moderator dan kasus false rejection.

## Gate rilis pilot

Gate wajib: auth/role lulus, keputusan audit konsisten, tidak auto-hide/count-confirm, tidak ada klaim departure palsu, tidak ada demo tercampur, error data tidak menjadi aman, serta pengamatan unsure tersedia. Bila gate gagal, batasi ke demo tertutup dan tulis keterbatasan. Pengujian pengguna tidak mengganti gate keamanan server.
