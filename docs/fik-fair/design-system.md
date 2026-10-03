# Design system GEMA

Status: acuan visual yang sudah diterapkan pada komponen inti; cakupan dan test ada pada [hasil implementasi](hasil-implementasi.md). Karakter GEMA dipertahankan; perubahan berfokus pada makna status, aksesibilitas, dan konsistensi.

## Prinsip

Informasi terpenting adalah apa yang dilaporkan, kapan diamati, seberapa kuat buktinya, dan apa tindak lanjutnya. Tampil tenang, mudah dibaca, serta jelas saat data belum pasti. Gunakan label dan ikon bersama warna.

Tidak menggunakan animasi berkedip, warna merah untuk semua laporan, atau banner darurat penuh layar berdasarkan satu foto yang belum dikonfirmasi.

## Token warna

| Token rencana | Nilai | Pemakaian |
| --- | --- | --- |
| `brand-primary` | `#0D5D3A` | Header, tombol utama, tautan dengan underline; bukan bukti verified |
| `background` | `#F7F6E4` | Latar utama seperti aplikasi sekarang |
| `surface` | `#FFFFFF` | Card, form, dialog |
| `text-primary` | `#0F172A` | Heading dan isi utama |
| `text-secondary` | `#475569` | Metadata dan penjelasan |
| `border-default` | `#CBD5E1` | Pemisah dekoratif; tidak sendirian menjadi batas input |
| `border-control` | `#64748B` | Batas kontrol yang perlu dikenali |
| `focus-ring` | `#1D4ED8` | Fokus keyboard, outline 2 px dengan offset 2 px |
| `evidence-neutral-bg/text` | `#F1F5F9` / `#334155` | Belum dikonfirmasi |
| `evidence-review-bg/text` | `#FEF3C7` / `#78350F` | Sedang ditinjau |
| `evidence-observation-bg/text` | `#DBEAFE` / `#1E3A8A` | Informasi pengamatan; bukan status verified |
| `evidence-confirmed-bg/text` | `#DCFCE7` / `#14532D` | Dikonfirmasi pengelola, dengan ikon dan nama sumber |
| `evidence-closed-bg/text` | `#F1F5F9` / `#475569` | Ditutup; alasan tetap tertulis |
| `error-bg/text` | `#FEE2E2` / `#991B1B` | Error input/layanan atau penolakan beralasan |

Severity visual mempertahankan warna lama tetapi mengubah label:

| Enum | Warna | Teks di atas warna | Label |
| --- | --- | --- | --- |
| rendah | `#0D5D3A` | putih | Indikasi visual ringan |
| sedang | `#FFBB00` | `#0F172A` | Indikasi visual sedang |
| tinggi | `#CF0003` | putih | Indikasi visual tinggi |
| kritis | `#242424` | putih | Indikasi visual kritis |
| null | netral | `#334155` | Analisis belum tersedia |

Hindari label TERKENDALI yang dapat dianggap jaminan aman. Badge severity tidak menggantikan EvidenceBadge. Marker unconfirmed netral; confirmed memiliki ikon/badge sumber, bukan hanya berubah merah/hijau.

Kontras teks normal ditargetkan ≥4,5:1, teks besar ≥3:1, komponen/fokus ≥3:1 terhadap latar yang relevan. Periksa pasangan warna aktual, termasuk opacity, disabled, dan overlay peta; token saja tidak menjamin aksesibilitas seluruh aplikasi.

Pemeriksaan numerik pasangan teks pada dokumen ini: putih/brand 7,94:1; teks gelap/kuning 10,51:1; putih/merah 5,75:1; putih/kritis 15,52:1. Pasangan badge bukti dan error berkisar 6,80–9,45:1. Ini pemeriksaan nilai warna solid, bukan audit UI yang telah diimplementasikan.

## Tipografi dan layout

