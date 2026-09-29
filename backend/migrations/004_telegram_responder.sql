-- Jalankan setelah 003_vote_functions.sql. Status penerimaan petugas terpisah
-- dari reports.status (draft/active/disputed_hidden) dan help_votes warga.
alter table reports
  add column if not exists responder_status text not null default 'PENDING'
    check (responder_status in ('PENDING', 'ACCEPTED')),
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by text,
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_message_id bigint;

alter table reports drop constraint if exists reports_acceptance_consistency;

alter table reports
  add constraint reports_acceptance_consistency check (
    (responder_status = 'PENDING' and accepted_at is null)
    or (responder_status = 'ACCEPTED' and accepted_at is not null)
  );
