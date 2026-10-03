# Kontrak data dan API GEMA

Status: kontrak acuan fitur inti yang sudah tersedia di workspace. Perbedaan rinci dan endpoint tambahan ada di [hasil implementasi](hasil-implementasi.md); konfigurasi/migrasi pada [operasional](operasional.md). Fitur roadmap tidak dianggap tersedia hanya karena disebut dalam desain.

## Model status

| Field | Nilai | Aturan |
| --- | --- | --- |
| `status` | `draft`, `active`, `held`, `closed` | Lifecycle/publikasi; closed tidak tampil pada feed aktif |
| `verification_status` | `unconfirmed`, `under_review`, `confirmed` | Bukti kejadian; tidak dihitung otomatis dari AI atau observations |
| `closure_reason` | null, `resolved`, `expired`, `refuted` | Non-null hanya ketika closed; resolved berbeda dari laporan salah |
| `ai_status` | `pending`, `relevant`, `uncertain`, `invalid`, `unavailable`, `not_requested` | Keadaan analisis foto |
| `responder_status` | `PENDING`, `ACCEPTED` | Kompatibel dengan migrasi 004; ACCEPTED hanya penerimaan |

`severity` mempertahankan enum kode saat ini: `rendah`, `sedang`, `tinggi`, `kritis`, tetapi nullable jika AI belum menghasilkan klasifikasi relevan. Maknanya severity **visual AI**, bukan risiko resmi. `reported_type` wajib saat submit dan berisi jenis yang dipilih warga; `ai_disaster_type` adalah hasil AI nullable. Jika keduanya berbeda, masuk review, jangan menimpa tanpa jejak. Field `type` lama menjadi alias kompatibilitas untuk reported_type; jangan mengubah nama kolom/kontrak legacy tanpa migrasi client yang jelas.

`confirmed` memerlukan moderator, alasan, dan `verified_at`. Held selalu under_review. Closed menyimpan status bukti terakhir untuk audit, tetapi UI menampilkan penutupan sebagai status utama. Reopen harus keputusan moderator yang mencatat alasan dan waktu pengamatan baru; tidak hanya menghapus expires_at.

### Transisi

| Dari | Ke | Pemicu |
| --- | --- | --- |
| draft | active + unconfirmed | Submit lolos validasi dan kebijakan publish |
| draft | held + under_review | Submit perlu review; laporan tetap tersimpan |
| active + unconfirmed | active + under_review | Konflik/pengaduan menambah kebutuhan tinjauan; tanpa auto-hide |
| active/held | active + confirmed | Keputusan moderator berbukti |
| active/held | active + unconfirmed | Moderator melepas penahanan tanpa cukup bukti konfirmasi |
| active | held + under_review | Keputusan moderator menahan dengan alasan |
| active/held | closed | Moderator resolved/refuted atau expiry sistem |
| closed | active/held | Reopen terotorisasi dengan pengamatan baru dan audit |

Pengaduan baru pada confirmed membuat item antrean review; tidak mencabut konfirmasi otomatis. Seluruh keputusan conditional terhadap versi record agar dua moderator tidak saling menimpa.

## Skema minimum

### `reports`: tambah/perbarui

| Field | Tipe | Aturan |
| --- | --- | --- |
| `author_id` | UUID | Subject JWT; bukan client ID |
| `status`, `verification_status`, `closure_reason`, `ai_status` | text + CHECK | Sesuai enum/transisi di atas |
| `observed_at` | timestamptz nullable | Wajib jika waktu diketahui; jika tidak diketahui, gunakan `observation_time_known=false` dan masuk held |
| `observation_time_known` | boolean | Tidak boleh memakai waktu upload sebagai waktu kejadian tanpa pernyataan pengguna |
| `photo_source` | `camera`, `gallery`, `forwarded`, `none` | Camera/gallery juga merupakan deklarasi client, bukan bukti perangkat tepercaya |
| `photo_captured_at` | timestamptz nullable | Waktu yang tersedia/dinyatakan; tidak mengganti observed_at |
| `reported_type` | flood/landslide/fire nullable pada draft | Wajib submit, label “jenis menurut pelapor” |
| `ai_disaster_type`, `severity`, `ai_summary`, `ai_reason`, `photo_path` | nullable | AI/manual fallback tidak memerlukan hasil fiktif; media tetap privat |
| `location_source` | device/map/demo | Demo hanya untuk mode demo; device tidak membuktikan lokasi kejadian |
| `expires_at` | timestamptz nullable pada draft | Dihitung server dari observed_at + TTL, atau held jika waktu tidak diketahui |
| `closed_at` | timestamptz nullable | Server mencatat saat status berubah menjadi closed; null saat reopen; dasar retensi foto 30 hari. Legacy memakai audit penutupan, atau memulai jendela retensi saat migrasi jika tanggal tidak diketahui |
| `verified_at`, `verified_by`, `verification_note` | nullable | Wajib untuk confirmed; public note versi aman terpisah dari catatan privat |
| `awareness_radius_override_m` | integer nullable | Hanya moderator, 100–10.000 m, konfigurasi pilot; bukan batas bahaya |
| `version` | integer | Bertambah pada mutasi status yang perlu concurrency control |

