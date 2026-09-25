-- Apply as postgres. Idempotent; safe to run whether or not
-- 20260924000200_hardening.sql was applied.
--
-- Opening a document calls public.record_document_access() before signing the
-- file URL (see getDocumentLink in src/features/documents/api.js). The function
-- was created by the hardening migration with a plain `create function`; on a
-- database where that migration never ran, every "Open" failed with "That file
-- could not be opened". This recreates exactly that function and its grants.
begin;

-- Download log is written only through the function below, never directly.
drop policy if exists downloads_insert_own on public.downloads;
revoke all on public.downloads from public, anon, authenticated;
grant select on public.downloads to authenticated;
revoke all on sequence public.downloads_id_seq from public, anon, authenticated;

create or replace function public.record_document_access(document_id uuid)
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

commit;
