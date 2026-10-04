# Hasil implementasi GEMA untuk FIK FAIR

Tanggal: **3 Oktober 2026**. Perubahan berada di working tree, mempertahankan perubahan pengguna yang sudah ada. Tidak dilakukan commit, deployment, migrasi Supabase live, atau pengiriman pesan nyata. Spesifikasi tetap pada [implementation.md](../perencanaan/implementation.md), [ui.md](../perencanaan/ui.md), dan paket FIK FAIR; petunjuk aktivasi pada [operasional.md](operasional.md).

## Perilaku yang berubah

Laporan sekarang mencatat jenis menurut pelapor, waktu pengamatan, sumber foto, hasil AI nullable, masa berlaku, dan status bukti. Submit yang memerlukan tinjauan menjadi held; hasil visual AI yang relevan tidak otomatis membuat kejadian confirmed.

Warga dalam radius mendapat notice netral dan dapat memilih melihat tanda, tidak melihat saat berada di lokasi, atau belum tahu. Sumber langsung/orang lain, waktu, catatan, dan konteks lokasi dipisahkan. Update/cabut tidak menggandakan jumlah akun. Pengaduan dan pengamatan bertentangan memicu tinjauan, tanpa auto-hide atau keputusan kebenaran berdasarkan count.

Pengelola memakai akun permanen dan role server. Detail privat memuat foto sementara, konteks, pengamatan, pengaduan, audit, serta keadaan antrean. Keputusan memerlukan alasan dan versi record; konfirmasi/penutupan/reopen tercatat. Pengaduan baru pada confirmed tetap meminta tinjauan tanpa otomatis mencabut konfirmasi.

Draft persisten dibuat sebelum AI. Laporan manual/AI gagal tetap dapat diajukan untuk review. Draft IndexedDB bertahan setelah reload dan dikirim saat aplikasi terbuka/reconnect bila sudah diajukan. Penggantian/penghapusan foto selalu mengganti ID draft, termasuk setelah submit gagal, agar bukti lama tidak terpakai tanpa sengaja.

## Pemetaan masalah ke kode

| ID baseline | Implementasi |
| --- | --- |
| FIX-01 | `deps/auth.py`, `lib/auth.ts`: anonymous Auth dan validasi token melalui get_user provider; UUID mentah ditolak |
| FIX-02 | Role server/permanent account pada endpoint privat; `/pengelola` dan detail pengelola; sakelar role tidak memberi otorisasi |
| FIX-03 | Waktu/sumber, status bukti, held untuk foto diteruskan/terulang/sinyal AI; SHA-256 + dHash; bukan vonis foto asli/hoax |
| FIX-04 | RPC quota persisten per akun/jaringan, lease satu analisis, budget model harian; guard nearby baca; CAPTCHA provider masih konfigurasi/pilot |
| FIX-05 | `cast_false_vote` menjadi pengaduan tanpa threshold hide; histori vote tetap ada |
| FIX-06 | State gagal/kosong/stale terpisah, waktu pembaruan dan retry; fitur nearby dimatikan menjadi error ketersediaan, bukan nihil laporan |
| FIX-07 | Nearby mengirim ringkasan lengkap aman dari query backend; feed memiliki cursor waktu+ID dan muat halaman berikutnya |
| FIX-08 | Tracker hanya menyatakan laporan diterima; allowlist/pemetaan Telegram dan RPC penerimaan atomik |
| FIX-09 | Outbox transaksi, lease/claim, backoff, batas percobaan, unknown, retry pengelola dengan audit |
| FIX-10 | Draft sebelum AI, nullable AI, foto opsional/manual; unavailable tidak menghapus draft |
| FIX-11 | IndexedDB tujuh hari, explicit queued, retry identik, hapus draft, pesan lokal/terkirim terpisah |
| FIX-12 | Refetch setelah mutasi; feed polling/backoff, detail/nearby/tracker refresh saat aktif; dismissal 30 menit per perubahan material |
| FIX-13 | Observations terpisah dari help vote; tiga jawaban, sumber, waktu, update/cabut, agregat freshness |
| FIX-14 | Predicate aktif non-demo/expiry bersama untuk feed, density, nearby, chat; radius informasi terpisah dari bukti/risiko resmi |
| FIX-15 | Daftar default, drawer focus trap/restore/inert, kontrol 44 px, keyboard, reduced motion, design tokens |
| FIX-16 | Berkas 10 MiB/body 11 MiB, bounded receive/read, decode/MIME/dimensi, EXIF dibersihkan, JPEG kompresi, foto privat; tidak memakai titik demo sebagai fallback |
| FIX-17 | Clock test dikendalikan, test frontend usang diganti untuk kontrak baru, test browser/database ditambahkan |
| FIX-18 | Detail held privat, angka fiktif About dibuang, titik kumpul contoh hanya mode demo; cleanup draft/koordinat/media |

