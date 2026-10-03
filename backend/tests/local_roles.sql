-- Disposable cluster only. Mirrors the backend role boundary, without Supabase credentials.
create role anon;
create role authenticated;
create role service_role bypassrls;
