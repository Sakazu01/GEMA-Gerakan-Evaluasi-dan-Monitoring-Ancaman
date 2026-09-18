-- GEMA — fungsi vote atomik (PRD §9.3-9.4). Jalankan di SQL Editor Supabase.
-- Dipanggil backend lewat client.rpc(...) memakai secret key (bypass RLS, sama seperti
-- akses tabel langsung yang sudah dipakai di services/reports.py).

drop function if exists cast_false_vote(uuid, uuid, text);

create or replace function cast_false_vote(
  p_report_id uuid,
  p_voter_id uuid,
  p_reason text default null
)
-- OUT param sengaja dinamai result_status (bukan "status") -- kalau sama persis
-- dengan kolom reports.status, Postgres error "column reference is ambiguous".
returns table (false_vote_count bigint, result_status text)
language plpgsql
as $$
declare
  v_owner uuid;
  v_status text;
  v_count bigint;
begin
  -- Kunci baris ini dulu supaya dua sanggahan barengan tidak salah hitung (PRD §9.4).
  select reports.author_id, reports.status into v_owner, v_status
  from reports where id = p_report_id
  for update;

  if not found then
    raise exception 'report_not_found';
  end if;
  if v_status <> 'active' then
    raise exception 'report_not_active';
  end if;
  if v_owner = p_voter_id then
    raise exception 'cannot_vote_own_report';
  end if;

  begin
    insert into false_votes (report_id, voter_id, reason)
    values (p_report_id, p_voter_id, p_reason);
  exception when unique_violation then
    raise exception 'already_voted';
  end;

  select count(*) into v_count from false_votes where report_id = p_report_id;

  if v_count >= 3 then
    update reports set status = 'disputed_hidden' where id = p_report_id;
    v_status := 'disputed_hidden';
  end if;

  false_vote_count := v_count;
  result_status := v_status;
  return next;
end;
$$;

create or replace function cast_help_vote(
  p_report_id uuid,
  p_voter_id uuid,
  p_value text
)
returns table (seen_count bigint, not_seen_count bigint)
language plpgsql
as $$
declare
  v_status text;
begin
  select status into v_status from reports where id = p_report_id for update;

  if not found then
    raise exception 'report_not_found';
  end if;
  if v_status <> 'active' then
    raise exception 'report_not_active';
  end if;

  -- Ganti nilai lama, bukan tambah suara baru (PRD §9.3).
  insert into help_votes (report_id, voter_id, value)
  values (p_report_id, p_voter_id, p_value)
  on conflict (report_id, voter_id) do update set value = excluded.value, created_at = now();

  select
    count(*) filter (where value = 'seen'),
    count(*) filter (where value = 'not_seen')
  into seen_count, not_seen_count
  from help_votes where report_id = p_report_id;

  return next;
end;
$$;
