-- Detach expired media transactionally before deletion. Cleanup must not race submit/reopen.
begin;
create table public.media_cleanup_jobs (
  path text primary key, created_at timestamptz not null default now(), attempts integer not null default 0
);
alter table public.media_cleanup_jobs enable row level security;
revoke all on public.media_cleanup_jobs from anon,authenticated;
grant all on public.media_cleanup_jobs to service_role;

create or replace function public.queue_media_cleanup() returns integer language plpgsql set search_path=public,pg_temp as $$
declare r reports%rowtype; v_count integer:=0;
begin
  for r in select * from reports where
    (status='draft' and created_at<now()-interval '24 hours' and (analysis_lease_until is null or analysis_lease_until<now()))
    or (status='closed' and published_at<now()-interval '30 days' and photo_path is not null)
    for update skip locked loop
    if r.photo_path is not null then insert into media_cleanup_jobs(path) values(r.photo_path) on conflict do nothing; end if;
    if r.status='draft' then delete from reports where id=r.id;
    else update reports set photo_path=null where id=r.id; end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end $$;
revoke execute on function public.queue_media_cleanup() from public,anon,authenticated;
grant execute on function public.queue_media_cleanup() to service_role;
commit;
