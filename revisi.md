# Revisi GEMA: masalah, solusi, dan proposal

Status: daftar masalah ini adalah baseline review sebelum perubahan. Implementasi solusi tersedia di workspace; lihat [pemetaan FIX dan bukti test](docs/fik-fair/hasil-implementasi.md). Aktivasi layanan/pilot masih membutuhkan konfigurasi dan uji staging.

Dokumen terkait: [implementasi](implementation.md), [UI](ui.md), [tema](docs/fik-fair/tema-dan-scope.md), [kontrak data](docs/fik-fair/data-dan-api.md).

P0 = fondasi sebelum pilot publik; P1 = kelengkapan dan keandalan setelah fondasi; P2 = pengembangan lanjutan. ID berikut dipakai dalam rencana implementasi dan pengujian.

## Masalah kode dan solusi

| ID | Prioritas | Masalah dan bukti kode | Solusi yang direncanakan |
| --- | --- | --- | --- |
| FIX-01 | P0 | `backend/app/deps/auth.py` menerima isi Bearer sebagai ID; `frontend/src/lib/anon-id.ts` membuat UUID lokal. Identitas dapat dipalsukan/diganti. | Supabase anonymous sign-in, validasi JWT server, ambil `sub` dari token terverifikasi. Tambahkan pembatasan penyalahgunaan; satu sesi bukan satu manusia. |
| FIX-02 | P0 | Role di `role-context.tsx`/`RoleSwitcher.tsx` hanya tampilan; `/reports/all` tidak membuktikan peran pengelola. | Role server dan pemeriksaan setiap endpoint privat. Akun moderator tetap, role dikelola server; sakelar demo tidak memberi akses produksi. |
| FIX-03 | P0 | `model.py` menilai isi foto; schema tidak menyimpan waktu pengamatan/sumber foto. Foto kebakaran lama bisa lolos relevan. | Pisahkan AI dan bukti kejadian; tambah waktu pengamatan, sumber foto, catatan, dan tinjauan. Metadata waktu adalah petunjuk, bukan bukti. Kemiripan foto menjadi tahap tambahan. |
| FIX-04 | P0 | Tidak ada pembatasan memadai pada analyze, publish, vote, dan chat; pembuatan UUID baru menghindari identitas lama. | Quota persisten per akun dan sinyal jaringan, challenge bertahap, batas konkurensi/biaya AI, deteksi pengulangan, dan antrean moderasi. |
| FIX-05 | P0 | Migrasi `003_vote_functions.sql` menyembunyikan laporan saat tiga false vote. | Hentikan auto-hide; jadikan pengaduan bahan review. Penahanan/penolakan harus keputusan moderator dengan alasan. Jangan hapus histori vote lama. |
| FIX-06 | P0 | `WargaDashboard.tsx` mengubah kegagalan `/nearby` menjadi tidak ada laporan; `PemerintahDashboard.tsx` mengubah error menjadi daftar kosong. | State loading/ready-empty/ready-data/error/stale terpisah, waktu pembaruan, retry. Kalimat nihil tidak berarti aman. |
| FIX-07 | P0 | Kandidat nearby dicari lagi pada feed yang dibatasi 50 laporan; laporan sah di luar feed bisa tidak tampil. | Respons nearby menyertakan ringkasan kandidat lengkap; tidak bergantung cache feed. Uji kandidat ke-51. |
| FIX-08 | P0 | Callback Telegram hanya mengubah `PENDING` → `ACCEPTED`, tracker menampilkan “Petugas Menuju Lokasi”. | Label “Laporan diterima responder”. Status berangkat/tiba hanya dari aksi terpisah yang terotorisasi; penerimaan bukan verifikasi kejadian. |
| FIX-09 | P0 | Telegram dikirim langsung setelah publish; gagal kirim hanya log, gagal simpan message ID tidak punya rekonsiliasi. | Outbox persisten, retry terbatas, claim pekerjaan, audit, status hasil kirim tidak diketahui. Pengiriman eksternal tidak dijamin exactly-once. |
| FIX-10 | P1 | `analyze.py` bergantung AI sebelum draft disimpan; AI gagal → 503 tanpa jalur laporan manual. Field foto/AI wajib pada schema. | Simpan draft lebih awal; hasil AI nullable, jalur manual/pending review, foto opsional untuk jalur manual. Jangan memalsukan hasil AI agar schema lolos. |
| FIX-11 | P1 | Form tidak menyimpan draft offline; kirim bergantung jaringan. | IndexedDB untuk draft lokal dan sync saat aplikasi dibuka kembali; idempotency key; status “tersimpan di perangkat” berbeda dari “terkirim”. |
| FIX-12 | P1 | `demo-report-context.tsx` memuat data saat mount; publish tidak selalu merefresh feed. | Invalidate/refetch setelah mutasi, refresh berkala saat layar aktif, indikator stale dan retry dengan backoff. Klaim real-time disesuaikan. |
| FIX-13 | P0 | Belum ada UI konfirmasi kejadian sekitar; vote API yang ada adalah pengaduan/bantuan, bukan pengamatan kejadian. | Endpoint dan tabel observation tersendiri; tiga pilihan, sumber informasi, waktu, satu jawaban terkini per akun per laporan. |
| FIX-14 | P0 | Feed aktif tidak memiliki kedaluwarsa seragam; data demo bisa tercampur; radius 1/3/10 km bukan batas bahaya tervalidasi. | Predicate visibilitas bersama, `expires_at`, `is_demo` terpisah, radius awareness/confirmation berbeda. Tidak menyebut di luar radius aman. |
| FIX-15 | P1 | Dialog legenda/drawer kurang pengelolaan fokus; kontrol kecil; daftar bukan alternatif peta yang mudah ditemukan. | Daftar sebagai mode utama alternatif, fokus modal/restore/inert, keyboard, target sentuh 44 px, status teks dan ikon. |
| FIX-16 | P1 | Upload dibaca penuh sebelum pemeriksaan ukuran; foto besar langsung ditolak; lokasi demo dapat menjadi fallback. | Batas body dan pembacaan bertahap, decode/validasi dimensi, kompresi client, allowlist MIME, pisahkan mode demo. Manual lokasi tetap diizinkan dan diberi sumber. |
| FIX-17 | P1 | Test chat memakai tanggal tetap; test frontend menunjuk export/file mock yang tidak tersedia. | Kendalikan clock dan fixture, perbaiki/hapus test usang sesuai perilaku publik; tambah skenario anti-hoax yang bermakna. |
| FIX-18 | P0 | Dashboard membuka link detail publik untuk laporan hidden sehingga 404; angka About dan titik kumpul memakai simulasi; draft tanpa TTL. | Detail privat moderator; demo diberi label konsisten atau dihapus dari produksi; retention media/draft dan cleanup terjadwal. |

