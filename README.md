# Harvest Panel Systems

React 19 / Vite marketing site and authenticated Supabase customer/admin portal.
Pipedrive handles contact submissions; private document access is governed by
Supabase row-level security and storage policies.

## Local setup

Use Node.js 22.12 or newer and npm. Run these commands from this directory (the Git repository
root, named frontend in the parent workspace):

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Fill in the Supabase URL and publishable key. Never use a service-role key in a
VITE_ variable: Vite embeds those values in public JavaScript. Without valid
Supabase configuration, marketing pages can run but portal authentication cannot.

```sh
npm run lint
npm test
npm run build
npm run preview
```

On Windows PowerShell with restricted script execution, use npm.cmd. CI runs
install, lint, all Vitest tests, and the production build on Node 22 with no
production secrets. CI also runs browser and isolated database regressions.

## Supabase setup and database validation

Follow [supabase/README.md](supabase/README.md) for the authoritative migration,
bootstrap, storage, and test instructions. New databases apply baseline then
hardening; existing baseline databases apply only hardening after backup/review.
schema.sql is now a psql include wrapper, not standalone SQL-editor input.
Never deploy test scaffolding. Create the private partner-docs storage bucket.

After signup, verify the intended Auth UUID and use the trusted postgres role:

```sql
select public.bootstrap_first_admin('YOUR-AUTH-USER-UUID'::uuid);
```

Configure Auth Site URL and explicit trusted redirect URLs, including /portal/reset
for password recovery. Verify email delivery and confirmation before invitations.

Database tests use a fresh disposable PostgreSQL 15+ database with postgres
superuser and no pre-existing anon/authenticated/service_role roles:

```sh
psql -X -v ON_ERROR_STOP=1 -d YOUR_DISPOSABLE_DATABASE -f supabase/tests/run.psql
```

CI supplies a fresh PostgreSQL 17 service for this command, separate from frontend
unit tests. Never point this fixture at a Supabase project. Run the in-memory database tests locally with `npm run test:db`; PGlite is included as a dev dependency. It runs entirely locally without Docker or a database connection.

The SQL suite covers bootstrap, legacy upgrades, anonymous/customer A/customer B/
admin row and storage isolation, role escalation, email synchronization, authorized
link-request audit timestamps, and path enforcement. These are link requests, not
proof of signing or completed downloads. Fixtures do not test live Supabase Auth,
PostgREST, signing, HTTP transfers, or concurrency; staging validation remains a
release gate.

## Deployment and headers

Vercel project root must be this directory, with the Vite preset, npm run build,
and dist output. Set the public Supabase environment variables separately for
Preview/Production and rebuild after changes. No paid monitoring service is required.

