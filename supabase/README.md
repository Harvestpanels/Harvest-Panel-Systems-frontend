# Portal database

## Migration ownership and deployment

`migrations/20260924000100_baseline.sql` preserves the original schema byte for
byte, including its historical comments. Those setup instructions are superseded
by this document. `20260924000200_hardening.sql` is the forward security change.
Never replay the baseline after hardening: it reinstates the old audit policy and
profile guard. Migrations are one-time operations, not repeatable setup scripts.

Nothing here has been applied to a remote database. An operator must apply the
SQL to Supabase, using the trusted `postgres` database role (SQL editor or a direct
administrative database connection). The Auth and Storage schemas, API roles and
normal Supabase table grants must already exist. Create the **private**
`partner-docs` bucket in Supabase Storage. Never deploy test scaffolding.

- New project: apply baseline then hardening, in order. `schema.sql` is a psql
  include wrapper for these files, not SQL-editor-compatible standalone SQL.
  In the SQL editor execute the two migration files separately.
- Existing project using the old schema: back up and compare its actual schema
  and policies with the baseline; apply **only hardening**. If adopting Supabase
  CLI migration tracking, mark the verified baseline as already applied in that
  project's migration history before a push. Do not replay it over live data.
- Review any additional deployed RLS policies/grants; permissive policies combine
  with these policies and custom ones can weaken isolation.

## Controlled first administrator

Sign up normally, verify the intended user's UUID in Auth, then as `postgres`:

```sql
select public.bootstrap_first_admin('YOUR-AUTH-USER-UUID'::uuid);
```

Only `postgres` has execution permission and the invoker function also checks the
current database role. A missing JWT never grants administrative authority.
The function locks profile writes while checking that no admin exists; unknown
UUIDs and subsequent bootstrap calls fail. Browser admins cannot invoke it.
After bootstrap, existing portal admins can manage roles and account membership.
The trusted database administrator also retains direct role-repair ability; that
is an explicit database role privilege, not an `auth.uid() is null` exception.
Do not grant browser roles membership in `postgres` or ownership of these objects.

## Application contract

Await this exact call before requesting a signed URL:

```js
const { data: eventId, error } = await supabase.rpc('record_document_access', {
  document_id: doc.id,
})
```

On failure, block signing and offer retry. Remove direct `downloads` inserts:
API roles no longer have insert privileges or an insert policy. The RPC checks
current profile/account authorization, derives the profile ID from Auth, and
writes `clock_timestamp()` itself. It returns the audit row's bigint ID.
Admins may request any document; customers only their account's documents.

These are **authorized link requests**, not proof of link issuance, file transfer,
or reading. Signing may fail after logging and retries may create multiple rows.
The RPC does not mint a URL, verify object existence, or make storage and logging
atomic; a client can still invoke the authorized Storage API separately. Historical
rows retain their original, potentially client-supplied timestamps.

Auth is the canonical email. The migration backfills existing profiles and an
Auth email update trigger synchronizes the copy, including null transitions.
Pending email confirmation is not copied until `auth.users.email` changes.
Customers and portal admins cannot write a differing profile email. Application
email changes must use Auth, not a profile update.

## Existing storage paths

New/updated documents must use `<account_id>/<nonempty path>`, with no empty,
`.` or `..` segments. The check is `NOT VALID`, so old mismatches do not abort
migration and no objects are renamed automatically. Updates to invalid legacy
rows will fail until corrected. Find affected rows:

```sql
select id, account_id, storage_path from public.documents
where not (split_part(storage_path, '/', 1) = account_id::text
  and length(storage_path) > 37 and right(storage_path, 1) <> '/'
  and storage_path !~ '(^|/)[.]{1,2}(/|$)'
  and storage_path not like '%//%');
```

Review actual object ownership, move/copy affected files using the Storage API,
and update document paths only after confirming intended account ownership.
Existing storage policies authorize by account folder, so pre-existing misfiled
objects require prompt operator review. No cross-schema foreign key is introduced:
upload and document registration are separate operations. After remediation:

```sql
alter table public.documents validate constraint documents_storage_path_account_check;
```

## Executable local tests

Preferred prerequisites: Node.js 20+ and `@electric-sql/pglite` installed as a
frontend dev dependency by the parent change. Tested with PGlite **0.5.8**.
No package manifests or lockfiles are changed by this database change.
No Docker, psql, remote credentials, environment variables or running DB needed.
From `frontend`:

```sh
node supabase/tests/run-pglite.mjs
```

Alternatively pass an absolute path to an external PGlite `dist/index.js` as the
first argument. The runner creates a fresh in-memory database, prints PASS per
SQL file, throws/nonzero-exits on failure, and always closes the instance.

Alternative prerequisites: PostgreSQL 15+ server and its `psql` client, a fresh
**disposable** database, connection as superuser `postgres`, and permission to
create roles/schemas. Required roles `anon`, `authenticated`, `service_role` must
not already exist in that test cluster. From `frontend`:

```sh
psql -X -v ON_ERROR_STOP=1 -d YOUR_DISPOSABLE_DATABASE -f supabase/tests/run.psql
```

Scaffolding intentionally fails on pre-existing roles/schemas. Do not run against
a Supabase project. The fixture creates minimal Auth/Storage tables, `auth.uid()`,
folder parsing, API roles/grants and RLS only under `tests/`. The psql fixture and
migrations persist in the disposable database; security assertions roll back.

Both runners execute the same SQL: original baseline, legacy drift fixture,
hardening, upgrade assertions, and role-based security assertions. Tests cover
anonymous access, customer A/B row and storage isolation, admin access, escalation,
bootstrap rejection/success/repetition, email synchronization, client audit-write
rejection, authorized RPC timestamps, and storage-path enforcement. Assertions
run under actual `SET ROLE` API roles, not just a privileged DB owner.

Limitations: fixtures do not implement GoTrue confirmation, PostgREST transport,
Storage signing/HTTP transfers, or concurrent sessions. Validate those integrations
on a separate staging Supabase project before production deployment.

PostgreSQL role semantics reference:
https://www.postgresql.org/docs/17/functions-info.html
