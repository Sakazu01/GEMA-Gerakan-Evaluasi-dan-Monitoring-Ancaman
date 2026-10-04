-- Responder-first flow, structured provenance evidence, and eligible nearby votes.
begin;

alter table public.reports
  add column if not exists provenance_status text not null default 'not_requested',
  add column if not exists provenance_web_status text not null default 'not_requested',
  add column if not exists provenance_checked_at timestamptz,
  add column if not exists internal_match_count integer not null default 0,
  add column if not exists web_match_count integer not null default 0,
  add column if not exists ai_confidence text,
  add column if not exists ai_limitations text;
alter table public.reports drop constraint if exists reports_provenance_status_check;
alter table public.reports add constraint reports_provenance_status_check
  check(provenance_status in ('not_requested','checking','complete','unavailable'));
alter table public.reports drop constraint if exists reports_provenance_web_status_check;
alter table public.reports add constraint reports_provenance_web_status_check
  check(provenance_web_status in ('not_requested','disabled','complete','unavailable'));
alter table public.reports drop constraint if exists reports_ai_confidence_check;
alter table public.reports add constraint reports_ai_confidence_check
  check(ai_confidence is null or ai_confidence in ('rendah','sedang','tinggi'));

create table if not exists public.report_matches (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports(id) on delete cascade,
  matched_report_id uuid not null references public.reports(id) on delete cascade,
  match_method text not null check(match_method in ('sha256','dhash')),
  score double precision not null check(score between 0 and 1),
  hamming_distance integer,
  created_at timestamptz not null default now(),
  unique(report_id,matched_report_id,match_method),
  check(report_id<>matched_report_id)
);
create index if not exists report_matches_report_idx on public.report_matches(report_id,score desc);

