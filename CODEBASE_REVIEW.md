# Codebase review — 2026-09-24

## Implementation status

The findings below are the original audit, preserved for context. The local
implementation now includes:

- Fixed asynchronous upload reset/cleanup, authorized audit RPC calls, scoped
  account/document queries, searchable paginated lists, and popup-safe downloads.
- Sequenced/cancellable profile requests, recoverable auth errors, shared auth
  validation, canonical Auth email display, and same-tab navigation updates.
- Versioned database migrations with controlled admin bootstrap, protected/synced
  profile email, trusted audit timestamps, and storage-path consistency checks.
- First-view-only readiness, accessible persistent loading, delayed hash navigation,
  and network timeouts. The existing colors, type, surfaces and buttons are retained.
- Extracted navigation/chat modules, shared portal operations, client-side social
  metadata, Vercel headers/report-only CSP, contact fallback and opt-in categorical
  error reporting.
- CI plus unit/integration, isolated SQL, and desktop/mobile browser regressions.
- Patched dependency lock and Vitest 4.1.11; npm audit reported zero advisories.

Local validation: ESLint and production build pass; 62 unit/integration tests pass;
all isolated database fixture/migration/security scripts pass; 10 Chromium desktop
and mobile browser tests pass. Portal screenshots were inspected for consistency
with the existing design. Browser portal requests use mocks, not production data.

See README.md and supabase/README.md for release instructions. These changes have
not been deployed and no remote migrations have been applied. Apply the hardening
migration before deploying the new document flow. Monitoring requires opt-in
environment configuration. Verify real Auth email delivery, Pipedrive submissions,
deployed headers and production storage separately. Full static prerendering and
a wholesale TypeScript/folder migration remain optional architectural projects;
the concrete fixes do not depend on them.

---

Scope: local React/Vite source, route and loading architecture, authentication,
portal CRUD, Supabase schema/policies, deployment configuration, tests, and static
asset/CSS inventory. No production database, deployed headers, real customer
accounts, or browser/mobile visual testing was performed. Application source was
not changed during this review. Existing loading-screen changes were included.

Validation: ESLint and production build pass; all 18 tests in four files pass.
Two runtime failure mechanisms were reproduced using the installed React and
Supabase packages, jsdom, and a mocked fetch; no external data was written.

## Current architecture

- React/Vite SPA, deployed to Vercel, with route-level lazy imports.
- Marketing content in data modules and page/section components.
- Portal routes load Supabase Auth and use database/storage RLS for authorization.
- Private document storage with short-lived signed URLs.
- Pipedrive's external embedded form handles lead submissions.
- Shared loading overlay with per-page readiness registrations; custom navigation,
  scroll, video, reveal, and chatbot behavior.

This is a reasonable architecture for the present product. A separate custom API
or wholesale framework rewrite is not justified by these findings. Keep RLS as
the authorization boundary while adding explicit query scoping for UI behavior.

## Prioritized findings

### 1. High: successful admin upload throws before displaying success

`src/pages/PortalAdminPage.jsx:92` calls `e.currentTarget.reset()` after awaiting
storage upload and the document insert. React has already cleared currentTarget.
The file and record may be saved, but reset throws and busy remains true.

Reproduction with installed React confirmed currentTarget becomes null after an
await while a saved form reference remains valid. Capture the form element at
handler entry and use try/catch/finally. Surface failed storage cleanup separately
so an orphan does not disappear into a generic record-insert error.

### 2. High: download audit writes never execute

`src/pages/PortalPage.jsx:71` constructs an insert query without awaiting or
consuming its thenable. Mock-fetch reproduction: zero requests before awaiting,
one request after awaiting. Execute the request and handle failures explicitly.

The insert policy at `supabase/schema.sql:157` checks only the caller's profile ID.
It does not validate document access, and clients can submit their own timestamp.
If this is intended as a trustworthy audit record, record authorized link issuance
in a trusted server/database operation using a server timestamp. Label it a link
request, not proof that the file was read. Ordinary browser telemetry cannot prove
a download happened.

