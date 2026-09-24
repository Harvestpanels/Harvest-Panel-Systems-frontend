-- Fail with an exception on any unexpected result. All test writes roll back.
begin;
create schema test;
grant usage on schema test to anon, authenticated;
create function test.assert(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
end;
$$;
create function test.denied(statement text, expected_state text default '42501') returns void
language plpgsql security invoker as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'FAIL: unexpectedly accepted %', statement;
end;
$$;
insert into auth.users(id,email,raw_user_meta_data) values
('00000000-0000-0000-0000-000000000001','a@test.invalid','{"role":"admin"}'),
('00000000-0000-0000-0000-000000000002','b@test.invalid','{}'),
('00000000-0000-0000-0000-000000000003','admin@test.invalid','{}');
select test.assert((select count(*) = 3 from public.profiles where role = 'customer'), 'signup ignores metadata role');
select test.denied($q$select public.bootstrap_first_admin('00000000-0000-0000-0000-000000000099')$q$, 'P0002');
set local role anon;
select test.assert((select count(*) = 0 from public.profiles), 'anon profiles');
select test.assert((select count(*) = 0 from public.documents), 'anon documents');
select test.denied($q$select public.bootstrap_first_admin('00000000-0000-0000-0000-000000000001')$q$);
select test.denied($q$select public.record_document_access('10000000-0000-0000-0000-000000000001')$q$);
reset role;
select public.bootstrap_first_admin('00000000-0000-0000-0000-000000000003');
select test.denied($q$select public.bootstrap_first_admin('00000000-0000-0000-0000-000000000001')$q$, '55000');
insert into public.documents(id,account_id,title,storage_path)
select ('10000000-0000-0000-0000-' || right(id::text,12))::uuid, account_id, email, account_id || '/file.pdf'
from public.profiles where role = 'customer';
insert into storage.objects(bucket_id,name) select 'partner-docs',storage_path from public.documents;
insert into storage.objects(bucket_id,name) select 'other-bucket',storage_path from public.documents;
set local role anon;
select test.assert((select count(*) = 0 from storage.objects), 'anon storage');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select test.assert((select count(*) = 1 from public.accounts), 'A account isolation');
select test.assert((select count(*) = 1 from public.profiles), 'A profile isolation');
select test.assert((select count(*) = 1 from public.documents), 'A document isolation');
select test.assert((select count(*) = 1 from storage.objects), 'A storage isolation');
select test.denied($q$update public.profiles set role = 'admin' where id = auth.uid()$q$);
select test.denied($q$update public.profiles set account_id = null where id = auth.uid()$q$);
select test.denied($q$update public.profiles set email = 'forged@test.invalid' where id = auth.uid()$q$);
select test.denied($q$select public.bootstrap_first_admin(auth.uid())$q$);
update public.profiles set full_name = 'Allowed edit' where id = auth.uid();
select public.record_document_access('10000000-0000-0000-0000-000000000001');
select test.assert((select count(*) = 1 from public.downloads where profile_id = auth.uid() and downloaded_at between transaction_timestamp() and clock_timestamp()), 'RPC identity and server timestamp');
select test.denied($q$select public.record_document_access('10000000-0000-0000-0000-000000000002')$q$);
select test.denied($q$select public.record_document_access('10000000-0000-0000-0000-000000000099')$q$);
select test.denied($q$insert into public.downloads(document_id,profile_id,downloaded_at) values ('10000000-0000-0000-0000-000000000001',auth.uid(),'2000-01-01')$q$);
select test.denied($q$insert into storage.objects(bucket_id,name) values ('partner-docs','forbidden.pdf')$q$);
with changed as (delete from storage.objects returning *) select test.assert(count(*) = 0, 'customer storage delete denied') from changed;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select test.assert((select count(*) = 1 from public.documents where id = '10000000-0000-0000-0000-000000000002'), 'B own document');
select test.assert((select count(*) = 1 from storage.objects), 'B storage isolation');
select test.assert((select count(*) = 0 from public.downloads), 'B audit isolation');
select test.denied($q$select public.record_document_access('10000000-0000-0000-0000-000000000001')$q$);
select public.record_document_access('10000000-0000-0000-0000-000000000002');
-- Null JWT under the browser role must not enable the DB-admin bypass.
select set_config('request.jwt.claim.sub','',true);
select test.denied($q$select public.bootstrap_first_admin('00000000-0000-0000-0000-000000000001')$q$);
select test.denied($q$select public.record_document_access('10000000-0000-0000-0000-000000000001')$q$);
reset role;
update auth.users set email = 'confirmed@test.invalid' where id = '00000000-0000-0000-0000-000000000001';
select test.assert((select email = 'confirmed@test.invalid' from public.profiles where id = '00000000-0000-0000-0000-000000000001'), 'Auth email synchronization');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select test.assert((select count(*) = 2 from public.documents), 'admin document visibility');
select test.assert((select count(*) = 2 from storage.objects), 'admin bucket isolation');
select test.assert((select count(*) = 2 from public.downloads), 'admin audit visibility');
select public.record_document_access('10000000-0000-0000-0000-000000000001');
select test.denied($q$update public.profiles set email = 'forged@test.invalid' where id = auth.uid()$q$);
select test.denied($q$select public.bootstrap_first_admin(auth.uid())$q$);
select test.denied($q$update public.documents set storage_path = 'wrong-account/file.pdf'$q$, '23514');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000002';
select test.assert((select role = 'admin' from public.profiles where id = '00000000-0000-0000-0000-000000000002'), 'admin can promote');
insert into storage.objects(bucket_id,name) values ('partner-docs','admin-upload.pdf');
select test.denied($q$insert into storage.objects(bucket_id,name) values ('other-bucket','admin-upload.pdf')$q$);
reset role;
set local role authenticated;
select test.denied($q$insert into public.downloads(document_id,profile_id) values ('10000000-0000-0000-0000-000000000001',auth.uid())$q$);
select test.denied($q$update public.documents set storage_path = account_id || '/file/'$q$, '23514');
select test.denied($q$update public.documents set storage_path = account_id || '/../file'$q$, '23514');
select test.denied($q$update storage.objects set bucket_id = 'other-bucket' where name = 'admin-upload.pdf'$q$);
reset role;
update auth.users set email = null where id = '00000000-0000-0000-0000-000000000001';
select test.assert((select email is null from public.profiles where id = '00000000-0000-0000-0000-000000000001'), 'null Auth email synchronization');
rollback;