## File database baru

| Migrasi | Isi |
| --- | --- |
| 005 | Status/waktu/AI nullable, legacy held, observation/history, pengaduan, role, audit, quota, idempotency, outbox/RPC |
| 006 | Responder Telegram, subscription/delivery push, event pembaruan, penerimaan, expiry/retention koordinat |
| 007 | Detach referensi dan antrean cleanup media atomik |
| 008 | Kepemilikan subscription/retry atomik, claim recipient push, pengamanan help RPC lama, audit append-only bagi service_role |
| 009 | Bucket Supabase `report-photos` privat, batas ukuran/MIME |
| 010 | Tanggal penutupan server, backfill audit yang konservatif, dan retensi foto 30 hari sejak penutupan |

Fresh migration dan fixture legacy diuji pada PostgreSQL **18 lokal**. Migration 009 juga diuji dengan fixture kontrak `storage.buckets`; ini belum menguji HTTP/policy/cache Storage Supabase.

## Hasil pemeriksaan lokal

| Pemeriksaan | Hasil | Batas |
| --- | --- | --- |
| Backend unittest discover | **35 test lulus** | Provider/Auth, AI, Telegram, push menggunakan mock; fixture demo dan penolakan seed di luar mode demo diuji; bukan koneksi live |
| Backend `test_rules.py`, `test_analyze.py` | **Lulus** | Script baseline diperbarui untuk kontrak sekarang |
| Frontend `npm test` | **6 test lulus** | Radius/status, GPS, notice cooldown/fingerprint, tracker |
| Frontend ESLint | **Lulus, tanpa error/warning** | Bukan audit aksesibilitas lengkap |
| TypeScript/build produksi Next.js 16.3.8 | **Lulus** | Build lokal; tidak deploy; font dibundel lokal |
| Playwright Chromium | **20 skenario lulus** | API/Auth mock; IndexedDB, navigasi, form, fokus dan jaringan browser nyata; push API browser di-mock |
| Migrasi 001–010 dari kosong | **Lulus** | Cluster disposable lokal, port loopback |
| Backfill legacy active/disputed_hidden | **Lulus** | Keduanya held, tanpa mengarang waktu/konfirmasi |
| `community_transactions.sql` | **Lulus** | Idempotency, counts, tidak auto-hide, versi, role, expiry/reopen, hash review, push ownership/retry, cleanup, privasi RPC/audit |
| `closure_retention.sql` | **Lulus** | Publikasi lama yang baru ditutup tidak dibersihkan dini, backfill dikenal/tidak diketahui, reopen, dan status tetap tidak mereset retensi |
| `postgres_concurrency.py` | **5 skenario lulus** | Koneksi PostgreSQL terpisah, bukan mock: submit, moderator, callback, quota, subscription ownership |
| npm audit produksi | **0 kerentanan dilaporkan** | Hasil registry pada pemeriksaan lokal; tooling dev masih memiliki 5 high dari rantai braces/micromatch/ESLint |

Skenario browser: error berbeda dari nihil/aman; notice netral dan unsure; submit manual/double click; draft offline/reconnect/reload; moderator ditolak dan tracker tepat; fokus/overflow 360 px; foto dianalisis lalu dihapus; koreksi laporan yang sebelumnya disembunyikan; konteks not_observed dan informasi warlok secondhand; detail mengikuti koreksi status saat halaman aktif.

Sepuluh skenario tambahan: keputusan pengelola dan konflik versi; pencabutan akses dengan respons baca lama; respons detail publik datang tidak berurutan; izin mutasi dicabut; pemuatan jawaban lama, perubahan source dan withdraw; subscribe/unsubscribe push; perubahan foto setelah kegagalan submit; pemulihan draft expired tanpa mengubah observed_at; retry form dengan ID/payload identik; pemulihan eksplisit draft yang telah dihapus tanpa otomatis mengirim.

Test lama `mock-analyze.test.mjs` dihapus karena modul mock yang dirujuk tidak ada dan tidak menjadi bagian alur produksi. Penggantinya menguji notice state serta alur AI/manual melalui browser; `demo-reports.test.mjs` menguji kontrak radius/status baru. Test chat kini mengendalikan clock sehingga tidak bergantung tanggal mesin.

## Perbaikan dari audit lanjutan

