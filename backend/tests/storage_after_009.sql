do $$ begin
  if not exists(select 1 from storage.buckets where id='report-photos' and public=false and file_size_limit=10485760 and allowed_mime_types=array['image/jpeg']) then
    raise exception 'photo_bucket_not_private';
  end if;
  raise notice 'Private storage migration contract passed';
end $$;
