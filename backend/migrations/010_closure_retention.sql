-- Keep closed evidence for 30 days after closure, independent of publication age.
begin;
alter table public.reports add column if not exists closed_at timestamptz;
-- Use a recorded closure when available. Unknown legacy dates start a conservative
-- retention window now; publication time is not treated as a closure timestamp.
update public.reports r set closed_at=coalesce(
  (select max(e.created_at) from public.moderation_events e
    where e.report_id=r.id and e.after_status='closed' and e.action in ('resolve','refute','expire')),
  now()) where r.status='closed' and r.closed_at is null;

create or replace function public.record_report_closure() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  if new.status<>'closed' then
    new.closed_at:=null;
  elsif tg_op='INSERT' then
    new.closed_at:=now();
  elsif old.status is distinct from 'closed' then
    new.closed_at:=now();
  else
    new.closed_at:=old.closed_at;
  end if;
  return new;
end $$;
create trigger report_closure_time before insert or update of status on public.reports
  for each row execute function public.record_report_closure();
alter table public.reports add constraint reports_closure_time_check check(
  (status='closed' and closed_at is not null) or (status<>'closed' and closed_at is null));
create index reports_closed_media_idx on public.reports(closed_at)
  where status='closed' and photo_path is not null;

create or replace function public.queue_media_cleanup() returns integer
language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype; v_count integer:=0;
begin
  for r in select * from reports where
    (status='draft' and created_at<now()-interval '24 hours' and (analysis_lease_until is null or analysis_lease_until<now()))
    or (status='closed' and closed_at<now()-interval '30 days' and photo_path is not null)
    for update skip locked loop
    if r.photo_path is not null then
      insert into media_cleanup_jobs(path) values(r.photo_path) on conflict do nothing;
    end if;
    if r.status='draft' then delete from reports where id=r.id;
    else update reports set photo_path=null where id=r.id; end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end $$;
revoke execute on function public.record_report_closure(),public.queue_media_cleanup() from public,anon,authenticated;
grant execute on function public.queue_media_cleanup() to service_role;
commit;
