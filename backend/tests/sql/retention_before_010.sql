-- Private, disposable fixtures for migration of existing closed reports.
insert into public.reports(id,author_id,status,closure_reason,is_demo,photo_path,created_at,published_at)
values
  ('aaaaaaaa-1000-4000-8000-000000000001','aaaaaaaa-1000-4000-8000-000000000003','closed','resolved',true,'fixture/known.jpg',now()-interval '40 days',now()-interval '40 days'),
  ('aaaaaaaa-1000-4000-8000-000000000002','aaaaaaaa-1000-4000-8000-000000000003','closed','resolved',true,'fixture/unknown.jpg',now()-interval '40 days',now()-interval '40 days');
insert into public.moderation_events(report_id,action,before_status,after_status,reason,report_version,created_at)
values('aaaaaaaa-1000-4000-8000-000000000001','resolve','active','closed','Penutupan historis diketahui untuk fixture privat.',1,now()-interval '35 days');
