-- Minimal contract fixture, not the Supabase Storage HTTP service.
create schema storage;
create table storage.buckets(id text primary key,name text not null,public boolean,file_size_limit bigint,allowed_mime_types text[]);
insert into storage.buckets values('report-photos','report-photos',true,null,null);
