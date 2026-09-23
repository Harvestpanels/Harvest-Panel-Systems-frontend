import { useCallback, useEffect, useState } from "react";
import PortalShell from "../components/PortalShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

// Documents shared with the signed-in customer's account. Profile and
// sign-in settings are their own pages, reachable from the nav account menu.

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? mb.toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

const DATE = { year: "numeric", month: "short", day: "numeric" };

export default function PortalPage() {
  usePageMeta({
    title: "Your documents | Harvest Panel Systems",
    description: "Documents shared with your account.",
    path: "/portal",
    noindex: true,
  });
  const { profile } = useAuth();

  // ---- documents -----------------------------------------------------
  const [docs, setDocs] = useState(null);   // null = still loading
  const [company, setCompany] = useState("");
  const [docError, setDocError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // No .eq("account_id", ...) filter on purpose: the RLS policy already
      // restricts these to the caller's own account. Filtering here as well
      // would imply the security lives in the browser, which it does not.
      const [docsRes, acctRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, title, storage_path, size_bytes, uploaded_at")
          .order("uploaded_at", { ascending: false }),
        supabase.from("accounts").select("company_name").maybeSingle(),
      ]);

      if (cancelled) return;
      if (docsRes.error) setDocError(docsRes.error.message);
      setDocs(docsRes.data ?? []);
      setCompany(acctRes.data?.company_name ?? "");
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Files are never public. Each download mints a short-lived signed URL, so a
  // forwarded link expires instead of becoming a permanent public file.
  const openDoc = useCallback(async (doc) => {
    setDocError(null);
    const { data, error: err } = await supabase.storage
      .from("partner-docs")
      .createSignedUrl(doc.storage_path, 60);

    if (err || !data?.signedUrl) {
      setDocError("That file could not be opened. Please contact us and we will re-share it.");
      return;
    }

    // Best-effort audit row; a failure here must not block the download.
    supabase.from("downloads").insert({ document_id: doc.id, profile_id: profile.id });
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }, [profile]);

  return (
    <PortalShell ready={docs !== null}>
      <main className="hp-portal__main">
        {company && <p className="hp-portal__company hp-reveal">{company}</p>}
        <h1 className="hp-portal__title hp-reveal">Your documents</h1>
        <p className="hp-portal__hint hp-reveal">
          Shared with your account by the Harvest Panel Systems team.
        </p>

        {docError && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{docError}</p>}

        {/* Renders nothing until the fetch lands — the page-loader stays up for
            exactly that long, so there is no second loading state. */}
        {docs === null ? null : docs.length === 0 ? (
          <div className="hp-portal__empty hp-reveal">
            <p><strong>No documents yet</strong></p>
            <p>Once our team shares a document with your account it appears here.</p>
          </div>
        ) : (
          <ul className="hp-doc-list hp-reveal">
            {docs.map((doc) => (
              <li className="hp-doc" key={doc.id}>
                <span className="hp-doc__file" aria-hidden="true">
                  {(doc.title.split(".").pop() || "doc").slice(0, 4).toUpperCase()}
                </span>
                <span className="hp-doc__text">
                  <span className="hp-doc__name">{doc.title}</span>
                  <span className="hp-doc__meta">
                    {new Date(doc.uploaded_at).toLocaleDateString(undefined, DATE)}
                    {formatSize(doc.size_bytes) ? " · " + formatSize(doc.size_bytes) : ""}
                  </span>
                </span>
                <button type="button" className="hp-btn hp-btn--primary hp-doc__open" onClick={() => openDoc(doc)}>
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
