-- Apply as postgres, after the baseline. Never run the baseline again afterward.
begin;

-- Invoker is essential: a definer trigger would see its privileged owner.
create or replace function public.guard_profile_columns()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.account_id is distinct from old.account_id)
     and current_user <> 'postgres' and not public.is_admin() then
    raise exception 'role and account_id require an administrator' using errcode = '42501';
  end if;
  if new.id is distinct from old.id then
    raise exception 'profile identity is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.bootstrap_first_admin(profile_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'postgres' then
    raise exception 'database administrator required' using errcode = '42501';
  end if;
  lock table public.profiles in share row exclusive mode;
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'an administrator already exists' using errcode = '55000';
  end if;
  update public.profiles set role = 'admin' where id = profile_id;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.bootstrap_first_admin(uuid) from public, anon, authenticated, service_role;
grant execute on function public.bootstrap_first_admin(uuid) to postgres;

-- Auth owns the copied email, including inserts by portal administrators.
create function public.guard_profile_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from (select email from auth.users where id = new.id) then
    raise exception 'profile email must match Auth email' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard_profile_email before insert or update on public.profiles
for each row execute function public.guard_profile_email();

create function public.sync_auth_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;
create trigger on_auth_email_changed after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_auth_email();
update public.profiles p set email = u.email from auth.users u
where p.id = u.id and p.email is distinct from u.email;
revoke all on function public.guard_profile_email(), public.sync_auth_email() from public, anon, authenticated;

drop policy if exists downloads_insert_own on public.downloads;
revoke all on public.downloads from public, anon, authenticated;
grant select on public.downloads to authenticated;
revoke all on sequence public.downloads_id_seq from public, anon, authenticated;

create function public.record_document_access(document_id uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  event_id bigint;
begin
  if caller is null or not exists (
    select 1 from public.documents d join public.profiles p on p.id = caller
    where d.id = $1 and (p.role = 'admin' or p.account_id = d.account_id)
  ) then
    raise exception 'document access denied' using errcode = '42501';
  end if;
  insert into public.downloads(document_id, profile_id, downloaded_at)
  values ($1, caller, clock_timestamp()) returning id into event_id;
  return event_id;
end;
$$;
revoke all on function public.record_document_access(uuid) from public, anon, service_role;
grant execute on function public.record_document_access(uuid) to authenticated;
comment on table public.downloads is 'Authorized download-link requests; not proof of issuance, transfer or reading. Historical entries predate trusted RPC logging.';

-- Existing violations remain visible for operator remediation; new/updated rows
-- must comply immediately. Do not rewrite object names without moving the files.
alter table public.documents add constraint documents_storage_path_account_check
check (split_part(storage_path, '/', 1) = account_id::text
       and length(storage_path) > 37 and right(storage_path, 1) <> '/'
       and storage_path !~ '(^|/)[.]{1,2}(/|$)'
       and storage_path not like '%//%') not valid;
commit;
