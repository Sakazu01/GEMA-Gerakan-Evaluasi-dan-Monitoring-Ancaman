begin;
create table public.telegram_responders (
  telegram_user_id bigint primary key, user_id uuid not null,
  label text not null check(char_length(label) between 1 and 100)
);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  endpoint text unique not null, keys jsonb not null, lat double precision not null check(lat between -90 and 90),
  lng double precision not null check(lng between -180 and 180), location_mode text not null check(location_mode in ('device','area')),
  location_updated_at timestamptz not null, accuracy_m double precision,
  enabled boolean not null default true, created_at timestamptz not null default now()
);
create table public.push_deliveries (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade, report_version integer not null,
  state text not null check(state in ('sending','sent','unknown','failed')), sent_at timestamptz,
  created_at timestamptz not null default now(), primary key(subscription_id,report_id,report_version)
);
create or replace function public.enqueue_report_update() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.status<>'draft' and not new.is_demo and (old.status is distinct from new.status or old.verification_status is distinct from new.verification_status) then
    insert into notification_outbox(event_key,report_id,channel,payload)
      values(new.id||':update:'||new.version,new.id,'push',jsonb_build_object('version',new.version)) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger report_push_updates after update on public.reports for each row execute function public.enqueue_report_update();

create or replace function public.accept_responder_report(p_report uuid,p_chat text,p_message bigint,p_actor uuid,p_label text)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype;
begin
  if not exists(select 1 from user_roles where user_id=p_actor and role='responder') then raise exception 'forbidden'; end if;
  select * into r from reports where id=p_report and not is_demo and status in ('active','held') for update;
  if not found then return jsonb_build_object('report',null,'changed',false); end if;
  -- An authorized callback itself can reconcile the known bot message after an ambiguous send.
  if r.telegram_message_id is null and exists(select 1 from notification_outbox where report_id=p_report and channel='telegram' and state='unknown') then
    update reports set telegram_chat_id=p_chat,telegram_message_id=p_message where id=p_report returning * into r;
    update notification_outbox set state='sent',remote_message_id=p_message::text,last_error_code=null where report_id=p_report and channel='telegram' and state='unknown';
  end if;
  if r.telegram_chat_id is distinct from p_chat or r.telegram_message_id is distinct from p_message then
    return jsonb_build_object('report',null,'changed',false);
  end if;
  if r.responder_status='ACCEPTED' then return jsonb_build_object('report',to_jsonb(r),'changed',false); end if;
  update reports set responder_status='ACCEPTED',accepted_at=now(),accepted_by=p_label,version=version+1 where id=p_report returning * into r;
  insert into moderation_events(report_id,actor,action,before_status,after_status,reason,report_version)
    values(p_report,p_actor,'accept',r.status,r.status,'Laporan diterima responder; belum menyatakan keberangkatan',r.version);
  return jsonb_build_object('report',to_jsonb(r),'changed',true);
end $$;

create or replace function public.expire_reports() returns integer language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype; v_count integer:=0;
begin
  for r in select * from reports where status='active' and expires_at<=now() for update skip locked loop
    update reports set status='closed',closure_reason='expired',version=version+1 where id=r.id;
    insert into moderation_events(report_id,action,before_status,after_status,reason,report_version)
      values(r.id,'expire','active','closed','Masa berlaku laporan berakhir',r.version+1);
    v_count:=v_count+1;
  end loop;
  update observations set lat=null,lng=null,accuracy_m=null where received_at<now()-interval '24 hours' and lat is not null;
  delete from rate_limit_buckets where window_start<now()-interval '2 days';
  delete from idempotency_keys where expires_at<now();
  return v_count;
end $$;

do $$ declare t text; begin
  foreach t in array array['telegram_responders','push_subscriptions','push_deliveries'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
revoke execute on function public.accept_responder_report(uuid,text,bigint,uuid,text),public.expire_reports(),public.enqueue_report_update() from public,anon,authenticated;
grant execute on function public.accept_responder_report(uuid,text,bigint,uuid,text),public.expire_reports() to service_role;
commit;