Untuk waktu tidak diketahui: `observed_at=null`, `observation_time_known=false`, status held; tidak eligible notice. Nilai nullable bukan alasan mengarang waktu. Tolak waktu masa depan >5 menit terhadap clock server sebagai default pilot. Simpan UTC; tampilkan WIB untuk lokasi pilot, tidak gunakan tanggal browser sebagai acuan server.

### Tabel baru

| Tabel | Field minimum dan invariant |
| --- | --- |
| `observations` | PK `(report_id,user_id)`; value seen/not_observed/unsure; source direct/secondhand nullable untuk unsure; observed_at, received_at server, note ≤500; at_report_location boolean nullable; claimed lat/lng/accuracy nullable; proximity_eligible server; withdrawn_at; abuse_flag; update mengganti jawaban terkini |
| `observation_history` | ID, report/user, value/source/time, alasan revisi/withdraw; tidak menggandakan raw lokasi; bukan sumber count terkini |
| `abuse_reports` | ID, report/user, category, reason ≤500, created_at; satu pengaduan aktif per akun/laporan; tidak bisa oleh pelapor sendiri |
| `moderation_events` | ID, report, actor, action, before/after status, reason, created_at, report_version; append-only |
| `user_roles` | user_id, role moderator/responder, assigned_by, assigned_at; hanya administrasi server |
| `notification_outbox` | ID, event_key UNIQUE, report, channel, payload aman, state, attempts, next_attempt_at, lease_until, remote_message_id, last_error_code |
| `idempotency_keys` | user_id + operation + key UNIQUE, payload_hash, result_ref, created_at, expires_at |
| `rate_limit_buckets` | scope + hashed key + window UNIQUE, count; perubahan atomik untuk multiworker |

MVP observation tanpa upload foto tambahan. Jika ditambahkan nanti, gunakan tabel media privat terpisah dengan retention dan otorisasi yang sama, bukan URL arbitrer dari client.

`false_votes`/`help_votes` lama tetap historis. Help vote mengukur bantuan, tidak dimigrasi menjadi pengamatan kejadian. Jangan menyamakan seen pada help vote dengan seen pada observation.

## Visibilitas bersama

Predicate dasar publik aktif: `status=active AND expires_at > now() AND is_demo=false`. Tanpa waktu yang diketahui laporan held, sehingga tidak memenuhi predicate. Gunakan fungsi/query bersama untuk feed, density, nearby, statistik aktif, dan konteks chat; riwayat hanya pada jalur eksplisit.

Nearby menambahkan eligibility: waktu pengamatan valid, lokasi pengguna/area valid, verification bukan under_review, dan berada dalam radius yang sesuai. Density menghitung pelapor unik, bukan kejadian unik. Chat menyebut jumlah **laporan** dan tidak mengekspose laporan held/draft atau isi privat ke model publik.

Kedaluwarsa efektif pada query meski job penutupan terlambat; worker kemudian mencatat closed/expired. Mode demo terpisah dan ditandai; tidak memberi pengamatan/Telegram produksi.

## Kontrak endpoint

Semua path memakai prefix `/api`. Migrasi client dilakukan bersama backend; jangan menyalin payload baru ke endpoint lama sebelum adaptornya tersedia.

