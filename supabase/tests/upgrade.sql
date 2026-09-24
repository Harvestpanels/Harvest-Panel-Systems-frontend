do $$
begin
  if not exists (select 1 from public.profiles where email = 'canonical@test.invalid') then
    raise exception 'FAIL: email backfill';
  end if;
  if not exists (select 1 from public.documents where storage_path = 'legacy/file.pdf') then
    raise exception 'FAIL: migration changed legacy path';
  end if;
  if (select convalidated from pg_constraint where conname = 'documents_storage_path_account_check') then
    raise exception 'FAIL: legacy constraint unexpectedly validated';
  end if;
end;
$$;
delete from public.accounts where id = (select account_id from public.profiles where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff');
delete from auth.users where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