vercel.json is the sole header configuration; the obsolete public/_headers was
removed. The SPA rewrite excludes /api and /api/* so the client-error function
and unknown API paths cannot become index.html. Headers use Vercel's documented
configuration: https://vercel.com/docs/project-configuration/vercel-json .

CSP is report-only. It permits Supabase HTTPS/WebSocket endpoints, Pipedrive scripts
and frames, Google Fonts, Vercel Analytics, same-origin assets, and existing inline
styles/scripts. Narrow the Supabase wildcard to the actual project when known;
custom Supabase domains need explicit entries. Inline scripts include the existing
structured metadata. Cross-origin Pipedrive iframe contents have their own policy.
No CSP report receiver is configured: browser diagnostics are used during rollout,
so URLs/tokens in CSP reports are not uploaded to the category-only endpoint.

Before enforcing CSP, inspect response headers on a preview and verify login,
recovery, private signed downloads, contact form, fonts, and analytics. Check a
nested SPA URL renders, GET /api/client-error returns 405, and /api/nonexistent is
404 rather than HTML. Local Vite dev/preview does not run Vercel functions or prove
Vercel routing/header behavior. These deployed checks remain manual remote steps.

## Privacy-limited operational reporting

Reporting is opt-in on both sides:

- Build-time VITE_ERROR_REPORTING_ENABLED=true enables production browser reports.
- Server-only CLIENT_ERROR_LOGGING_ENABLED=true enables Vercel category logs.
- Server-only CLIENT_ERROR_ALLOWED_ORIGINS lists exact comma-separated HTTPS origins
  without trailing slashes. Add specific approved preview origins if needed.

The browser posts only {"code":"render_error"} or another fixed category to
/api/client-error with credentials omitted and referrer disabled. It sends no
message, stack, route, query, token, email, document name, or form input. Categories
cover render errors, uncaught errors, unhandled rejections, handled portal/auth network errors, and Pipedrive load/timeout
failures. Each category is sent at most once per page lifetime with no retries.
Explicitly handled async failures still need user-facing recovery at their call sites.

The endpoint validates POST, configured Origin, JSON media type, 128-byte body limit
(including streamed bodies), exact fields, and allowed codes. It logs only a fixed
event name and category. View these in Vercel runtime logs under client_error.
Platform access logs may independently retain request/IP metadata; this code does
not control provider retention. Origin validation is not authentication against
non-browser clients, and client deduplication is not a global abuse rate limit.
Keep collection disabled if it is not needed; use the server flag to stop collection
without rebuilding. Client changes need a rebuild. No paid service or alerting
integration was selected; category logs are best-effort, not durable incident storage.

Pipedrive always displays a mailto alternative without importing the asset-heavy
site data module. Script errors and a 15-second frame-load timeout show an accessible
status message. A frame load cannot prove the third-party form is usable, so the
email link remains available even after load.

## Recovery and outstanding release work

For a bad deployment, restore the last known-good Vercel deployment and investigate
category logs. For auth/storage failures, check environment values, Auth redirects,
and policies in a nonproduction project before changes. Do not expose a bucket or
service key to work around an authorization failure. Database recovery needs a
reviewed backup/migration plan; frontend rollback does not roll back data.

Remaining remote steps: apply the reviewed migrations to your target Supabase project;
configure Vercel environment/origins and Supabase Auth/storage; verify deployed
headers/API routing; exercise real email recovery, Pipedrive submission, document
flows, mobile/keyboard behavior, reduced motion, and loading transitions; review
deployment-specific behavior. CI is local-source coverage, not evidence those remote checks passed.

## Browser regression tests

Run `npx playwright install chromium firefox webkit`, then `npm run test:e2e`. Tests launch a
local Vite server at port 4173 with a fake Supabase project and intercept all portal
requests. No production credentials or accounts are used. Desktop and mobile
Chromium tests exercise sign-in, scoped documents, audited links, uploads, delayed
hash navigation, public routes, responsive widths, and existing theme tokens.
The responsive suite also runs in Firefox and mobile WebKit at 320, 390, 667,
768, 1024, and 1440 CSS pixels, including short landscape windows. It covers
menu scrolling/resizing, chat, gallery keyboard controls, dialog layering,
portal panel bounds, and reduced motion. Run just this suite with
`npm run test:e2e -- e2e/responsive.spec.js --workers=3`.
Screenshots and failing traces are saved under ignored `test-results/`.
These tests do not replace real email-delivery or deployed Storage checks.
Browser emulation does not certify every physical device, virtual keyboard,
browser version, GPU, or assistive technology.

## Code organization

Routes stay in src/pages, with data operations and shared auth validation under
src/features/documents and src/features/auth. Navigation dropdowns live under
src/components/navigation; chat presentation/helpers under src/features/chat.
Shared styles retain the existing design tokens and component classes. Public
metadata updates are client-side; prerendering public pages remains an optional
SEO project rather than a requirement for these portal fixes.

## Release order

1. Back up/review the target database and apply its missing migrations following
   supabase/README.md. Verify the record_document_access RPC and private bucket.
2. Deploy the frontend with matching Supabase public configuration. Downloads now
   require the new authorized audit RPC, so migrate before deploying this build.
3. Configure opt-in error reporting if desired; verify deployed headers, real
   email recovery, document access, and Pipedrive submissions.

The local dependency lock was updated to patched compatible releases and Vitest
4.1.11. Run `npm audit` periodically; advisory results change over time.
