-- TEST ONLY. Fresh disposable PostgreSQL database, connected as postgres.
-- Deliberately fail rather than replace any existing auth/storage installation.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$
  select (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'), 1)-1];
$$;
grant usage on schema public, auth, storage to anon, authenticated;
grant execute on function auth.uid(), storage.foldername(text) to anon, authenticated;
grant all on storage.objects to anon, authenticated;
-- Mimic permissive Supabase API grants so RLS, not missing grants, is tested.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
