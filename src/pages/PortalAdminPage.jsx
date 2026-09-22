import { useEffect, useState } from "react";
import PortalShell from "../components/PortalShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

// Admin-only: upload a document and attach it to a customer account, and move
// a person onto an existing account when two colleagues sign up separately.
//
// Every write below is also gated by RLS (documents_admin_write,
// profiles_admin_write). Hiding this route from non-admins is a courtesy; the
// database is what actually refuses a non-admin who calls the API directly.
export default function PortalAdminPage() {
  usePageMeta({ title: "Admin | Harvest Panel Systems", description: "Portal administration.", path: "/portal/admin" });
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [people, setPeople] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Bumped by handlers to re-read the lists after a change, instead of
  // calling a setState-ing function straight from the effect body.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [a, p] = await Promise.all([
        supabase.from("accounts").select("id, company_name").order("company_name"),
        supabase.from("profiles").select("id, email, full_name, account_id, role").order("created_at"),
      ]);
      if (cancelled) return;
      setAccounts(a.data ?? []);
      setPeople(p.data ?? []);
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  async function handleUpload(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    const accountId = String(form.get("account_id"));
    const title = String(form.get("title")).trim() || file.name;

    if (!file || !file.size) { setMsg({ type: "error", text: "Choose a file first." }); return; }
    if (!accountId) { setMsg({ type: "error", text: "Choose which customer this is for." }); return; }

    setBusy(true);
    setMsg(null);

    // Path shape matters: the storage policy reads the FIRST path segment as
    // the owning account id, so this is what makes the file visible to that
    // customer and invisible to everyone else. Date-prefixed so re-uploading
    // the same filename does not collide.
    const safeName = file.name.replace(/[^\w.-]+/g, "_");
    const path = accountId + "/" + Date.now() + "-" + safeName;

    const up = await supabase.storage.from("partner-docs").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (up.error) {
      setMsg({ type: "error", text: "Upload failed: " + up.error.message });
      setBusy(false);
      return;
    }

    const row = await supabase.from("documents").insert({
      account_id: accountId,
      title,
      storage_path: path,
      size_bytes: file.size,
      content_type: file.type || null,
      uploaded_by: profile.id,
    });

    if (row.error) {
      // The object is already in storage; without its row nobody can see it.
      // Remove it so we do not leave an orphan consuming the storage quota.
      await supabase.storage.from("partner-docs").remove([path]);
      setMsg({ type: "error", text: "Could not save the document record: " + row.error.message });
      setBusy(false);
      return;
    }

    e.currentTarget.reset();
    setMsg({ type: "ok", text: "Uploaded and shared." });
    setBusy(false);
  }

  async function moveToAccount(profileId, accountId) {
    setMsg(null);
    const { error } = await supabase.from("profiles").update({ account_id: accountId }).eq("id", profileId);
    if (error) { setMsg({ type: "error", text: error.message }); return; }
    setMsg({ type: "ok", text: "Account updated." });
    setRefreshKey((n) => n + 1);
  }

  return (
    <PortalShell>
      <main className="hp-portal__main">
        <p className="hp-portal__company">Admin</p>
        <h1 className="hp-portal__title">Share a document</h1>
        <p className="hp-portal__hint">Upload a file and attach it to a customer account.</p>

        {msg && (
          <p className={"hp-portal-msg hp-portal-msg--" + (msg.type === "ok" ? "ok" : "error")} role="alert">
            {msg.text}
          </p>
        )}

        <form className="hp-portal-form hp-portal-form--admin" onSubmit={handleUpload}>
          <label htmlFor="a-account">Customer account</label>
          <select id="a-account" name="account_id" required defaultValue="">
            <option value="" disabled>Choose an account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.company_name}</option>
            ))}
          </select>

          <label htmlFor="a-title">Document title</label>
          <input id="a-title" name="title" type="text" placeholder="Leave blank to use the file name" />

          <label htmlFor="a-file">File</label>
          <input id="a-file" name="file" type="file" required />

          <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>
            {busy ? "Uploading..." : "Upload and share"}
          </button>
        </form>

        <h2 className="hp-portal__subtitle">People</h2>
        <p className="hp-portal__hint">
          Each signup creates its own account. Move colleagues onto one shared account so
          they see the same documents.
        </p>

        <ul className="hp-doc-list">
          {people.map((p) => (
            <li className="hp-doc" key={p.id}>
              <span>
                <span className="hp-doc__name">{p.full_name || p.email}</span>
                <span className="hp-doc__meta">{p.email} {p.role === "admin" ? "- admin" : ""}</span>
              </span>
              <select
                aria-label={"Account for " + p.email}
                value={p.account_id || ""}
                onChange={(e) => moveToAccount(p.id, e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.company_name}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </main>
    </PortalShell>
  );
}
