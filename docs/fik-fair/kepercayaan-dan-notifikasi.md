# Kepercayaan laporan dan notifikasi radius

Status: acuan kebijakan fitur inti yang diterapkan di workspace. Layanan luar dan pilot belum diaktifkan. Kontrak field/status: [data-dan-api.md](data-dan-api.md); bukti implementasi: [hasil-implementasi.md](hasil-implementasi.md).

## Solusi utama

**Jangan menilai kebenaran dari foto atau jumlah Yes/No saja.** Simpan sumber dan waktu, kumpulkan pengamatan warga, batasi penyalahgunaan, lalu gunakan review manusia untuk keputusan yang berdampak pada publikasi dan peringatan.

| Masalah | Solusi |
| --- | --- |
| Foto lama dipakai untuk mengaku kejadian sekarang | Waktu pengamatan dan sumber foto wajib; AI hanya label visual; pengulangan foto menjadi sinyal review; tidak ada auto-verified |
| Spam menimbulkan kepanikan | Auth, quota, dedup, pembatasan AI, notice netral, dan penahanan laporan berisiko |
| Banyak akun menyatakan valid/palsu | Satu jawaban terkini per akun; anonymous auth bukan bukti manusia unik; pola akun/jaringan ditinjau |
| Warga dekat tetapi tidak bisa melihat lokasi | Radius hanya jangkauan informasi; pilihan tidak tahu; jawaban negatif harus menyatakan benar-benar berada di lokasi |
| Informasi dari warlok tersebar ulang | Pisahkan `secondhand` dari pengamatan langsung; jangan dihitung sebagai beberapa saksi langsung |
| Laporan nyata diserang dengan pengaduan | Tidak auto-hide; moderator menilai bukti dan mencatat alasan |
| Laporan mendesak belum punya banyak saksi | Tetap masuk triase privat; jangan menunggu quorum untuk dibaca responder |

## Empat makna yang tidak dicampur

1. **Indikasi visual:** model melihat ciri kebakaran/banjir/longsor dan memperkirakan severity visual.
2. **Bukti kejadian:** waktu, lokasi, sumber, pengamatan, konflik, dan keputusan moderator.
3. **Status publikasi:** draft, aktif, ditahan, atau ditutup.
4. **Status responder:** menunggu atau diterima; tahapan tindakan lain belum tersedia.

Label AI “relevant” berarti foto relevan terhadap kategori, bukan berita benar. GPS client, waktu perangkat, EXIF, atau hasil AI tidak menjadi bukti tunggal. Ketiadaan EXIF juga tidak membuktikan foto palsu.

## Kebijakan publikasi

| Kondisi | Perilaku |
| --- | --- |
| Submit biasa, informasi cukup, tidak ada sinyal risiko kuat | Aktif dengan “Belum dikonfirmasi”; tampilkan ringkasan netral, bukan klaim pasti |
| AI gagal/uncertain/invalid, waktu kejadian tidak jelas, indikasi foto lama, atau spam kuat | `held` + `under_review`; kirim ke moderator, jangan ke notice publik |
| Pengaduan atau pengamatan bertentangan pada laporan aktif | `under_review`; notice ajakan baru dihentikan sementara; tidak otomatis hilang dari feed |
| Moderator memiliki bukti memadai | `active` + `confirmed`, alasan dan waktu tersedia; label “Dikonfirmasi pengelola komunitas” |
| Moderator menilai laporan salah untuk konteks saat ini | `closed`, `closure_reason=refuted`; tampilkan koreksi pada riwayat/notice sebelumnya tanpa menyebarkan ulang klaim |
| Kejadian selesai atau informasi kadaluwarsa | `closed`, alasan resolved/expired; hentikan notice baru, arsipkan |

Moderator dapat menahan laporan aktif bila ada risiko penyalahgunaan, dengan alasan tercatat. Pengaduan tidak membatalkan konfirmasi otomatis; mengubah confirmed menjadi under_review harus keputusan moderator beralasan.

Isi pelapor yang belum direview tidak diteruskan mentah ke headline notice. Gunakan template kategori, waktu, area, dan status. Penghinaan, identitas pribadi, atau instruksi berbahaya tidak ditampilkan sebagai ringkasan publik.

## Fitur pengamatan warga

Pertanyaan: **“Apakah Anda mengetahui kondisi di lokasi tersebut?”**

| Jawaban UI | Nilai | Arti |
| --- | --- | --- |
| Saya melihat tanda kejadian | `seen` | Mengetahui tanda yang sesuai laporan; sumber informasi tetap ditanyakan |
| Saya berada di lokasi kejadian dan tidak melihat tanda tersebut | `not_observed` | Tidak melihat tanda pada tempat/waktu pengamatan; bukan vonis hoax |
| Saya belum tahu / tidak bisa memastikan | `unsure` | Tidak cukup informasi; tidak menambah penolakan |