| Method/path | Hak akses | Hasil/perilaku |
| --- | --- | --- |
| POST `/reports/drafts` | Warga authenticated | Multipart metadata + foto opsional; simpan draft privat sebelum AI |
| POST `/reports/drafts/{id}/analyze` | Pemilik | Analisis foto draft; return ai_status; unavailable tetap menyimpan draft |
| PATCH `/reports/drafts/{id}` | Pemilik | Perbarui metadata, koordinat, description; validasi field allowlist |
| POST `/reports` | Pemilik | Submit draft, header Idempotency-Key; active/held dari kebijakan server |
| GET `/reports` | Publik | Feed aman dengan cursor, status bukti, freshness, tidak held/demo |
| GET `/reports/{id}` | Publik | Detail aktif/arsip yang aman; held tidak dibuka lewat jalur ini |
| GET `/my-reports/{id}` | Pemilik | Detail sendiri termasuk held dan alasan yang aman disampaikan |
| GET `/nearby` | Publik, quota baca | Ringkasan kandidat lengkap, mode lokasi/area, data_as_of; tidak bergantung feed 50 |
| PUT `/reports/{id}/observation` | Warga authenticated | Upsert satu jawaban sendiri; report harus masih active dan belum expired |
| DELETE `/reports/{id}/observation` | Pemilik jawaban | Withdraw, update agregat, simpan jejak; tidak hapus bukti audit |
| POST `/reports/{id}/abuse` | Warga authenticated | Pengaduan; tidak mengubah visibility otomatis |
| GET `/moderation/reports` | Moderator | Antrean privat berpagination |
| GET `/moderation/reports/{id}` | Moderator | Detail privat, pengamatan, audit, media sesuai izin |
| POST `/moderation/reports/{id}/decisions` | Moderator | Action, reason, expected_version; server menerapkan transisi |
| POST `/telegram/webhook` | Webhook terverifikasi | Secret, group, message, responder allowlist; ACCEPTED atomik |
| GET `/session` | Authenticated | Role dari server; anonymous account tidak menjadi moderator |
| GET `/my-reports` | Pemilik | Riwayat sendiri termasuk held dan closed |
| GET `/reports/{id}/observation` | Pemilik jawaban | Jawaban sendiri untuk update/cabut |
| GET `/push/config` | Publik | Kesiapan push dan public VAPID key |
| POST/DELETE `/push/subscriptions` | Authenticated/pemilik | Daftar/perbarui preferensi atau unsubscribe |
| POST `/moderation/outbox/{id}/retry` | Moderator | Retry eksplisit dan audit dengan peringatan risiko pesan ganda |

Endpoint `/analyze` lama menjadi adaptor ke draft/analyze sampai semua client beralih. `/reports/all` lama diproteksi role lalu digantikan jalur moderation. Vote false lama menjadi adaptor pengaduan tanpa auto-hide; help vote tidak dicampur.

### Contoh observation

```json
{
  "value": "seen",
  "source": "direct",
  "observed_at": "2026-10-03T07:10:00Z",
  "note": "Terlihat asap dari area yang disebut pada laporan.",
  "observer_location": {
    "lat": -6.9,
    "lng": 107.6,
    "accuracy_m": 35,
    "measured_at": "2026-10-03T07:11:00Z"
  }
}
```

ID user, proximity_eligible, received_at, verification_status, role, dan count tidak diterima dari client. Location opsional: manual area tidak menjadi observer_location perangkat. `not_observed` mewajibkan source direct, `at_report_location=true` dan note konteks; flag ini hanya deklarasi pengguna, bukan bukti GPS. Source secondhand tidak masuk direct count dan backend membuang observer_location untuk sumber tersebut. Semua jawaban diberi cap waktu server. Untuk seen/unsure flag keberadaan dinormalisasi menjadi null; untuk unsure source, observed_at, dan observer_location juga null.

### Contoh nearby

```json
{
  "data_as_of": "2026-10-03T07:12:00Z",
  "location_mode": "device",
  "items": [
    {
      "report_id": "11111111-1111-4111-8111-111111111111",
      "reported_type": "fire",
      "location_label": "Area lingkungan A",
      "distance_m": 400,
      "observed_at": "2026-10-03T07:10:00Z",
      "verification_status": "unconfirmed",
      "notice_kind": "observation_invitation",
      "observation_counts": {
        "direct_seen_nearby": 2,
        "direct_not_observed_nearby": 1,
        "secondhand": 1,
        "unsure": 3
      }
    }
  ],
  "next_refresh_after_seconds": 30
}
```

