-- Apply after 004 on staging first. Legacy observations are NOT inferred from upload time.
begin;
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add column if not exists verification_status text not null default 'unconfirmed',
  add column if not exists closure_reason text,
  add column if not exists ai_status text not null default 'not_requested',
  add column if not exists observed_at timestamptz,
  add column if not exists observation_time_known boolean not null default false,
  add column if not exists photo_source text not null default 'none',
  add column if not exists photo_captured_at timestamptz,
  add column if not exists reported_type text,
  add column if not exists ai_disaster_type text,
  add column if not exists photo_sha256 text,
  add column if not exists photo_phash text,
  add column if not exists expires_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid,
  add column if not exists verification_note text,
  add column if not exists public_verification_note text,
  add column if not exists awareness_radius_override_m integer,
  add column if not exists version integer not null default 1,
  add column if not exists risk_flags jsonb not null default '[]',
  add column if not exists publish_hash text,
  add column if not exists analysis_lease_until timestamptz;
alter table public.reports alter column type drop not null,
  alter column severity drop not null, alter column ai_summary drop not null,
  alter column ai_reason drop not null, alter column photo_path drop not null;
update public.reports set reported_type=type, ai_disaster_type=type,
  ai_status=case when ai_summary is not null then 'relevant' else 'not_requested' end;
update public.reports set status='held', verification_status='under_review',
  risk_flags='["legacy_observation_time_unknown"]'
  where status in ('active','disputed_hidden') and observed_at is null;
alter table public.reports add constraint reports_status_check check(status in ('draft','active','held','closed')),
  add constraint reports_verification_check check(verification_status in ('unconfirmed','under_review','confirmed')),
  add constraint reports_ai_status_check check(ai_status in ('pending','relevant','uncertain','invalid','unavailable','not_requested')),
  add constraint reports_photo_source_check check(photo_source in ('camera','gallery','forwarded','none')),
  add constraint reports_reported_type_check check(reported_type in ('flood','landslide','fire')),
  add constraint reports_ai_type_check check(ai_disaster_type in ('flood','landslide','fire')),
  add constraint reports_closure_check check((status='closed' and closure_reason in ('resolved','expired','refuted')) or (status<>'closed' and closure_reason is null)),
  add constraint reports_held_check check(status<>'held' or verification_status='under_review'),
  add constraint reports_confirmed_check check(verification_status<>'confirmed' or (verified_at is not null and verified_by is not null and verification_note is not null)),
  add constraint reports_active_time_check check(status<>'active' or (observed_at is not null and observation_time_known and expires_at is not null)),
  add constraint reports_radius_check check(awareness_radius_override_m between 100 and 10000),
  add constraint reports_version_check check(version > 0);
create index reports_live_idx on public.reports(status,expires_at,published_at desc) where not is_demo;
create index reports_photo_hash_idx on public.reports(photo_sha256) where photo_sha256 is not null;