Untuk `seen`, minta sumber `Melihat langsung` atau `Informasi dari orang lain`, waktu, dan catatan opsional. `not_observed` menyatakan bahwa pengguna sendiri berada di lokasi dan tidak melihat tanda: sumber wajib direct, deklarasi keberadaan serta catatan konteks wajib. Bila warlok hanya mengatakan tidak melihat kejadian sedangkan pengguna tidak mengamati sendiri, pilih unsure dan tulis informasi tersebut dalam catatan. Secondhand tidak mengirim koordinat perangkat pengguna dan tidak masuk direct count. Untuk unsure, sumber dan waktu pengamatan boleh kosong.

Pengguna tidak diminta mendekati lokasi berbahaya. Membaca pesan orang lain atau menanyakan warga setempat tidak otomatis menjadi pengamatan langsung. Tawarkan pilihan tidak tahu tanpa hambatan.

Aturan agregasi:

- Satu jawaban terkini per `(report_id, user_id)`; update mengganti, bukan menambah angka.
- Jawaban pelapor tidak dihitung sebagai dukungan warga lain; pengaduan diri tidak diperbolehkan.
- Pisahkan seen langsung, not_observed langsung, secondhand, dan unsure.
- Hanya pengamatan yang masih segar, tidak dicabut, tidak ditandai abuse, dan sesuai konteks lokasi yang masuk angka “warga sekitar”.
- Lokasi diklaim client, bukan jaminan posisi. Tanpa lokasi, pengamatan tetap masuk tinjauan tetapi tidak dihitung sebagai “warga sekitar terukur”.
- Angka menunjukkan akun yang memenuhi kriteria, bukan orang unik yang dijamin independen. Simpan keterbatasan ini pada tooltip/penjelasan.
- Gunakan teks “3 akun melaporkan melihat langsung” dan “Ada pengamatan yang bertentangan”. Jangan otomatis menulis “Berita valid” atau “3 warga membuktikan kejadian”.

MVP mengaitkan observation dengan **laporan**, bukan incident. Dua laporan tentang peristiwa sama dapat memiliki saksi sama; tidak boleh dijumlahkan sebagai saksi independen lintas laporan.

## Radius, waktu, dan notice

Default berikut hanya konfigurasi awal pilot, harus diuji bersama komunitas. Bukan radius bahaya ilmiah.

| Parameter | Nilai awal | Tujuan |
| --- | --- | --- |
| `CONFIRMATION_RADIUS_M` | 500 m | Menawarkan pengamatan sekitar untuk laporan aktif unconfirmed |
| `AWARENESS_RADIUS_M` | sedang 1.000, tinggi 3.000, kritis 10.000; rendah 500 | Jangkauan informasi untuk laporan confirmed; severity tetap indikasi visual |
| `DEVICE_LOCATION_MAX_AGE_MIN` | 10 menit | Mencegah menganggap lokasi perangkat lama sebagai posisi sekarang |
| `OBSERVATION_FRESHNESS_MIN` | 30 menit | Angka pengamatan terbaru; sisanya riwayat untuk moderator |
| `REPORT_ACTIVE_TTL_HOURS` | 12 jam sejak waktu pengamatan | Default kedaluwarsa; moderator boleh memperbarui dengan bukti baru |
| `NOTICE_COOLDOWN_MIN` | 30 menit | Mengurangi pengulangan; koreksi penting boleh melampaui cooldown |
| `NEARBY_MAX_ITEMS` | 3 | Mencegah rentetan ajakan konfirmasi |

Untuk laporan confirmed tanpa severity AI, pengelola menetapkan jangkauan awareness eksplisit; tidak mengarang hasil AI. Laporan tanpa waktu pengamatan yang jelas tidak mendapat notice baru. Timestamp masa depan di luar toleransi clock ditolak/diminta diperbaiki, bukan membuat masa aktif lebih panjang.

- **Unconfirmed:** dalam radius confirmation → ajakan pengamatan netral.
- **Under review:** feed berlabel tinjauan jika masih active; hentikan ajakan baru; koreksi tetap dapat dikirim ke penerima notice sebelumnya.
- **Confirmed:** awareness menurut konfigurasi/pilihan moderator; badge sumber konfirmasi selalu tampak.
- **Held/closed/demo:** tidak mendapat notice publik baru.
- **Lokasi pilihan:** tulis “Di area yang Anda pantau”; jangan “di sekitar posisi Anda”.
- **Di luar radius/tidak ada kandidat:** tulis “Belum ada laporan aktif yang sesuai area ini”; tidak berarti bebas bahaya.