### 3. High: documented first-admin setup conflicts with its trigger

`supabase/schema.sql:170` rejects role changes unless `is_admin()` is true.
The example at line 261 says to promote the first admin directly in the SQL editor.
For an ordinary SQL-editor session without an authenticated JWT, auth.uid() is null,
so is_admin() is false and this trigger rejects the update. RLS bypass does not
disable triggers. This is a static schema finding; it was not run against a live DB.

Provide a narrowly controlled bootstrap migration/procedure for trusted database
administration, document it, and test it from a clean database. Do not simply grant
role-editing rights to browser clients or exempt all unauthenticated callers.

### 4. High: loading blocks on noncritical assets

`src/hooks/usePageReady.js:99` sweeps every rendered image/video, including
off-screen lazy images. At line 147 it additionally fetches entire background
video files. The ceiling is 25 seconds. The bundled videos range from about
2.3 MB to 6.3 MB; this is a substantial dependency before content becomes usable.

The Specs playback video uses preload="metadata" (`src/pages/SpecsPage.jsx:623`),
but readiness waits for canplaythrough. A browser that fetches metadata only can
therefore hold the overlay until the safety ceiling.

Wait for first-screen content/posters and necessary route data; progressively load
the rest. Let decorative video buffering proceed independently. Abort obsolete
fetches and clear timers/listeners on cleanup. Use a stable empty array for the
default videoSrcs argument: the current default `[]` changes on every render for
callers that omit it, restarting the effect. Preserve one overlay across loading
stages, and test actual Suspense/auth/route transitions, not only keyed swaps.

### 5. Medium: authentication can commit stale profile results

`src/context/AuthProvider.jsx:19` commits profile responses without checking that
the active user/request still matches. Both getSession and onAuthStateChange load
profiles; an older response can overwrite a newer user's profile or a signed-out
state. The cancellation flag is not checked inside loadProfile after the query.
Loading also has no explicit failure state, and profile errors are discarded.

Use a synchronous auth subscription to update session state, then load the profile
in a user-ID-dependent effect with cancellation/request sequencing. Distinguish
missing profile, query failure, and pending state. Avoid redundant profile fetches
on token events when identity has not changed.

Do not describe all async auth callbacks as a proven deadlock in this installed
version: its source documents support for common reentry patterns. Slow callbacks
still delay event delivery, and the SDK documents a nested-refresh hazard.

### 6. Medium: unscoped account queries break admin presentation

`src/pages/PortalPage.jsx:44` and `PortalProfilePage.jsx:44` call maybeSingle on
all visible accounts. Admin RLS allows multiple accounts, so the query fails once
more than one exists; its error is ignored. The document query also returns all
customers' documents on a page labeled "Your documents" for admins.

Filter by profile.account_id for the personal account view and provide a separate
explicit admin-wide view. RLS remains mandatory; UI filtering expresses which
authorized records the screen should show. Refetch and clear old state when the
user or account changes; the current effects have empty dependencies. Add
pagination/search instead of unbounded account, people, and document lists.

### 7. Medium: sign-in email and profile email drift apart

`PortalSettingsPage.jsx:61` updates Auth email, but profile email is only populated
on signup in the supplied SQL. Settings, Profile, and admin People display the
copied profile value. After confirmation they can continue showing the old email.

Use the Auth user as the canonical current sign-in address. If profiles need an
email copy for admin lookup, synchronize it through a controlled database path
and restrict arbitrary client edits to that copy.

### 8. Medium: deployment header configuration is inconsistent

`vercel.json` contains only rewrites; intended custom security headers are in
`public/_headers`, not in Vercel's documented headers configuration. Actual
production response headers were not checked. Do not assume they are active.

The stored CSP is also stale: connect-src 'self' excludes Supabase and script-src
excludes the external Pipedrive loader; default-src excludes its frame. Copying
this policy into active configuration would break integrations. Define one
deployment-appropriate policy, inventory actual origins, trial it in report-only
mode, and verify deployed response headers and auth/forms before enforcement.