| Temuan | Koreksi |
| --- | --- |
| Detail privat tetap terlihat setelah GET/POST ditolak; respons lama dapat datang sesudah penolakan | Bersihkan data/foto saat 401/403/404 atau sign-out, abaikan request lama, dan nonaktifkan mutasi saat error |
| Jawaban yang sedang dimuat dapat menimpa input; koordinat tersisa ketika source berubah menjadi warlok | Input menunggu fetch; secondhand membuang koordinat di client dan backend. not_observed berarti pengamatan langsung pengguna, bukan klaim dari orang lain |
| Koreksi kembali menjadi unconfirmed dapat tertahan oleh cooldown | Update material tetap dikirim; claim recipient per report/version mencegah pengiriman ulang identik |
| Jenis dalam Telegram dapat mengambil hasil AI yang berbeda dari pilihan pelapor | Gunakan reported_type pada pesan triase; hasil visual tetap dilabeli AI |
| Submit gagal dapat menyimpan draft server tanpa memperbarui state form | Baca ID/analisis terakhir dari IndexedDB untuk retry; setiap perubahan bukti mengganti ID |
| Draft server expired menghalangi pengiriman data lokal | Setelah penolakan pasti draft_expired, buat ulang sekali dengan observed_at asli. Jika sudah dihapus, pengguna memeriksa Laporan Saya dan memilih membuat ulang; bukan auto-retry pada hasil ambigu |
| Retensi foto dihitung dari publikasi | Migrasi 010 memakai closed_at server. Audit legacy yang diketahui dipakai; jika tidak diketahui, mulai jendela retensi saat migrasi |
| Kesiapan layanan belum terlihat | Tambah check_readiness.py untuk diagnosis tanpa rahasia/mutasi; buat salt quota yang sebelumnya kosong pada environment lokal |

Skema dan foto Supabase nyata belum dapat diperiksa: GET gagal DNS untuk hostname project yang tersimpan, sedangkan DNS domain publik pembanding berhasil. Frontend environment dan VAPID belum tersedia. Worker/push tidak diaktifkan. Rincian pemulihan ada pada operasional; ini kendala konfigurasi/koneksi yang belum terselesaikan, bukan hasil test layanan yang berhasil.

## Menjalankan ulang

Dari root repo:

```powershell
rtk proxy backend/.venv/Scripts/python.exe -m unittest discover -s backend -p test_*.py
rtk proxy backend/.venv/Scripts/python.exe backend/tests/unit/test_rules.py
rtk proxy backend/.venv/Scripts/python.exe backend/tests/unit/test_analyze.py
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File backend/tests/sql/run-postgres.ps1
```

Runner PostgreSQL Windows membuat cluster baru di `tmp/`, hanya bind `127.0.0.1`, memakai port 55433, menjalankan seluruh migrasi/fixture/test, lalu menghentikan cluster. Tidak memakai database existing. Parameter `-PostgresBin`/`-TestPort` tersedia. ExecutionPolicy Bypass hanya untuk proses test tersebut, tidak mengubah policy komputer. Folder/log dibiarkan ignored untuk diagnosis.

Dari `frontend/`:

```powershell
rtk proxy npm test
rtk proxy npm run lint
rtk proxy node node_modules/typescript/bin/tsc --noEmit --incremental false
rtk proxy npm run build
rtk proxy npx playwright install chromium
rtk proxy npm run test:e2e
```

## Batas dan sisa pekerjaan

- Supabase/Auth/Storage, Telegram, VAPID/provider push, serta hosting nyata memerlukan konfigurasi dan smoke test staging sesuai operasional. Tidak ada laporan simulasi yang dikirim ke publik.
- Hash persis/dHash mengenali bukti yang pernah tersimpan. Tidak membuktikan tanggal/lokasi, dan belum diukur false positive/negative; keputusan akhir tetap membutuhkan konteks manusia.
- Anonymous account bukan satu orang; quota jaringan perlu disesuaikan dengan proxy/NAT komunitas. CAPTCHA/adaptive challenge belum dibangun di UI; konfigurasi provider perlu dipilih sebelum mengaktifkannya.
- Draft offline bekerja setelah aplikasi terbuka; belum tersedia cache seluruh aplikasi/ubin atau background sync universal. Draft yang sudah dihapus memerlukan pemeriksaan hasil sebelumnya dan pembuatan ulang eksplisit dari data lokal; waktu pengamatan tidak diperbarui otomatis.
- Cleanup atomik menangani media dengan referensi database diketahui. Orphan dari upload saat database sama sekali tidak dapat diperiksa memerlukan rekonsiliasi inventaris storage setelah layanan pulih.
- Grouping/merge/split incident, responder berangkat/tiba, integrasi resmi/rute evakuasi, uji warga/relawan, dan benchmark AI tetap roadmap tahap E. Jumlah laporan tidak disebut kejadian unik.
- Tidak dibuat nilai lomba baru, kemitraan, statistik dampak, atau klaim akurasi dari test lokal. Revisi proposal/video harus memakai fitur yang berhasil diperagakan dan bukti pengguna yang benar-benar dikumpulkan.
