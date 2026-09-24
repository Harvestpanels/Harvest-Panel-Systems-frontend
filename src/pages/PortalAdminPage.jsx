import { useEffect, useState } from "react";
import PortalShell from "../components/PortalShell";
import { PortalPagination, PortalSearch } from "../components/PortalListControls";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { listAdminRows, uploadDocument, moveProfile } from "../features/documents/api";
import AccountPicker from "../features/documents/AccountPicker";
import AdminDocumentList from "../features/documents/AdminDocumentList";
import { usePageMeta } from "../hooks/usePageMeta";

// Admin-only: upload a document and attach it to a customer account, review or
// delete what an account already has, and move
// a person onto an existing account when two colleagues sign up separately.
//
// Every write below is also gated by RLS (documents_admin_write,
// profiles_admin_write). Hiding this route from non-admins is a courtesy; the
// database is what actually refuses a non-admin who calls the API directly.
export default function PortalAdminPage() {
  usePageMeta({ title: "Admin | Harvest Panel Systems", description: "Portal administration.", path: "/portal/admin", noindex: true });
  const { profile } = useAuth();
  const [account, setAccount] = useState(null);
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Bumped after each upload so the account's document list refetches.
  const [docRevision, setDocRevision] = useState(0);
  const key = JSON.stringify([page, search, refreshKey]);
  const current = result?.key === key ? result : null;
  const people = current?.rows ?? [];

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      listAdminRows("profiles", page, search, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setResult({ key, ...data }); })
        .catch(() => { if (!controller.signal.aborted) setResult({ key, error: "People could not be loaded." }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, search, key]);

  async function handleUpload(e) {
    e.preventDefault();
    const element = e.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    setMsg(null);
    try {
      await uploadDocument({ file: form.get("file"), accountId: account?.id,
        title: String(form.get("title") || ""), profileId: profile.id });
      element.reset();
      // The account stays selected so the new file shows up in its list below.
      setDocRevision((n) => n + 1);
      setMsg({ type: "ok", text: "Uploaded and shared." });
    } catch (error) {
      setMsg({ type: "error", text: error.message || "Upload failed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function moveToAccount(profileId) {
    if (!account) return;
    setMoving(profileId);
    setMsg(null);
    try {
      await moveProfile(profileId, account.id);
      setMsg({ type: "ok", text: "Account updated." });
      setRefreshKey((n) => n + 1);
    } catch {
      setMsg({ type: "error", text: "The account could not be updated. Please try again." });
    } finally {
      setMoving(null);
    }
  }

  return (
    <PortalShell>
      <main className="hp-portal__main">
        <p className="hp-portal__company hp-reveal">Admin</p>
        <h1 className="hp-portal__title hp-reveal">Admin tools</h1>
        <p className="hp-portal__hint hp-reveal">
          Share documents and manage which account each person belongs to.
          {" "}<Link to="/portal">Back to your account</Link>.
        </p>

      {msg && (
        <p className={"hp-portal-msg hp-portal-msg--" + (msg.type === "ok" ? "ok" : "error")} role="alert">
          {msg.text}
        </p>
      )}

        <div className="hp-panels hp-panels--spaced">
        <section className="hp-panel hp-reveal">
          <h2>Share a document</h2>
          <p className="hp-panel__note">Upload a file and attach it to a customer account.</p>

          <form className="hp-portal-form hp-portal-form--dark" onSubmit={handleUpload}>
            <AccountPicker value={account} onChange={setAccount} />

            <label htmlFor="a-title">Document title</label>
            <input id="a-title" name="title" type="text" placeholder="Leave blank to use the file name" />

            <label htmlFor="a-file">File</label>
            <input id="a-file" name="file" type="file" required />

            <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>
              {busy ? "Uploading..." : "Upload and share"}
            </button>
          </form>
        </section>

        <section className="hp-panel hp-reveal">
          <h2>People</h2>
          <p className="hp-panel__note">
            Each signup creates its own account. Move colleagues onto one shared account so they
            see the same documents.
          </p>

          <PortalSearch id="people-search" label="Search people by email" placeholder="name@company.com" value={search} onChange={(v) => { setSearch(v); setPage(0); }} />
          <p className="hp-panel__note">Choose an account above, then move a person into it.</p>
          {!current && <p className="hp-panel__note" role="status">Loading people...</p>}
          {current?.error && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{current.error} <button type="button" className="hp-btn hp-btn--ghost" onClick={() => setRefreshKey((n) => n + 1)}>Try again</button></p>}
          {current?.rows && people.length === 0 && <p className="hp-portal__empty-note" role="status">No people match.</p>}
          <ul className="hp-people">
            {people.map((p) => (
              <li className="hp-person" key={p.id}>
                <span className="hp-person__text">
                  <span className="hp-person__name">
                    {p.full_name || p.email}
                    {p.role === "admin" && <span className="hp-badge hp-badge--admin">Admin</span>}
                  </span>
                  <span className="hp-person__email">{p.email}</span>
                </span>
                <button type="button" className="hp-btn hp-btn--ghost" disabled={!account || moving !== null || p.account_id === account.id} onClick={() => moveToAccount(p.id)}>
                  {moving === p.id ? "Moving..." : account ? "Move to " + account.company_name : "Select an account above"}
                </button>
              </li>
            ))}
          </ul>
          <PortalPagination label="People pages" page={page} hasMore={!!current?.hasMore} onPage={setPage} />
        </section>

        <section className="hp-panel hp-panel--wide hp-reveal">
          <h2>Account documents</h2>
          {account ? (
            <>
              <p className="hp-panel__note">Everything shared with {account.company_name}. Deleting removes it for everyone on the account.</p>
              <AdminDocumentList key={account.id} account={account} revision={docRevision} onMessage={setMsg} />
            </>
          ) : (
            <p className="hp-panel__note">Choose an account above to see and manage its documents.</p>
          )}
        </section>
      </div>
      </main>
    </PortalShell>
  );
}