Reference: https://vercel.com/docs/project-configuration/vercel-json

### 9. Medium: important flows have no automated coverage

The four test files cover ErrorBoundary, RequireAuth, session hints, and loading
handoffs. They do not cover AuthProvider races, upload/download operations, email
changes, SQL bootstrap, or tenant isolation. The only repository workflow is a
Supabase keepalive; there is no checked-in lint/test/build CI workflow.

Add CI and targeted regression tests for the findings above. Add database tests
for anonymous/customer-A/customer-B/admin access to rows and storage. Browser
coverage should include sign-in, password recovery, actual Suspense handoffs,
mobile menus, downloads under latency, and navigation to unloaded hash sections.

### 10. Medium: accessibility and failure observability need follow-through

The loading overlay (`LoadingOverlay.jsx:66`) has an empty-alt image and no status
message. The background is not inert, so keyboard focus can reach controls behind
the visible overlay. Provide an accessible loading status and a deliberate focus
policy; verify reduced-motion behavior and keyboard navigation in a browser.

ErrorBoundary only logs to console; event-handler and async errors are not caught
by that render boundary. Add operational reporting with sensitive-data filtering,
plus explicit error/finally handling for asynchronous workflows. PipedriveForm has
no script-load error or timeout fallback; keep an accessible contact option when
the embed fails.

### 11. Medium: hash navigation is scheduled before lazy content is guaranteed

`src/App.jsx:76` tries the target once on the next animation frame, while the
destination route may still be downloading. `scrollCenter` returns when the target
does not exist. Coordinate hash scrolling with committed destination content and
its layout, with a bounded retry/cancellation policy. Verify on uncached navigation.

## Structure improvements

Refactor incrementally around product features:

```text
src/
  app/                  # router, app providers, global error boundary
  features/
    marketing/          # public pages and content
    auth/               # auth forms, session/profile lifecycle
    documents/          # document list, uploads, download operations
  shared/
    ui/                 # navigation, dialogs, loading overlay
    hooks/
    styles/             # tokens, base styles, shared primitives
  lib/                  # configured external clients
supabase/
  migrations/
  tests/
```

- Extract document/account operations from JSX into small service modules/hooks
  with consistent error handling and explicit query scope.
- Share validation and auth operations between AuthModal and full-page forms.
- Split Nav's 1,045 lines by desktop/mobile/account-menu behavior; similarly
  separate ChatWidget's 603 lines into conversation state and rendering. Line
  counts include comments, so size alone is not evidence of a bug.
- Introduce types first at database responses, document records, auth context,
  and async operations. Avoid a bulk TypeScript conversion before fixing defects.
- Replace the single manually applied schema file with versioned migrations and
  reproducible local database setup. Keep deployment changes reviewable.
- Update README: it describes a marketing-only site and omits portal setup,
  admin bootstrap, database migrations, tests, and operational recovery.
- Public pages currently share static HTML/social metadata; use prerendered
  public routes if route-specific previews/search landing pages are a requirement.
  Keep private portal content client-authenticated. A framework migration is not
  a prerequisite for the reliability work above.

## What did not warrant cleanup

A filename-reference sweep found no obvious unreferenced source assets or modules.
A PostCSS scan found no repeated exact rule selectors in the same media/state
context and no conflicting exact top-level selectors across stylesheets. These
checks do not prove every selector is reachable or rule out specificity/layout
bugs. No files should be deleted based on this review.

## Suggested delivery order

1. Upload crash, missing download logging, and admin bootstrap.
2. Auth request sequencing, account scoping, and canonical email handling.
3. Critical-only loading, hash navigation, and loading accessibility.
4. CI, tenant-isolation tests, deployment headers, and error reporting.
5. Feature-based refactoring, documentation, and public-page metadata improvements.

Remaining validation: live RLS/bucket configuration, deployed headers, responsive
and keyboard behavior, visual loading continuity, and dependency advisory audit.