create table if not exists public.web_image_matches (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports(id) on delete cascade,
  provider text not null,
  source_page_url text,
  source_image_url text not null,
  title text,
  published_at timestamptz,
  match_type text not null check(match_type in ('full','partial','visual')),
  score double precision not null check(score between 0 and 1),
  created_at timestamptz not null default now(),
  unique(report_id,provider,source_image_url)
);
create index if not exists web_image_matches_report_idx on public.web_image_matches(report_id,score desc);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  disaster_type text not null check(disaster_type in ('flood','landslide','fire')),
  anchor_lat double precision not null check(anchor_lat between -90 and 90),
  anchor_lng double precision not null check(anchor_lng between -180 and 180),
  started_at timestamptz not null,
  status text not null default 'active' check(status in ('active','resolved')),
  created_at timestamptz not null default now()
);
create table if not exists public.report_incidents (
  report_id uuid primary key references public.reports(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  match_basis text not null default 'space_time_type',
  created_at timestamptz not null default now()
);
create index if not exists report_incidents_incident_idx on public.report_incidents(incident_id);

do $$ declare t text; begin
  foreach t in array array['report_matches','web_image_matches','incidents','report_incidents'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant usage,select on all sequences in schema public to service_role;

create or replace function public.find_photo_matches(p_report uuid,p_limit integer,p_hamming integer)
returns table(matched_report_id uuid,match_method text,score double precision,hamming_distance integer)
language sql stable set search_path=public,pg_temp as $$
  with source as (
    select photo_sha256,photo_phash from reports where id=p_report
  ), candidates as (
    select r.id,
      case when r.photo_sha256=s.photo_sha256 then 'sha256' else 'dhash' end as method,
      case when r.photo_sha256=s.photo_sha256 then 0
        else bit_count((('x'||r.photo_phash)::bit(64)) # (('x'||s.photo_phash)::bit(64))) end as distance
    from reports r cross join source s
    where r.id<>p_report and not r.is_demo and r.status<>'draft'
      and ((s.photo_sha256 is not null and r.photo_sha256=s.photo_sha256)
        or (s.photo_phash ~ '^[0-9a-f]{16}$' and r.photo_phash ~ '^[0-9a-f]{16}$'
          and bit_count((('x'||r.photo_phash)::bit(64)) # (('x'||s.photo_phash)::bit(64)))<=p_hamming))
  )
  select id,method,case when method='sha256' then 1::float8 else 1-distance::float8/64 end,distance
  from candidates order by (method='sha256') desc,distance,id limit greatest(1,least(p_limit,20));
$$;

create or replace function public.assign_incident(p_report uuid) returns uuid
language plpgsql set search_path=public,pg_temp as $$
declare current_report reports%rowtype; candidate_id uuid; selected_incident uuid;
begin
  select * into current_report from reports where id=p_report and status in ('active','held') and not is_demo for update;
  if not found or current_report.observed_at is null then return null; end if;
  select ri.incident_id,r.id into selected_incident,candidate_id
    from reports r left join report_incidents ri on ri.report_id=r.id
    where r.id<>p_report and r.status in ('active','held') and not r.is_demo
      and coalesce(r.reported_type,r.type)=coalesce(current_report.reported_type,current_report.type)
      and r.observed_at between current_report.observed_at-interval '2 hours' and current_report.observed_at+interval '2 hours'
      and 2*6371000*asin(sqrt(power(sin(radians(r.lat-current_report.lat)/2),2)
        +cos(radians(current_report.lat))*cos(radians(r.lat))*power(sin(radians(r.lng-current_report.lng)/2),2)))<=500
    order by abs(extract(epoch from r.observed_at-current_report.observed_at)),r.id limit 1;
  if candidate_id is null then return null; end if;
  if selected_incident is null then
    insert into incidents(disaster_type,anchor_lat,anchor_lng,started_at)
      values(coalesce(current_report.reported_type,current_report.type),current_report.lat,current_report.lng,
        least(current_report.observed_at,(select observed_at from reports where id=candidate_id))) returning id into selected_incident;
    insert into report_incidents(report_id,incident_id) values(candidate_id,selected_incident) on conflict(report_id) do nothing;
  end if;
  insert into report_incidents(report_id,incident_id) values(p_report,selected_incident) on conflict(report_id) do nothing;
  return selected_incident;
end $$;

create or replace function public.submit_report(p_user uuid,p_draft uuid,p_payload jsonb,p_key text,p_hash text,p_ttl integer,p_triage boolean,p_push boolean)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype; k idempotency_keys%rowtype; v_observed timestamptz;
  v_known boolean; v_flags jsonb:='[]'; v_status text; v_expires timestamptz;
begin
  insert into idempotency_keys(user_id,operation,key,payload_hash) values(p_user,'submit',p_key,p_hash) on conflict do nothing;
  select * into k from idempotency_keys where user_id=p_user and operation='submit' and key=p_key for update;
  if k.payload_hash<>p_hash then raise exception 'idempotency_conflict'; end if;
  if k.result_ref is not null then
    select * into r from reports where id=k.result_ref and author_id=p_user;
    return jsonb_build_object('report',to_jsonb(r),'already_published',true);
  end if;
  select * into r from reports where id=p_draft and author_id=p_user for update;
  if not found then raise exception 'report_not_found'; end if;
  if r.status='draft' and r.created_at<now()-interval '24 hours' then raise exception 'draft_expired'; end if;
  if r.status<>'draft' then
    if r.publish_hash=p_hash then
      update idempotency_keys set result_ref=r.id where user_id=p_user and operation='submit' and key=p_key;
      return jsonb_build_object('report',to_jsonb(r),'already_published',true);
    end if;
    raise exception 'report_not_draft';
  end if;
  if r.photo_path is null or p_payload->>'photo_source'<>'camera' then raise exception 'camera_photo_required'; end if;
  v_known:=coalesce((p_payload->>'observation_time_known')::boolean,false);
  v_observed:=(p_payload->>'observed_at')::timestamptz;
  if v_known and v_observed is null then raise exception 'observation_time_required'; end if;
  if v_observed>now()+interval '5 minutes' then raise exception 'future_observation'; end if;
  v_expires:=v_observed+make_interval(hours=>p_ttl);
  if not v_known then v_flags:=v_flags||'"observation_time_unknown"'::jsonb; end if;
  if v_expires is null or v_expires<=now() then v_flags:=v_flags||'"observation_expired"'::jsonb; end if;
  if r.ai_status<>'relevant' then v_flags:=v_flags||'"manual_or_uncertain"'::jsonb; end if;
  if r.ai_disaster_type is not null and r.ai_disaster_type<>p_payload->>'reported_type' then v_flags:=v_flags||'"type_mismatch"'::jsonb; end if;
  if exists(select 1 from report_matches m where m.report_id=r.id and m.match_method='sha256') then v_flags:=v_flags||'"photo_reused"'::jsonb; end if;
  if exists(select 1 from report_matches m where m.report_id=r.id and m.match_method='dhash') then v_flags:=v_flags||'"photo_similar"'::jsonb; end if;
  if exists(select 1 from web_image_matches w where w.report_id=r.id) then v_flags:=v_flags||'"photo_found_on_web"'::jsonb; end if;
  v_flags:=v_flags||r.risk_flags;
  v_status:=case when not v_known or v_expires is null or v_expires<=now() then 'held' else 'active' end;
  update reports set status=v_status,verification_status=case when v_status='held' then 'under_review' else 'unconfirmed' end,
    published_at=now(),type=p_payload->>'reported_type',reported_type=p_payload->>'reported_type',
    lat=(p_payload->>'lat')::float8,lng=(p_payload->>'lng')::float8,location_source=p_payload->>'location_source',
    location_label=p_payload->>'location_label',description=p_payload->>'description',details_json=nullif(p_payload->'details','null'::jsonb),
    observation_time_known=v_known,observed_at=v_observed,expires_at=v_expires,photo_source='camera',
    photo_captured_at=(p_payload->>'photo_captured_at')::timestamptz,risk_flags=v_flags,publish_hash=p_hash,version=version+1
    where id=r.id returning * into r;
  update idempotency_keys set result_ref=r.id where user_id=p_user and operation='submit' and key=p_key;
  insert into moderation_events(report_id,actor,action,before_status,after_status,reason,report_version)
    values(r.id,p_user,'submit','draft',r.status,'Laporan kamera diajukan; bukti diteruskan kepada responder',r.version);
  if p_triage then insert into notification_outbox(event_key,report_id,channel) values(r.id||':triage',r.id,'telegram') on conflict do nothing; end if;
  if p_push and r.status='active' then insert into notification_outbox(event_key,report_id,channel,payload)
    values(r.id||':push:'||r.version,r.id,'push',jsonb_build_object('version',r.version,'action','published')) on conflict do nothing; end if;
  return jsonb_build_object('report',to_jsonb(r),'already_published',false);
end $$;

create or replace function public.save_observation(p_user uuid,p_report uuid,p_payload jsonb,p_proximity boolean,p_withdraw boolean default false)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype; old observations%rowtype; v_time timestamptz; v_seen bigint; v_false bigint; v_changed boolean:=false;
begin
  select * into r from reports where id=p_report for update;
  if not found then raise exception 'report_not_found'; end if;
  if r.is_demo or r.status<>'active' or r.expires_at<=now() then raise exception 'report_not_active'; end if;
  if r.author_id=p_user then raise exception 'cannot_observe_own_report'; end if;
  select * into old from observations where report_id=p_report and user_id=p_user;
  if p_withdraw then
    update observations set withdrawn_at=now() where report_id=p_report and user_id=p_user;
    if old.user_id is not null then insert into observation_history(report_id,user_id,value,source,observed_at,action)
      values(p_report,p_user,old.value,old.source,old.observed_at,'withdraw'); end if;
    return jsonb_build_object('saved',true,'withdrawn',true);
  end if;
  if p_payload->>'value' not in ('seen','not_observed') then raise exception 'invalid_observation'; end if;
  if not p_proximity then raise exception 'proximity_required'; end if;
  v_time:=(p_payload->>'observed_at')::timestamptz;
  if v_time is null or v_time>now()+interval '5 minutes' then raise exception 'future_observation'; end if;
  insert into observations(report_id,user_id,value,source,observed_at,note,at_report_location,lat,lng,accuracy_m,proximity_eligible)
    values(p_report,p_user,p_payload->>'value','direct',v_time,p_payload->>'note',true,
      (p_payload#>>'{observer_location,lat}')::float8,(p_payload#>>'{observer_location,lng}')::float8,
      (p_payload#>>'{observer_location,accuracy_m}')::float8,true)
    on conflict(report_id,user_id) do update set value=excluded.value,source='direct',observed_at=excluded.observed_at,
      note=excluded.note,at_report_location=true,lat=excluded.lat,lng=excluded.lng,accuracy_m=excluded.accuracy_m,
      proximity_eligible=true,received_at=now(),withdrawn_at=null;
  insert into observation_history(report_id,user_id,value,source,observed_at,action)
    values(p_report,p_user,p_payload->>'value','direct',v_time,case when old.user_id is null then 'create' else 'update' end);
  select count(*) filter(where value='seen'),count(*) filter(where value='not_observed') into v_seen,v_false
    from observations where report_id=p_report and proximity_eligible and not abuse_flag and withdrawn_at is null;
  if v_false>=6 and v_false>v_seen then
    if r.responder_status='ACCEPTED' then
      update reports set verification_status='under_review',public_verification_note='Diragukan oleh warga sekitar; petugas telah menerima laporan.',version=version+1 where id=p_report returning * into r;
    else
      update reports set status='held',verification_status='under_review',public_verification_note='Diragukan oleh warga sekitar.',version=version+1 where id=p_report returning * into r;
    end if;
    v_changed:=true;
    insert into moderation_events(report_id,actor,action,before_status,after_status,reason,report_version)
      values(p_report,p_user,'community_dispute','active',r.status,'Minimal enam suara Palsu eligible dan lebih banyak dari Konfirmasi',r.version);
    if r.telegram_message_id is not null then insert into notification_outbox(event_key,report_id,channel,payload)
      values(r.id||':telegram-community:'||r.version,r.id,'telegram',jsonb_build_object('version',r.version,'action','community_disputed')) on conflict do nothing; end if;
  end if;
  return jsonb_build_object('saved',true,'confirm_count',v_seen,'false_count',v_false,'community_disputed',v_changed,'status',r.status);
end $$;

create or replace function public.enqueue_report_update() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.status<>'draft' and not new.is_demo and (
      old.status is distinct from new.status
      or old.verification_status is distinct from new.verification_status
      or old.responder_status is distinct from new.responder_status) then
    insert into notification_outbox(event_key,report_id,channel,payload)
      values(new.id||':update:'||new.version,new.id,'push',jsonb_build_object('version',new.version)) on conflict do nothing;
  end if;
  return new;
end $$;

create or replace function public.accept_responder_report(p_report uuid,p_chat text,p_message bigint,p_actor uuid,p_label text)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype;
begin
  if not exists(select 1 from user_roles where user_id=p_actor and role='responder') then raise exception 'forbidden'; end if;
  select * into r from reports where id=p_report and not is_demo and status in ('active','held') for update;
  if not found then return jsonb_build_object('report',null,'changed',false); end if;
  if r.telegram_message_id is null and exists(select 1 from notification_outbox where report_id=p_report and channel='telegram' and state='unknown') then
    update reports set telegram_chat_id=p_chat,telegram_message_id=p_message where id=p_report returning * into r;
    update notification_outbox set state='sent',remote_message_id=p_message::text,last_error_code=null where report_id=p_report and channel='telegram' and state='unknown';
  end if;
  if r.telegram_chat_id is distinct from p_chat or r.telegram_message_id is distinct from p_message then return jsonb_build_object('report',null,'changed',false); end if;
  if r.responder_status='ACCEPTED' then return jsonb_build_object('report',to_jsonb(r),'changed',false); end if;
  update reports set responder_status='ACCEPTED',accepted_at=now(),accepted_by=p_label,
    status=case when observed_at is not null and observation_time_known and expires_at>now() then 'active' else status end,
    version=version+1 where id=p_report returning * into r;
  insert into moderation_events(report_id,actor,action,before_status,after_status,reason,report_version)
    values(p_report,p_actor,'accept',r.status,r.status,'Laporan diterima responder; marker publik diaktifkan jika bukti waktunya masih berlaku',r.version);
  return jsonb_build_object('report',to_jsonb(r),'changed',true);
end $$;

revoke execute on function public.find_photo_matches(uuid,integer,integer),public.assign_incident(uuid),
  public.submit_report(uuid,uuid,jsonb,text,text,integer,boolean,boolean),
  public.save_observation(uuid,uuid,jsonb,boolean,boolean),
  public.accept_responder_report(uuid,text,bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.find_photo_matches(uuid,integer,integer),public.assign_incident(uuid),
  public.submit_report(uuid,uuid,jsonb,text,text,integer,boolean,boolean),
  public.save_observation(uuid,uuid,jsonb,boolean,boolean),
  public.accept_responder_report(uuid,text,bigint,uuid,text) to service_role;

commit;
