-- ============================================================================
-- Customer portal — schema, security policies and signup wiring.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard > SQL Editor > New
-- query > paste > Run). It is written to be re-runnable: every object uses
-- "if not exists" or "create or replace", so running it again will not
-- destroy data.
--
-- The security model in one paragraph: the browser holds a publishable key
-- that grants nothing by itself. Every table below has Row Level Security
-- enabled, so Postgres decides which rows a signed-in user may read or write.
-- A mistake in the React code therefore cannot leak another customer's
-- documents — the database refuses the query regardless of what the frontend
-- asks for. That is why this key is safe in the browser and a Pipedrive API
-- token would not be.
-- ============================================================================


-- ============================ TABLES ========================================

-- One row per customer company. Kept separate from `profiles` so two people at
-- the same company (a purchasing manager and an engineer, say) can share one
-- set of documents. Adding this later would mean migrating live data, so it
-- exists from the start even though most accounts will have a single user.
create table if not exists public.accounts (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null,
  created_at    timestamptz not null default now()
);

-- One row per login, created automatically by the trigger at the bottom of
-- this file. `id` IS the Supabase auth user id, so there can never be a login
-- without a profile or a profile without a login.
--
-- `role` is deliberately not something a user can set: signup always writes
-- 'customer', and the guard trigger below rejects any attempt to change it
-- from the client. Promoting an admin happens here in the SQL editor.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  account_id  uuid references public.accounts(id) on delete set null,
  full_name   text,
  email       text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

-- A document belongs to an account, not to a person, so it stays visible if
-- the original contact leaves and a colleague takes over.
-- `storage_path` is the file's location in the private bucket, unique so the
-- same object cannot be registered twice.
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  title         text not null,
  storage_path  text not null unique,
  size_bytes    bigint,
  content_type  text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

-- Audit trail: who opened which document, and when. Useful as sales signal and
-- as a record if a customer asks what they were sent.
create table if not exists public.downloads (
  id             bigserial primary key,
  document_id    uuid not null references public.documents(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  downloaded_at  timestamptz not null default now()
);

create index if not exists documents_account_id_idx on public.documents (account_id);
create index if not exists profiles_account_id_idx  on public.profiles  (account_id);
create index if not exists downloads_document_idx   on public.downloads (document_id);


-- ======================= HELPER FUNCTIONS ===================================
-- Both are SECURITY DEFINER on purpose. A policy on `profiles` that itself
-- queries `profiles` would re-enter that same policy and fail with infinite
-- recursion; running these as the definer bypasses RLS *inside the function
-- only*, which is the standard Supabase pattern. Each is pinned to a fixed
-- search_path so it cannot be hijacked by a shadowing schema.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$fn$;

create or replace function public.my_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select account_id from public.profiles where id = auth.uid();
$fn$;


-- ===================== ROW LEVEL SECURITY ===================================
-- None of this is optional. With RLS enabled and no matching policy, Postgres
-- denies the request — deny by default, which is what we want.

alter table public.accounts  enable row level security;
alter table public.profiles  enable row level security;
alter table public.documents enable row level security;
alter table public.downloads enable row level security;

-- ---- accounts --------------------------------------------------------------
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
  for select using (id = public.my_account_id() or public.is_admin());

drop policy if exists accounts_admin_write on public.accounts;
create policy accounts_admin_write on public.accounts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- profiles --------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- A user may edit their own row; the guard trigger below is what stops them
-- touching `role` or `account_id`. A policy alone cannot express "these two
-- columns are off limits".
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- documents -------------------------------------------------------------
-- The whole point of the feature: you see your account's documents and nobody
-- else's. Admins see everything and are the only ones who can add or remove.
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (account_id = public.my_account_id() or public.is_admin());

drop policy if exists documents_admin_write on public.documents;
create policy documents_admin_write on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- downloads -------------------------------------------------------------
-- A user may log their own download and read their own history; admins read it
-- all. Nobody may update or delete an entry, so the trail is append-only.
drop policy if exists downloads_insert_own on public.downloads;
create policy downloads_insert_own on public.downloads
  for insert with check (profile_id = auth.uid());

drop policy if exists downloads_select on public.downloads;
create policy downloads_select on public.downloads
  for select using (profile_id = auth.uid() or public.is_admin());


-- ==================== PRIVILEGE-ESCALATION GUARD ============================
-- Without this, a signed-in customer could update their own profile row to
-- role='admin' (the update policy above permits editing your own row) and gain
-- access to every customer's documents. This rejects any change to `role` or
-- `account_id` unless an admin is making it.
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if (new.role is distinct from old.role
      or new.account_id is distinct from old.account_id)
     and not public.is_admin() then
    raise exception 'role and account_id may only be changed by an admin';
  end if;
  return new;
end;
$fn$;

drop trigger if exists guard_profile_columns on public.profiles;
create trigger guard_profile_columns
  before update on public.profiles
  for each row execute function public.guard_profile_columns();


-- ========================= SIGNUP WIRING ====================================
-- Runs whenever Supabase Auth creates a user. Signup is open, so each new
-- registration gets its OWN empty account: a stranger who signs up can never
-- land inside an existing customer's account, because only an admin can change
-- a profile's account_id (see the guard above). Granting real access is
-- therefore always a deliberate admin action — either upload documents to the
-- new account, or move the profile onto an existing one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  new_account_id uuid;
begin
  insert into public.accounts (company_name)
  values (coalesce(nullif(trim(new.raw_user_meta_data ->> 'company'), ''), 'Unassigned'))
  returning id into new_account_id;

  insert into public.profiles (id, account_id, full_name, email, role)
  values (
    new.id,
    new_account_id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email,
    'customer'          -- never taken from user input
  );

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ======================== STORAGE POLICIES ==================================
-- Create the bucket FIRST in the dashboard: Storage > New bucket, name it
-- "partner-docs", and leave "Public bucket" OFF. A public bucket serves every
-- file to anyone holding the URL, which would make everything above pointless.
--
-- Files are stored as:  <account_id>/<filename>
-- so the first path segment names the owning account, which is what these
-- policies check. The app downloads via short-lived signed URLs, so a
-- forwarded link expires instead of becoming a permanent public file.

drop policy if exists partner_docs_read on storage.objects;
create policy partner_docs_read on storage.objects
  for select using (
    bucket_id = 'partner-docs'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.my_account_id()::text
    )
  );

drop policy if exists partner_docs_admin_write on storage.objects;
create policy partner_docs_admin_write on storage.objects
  for all using (bucket_id = 'partner-docs' and public.is_admin())
  with check (bucket_id = 'partner-docs' and public.is_admin());


-- ===================== MAKE YOURSELF AN ADMIN ===============================
-- Sign up through the site first, then run this once with your own email.
-- There is deliberately no way to do this from the app.
--
--   update public.profiles set role = 'admin'
--   where email = 'you@harvestpanels.com';
