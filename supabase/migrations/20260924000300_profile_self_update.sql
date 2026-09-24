-- Apply as postgres, after the hardening migration.
--
-- Idempotent on purpose: every statement here can be re-run safely
-- (create or replace / drop ... if exists). 20260924000200_hardening.sql is
-- NOT re-runnable (plain `create function`, `create trigger`, `add constraint`)
-- and has already been applied, so never run it again; later migrations follow
-- this file's pattern instead.
begin;

-- Customers may change exactly one column on their own row: full_name.
-- role/account_id need an administrator (as before); id and created_at are
-- immutable for everyone except the database owner; email is owned by Auth and
-- only ever written by sync_auth_email (security definer, so it runs as the
-- owner) and checked by guard_profile_email.
create or replace function public.guard_profile_columns()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile identity is immutable' using errcode = '42501';
  end if;
  if current_user = 'postgres' then
    return new;
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'created_at is immutable' using errcode = '42501';
  end if;
  if (new.role is distinct from old.role or new.account_id is distinct from old.account_id)
     and not public.is_admin() then
    raise exception 'role and account_id require an administrator' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_columns on public.profiles;
create trigger guard_profile_columns
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- Column privileges as a second layer: the API roles can update full_name and
-- nothing else. Admin moves (account_id) go through profiles_admin_write, so
-- authenticated keeps account_id too; the trigger above still requires admin.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, account_id) on public.profiles to authenticated;

-- Names are trimmed and 1-120 characters (null = not given at signup).
-- NOT VALID: enforced for every new or updated row immediately, without
-- failing on any legacy row. Validate later — see 20260924000500.
alter table public.profiles drop constraint if exists profiles_full_name_check;
alter table public.profiles add constraint profiles_full_name_check
  check (full_name is null
         or (full_name = btrim(full_name) and char_length(full_name) between 1 and 120))
  not valid;

commit;