create table public.user_roles (
  user_id uuid not null, role text not null check(role in ('moderator','responder')),
  assigned_by uuid, assigned_at timestamptz not null default now(), primary key(user_id,role)
);
create table public.observations (
  report_id uuid not null references public.reports(id) on delete cascade, user_id uuid not null,
  value text not null check(value in ('seen','not_observed','unsure')),
  source text check(source in ('direct','secondhand')), observed_at timestamptz,
  received_at timestamptz not null default now(), note text check(char_length(note)<=500),
  at_report_location boolean, lat double precision, lng double precision, accuracy_m double precision,
  proximity_eligible boolean not null default false, withdrawn_at timestamptz,
  abuse_flag boolean not null default false, primary key(report_id,user_id),
  check(value='unsure' or (source is not null and observed_at is not null)),
  check(value<>'not_observed' or (at_report_location is true and note is not null)),
  check(lat between -90 and 90), check(lng between -180 and 180)
);
create table public.observation_history (
  id bigint generated always as identity primary key, report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null, value text, source text, observed_at timestamptz, action text not null,
  created_at timestamptz not null default now()
);
create table public.abuse_reports (
  report_id uuid not null references public.reports(id) on delete cascade, user_id uuid not null,
  category text not null, reason text not null check(char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(), primary key(report_id,user_id)
);
create table public.moderation_events (
  id bigint generated always as identity primary key, report_id uuid not null references public.reports(id) on delete cascade,
  actor uuid, action text not null, before_status text, after_status text,
  reason text not null, created_at timestamptz not null default now(), report_version integer not null
);
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(), event_key text unique not null,
  report_id uuid not null references public.reports(id) on delete cascade, channel text not null,
  payload jsonb not null default '{}', state text not null default 'pending'
    check(state in ('pending','sending','sent','retry','unknown','failed')),
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  lease_until timestamptz, remote_message_id text, last_error_code text,
  created_at timestamptz not null default now()
);
create index notification_outbox_due_idx on public.notification_outbox(channel,state,next_attempt_at);
create table public.idempotency_keys (
  user_id uuid not null, operation text not null, key text not null,
  payload_hash text not null, result_ref uuid, created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '7 days', primary key(user_id,operation,key)
);
create table public.rate_limit_buckets (
  scope text not null, key text not null, window_start timestamptz not null,
  count integer not null default 0, primary key(scope,key,window_start)
);

create or replace function public.take_quota(p_scope text,p_user uuid,p_network text,p_limit integer,p_network_limit integer,p_window_seconds integer)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare v_start timestamptz; v_user integer; v_net integer;
begin
  v_start:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
  insert into rate_limit_buckets(scope,key,window_start,count) values(p_scope,'u:'||p_user,v_start,1)
  on conflict(scope,key,window_start) do update set count=rate_limit_buckets.count+1 returning count into v_user;
  insert into rate_limit_buckets(scope,key,window_start,count) values(p_scope,'n:'||p_network,v_start,1)
  on conflict(scope,key,window_start) do update set count=rate_limit_buckets.count+1 returning count into v_net;
  return jsonb_build_object('allowed',v_user<=p_limit and v_net<=p_network_limit,
    'retry_after_seconds',ceil(extract(epoch from v_start+make_interval(secs=>p_window_seconds)-now())));
end $$;

create or replace function public.submit_report(p_user uuid,p_draft uuid,p_payload jsonb,p_key text,p_hash text,p_ttl integer,p_triage boolean)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype; k idempotency_keys%rowtype; v_observed timestamptz;
  v_known boolean; v_flags jsonb:='[]'; v_status text; v_expires timestamptz;
