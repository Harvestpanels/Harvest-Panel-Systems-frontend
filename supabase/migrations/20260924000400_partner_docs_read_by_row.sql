-- Apply as postgres, after 20260924000300. Idempotent; safe to re-run.
--
-- A customer may read a stored file only when a documents row for their own
-- account points at it. The old policy trusted the folder name alone, so any
-- object dropped under <account_id>/ (a stray upload, a file whose row was
-- deleted or moved to another account) stayed downloadable.
begin;

drop policy if exists partner_docs_read on storage.objects;
create policy partner_docs_read on storage.objects
  for select using (
    bucket_id = 'partner-docs'
    and (
      public.is_admin()
      or exists (
        select 1 from public.documents d
        where d.storage_path = storage.objects.name
          and d.account_id = public.my_account_id()
      )
    )
  );

commit;
