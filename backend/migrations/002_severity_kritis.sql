-- GEMA — tambah tingkat keparahan "kritis" (proposal tim, radius 10km).
-- Jalankan di SQL Editor Supabase SETELAH 001_initial.sql sudah pernah jalan.

alter table reports drop constraint if exists reports_severity_check;
alter table reports add constraint reports_severity_check
  check (severity in ('rendah', 'sedang', 'tinggi', 'kritis'));
