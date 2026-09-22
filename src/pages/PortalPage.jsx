import { useCallback, useEffect, useState } from "react";
import PortalShell from "../components/PortalShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? mb.toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

export default function PortalPage() {
  usePageMeta({
    title: "Your documents | Harvest Panel Systems",
    description: "Documents shared with your account.",
    path: "/portal",
  });
  const { profile } = useAuth();
  const [docs, setDocs] = useState(null);   // null = still loading
  const [company, setCompany] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // No .eq("account_id", ...) filter here on purpose: the RLS policy
      // already restricts this select to the caller's own account. Filtering
      // client-side as well would imply the security lives here, which it
      // does not — the database refuses other rows regardless.
      const [docsRes, acctRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, title, storage_path, size_bytes, uploaded_at")
          .order("uploaded_at", { ascending: false }),
        supabase.from("accounts").select("company_name").maybeSingle(),
      ]);

      if (cancelled) return;
      if (docsRes.error) setError(docsRes.error.message);
      setDocs(docsRes.data ?? []);
      setCompany(acctRes.data?.company_name ?? "");
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Files are never public. Each download mints a short-lived signed URL, so a
  // forwarded link stops working instead of becoming a permanent public file.
  const openDoc = useCallback(async (doc) => {
    setError(null);
    const { data, error: err } = await supabase.storage
      .from("partner-docs")
      .createSignedUrl(doc.storage_path, 60);

    if (err || !data?.signedUrl) {
      setError("That file could not be opened. Please contact us and we will re-share it.");
      return;
    }

    // Best-effort audit row; a failure here must not block the download.
    supabase.from("downloads").insert({ document_id: doc.id, profile_id: profile.id });
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }, [profile]);

  return (
    <PortalShell>
      <main className="hp-portal__main">
        {company && <p className="hp-portal__company">{company}</p>}
        <h1 className="hp-portal__title">Your documents</h1>
        <p className="hp-portal__hint">
          Shared with your account by the Harvest Panel Systems team.
        </p>

        {error && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{error}</p>}

        {docs === null ? (
          <p className="hp-portal__empty">Loading your documents...</p>
        ) : docs.length === 0 ? (
          <p className="hp-portal__empty">
            Nothing here yet. Once our team shares a document with your account it will
            appear on this page.
          </p>
        ) : (
          <ul className="hp-doc-list">
            {docs.map((doc) => (
              <li className="hp-doc" key={doc.id}>
                <span>
                  <span className="hp-doc__name">{doc.title}</span>
                  <span className="hp-doc__meta">
                    {new Date(doc.uploaded_at).toLocaleDateString()} {formatSize(doc.size_bytes)}
                  </span>
                </span>
                <button type="button" className="hp-btn hp-btn--primary" onClick={() => openDoc(doc)}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </PortalShell>
  );
}
