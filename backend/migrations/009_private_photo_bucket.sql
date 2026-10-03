begin;
-- Supabase owns storage.*. Plain PostgreSQL tests intentionally have no such schema.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    execute $storage$
      insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
      values('report-photos','report-photos',false,10485760,array['image/jpeg'])
      on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg']
    $storage$;
  end if;
end $$;
commit;
