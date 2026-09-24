-- Simulate a deployed baseline with drift and a legacy path mismatch.
insert into auth.users(id,email) values ('ffffffff-ffff-ffff-ffff-ffffffffffff','canonical@test.invalid');
update public.profiles set email = 'stale@test.invalid' where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
insert into public.documents(account_id,title,storage_path)
select account_id, 'Legacy', 'legacy/file.pdf' from public.profiles where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
