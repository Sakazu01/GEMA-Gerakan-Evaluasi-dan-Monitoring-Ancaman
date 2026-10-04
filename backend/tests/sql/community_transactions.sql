-- Run only on a disposable local database after all migrations. Rolls back fixtures.
begin;
grant all on reports,false_votes,help_votes to service_role;
do $$
declare
  author uuid:='11111111-1111-4111-8111-111111111111';
  observer uuid:='22222222-2222-4222-8222-222222222222';
  moderator uuid:='33333333-3333-4333-8333-333333333333';
  report uuid:=gen_random_uuid(); old_draft uuid:=gen_random_uuid();
  payload jsonb; result jsonb; r reports%rowtype; n integer; i integer;
  other_report uuid; disputed_report uuid; sub uuid; job uuid;
begin
  insert into user_roles(user_id,role) values(moderator,'moderator'),(moderator,'responder');
  insert into reports(id,author_id,ai_status,ai_disaster_type,type,severity,ai_summary,photo_source,photo_path)
    values(report,author,'relevant','fire','fire','tinggi','Terlihat asap.','camera',author||'/test.jpg');
  payload:=jsonb_build_object('reported_type','fire','lat',-6.9,'lng',107.6,'location_source','device',
    'location_label','Lokasi uji','observation_time_known',true,'observed_at',now(),'photo_source','camera');
  result:=submit_report(author,report,payload,'key1','hash1',12,true,false);
  if result#>>'{report,status}'<>'active' or (result->>'already_published')::boolean then raise exception 'submit_failed'; end if;
  result:=submit_report(author,report,payload,'key1','hash1',12,true,false);
  if not (result->>'already_published')::boolean then raise exception 'idempotency_failed'; end if;
  select count(*) into n from notification_outbox where report_id=report and channel='telegram';
  if n<>1 then raise exception 'duplicate_outbox'; end if;
  begin
    perform submit_report(author,report,payload,'key1','different_hash',12,true,false);
    raise exception 'expected_conflict_missing';
  exception when raise_exception then if sqlerrm<>'idempotency_conflict' then raise; end if; end;
  perform save_observation(observer,report,jsonb_build_object('value','seen','source','direct','observed_at',now()),true);
  perform save_observation(observer,report,jsonb_build_object('value','seen','source','direct','observed_at',now()),true);
  select count(*) into n from observations where report_id=report;
  if n<>1 then raise exception 'observation_double_count'; end if;
  select * into r from reports where id=report;
  if r.verification_status<>'unconfirmed' then raise exception 'count_auto_confirmed'; end if;
  begin
    perform save_observation(author,report,jsonb_build_object('value','seen','source','direct','observed_at',now()),true);
    raise exception 'expected_owner_rejection_missing';
  exception when raise_exception then if sqlerrm<>'cannot_observe_own_report' then raise; end if; end;
  disputed_report:=gen_random_uuid();
  insert into reports(id,author_id,ai_status,ai_disaster_type,type,severity,ai_summary,photo_source,photo_path)
    values(disputed_report,author,'relevant','fire','fire','tinggi','Terlihat asap.','camera',author||'/disputed.jpg');
  perform submit_report(author,disputed_report,payload,'disputed','disputed_hash',12,false,false);
  for i in 1..2 loop
    perform save_observation(('55555555-5555-4555-8555-'||lpad(i::text,12,'0'))::uuid,disputed_report,
      jsonb_build_object('value','seen','source','direct','observed_at',now()),true);
  end loop;
  for i in 1..6 loop
    perform save_observation(('66666666-6666-4666-8666-'||lpad(i::text,12,'0'))::uuid,disputed_report,
      jsonb_build_object('value','not_observed','source','direct','observed_at',now(),'note','Tidak menemukan kejadian setelah memeriksa area.'),true);
  end loop;
  if (select status from reports where id=disputed_report)<>'held' then raise exception 'six_false_votes_did_not_hide'; end if;
  if (select public_verification_note from reports where id=disputed_report) not like 'Diragukan%' then raise exception 'community_dispute_note_missing'; end if;
  for i in 1..3 loop
    perform report_abuse(('44444444-4444-4444-8444-'||lpad(i::text,12,'0'))::uuid,report,'old_photo','Waktu foto perlu diperiksa.');
  end loop;
  select * into r from reports where id=report;
  if r.status<>'active' or r.verification_status<>'under_review' then raise exception 'auto_hide_or_review_missing'; end if;
  result:=moderate_report(moderator,report,'confirm','Pengelola memeriksa bukti langsung terbaru.','Dikonfirmasi pengelola.',r.version,null,null,12);
  select * into r from reports where id=report;
  if r.verification_status<>'confirmed' or r.verified_by<>moderator then raise exception 'confirmation_not_audited'; end if;
  perform report_abuse(observer,report,'other','Masih ada konteks yang perlu diperiksa.');
  if (select verification_status from reports where id=report)<>'confirmed' then raise exception 'complaint_revoked_confirmation'; end if;
  begin
    perform moderate_report(moderator,report,'refute','Alasan pengelola cukup panjang.',null,r.version-1,null,null,12);
    raise exception 'expected_version_conflict_missing';
  exception when raise_exception then if sqlerrm<>'version_conflict' then raise; end if; end;
  begin
    perform moderate_report(observer,report,'confirm','Alasan cukup panjang.',null,r.version,null,null,12);
    raise exception 'expected_role_rejection_missing';
  exception when raise_exception then if sqlerrm<>'forbidden' then raise; end if; end;
  update reports set telegram_chat_id='test',telegram_message_id=123 where id=report;
  result:=accept_responder_report(report,'test',123,moderator,'Responder uji');
  if not (result->>'changed')::boolean then raise exception 'accept_failed'; end if;
  result:=accept_responder_report(report,'test',123,moderator,'Responder uji');
  if (result->>'changed')::boolean then raise exception 'duplicate_accept'; end if;
  select * into r from reports where id=report;
  select count(*) into n from claim_outbox('telegram',10) where report_id=report;
  if n<>1 then raise exception 'claim_failed'; end if;
  if exists(select 1 from claim_outbox('telegram',10) where report_id=report) then raise exception 'duplicate_claim'; end if;
  update notification_outbox set lease_until=now()-interval '1 second' where report_id=report and channel='telegram';
  perform claim_outbox('telegram',10);
  if (select state from notification_outbox where report_id=report and channel='telegram')<>'unknown' then raise exception 'ambiguous_retry'; end if;
  result:=take_quota('test',author,'network',1,20,600);
  if not (result->>'allowed')::boolean then raise exception 'quota_first_denied'; end if;
  result:=take_quota('test',author,'network',1,20,600);
  if (result->>'allowed')::boolean then raise exception 'quota_not_persistent'; end if;
  -- Exact and perceptually similar evidence signals must not become a truth verdict.
  update reports set photo_sha256=repeat('a',64),photo_phash='abcdef0123456789' where id=report;
  other_report:=gen_random_uuid();
  insert into reports(id,author_id,ai_status,ai_disaster_type,type,severity,ai_summary,photo_sha256,photo_phash,photo_source,photo_path)
    values(other_report,observer,'relevant','fire','fire','tinggi','Indikasi visual.',repeat('a',64),'abcdef0123456788','camera',observer||'/duplicate.jpg');
  insert into report_matches(report_id,matched_report_id,match_method,score,hamming_distance)
    select other_report,matched_report_id,match_method,score,hamming_distance from find_photo_matches(other_report,3,5);
  result:=submit_report(observer,other_report,payload,'duplicate','duplicate_hash',12,false,false);
  if result#>>'{report,status}'<>'active' or not (result#>'{report,risk_flags}') ? 'photo_reused' then raise exception 'duplicate_evidence_missing'; end if;
  if result#>>'{report,closure_reason}' is not null then raise exception 'duplicate_auto_refuted'; end if;
  other_report:=gen_random_uuid();
  insert into reports(id,author_id,photo_path,photo_source) values(other_report,author,author||'/manual.jpg','camera');
  result:=submit_report(author,other_report,payload||'{"observation_time_known":false,"observed_at":null}','manual','manual_hash',12,false,false);
  if result#>>'{report,status}'<>'held' or result#>>'{report,observed_at}' is not null then raise exception 'manual_fabricated_time'; end if;
  other_report:=gen_random_uuid();
  insert into reports(id,author_id,created_at,photo_source,photo_path)
    values(other_report,author,now()-interval '25 hours','camera',author||'/expired-submit.jpg');
  begin
    perform submit_report(author,other_report,payload,'expired_draft','expired_hash',12,false,false);
    raise exception 'expected_draft_expiry_missing';
  exception when raise_exception then if sqlerrm<>'draft_expired' then raise; end if; end;
  perform save_push_subscription(author,jsonb_build_object('endpoint','https://fcm.googleapis.com/test','keys','{}'::jsonb,'lat',-6.9,'lng',107.6,'location_mode','area','location_updated_at',now()));
  begin
    perform save_push_subscription(observer,jsonb_build_object('endpoint','https://fcm.googleapis.com/test','keys','{}'::jsonb,'lat',-6.9,'lng',107.6,'location_mode','area','location_updated_at',now()));
    raise exception 'expected_subscription_owner_rejection_missing';
  exception when raise_exception then if sqlerrm<>'subscription_conflict' then raise; end if; end;
  select id into sub from push_subscriptions where endpoint='https://fcm.googleapis.com/test';
  if not claim_push_delivery(sub,report,r.version) or claim_push_delivery(sub,report,r.version) then raise exception 'push_duplicate_claim'; end if;
  update push_deliveries set state='unknown' where subscription_id=sub;
  if claim_push_delivery(sub,report,r.version) then raise exception 'push_blind_retry'; end if;
  insert into notification_outbox(event_key,report_id,channel,payload,state) values(report||':test_retry',report,'push',jsonb_build_object('version',r.version),'unknown') returning id into job;
  perform retry_notification(moderator,job);
  if not claim_push_delivery(sub,report,r.version) then raise exception 'explicit_push_retry_missing'; end if;
  update reports set expires_at=now()-interval '1 second' where id=report;
  result:=moderate_report(moderator,report,'reopen','Pemeriksaan baru pada kejadian yang kedaluwarsa.',null,r.version,now(),null,12);
  if result#>>'{report,status}'<>'active' then raise exception 'effective_expiry_reopen_failed'; end if;
  update reports set expires_at=now()-interval '1 second' where id=report;
  perform expire_reports();
  if (select closure_reason from reports where id=report)<>'expired' then raise exception 'expiry_failed'; end if;
  begin
    perform save_observation(observer,report,jsonb_build_object('value','seen','source','direct','observed_at',now()),true);
    raise exception 'expected_expired_rejection_missing';
  exception when raise_exception then if sqlerrm<>'report_not_active' then raise; end if; end;
  insert into reports(id,author_id,created_at,photo_path) values(old_draft,author,now()-interval '25 hours',author||'/expired.jpg');
  perform queue_media_cleanup();
  if exists(select 1 from reports where id=old_draft) or not exists(select 1 from media_cleanup_jobs where path=author||'/expired.jpg') then raise exception 'cleanup_not_atomic'; end if;
  if has_function_privilege('authenticated','public.submit_report(uuid,uuid,jsonb,text,text,integer,boolean,boolean)','execute') then raise exception 'public_rpc_exposed'; end if;
  if has_function_privilege('authenticated','public.cast_help_vote(uuid,uuid,text)','execute') then raise exception 'legacy_rpc_exposed'; end if;
  if has_table_privilege('service_role','public.moderation_events','update') then raise exception 'audit_mutable'; end if;
  if has_table_privilege('anon','public.observations','select') then raise exception 'observations_exposed'; end if;
  raise notice 'Community transaction acceptance tests passed';
end $$;
rollback;