Urutan kandidat: confirmed terlebih dahulu, kemudian waktu pembaruan paling baru, kemudian jarak. Keparahan visual tersedia pada detail, bukan penentu kebenaran.

Contoh notice:

> Ada laporan kebakaran sekitar 400 m dari lokasi Anda. Diamati pukul 14.10 WIB. Belum dikonfirmasi. Apakah Anda mengetahui kondisi di lokasi tersebut?

Contoh koreksi:

> Pembaruan laporan di area yang Anda pantau: laporan sebelumnya ditutup karena informasi tidak sesuai kejadian saat ini. Lihat catatan pengelola.

## Pencegahan spam dan pengulangan

Default pilot: analyze 5/10 menit/akun dengan 1 proses bersamaan; submit 3/10 menit/akun; observation 10 perubahan/10 menit/akun; chat 10/10 menit/akun. Terapkan juga batas jaringan yang lebih longgar dan anggaran harian layanan. Angka harus dituning; shared Wi-Fi tidak boleh langsung dianggap beberapa akun palsu.

Quota memakai store bersama, bukan memory per proses. Return 429 + waktu coba lagi. Challenge digunakan saat pola mencurigakan, bukan wajib untuk membaca laporan/hotline. Pertahankan akses baca saat kuota mutasi habis. Bila anggaran AI habis, draft manual tetap mungkin jika quota submit mengizinkan.

Hash foto identik memberi petunjuk pengulangan. dHash 64-bit dengan jarak Hamming ≤5 juga tersedia sebagai sinyal review; evaluasi ketepatannya masih diperlukan. Tidak auto-refute hanya karena dua warga memotret kejadian sama. Foto lama yang belum pernah tersimpan tetap memerlukan pemeriksaan sumber/waktu oleh manusia.

## Moderasi dan triase

Antrean berisi alasan risiko, waktu, sumber, pengamatan terbaru/riwayat, pengaduan, serta status pengiriman responder. Aksi: konfirmasi, kembali unconfirmed, tahan, tutup dengan alasan, atau minta informasi.

Konfirmasi memerlukan alasan berbasis bukti: misalnya moderator menghubungi pelapor dan menerima pengamatan langsung terbaru dengan konteks lokasi. Catatan “karena 3 Yes” tidak cukup. Ini tetap konfirmasi pengelola komunitas, bukan pengesahan pemerintah.

SOP pilot: laporan berindikasi tinggi masuk triase privat segera setelah submit yang lolos auth/quota, termasuk yang held. Teks triase menyebut “belum dikonfirmasi”. Ini bukan jaminan waktu respons atau pengganti kanal darurat. Moderator memilih prioritas, bukan menunggu semua warga menjawab.

## Privasi dan retention

- Public: area/koordinat dibulatkan, waktu, status, ringkasan yang aman, dan agregat. Identitas akun, lokasi pengamat, IP, serta raw photo tidak dibuka ke publik.
- Private: lokasi rinci hanya untuk pemilik dan pengelola/responder yang memiliki kebutuhan akses. Original foto tidak dikirim otomatis ke grup umum.
- Preview publik hanya versi yang diizinkan/diredaksi; URL signed berumur singkat dan penerbitannya melalui backend.
- Foto dapat berisi wajah/nomor kendaraan; jangan memakai geotag sebagai fitur publik.
- Default pilot: draft server 24 jam, draft perangkat 7 hari dengan pilihan hapus, koordinat rinci pengamat 24 jam, foto laporan 30 hari, audit minimal 90 hari. Retention disesuaikan kebutuhan dan persetujuan pilot.
- Audit tidak menyalin raw koordinat pengamat; simpan hasil proximity dan alasan keputusan seperlunya. Data agregat/history harus menyebut jika bukti asli sudah dibersihkan.
- Lokasi diminta untuk fungsi tertentu; tidak dikumpulkan terus-menerus atau dijual. Unsubscribe tidak menghapus laporan pengguna secara otomatis.

## Push tahap lanjutan

MVP memeriksa `/nearby` saat halaman aktif. Push memerlukan service worker, permission, subscription, pengiriman server, serta pengelolaan unsubscribe. Browser dapat menerima push saat halaman tidak terbuka; hal ini tidak memberikan GPS background otomatis. Acuan: [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

Area push berasal dari pilihan area pengguna atau lokasi terakhir yang masih berlaku dan telah disetujui. Jika kedaluwarsa, hentikan klaim “sekitar Anda” sampai diperbarui. Jangan memaksa izin notifikasi pada kunjungan pertama.
