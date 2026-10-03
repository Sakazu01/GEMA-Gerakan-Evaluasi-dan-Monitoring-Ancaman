# Rencana submission FIK FAIR 2026

Status: checklist persiapan, bukan bukti sudah submit. Acuan 3 Oktober 2026.

## Aturan yang perlu diperiksa

Devpost menampilkan deadline **4 Oktober 2026 pukul 23.45 WIB** pada saat diperiksa. Halaman rules merujuk guidebook; periksa pembaruan panitia dan jangan menganggap halaman tersebut memuat semua aturan. Sumber: [Devpost rules](https://fik-fair-2026.devpost.com/rules).

Technical meeting menyebut peserta mahasiswa D3/D4/S1, tim 4–5 orang, susunan terdaftar tidak diubah, pelaporan kerja asynchronous, dan satu proyek dengan akun Devpost setiap anggota terkait.

Dokumen yang diberikan belum menyatakan tegas izin/larangan menggunakan ulang proyek lama. Ketentuan open source “selama tidak digunakan untuk bagian inti proyek” juga perlu penjelasan mengenai framework, library, dan layanan AI. Ini pertanyaan kelayakan submission, bukan alasan menghentikan penulisan dokumentasi.

Teks pertanyaan untuk tim kirim sendiri ke panitia:

> Kami memiliki prototipe GEMA yang dibuat sebelumnya dan ingin mengembangkannya untuk case ketahanan komunitas. Apakah penggunaan baseline tersebut diizinkan bila kami mengungkap fitur lama, commit baseline, dan kontribusi baru selama kompetisi? Bagaimana batas “bagian inti proyek” untuk Next.js, FastAPI, Supabase, Leaflet, dan layanan AI? Mohon juga checklist komponen teknis wajib serta guidebook terbaru.

Simpan jawaban tertulis/tanggal/sumber. Jangan menulis pernyataan originalitas yang seolah seluruh kode baru jika ada baseline lama. Dokumen ini tidak mengirim pesan kepada panitia atau mengubah submission.

## Batas tenggat dan scope realistis

Karena acuan saat ini 3 Oktober dan deadline tercantum 4 Oktober, paket dokumentasi penuh tidak sama dengan kemampuan menyelesaikan seluruh roadmap. Prioritaskan demo yang dapat diverifikasi:

1. Selaraskan narasi dengan case 2 dan ungkap status reuse/baseline.
2. Koreksi bahasa tracker, error/empty, simulasi, dan batas kemampuan AI.
3. Bangun alur notice + observation hanya jika fondasi auth, role, status, dan test dapat diselesaikan. Jika belum, tampilkan sebagai desain/prototipe berlabel, tidak sebagai fitur produksi.
4. Lakukan uji pengguna kecil yang benar-benar tersedia; rekam temuan apa adanya.
5. Finalisasi materi dan cek tautan lebih awal dari deadline. Jangan memaksakan push/dispatch nasional sebagai klaim demo.

## Checklist keluaran

| Keluaran | Isi minimum | Status awal |
| --- | --- | --- |
| Proposal | Masalah, kasus utama, solusi, user flow, teknologi, bukti uji, roadmap, referensi | Perlu revisi sesuai revisi.md |
| GitHub repository | README menjalankan aplikasi, domain demo, lisensi/dependensi, baseline dan kontribusi baru | Kode tersedia; verifikasi akses dan keselarasan README |
| Video kreatif/demo ≤3 menit | Problem, alur fungsional, bukti singkat, batas dan roadmap | Belum dibuktikan selesai dalam review |
| PowerPoint | Narasi konsisten, diagram terbaca, hasil uji, teknologi dan alasan | Selaraskan materi yang ada |
| Surat pernyataan orisinalitas | Sesuai format dan pengungkapan baseline/dependensi | Perlu klarifikasi reuse |
| Devpost | Problem, solution, technologies, user flow; anggota terkait | Periksa akun/project tim |
| Pelaporan kerja | Kontribusi anggota sesuai ketentuan panitia | Lengkapi sesuai format resmi |

Daftar ini berasal dari technical meeting yang diberikan. Bila guidebook terbaru berbeda, catat perubahan sumber dan perbarui checklist.

## Checklist komponen teknis wajib

Belum semua persyaratan rinci dapat dipastikan dari dokumen yang dibaca. Setelah konfirmasi, isi tabel berikut dengan teks ringkas persyaratan, implementasi, dan bukti; jangan hanya menuliskan nama stack.

| Persyaratan resmi | Sumber/bagian/tanggal | Implementasi | Bukti demo/test | Terpenuhi? |
| --- | --- | --- | --- | --- |
| Belum dikonfirmasi | Guidebook/penjelasan panitia diperlukan | — | — | Belum dinilai |

## Struktur proposal/deck yang disarankan

1. Masalah: foto lama/spam dan informasi lokal yang belum pasti menghambat kesiapsiagaan.
2. Pengguna: satu komunitas pilot, warga, pengelola, responder; bukti wawancara jika tersedia.
3. Hubungan IGNITE/case 2/SDG 9,11,13; manfaat inklusif sebagai pendukung.
4. Solusi: pelaporan berwaktu/sumber, AI visual, observation, moderator, tindak lanjut.
5. Demo user flow dan status, termasuk konflik/tidak tahu.
6. Arsitektur: alasan teknologi, auth, privasi, quota, keterbatasan AI.
7. Bukti: hasil uji nyata, kinerja terukur, perubahan dari temuan.
8. Roadmap dan keterbatasan; izin reuse dan kontribusi baru.

Materi root `BUSINESS_PRESENTATION_GUIDE.md` dan `PITCH_SCRIPT_4M30.md` sudah ada sebelum paket ini dibuat. Script 4 menit 30 detik tidak otomatis sesuai batas video 3 menit; buat versi singkat tanpa mengubah fakta atau menyatakan fitur rencana sudah live.

## Storyboard video maksimal 3 menit

| Waktu | Isi |
| --- | --- |
| 0:00–0:20 | Masalah dan satu contoh foto lama; semua skenario demo diberi label |
| 0:20–0:40 | Pengguna dan kaitan ketahanan komunitas |
| 0:40–1:20 | Warga membuat laporan; sumber/waktu; AI hanya indikasi visual |
| 1:20–1:55 | Notice sekitar; unsure/direct/secondhand; pengamatan bertentangan |
| 1:55–2:20 | Pengelola review; responder menerima; teks status sesuai data |
| 2:20–2:45 | Bukti pengujian/kontribusi baru/teknologi, sesuai yang benar-benar ada |
| 2:45–3:00 | Batas dan roadmap, tautan proyek |

Jika fitur tertentu belum ada, gunakan segmen “rancangan pengembangan” yang jelas; jangan menyunting video untuk menyamarkan mock sebagai backend live. Jangan mengirim laporan simulasi ke grup/pengguna umum demi rekaman.

## Ledger bukti

| Klaim | Bukti yang diizinkan | Klaim yang dihindari |
| --- | --- | --- |
| AI mengenali indikasi visual | Request/response aktual dan evaluasi terpisah | AI membuktikan berita benar |
| Warga memberi pengamatan | Rekaman alur dan data tersimpan | Voting otomatis memastikan kebenaran |
| Informasi dapat ditelusuri | Audit aktor, waktu, alasan | Sistem pasti menghapus semua hoax |
| Responder menerima laporan | Status ACCEPTED dari alur terotorisasi | Petugas pasti berangkat/tiba |
| Mudah digunakan | Hasil pengguna n/N dan temuan | Semua warga terbantu dari uji beberapa orang |
| Dampak ketahanan komunitas | Hipotesis + hasil pilot yang tersedia | Penurunan korban/panik tanpa pengukuran |
| Inovasi | Perbandingan dengan sumber produk utama, lingkup pembeda | Belum pernah ada sistem serupa tanpa riset |

Simpan artefak uji tanpa identitas privat. Screenshot memakai data demo/izin. Jangan commit token, service key, file .env nyata, atau signed URL aktif.

## Cek akhir sebelum submit oleh tim

- [ ] Izin baseline/reuse dan batas open source sudah jelas atau ketidakpastian ditangani sesuai jawaban panitia.
- [ ] Susunan tim dan akun Devpost sesuai pendaftaran.
- [ ] Narasi tidak lagi menggunakan tema lama.
- [ ] Kode, proposal, deck, Devpost, dan video menyebut status fitur yang sama.
- [ ] Domain/demo dapat dibuka evaluator; alternatif demo aman jika layanan gagal.
- [ ] Semua angka hasil punya metode/bukti; target ditandai sebagai target.
- [ ] Video tidak melebihi 3 menit; deck dan diagram terbaca.
- [ ] Repository bebas secrets dan data pengguna privat.
- [ ] Pengujian dan failure tersisa dicatat; tidak ada klaim dispatch resmi tanpa mitra.
- [ ] Tautan, file, serta waktu deadline terakhir diperiksa sebelum submit.

Penyerahan final dilakukan tim melalui kanal resmi. Paket ini tidak melakukan publikasi, pengiriman pesan, atau submission otomatis.
