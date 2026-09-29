-- GEMA — migrasi awal. Jalankan di SQL Editor Supabase.
-- Sumber: PRD.md §11 (model data) dan §9 (aturan bisnis).

create extension if not exists pgcrypto;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'disputed_hidden')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  type text not null check (type in ('flood', 'landslide', 'fire')),
  severity text not null check (severity in ('rendah', 'sedang', 'tinggi')),
  ai_summary text not null check (char_length(ai_summary) <= 240),
  ai_reason text not null check (char_length(ai_reason) <= 120),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  location_source text check (location_source in ('device', 'map', 'demo')),
  location_label text check (char_length(location_label) <= 100),
  description text check (char_length(description) <= 500),
  details_json jsonb,
  photo_path text not null,
  is_demo boolean not null default false,
  -- PRD §11: lokasi dan waktu publikasi wajib ada begitu laporan aktif.
  constraint reports_active_needs_location check (
    status <> 'active'
    or (
      lat is not null
      and lng is not null
      and location_source is not null
      and location_label is not null
      and published_at is not null
    )
  )
);

create index if not exists reports_status_published_idx
  on reports (status, published_at desc);

-- Primary key gabungan sekalian jadi jaminan "satu suara per pengguna per laporan"
-- (PRD §9.3 dan §9.4) — tidak perlu unique constraint terpisah.
create table if not exists false_votes (
  report_id uuid not null references reports (id) on delete cascade,
  voter_id uuid not null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (report_id, voter_id)
);

create table if not exists help_votes (
  report_id uuid not null references reports (id) on delete cascade,
  voter_id uuid not null,
  value text not null check (value in ('seen', 'not_seen')),
  created_at timestamptz not null default now(),
  primary key (report_id, voter_id)
);

-- RLS aktif dan SENGAJA tanpa policy apa pun: browser tidak pernah query tabel ini
-- langsung. Semua akses lewat backend FastAPI yang pakai secret key (bypass RLS),
-- jadi pemeriksaan kepemilikan dilakukan di Route Handler (PRD §11).
alter table reports enable row level security;
alter table false_votes enable row level security;
alter table help_votes enable row level security;

revoke all on reports from anon, authenticated;
revoke all on false_votes from anon, authenticated;
revoke all on help_votes from anon, authenticated;