Respons ini tidak mengandung lokasi rinci pengamat, identitas, atau reason privat. `items=[]` dengan HTTP 200 berbeda dari error API. Gunakan `awareness` untuk notice confirmed; under_review tidak menjadi kandidat baru.

Implementasi juga mengirim `location_valid` dan proyeksi lengkap aman pada `items[].report`, sehingga notice tidak bergantung feed. `ReportOut` menambahkan `awareness_radius_m` dan `review_requested`; ID/private reason pengadu tidak dikirim. Cursor feed baru memakai pasangan `cursor` waktu + `cursor_id`, agar timestamp yang sama tidak melewati laporan.

## Auth dan akses database

Anonymous sign-in Supabase menyediakan akun/session dengan JWT; tidak memerlukan email untuk warga. Namun clear storage/perangkat lain dapat membuat identitas baru, sehingga tetap butuh mitigasi spam. Pengelola memakai akun permanen. Acuan: [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous).

Backend memverifikasi JWT melalui mekanisme resmi provider dan key yang dikonfigurasi, mengambil `sub`, lalu mengecek role dari sumber server. Service key tetap backend-only. RLS saat ini tidak memberi akses client langsung; tidak perlu membuka tabel publik untuk membuat fitur ini. Jika kelak memakai Data API langsung, kebijakan RLS harus ditinjau khusus, termasuk anonymous user yang menggunakan role authenticated.

## Idempotency, concurrency, dan outbox

- Submit dan keputusan moderator dijalankan dalam transaksi/RPC server yang atomik, bukan rangkaian read-then-write terpisah.
- Submit identik mengembalikan referensi laporan yang sama; event outbox unique `(report, jenis event, version)` mencegah enqueue ganda.
- Observation upsert dan agregat membaca sumber terkini yang sama; dua request akun sama tidak menambah count dua kali.
- Moderator expected_version berbeda → 409, refetch lalu review ulang.
- Outbox state: pending/sending/sent/retry/unknown/failed. Lease kedaluwarsa tidak otomatis berarti pesan belum terkirim.
- Timeout setelah request eksternal dapat berarti Telegram sudah menerima. Unknown membutuhkan rekonsiliasi/manual retry dengan penjelasan risiko duplikasi; jangan mengklaim exactly-once.

## Error contract

Format aktual: `detail`, `code`, `retryable`, `request_id`; `retry_after_seconds` jika 429. HTTPException juga menyertakan `message_id`; validasi mengirim field dengan pesan aman. Batas body awal mengirim code/detail tanpa request ID. Jangan mengirim exception mentah/secrets. 401 token tidak valid, 403 hak akses, 404 objek tidak tersedia pada jalur itu, 409 konflik/idempotency, 413 upload terlalu besar, 422 field invalid, 429 quota, 503 layanan sementara gagal.

AI unavailable dapat return hasil analisis draft dengan `ai_status=unavailable`; bukan mengaku sukses klasifikasi. Submit held adalah penyimpanan berhasil dengan status held, bukan error jaringan.

## Migrasi

SQL aktual setelah 004: 005 komunitas/kepercayaan, 006 pengiriman/retention, 007 cleanup atomik, 008 subscription/retry/pengamanan RPC, 009 bucket foto privat, dan 010 retensi sejak penutupan. Daftar berikut menjelaskan urutan migrasi; petunjuk menjalankan ada pada operasional.

1. Expand schema laporan/status/nullable dan tabel pendukung; backend dual-read field legacy.
2. Backfill verification unconfirmed; active legacy tanpa observed_at dipindah held untuk review/arsip, tidak mengisi observed_at dari published_at tanpa bukti.
3. Map disputed_hidden → held under_review, simpan sebab migrasi, jangan refuted.
4. Disable fungsi SQL auto-hide sebelum frontend observation diaktifkan; gunakan adaptor pengaduan.
5. Aktifkan auth dan role; data UUID lama tidak diklaim hanya dengan ID localStorage.
6. Deploy frontend baru, verifikasi transisi, lalu bersihkan endpoint/constraint legacy setelah periode kompatibilitas.

Rollback berupa penonaktifan alur baru dan read-only bila perlu. Tidak boleh mengembalikan otorisasi palsu atau auto-hide sebagai jalan pemulihan.
