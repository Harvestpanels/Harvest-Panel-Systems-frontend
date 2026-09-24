import { useState } from "react";
import PortalShell from "../components/PortalShell";
import { PortalPagination, PortalSearch } from "../components/PortalListControls";
import { useAuth } from "../hooks/useAuth";
import { getDocumentLink } from "../features/documents/api";
import { useAccountDocuments } from "../features/documents/useAccountDocuments";
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

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [docError, setDocError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [opening, setOpening] = useState(null);
  const result = useAccountDocuments(profile?.account_id, page, search, revision);
  const docs = result?.documents ?? null;
  const company = result?.company ?? "";
  if (result && !hasLoaded) setHasLoaded(true);

  async function openDoc(doc) {
    // Reserve a tab during the user gesture, before awaiting the signed URL.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setOpening(doc.id);
    setDocError(null);
    try {
      const url = await getDocumentLink(doc);
      if (tab) tab.location.replace(url);
      else window.location.assign(url);
    } catch {
      tab?.close();
      setDocError("That file could not be opened. Please try again or contact us.");
    } finally {
      setOpening(null);
    }
  }

  return (
    <PortalShell ready={hasLoaded || docs !== null}>
      <main className="hp-portal__main">
        {company && <p className="hp-portal__company hp-reveal">{company}</p>}
        <h1 className="hp-portal__title hp-reveal">Your documents</h1>
        <p className="hp-portal__hint hp-reveal">
          Shared with your account by the Harvest Panel Systems team.
        </p>

        <PortalSearch id="document-search" label="Search your documents" placeholder="Search by document name" value={search} onChange={(v) => { setSearch(v); setPage(0); }} />
        {(docError || result?.error) && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{docError || result.error} <button type="button" className="hp-btn hp-btn--ghost" onClick={() => setRevision((n) => n + 1)}>Try again</button></p>}

        {/* Renders nothing until the fetch lands — the page-loader stays up for
            exactly that long, so there is no second loading state. */}
        {docs === null ? <p className="hp-panel__note" role="status">Loading documents...</p> : result.error ? null : docs.length === 0 ? (
          <div className="hp-portal__empty hp-reveal">
            <p><strong>No documents yet</strong></p>
            <p>Once our team shares a document with your account it appears here.</p>
          </div>
        ) : (
          <ul className="hp-doc-list hp-reveal" aria-busy={result.stale || undefined}>
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
                <button type="button" className="hp-btn hp-btn--primary hp-doc__open" disabled={opening !== null} onClick={() => openDoc(doc)}>
                  {opening === doc.id ? "Opening..." : "Open"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <PortalPagination label="Document pages" page={page} hasMore={!!result?.hasMore} onPage={setPage} />
      </main>
    </PortalShell>
  );
}