begin
  insert into idempotency_keys(user_id,operation,key,payload_hash) values(p_user,'submit',p_key,p_hash)
    on conflict do nothing;
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
  v_known:=coalesce((p_payload->>'observation_time_known')::boolean,false);
  v_observed:=(p_payload->>'observed_at')::timestamptz;
  if v_known and v_observed is null then raise exception 'observation_time_required'; end if;
  if not v_known then v_observed:=null; v_flags:=v_flags||'"observation_time_unknown"'::jsonb; end if;
  if v_observed>now()+interval '5 minutes' then raise exception 'future_observation'; end if;
  v_expires:=v_observed+make_interval(hours=>p_ttl);
  if v_expires<=now() then v_flags:=v_flags||'"observation_expired"'::jsonb; end if;
  if r.ai_status<>'relevant' then v_flags:=v_flags||'"manual_or_uncertain"'::jsonb; end if;
  if r.ai_disaster_type is not null and r.ai_disaster_type<>p_payload->>'reported_type' then
    v_flags:=v_flags||'"type_mismatch"'::jsonb;
  end if;
  if p_payload->>'photo_source'='forwarded' then v_flags:=v_flags||'"forwarded_photo"'::jsonb; end if;
  -- Serialize the short photo comparison phase, so concurrent duplicate submissions cannot both bypass it.
  if r.photo_sha256 is not null then perform pg_advisory_xact_lock(731924); end if;
  if r.photo_sha256 is not null and exists(select 1 from reports x where x.id<>r.id and x.photo_sha256=r.photo_sha256 and not x.is_demo and x.status<>'draft') then
    v_flags:=v_flags||'"photo_reused"'::jsonb;
  end if;
  if r.photo_phash ~ '^[0-9a-f]{16}$' and exists(
    select 1 from reports x where x.id<>r.id and not x.is_demo and x.status<>'draft'
      and x.photo_phash ~ '^[0-9a-f]{16}$'
      and bit_count((('x'||r.photo_phash)::bit(64)) # (('x'||x.photo_phash)::bit(64)))<=5
  ) then v_flags:=v_flags||'"photo_similar"'::jsonb; end if;
  v_flags:=v_flags||r.risk_flags;
  v_status:=case when jsonb_array_length(v_flags)>0 then 'held' else 'active' end;
  update reports set status=v_status, verification_status=case when v_status='held' then 'under_review' else 'unconfirmed' end,
    published_at=now(), type=p_payload->>'reported_type', reported_type=p_payload->>'reported_type',
    lat=(p_payload->>'lat')::float8,lng=(p_payload->>'lng')::float8,
    location_source=p_payload->>'location_source',location_label=p_payload->>'location_label',
    description=p_payload->>'description',details_json=nullif(p_payload->'details','null'::jsonb),
    observation_time_known=v_known,observed_at=v_observed,expires_at=v_expires,
    photo_source=p_payload->>'photo_source',photo_captured_at=(p_payload->>'photo_captured_at')::timestamptz,
    risk_flags=v_flags,publish_hash=p_hash,version=version+1 where id=r.id returning * into r;
  update idempotency_keys set result_ref=r.id where user_id=p_user and operation='submit' and key=p_key;
  insert into moderation_events(report_id,actor,action,before_status,after_status,reason,report_version)
    values(r.id,p_user,'submit','draft',r.status,'Laporan diajukan; status bukti belum dikonfirmasi',r.version);
  if p_triage and not r.is_demo then
    insert into notification_outbox(event_key,report_id,channel) values(r.id||':triage',r.id,'telegram') on conflict do nothing;
  end if;
  return jsonb_build_object('report',to_jsonb(r),'already_published',false);
end $$;

create or replace function public.save_observation(p_user uuid,p_report uuid,p_payload jsonb,p_proximity boolean,p_withdraw boolean default false)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype; old observations%rowtype; v_time timestamptz;
begin
  select * into r from reports where id=p_report for update;
  if not found then raise exception 'report_not_found'; end if;
  if r.is_demo or r.status<>'active' or r.expires_at<=now() then raise exception 'report_not_active'; end if;
  if r.author_id=p_user then raise exception 'cannot_observe_own_report'; end if;
  select * into old from observations where report_id=p_report and user_id=p_user;
  if p_withdraw then
    update observations set withdrawn_at=now() where report_id=p_report and user_id=p_user;
    if old.user_id is not null then
      insert into observation_history(report_id,user_id,value,source,observed_at,action)
        values(p_report,p_user,old.value,old.source,old.observed_at,'withdraw');
    end if;
    return jsonb_build_object('saved',true);
  end if;
  v_time:=(p_payload->>'observed_at')::timestamptz;
  if v_time>now()+interval '5 minutes' then raise exception 'future_observation'; end if;
  insert into observations(report_id,user_id,value,source,observed_at,note,at_report_location,lat,lng,accuracy_m,proximity_eligible)
    values(p_report,p_user,p_payload->>'value',p_payload->>'source',v_time,p_payload->>'note',
      (p_payload->>'at_report_location')::boolean,(p_payload#>>'{observer_location,lat}')::float8,
      (p_payload#>>'{observer_location,lng}')::float8,(p_payload#>>'{observer_location,accuracy_m}')::float8,p_proximity)
    on conflict(report_id,user_id) do update set value=excluded.value,source=excluded.source,
      observed_at=excluded.observed_at,note=excluded.note,at_report_location=excluded.at_report_location,
      lat=excluded.lat,lng=excluded.lng,accuracy_m=excluded.accuracy_m,proximity_eligible=excluded.proximity_eligible,
      received_at=now(),withdrawn_at=null;
  insert into observation_history(report_id,user_id,value,source,observed_at,action)
    values(p_report,p_user,p_payload->>'value',p_payload->>'source',v_time,case when old.user_id is null then 'create' else 'update' end);
  if p_payload->>'value'='not_observed' and r.verification_status='unconfirmed' then
    update reports set verification_status='under_review',version=version+1 where id=p_report;
  end if;
  return jsonb_build_object('saved',true);
end $$;

create or replace function public.report_abuse(p_user uuid,p_report uuid,p_category text,p_reason text)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype;
begin
  select * into r from reports where id=p_report for update;
  if not found then raise exception 'report_not_found'; end if;
  if r.is_demo or r.status<>'active' or r.expires_at<=now() then raise exception 'report_not_active'; end if;
  if r.author_id=p_user then raise exception 'cannot_vote_own_report'; end if;
  insert into abuse_reports(report_id,user_id,category,reason) values(p_report,p_user,p_category,p_reason)
    on conflict(report_id,user_id) do update set category=excluded.category,reason=excluded.reason,created_at=now();
  if r.verification_status='unconfirmed' then
    update reports set verification_status='under_review',version=version+1 where id=p_report;
  end if;
  return jsonb_build_object('saved',true,'status',r.status);
end $$;

-- Compatibility endpoint, deliberately removes the old threshold-based hiding.
create or replace function public.cast_false_vote(p_report_id uuid,p_voter_id uuid,p_reason text default null)
returns table(false_vote_count bigint,result_status text) language plpgsql set search_path=public,pg_temp as $$
begin
  perform report_abuse(p_voter_id,p_report_id,'other',coalesce(nullif(p_reason,''),'Pengaduan melalui endpoint lama'));
  select count(*) into false_vote_count from abuse_reports where report_id=p_report_id;
  select status into result_status from reports where id=p_report_id;
  return next;
end $$;

create or replace function public.moderate_report(p_actor uuid,p_report uuid,p_action text,p_reason text,p_public_note text,p_version integer,p_observed timestamptz,p_radius integer,p_ttl integer)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype; v_before text; v_time timestamptz;
begin
  if not exists(select 1 from user_roles where user_id=p_actor and role='moderator') then raise exception 'forbidden'; end if;
  select * into r from reports where id=p_report for update;
  if not found then raise exception 'report_not_found'; end if;
  if r.version<>p_version then raise exception 'version_conflict'; end if;
  if r.status='draft' then raise exception 'report_not_submitted'; end if;
  if char_length(trim(p_reason))<10 then raise exception 'reason_required'; end if;
  v_before:=r.status;
  v_time:=coalesce(p_observed,r.observed_at);
  if v_time>now()+interval '5 minutes' then raise exception 'future_observation'; end if;
  if p_action in ('confirm','release','reopen') then
    if v_time is null or v_time+make_interval(hours=>p_ttl)<=now() then raise exception 'fresh_observation_required'; end if;
    if (r.status='closed' or (r.status='active' and r.expires_at<=now())) and p_observed is null then raise exception 'fresh_observation_required'; end if;
    if p_action='reopen' and not (r.status='closed' or (r.status='active' and r.expires_at<=now())) then raise exception 'invalid_transition'; end if;
    update reports set status='active',closure_reason=null,observed_at=v_time,observation_time_known=true,
      expires_at=v_time+make_interval(hours=>p_ttl),
      verification_status=case when p_action='confirm' then 'confirmed' else 'unconfirmed' end,
      verified_at=case when p_action='confirm' then now() else null end,
      verified_by=case when p_action='confirm' then p_actor else null end,
      verification_note=case when p_action='confirm' then p_reason else null end,
      public_verification_note=p_public_note,awareness_radius_override_m=p_radius,version=version+1 where id=p_report returning * into r;
  elsif p_action in ('hold','review') then
    if r.status='closed' then raise exception 'invalid_transition'; end if;
    update reports set status=case when p_action='hold' then 'held' else status end,
      verification_status='under_review',verified_at=null,verified_by=null,verification_note=null,
      public_verification_note=p_public_note,version=version+1 where id=p_report returning * into r;
  elsif p_action in ('resolve','refute','expire') then
    if r.status='closed' then raise exception 'invalid_transition'; end if;
    update reports set status='closed',closure_reason=case p_action when 'resolve' then 'resolved' when 'refute' then 'refuted' else 'expired' end,
      public_verification_note=p_public_note,version=version+1 where id=p_report returning * into r;
  else raise exception 'invalid_action'; end if;
  insert into moderation_events(report_id,actor,action,before_status,after_status,reason,report_version)
    values(p_report,p_actor,p_action,v_before,r.status,p_reason,r.version);
  if not r.is_demo then
    insert into notification_outbox(event_key,report_id,channel,payload)
      values(r.id||':update:'||r.version,r.id,'push',jsonb_build_object('version',r.version,'action',p_action)) on conflict do nothing;
  end if;
  return to_jsonb(r);
end $$;

create or replace function public.claim_outbox(p_channel text,p_limit integer default 10)
returns setof public.notification_outbox language plpgsql set search_path=public,pg_temp as $$
begin
  -- A crashed send may have reached the provider. Never retry blindly.
  update notification_outbox set state='unknown',last_error_code='lease_expired'
    where channel=p_channel and state='sending' and lease_until<now();
  return query update notification_outbox set state='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes'
    where id in (select id from notification_outbox where channel=p_channel and state in ('pending','retry') and next_attempt_at<=now()
      order by created_at for update skip locked limit p_limit) returning *;
end $$;

create or replace function public.claim_analysis(p_report uuid,p_user uuid)
returns boolean language plpgsql set search_path=public,pg_temp as $$
begin
  -- A user may have at most one active model request, across processes.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  if exists(select 1 from reports where author_id=p_user and analysis_lease_until>now()) then return false; end if;
  update reports set analysis_lease_until=now()+interval '60 seconds',ai_status='pending'
    where id=p_report and author_id=p_user and status='draft' and photo_path is not null and created_at>now()-interval '24 hours';
  return found;
end $$;

-- Restrict all new tables/RPCs to the backend. Authenticated anonymous users get no direct data access.
do $$ declare t text; begin
  foreach t in array array['user_roles','observations','observation_history','abuse_reports','moderation_events','notification_outbox','idempotency_keys','rate_limit_buckets'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant usage,select on all sequences in schema public to service_role;
revoke execute on function public.take_quota(text,uuid,text,integer,integer,integer),
  public.submit_report(uuid,uuid,jsonb,text,text,integer,boolean),public.save_observation(uuid,uuid,jsonb,boolean,boolean),
  public.report_abuse(uuid,uuid,text,text),public.cast_false_vote(uuid,uuid,text),
  public.moderate_report(uuid,uuid,text,text,text,integer,timestamptz,integer,integer),
  public.claim_outbox(text,integer),public.claim_analysis(uuid,uuid) from public,anon,authenticated;
grant execute on function public.take_quota(text,uuid,text,integer,integer,integer),
  public.submit_report(uuid,uuid,jsonb,text,text,integer,boolean),public.save_observation(uuid,uuid,jsonb,boolean,boolean),
  public.report_abuse(uuid,uuid,text,text),public.cast_false_vote(uuid,uuid,text),
  public.moderate_report(uuid,uuid,text,text,text,integer,timestamptz,integer,integer),
  public.claim_outbox(text,integer),public.claim_analysis(uuid,uuid) to service_role;
commit;