- Font: **Plus Jakarta Sans** yang sudah digunakan; fallback system sans-serif. Tidak menambah font untuk judul.
- Body 16 px/24 px; metadata 14 px/20 px; heading layar 24 px/32 px, weight 700; heading card 18 px/26 px, weight 600.
- Hindari informasi penting 10–12 px. Waktu/status tidak dibuat terlalu tipis atau kontras rendah.
- Spacing: 4, 8, 12, 16, 24, 32, 48 px. Mobile gutter 16 px; desktop 24–32 px.
- Radius: input/button 8 px; card/dialog 12 px; pill 999 px. Shadow tipis untuk elevasi dialog, bukan semua elemen.
- Target interaksi minimum **44 × 44 px**. Ikon 20–24 px boleh berada dalam tombol 44 px.
- Lebar mobile diuji 360–430 px; tetap reflow pada 320 px. Desktop memanfaatkan ruang, bukan memaksa semua halaman tetap selebar telepon.
- Breakpoint rencana: <768 px satu panel; 768–1023 px layout menengah; ≥1024 px daftar/detail dan peta berdampingan. Nilai adalah konvensi UI, bukan kondisi browser wajib.

## Komponen inti

| Komponen rencana | Isi dan perilaku |
| --- | --- |
| `Button` | primary/secondary/destructive/ghost; loading mempertahankan lebar; label jelas |
| `FormField` | label, bantuan, error terhubung ke input; tidak hanya placeholder |
| `EvidenceBadge` | status bukti + ikon; confirmed menyebut pengelola, closed menyebut alasan |
| `VisualSeverityBadge` | hasil visual AI, tidak tampil fiktif jika null |
| `ReportCard` | kategori, area, waktu pengamatan, bukti, ringkasan aman, link detail |
| `AwarenessNotice` | notice_kind, jarak/area, waktu, status, satu tindakan utama; tidak blinking |
| `ObservationForm` | radio tiga pilihan, source, time, note, simpan/ubah/cabut |
| `ObservationSummary` | angka langsung/tidak langsung/unsure terpisah, waktu freshness, penjelasan keterbatasan |
| `DataStatePanel` | loading/empty/error/stale/offline; retry dan data_as_of |
| `ModerationDecisionForm` | action, alasan, perubahan yang akan terjadi, versi record |
| `Timeline` | kejadian audit yang aman: submit, review, keputusan, penerimaan, penutupan |
| `Dialog` | judul, focus trap, Escape, restore focus, background inert |

Nama tersebut adalah komponen yang direncanakan, bukan file yang sudah ada. Gunakan komponen `Card` yang tersedia bila sesuai; tidak perlu membangun library kompleks.

## Interaksi dan aksesibilitas

- Gunakan elemen semantic: button, label, fieldset/legend, heading berurutan, landmark, dan link.
- Error form dibaca pembaca layar dan dikaitkan dengan field. Pemberitahuan biasa memakai live region polite; jangan semua toast menjadi alert interruptif.
- Radio group dapat dioperasikan keyboard. Link daftar tidak terjebak di modal yang tersembunyi.
- Modal mengambil fokus awal yang masuk akal, menahan fokus, menutup via Escape, dan mengembalikan fokus ke pemicu. Acuan: [WAI-ARIA dialog modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Peta memiliki alternatif daftar. Status laporan dan jarak tidak hanya berupa warna/ring peta.
- Dukung zoom 200%, reduced motion, teks panjang, dan scroll tanpa tombol tertutup fixed navigation.
- Target WCAG 2.2 AA adalah sasaran pengembangan, bukan klaim sertifikasi atau hasil audit yang sudah lulus.

## Aturan bahasa

| Gunakan | Hindari |
| --- | --- |
| Ada laporan kebakaran di area ini | Pasti terjadi kebakaran, jika belum ada konfirmasi |
| Belum dikonfirmasi | Valid berdasarkan AI |
| Dikonfirmasi pengelola komunitas | Diverifikasi pemerintah tanpa mitra resmi |
| Tidak melihat tanda pada waktu pengamatan | Berita palsu berdasarkan satu jawaban |
| Belum ada laporan aktif yang sesuai area | Area aman |
| Laporan diterima responder | Petugas menuju lokasi hanya dari ACCEPTED |
| Tersimpan di perangkat, belum terkirim | Berhasil dilaporkan ketika offline lokal saja |

## Cara menerapkan nanti

Pusatkan token pada stylesheet/theme yang dipakai seluruh UI; rencana lokasi `frontend/src/app/globals.css` dan modul semantic bersama. Saat ini sebagian warna/pemetaan berada di `frontend/src/lib/demo-reports.ts`; migrasikan import bertahap dan hindari dua sumber status yang berbeda.

Urutan: token → badge/state panel → card/notice → form → dashboard. Review visual pada mobile dan desktop setelah alur data berfungsi. Tidak perlu mengganti framework, menambah library ikon, atau membuat desain baru yang memutus identitas GEMA.
