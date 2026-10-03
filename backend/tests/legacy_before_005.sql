-- Disposable database only: run after 004, before 005.
insert into reports(id,author_id,status,type,severity,ai_summary,ai_reason,photo_path,lat,lng,location_source,location_label,published_at)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','active','fire','tinggi','Foto lama','Fixture','legacy.jpg',-6.9,107.6,'device','Legacy uji',now()),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','disputed_hidden','flood','sedang','Foto lama','Fixture','legacy2.jpg',-6.9,107.6,'map','Legacy pengaduan',now());
