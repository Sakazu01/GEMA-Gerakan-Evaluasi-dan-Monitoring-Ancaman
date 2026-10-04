begin;
do $$
declare
  report uuid:=gen_random_uuid(); author uuid:='bbbbbbbb-1000-4000-8000-000000000001';
  first_closed timestamptz; v_path text:='fixture/'||report||'.jpg';
begin
  if (select closed_at from reports where id='aaaaaaaa-1000-4000-8000-000000000001')>now()-interval '34 days' then
    raise exception 'known_closure_backfill_failed';
  end if;
  if (select closed_at from reports where id='aaaaaaaa-1000-4000-8000-000000000002')<now()-interval '5 minutes' then
    raise exception 'unknown_closure_guessed_from_publication';
  end if;
  insert into reports(id,author_id,status,is_demo,photo_path,observed_at,observation_time_known,expires_at,published_at,lat,lng,location_source,location_label)
    values(report,author,'active',true,v_path,now(),true,now()+interval '12 hours',now()-interval '40 days',-6.9,107.6,'map','Fixture retensi privat');
  update reports set status='closed',closure_reason='resolved' where id=report;
  select closed_at into first_closed from reports where id=report;
  if first_closed is null or first_closed<now()-interval '1 minute' then raise exception 'closure_time_missing'; end if;
  perform queue_media_cleanup();
  if (select photo_path from reports where id=report) is null or exists(select 1 from media_cleanup_jobs where media_cleanup_jobs.path=v_path) then
    raise exception 'newly_closed_old_publication_photo_removed_early';
  end if;
  if (select photo_path from reports where id='aaaaaaaa-1000-4000-8000-000000000002') is null then
    raise exception 'unknown_closure_photo_removed_early';
  end if;
  if (select photo_path from reports where id='aaaaaaaa-1000-4000-8000-000000000001') is not null then
    raise exception 'known_old_closure_not_cleaned';
  end if;
  update reports set status='active',closure_reason=null where id=report;
  if (select closed_at from reports where id=report) is not null then raise exception 'reopen_retains_old_closure'; end if;
  update reports set status='closed',closure_reason='resolved' where id=report;
  update reports set version=version+1 where id=report;
  if (select closed_at from reports where id=report) is distinct from first_closed then raise exception 'unrelated_update_changes_closure'; end if;
  -- Emulate a past server closure on this disposable fixture.
  update reports set closed_at=now()-interval '31 days' where id=report;
  select closed_at into first_closed from reports where id=report;
  update reports set status='closed',version=version+1 where id=report;
  if (select closed_at from reports where id=report) is distinct from first_closed then raise exception 'same_status_update_resets_retention'; end if;
  perform queue_media_cleanup();
  if (select photo_path from reports where id=report) is not null or not exists(select 1 from media_cleanup_jobs where media_cleanup_jobs.path=v_path) then
    raise exception 'closed_media_not_queued_after_full_retention';
  end if;
  if has_function_privilege('anon','public.record_report_closure()','execute') then raise exception 'closure_trigger_exposed'; end if;
  raise notice 'Closure retention acceptance tests passed';
end $$;
rollback;
