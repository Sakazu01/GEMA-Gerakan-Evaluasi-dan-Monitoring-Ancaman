begin;
alter table public.push_deliveries add column if not exists attempts integer not null default 1;
alter table public.push_deliveries add column if not exists lease_until timestamptz;
alter table public.push_deliveries add column if not exists last_error_code text;
grant all on public.reports,public.false_votes,public.help_votes to service_role;
revoke update,delete,truncate on public.moderation_events from service_role;

create or replace function public.cast_help_vote(p_report_id uuid,p_voter_id uuid,p_value text)
returns table(seen_count bigint,not_seen_count bigint) language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype;
begin
  select * into r from reports where id=p_report_id for update;
  if not found then raise exception 'report_not_found'; end if;
  if r.is_demo or r.status<>'active' or r.expires_at<=now() then raise exception 'report_not_active'; end if;
  if r.author_id=p_voter_id then raise exception 'cannot_vote_own_report'; end if;
  insert into help_votes(report_id,voter_id,value) values(p_report_id,p_voter_id,p_value)
    on conflict(report_id,voter_id) do update set value=excluded.value,created_at=now();
  select count(*) filter(where value='seen'),count(*) filter(where value='not_seen') into seen_count,not_seen_count from help_votes where report_id=p_report_id;
  return next;
end $$;

create or replace function public.save_push_subscription(p_user uuid,p_payload jsonb)
returns boolean language plpgsql set search_path=public,pg_temp as $$
declare v_owner uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_payload->>'endpoint',1));
  select user_id into v_owner from push_subscriptions where endpoint=p_payload->>'endpoint' for update;
  if found and v_owner<>p_user then raise exception 'subscription_conflict'; end if;
  insert into push_subscriptions(user_id,endpoint,keys,lat,lng,location_mode,location_updated_at,accuracy_m,enabled)
    values(p_user,p_payload->>'endpoint',p_payload->'keys',(p_payload->>'lat')::float8,(p_payload->>'lng')::float8,
      p_payload->>'location_mode',(p_payload->>'location_updated_at')::timestamptz,(p_payload->>'accuracy_m')::float8,true)
    on conflict(endpoint) do update set keys=excluded.keys,lat=excluded.lat,lng=excluded.lng,
      location_mode=excluded.location_mode,location_updated_at=excluded.location_updated_at,accuracy_m=excluded.accuracy_m,enabled=true;
  return true;
end $$;

create or replace function public.claim_push_delivery(p_subscription uuid,p_report uuid,p_version integer)
returns boolean language plpgsql set search_path=public,pg_temp as $$
declare v_delivery push_deliveries%rowtype;
begin
  insert into push_deliveries(subscription_id,report_id,report_version,state,lease_until)
    values(p_subscription,p_report,p_version,'sending',now()+interval '2 minutes') on conflict do nothing;
  if found then return true; end if;
  select * into v_delivery from push_deliveries where subscription_id=p_subscription and report_id=p_report and report_version=p_version for update;
  if v_delivery.state='failed' then
    update push_deliveries set state='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes'
      where subscription_id=p_subscription and report_id=p_report and report_version=p_version;
    return true;
  end if;
  if v_delivery.state='sending' and v_delivery.lease_until<now() then
    update push_deliveries set state='unknown',last_error_code='lease_expired',lease_until=null
      where subscription_id=p_subscription and report_id=p_report and report_version=p_version;
  end if;
  return false;
end $$;

create or replace function public.retry_notification(p_actor uuid,p_job uuid)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare j notification_outbox%rowtype; r reports%rowtype;
begin
  if not exists(select 1 from user_roles where user_id=p_actor and role='moderator') then raise exception 'forbidden'; end if;
  select * into j from notification_outbox where id=p_job;
  if not found then raise exception 'outbox_conflict'; end if;
  select * into r from reports where id=j.report_id for update;
  select * into j from notification_outbox where id=p_job for update;
  if j.state not in ('unknown','failed') then raise exception 'outbox_conflict'; end if;
  if j.channel='push' and (j.payload->>'version')::integer is distinct from r.version then raise exception 'outbox_conflict'; end if;
  update notification_outbox set state='retry',attempts=0,next_attempt_at=now(),lease_until=null where id=j.id;
  if j.channel='push' then
    update push_deliveries set state='failed',lease_until=null where report_id=r.id and report_version=r.version and state in ('unknown','failed','sending');
  end if;
  insert into moderation_events(report_id,actor,action,before_status,after_status,reason,report_version)
    values(r.id,p_actor,'retry_outbox',r.status,r.status,'Pengelola meminta pengiriman ulang setelah meninjau risiko pesan ganda',r.version);
  return jsonb_build_object('queued',true);
end $$;

revoke execute on function public.save_push_subscription(uuid,jsonb),public.claim_push_delivery(uuid,uuid,integer),public.retry_notification(uuid,uuid),public.cast_help_vote(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.save_push_subscription(uuid,jsonb),public.claim_push_delivery(uuid,uuid,integer),public.retry_notification(uuid,uuid),public.cast_help_vote(uuid,uuid,text) to service_role;
commit;