Tidak semua masalah memerlukan arsitektur baru. Pertahankan Next.js, FastAPI, Supabase, dan Leaflet; tambahkan kebijakan server, tabel kecil, serta state UI yang diperlukan. Gunakan worker sederhana dari layanan backend untuk outbox sebelum mempertimbangkan broker pesan tersendiri.

## Hal baik yang dipertahankan

- Penyimpanan foto privat dan pemisahan service key di backend.
- Pembatasan tipe file, pemeriksaan magic bytes, validasi koordinat, dan schema request yang menolak field ekstra.
- Publish draft memiliki pemeriksaan pemilik dan perubahan status kondisional; retry draft aktif tidak membuat laporan baru.
- Callback penerimaan responder memakai perubahan kondisional agar hanya satu penerimaan berhasil.
- Prompt AI tidak meminta model menyimpulkan lokasi, tanggal, atau keaslian foto.
- Respons publik membatasi identitas/koordinat; pertahankan pemisahan data publik dan privat saat schema diperluas.

## Revisi proposal GEMA

| Bagian | Masalah | Revisi konkret |
| --- | --- | --- |
| Ringkasan dan latar belakang | Visi terlalu luas dibanding MVP | Fokus pada informasi bencana lokal yang meragukan dan kesiapsiagaan satu komunitas pilot. |
| Kesesuaian tema, bagian 4.6 | Masih menyebut Tech for Human Connections / Accessibility | Ganti dengan IGNITE dan case 2; aksesibilitas sebagai cara menjangkau pengguna. |
| Mekanisme | AI/severity dapat terbaca sebagai validasi kebenaran | Pisahkan indikasi visual, status bukti, status laporan, dan status responder. Tambahkan moderasi serta pengamatan warga. |
| Alur laporan | Proposal dan kode belum sama | Nyatakan alur saat ini AI → draft → publish; alur revisi draft → AI/manual → publish → pengamatan → review. |
| Radius dan notifikasi | Dapat dianggap area bahaya pasti; push belum tersedia | Tulis radius jangkauan informasi pilot, notice netral, tiga jawaban, dan push sebagai roadmap. |
| Offline/PWA | Belum terbukti pada implementasi | Sebut rencana draft lokal dan sync; jangan mengklaim pengiriman offline sudah berjalan. |
| Koordinasi instansi | Dispatch berjenjang/nasional belum ada | Demo penerimaan grup responder komunitas; integrasi resmi memerlukan mitra dan tata kelola. |
| Ukuran keberhasilan | Target map <10 s, AI <5 s, akurasi ≥80%, alert <60 s belum terukur | Label sebagai target riset; tambahkan metode, ukuran sampel, p50/p95, baseline, dan hasil aktual jika tersedia. |
| Riset pengguna | Belum ada bukti cukup | Lampirkan catatan uji warga dan moderator, kesalahan pemahaman, serta revisi yang benar-benar dilakukan. |
| Roadmap | Tahap dan ketergantungan kurang jelas | Gunakan tahapan di implementation.md; auth/moderasi sebelum perluasan notifikasi. |
| Bagian 4.3 dan 4.4 | Judul Mekanisme Keparahan dan Ekskalasi berulang | 4.4 menjadi “Komponen Sistem”; perbaiki ejaan eskalasi dan diagram agar terbaca. |
| Statistik dan referensi | 8.136.271 dapat salah ditulis seluruhnya pengungsi; total semua jenis bencana | Gunakan istilah sumber BNPB “menderita dan mengungsi”; sebut cakupan tahun/jenis; lengkapi judul, tanggal, dan URL. |
| Daftar pustaka | Header tertulis DAFTAR ISI | Perbaiki menjadi DAFTAR PUSTAKA dan seragamkan sitasi. |
| Kebaruan dan orisinalitas | Penggunaan ulang GEMA belum jelas di aturan yang diberikan | Ungkap baseline lama, kontribusi baru, dan hasil konfirmasi panitia; jangan menyatakan izin reuse tanpa jawaban. |

## Narasi pengganti yang bisa dikembangkan

> GEMA adalah platform pelaporan dan pemantauan indikasi bencana lokal untuk mendukung kesiapsiagaan komunitas. Foto dianalisis AI sebagai bantuan interpretasi visual. Waktu pengamatan, sumber informasi, pengamatan warga sekitar, dan keputusan pengelola ditampilkan terpisah agar laporan belum terkonfirmasi tidak dianggap sebagai kepastian. Prototipe difokuskan pada alur warga–pengelola–responder; perluasan notifikasi dan integrasi lembaga berada pada roadmap.

## Batas hasil review

Kode dan test lokal sudah direview, tetapi tidak ada benchmark akurasi model, observasi dispatch lapangan, atau audit deployment menyeluruh. Baseline hasil test dicatat di [pengujian.md](docs/fik-fair/pengujian.md). Dokumen ini tidak memperbaiki failure test atau vulnerability dengan sendirinya.
