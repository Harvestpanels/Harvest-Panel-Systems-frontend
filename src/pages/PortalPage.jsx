import { useState } from "react";
import PortalShell from "../components/PortalShell";
import { PortalPagination, PortalSearch } from "../components/PortalListControls";
import { useAuth } from "../hooks/useAuth";
import { getDocumentLink } from "../features/documents/api";
import { useAccountDocuments } from "../features/documents/useAccountDocuments";
import { describeDocument, fileExtension } from "../features/documents/format";
import { usePageMeta } from "../hooks/usePageMeta";
import Notify from "../components/toast/Notify";

// Documents shared with the signed-in customer's account. Profile and
// sign-in settings are their own pages, reachable from the nav account menu.

// Local development only: append Supabase's own reason so a failing View or
// Download can be diagnosed from the notification. Production shows just the
// friendly sentence.
function devDetail(error) {
  if (!import.meta.env.DEV || !error) return "";
  return ` [dev: ${[error.code, error.statusCode ?? error.status, error.message].filter(Boolean).join(" · ")}]`;
}

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

  // View opens the file in a new tab (PDFs and images display in the
  // browser); Download saves it under its title. Both get a fresh 60-second
  // signed link and are recorded in the download log.
  async function viewDoc(doc) {
    // Reserve a tab during the user gesture, before awaiting the signed URL,
    // or popup blockers treat the later open as unrequested.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setOpening({ id: doc.id, action: "view" });
    setDocError(null);
    try {
      const url = await getDocumentLink(doc);
      if (tab) tab.location.replace(url);
      else window.location.assign(url);
    } catch (error) {
      tab?.close();
      setDocError("That file could not be opened. Please try again or contact us." + devDetail(error));
    } finally {
      setOpening(null);
    }
  }

  async function downloadDoc(doc) {
    setOpening({ id: doc.id, action: "download" });
    setDocError(null);
    try {
      // Served as an attachment, so navigating to it saves the file and the
      // page itself stays put.
      window.location.assign(await getDocumentLink(doc, { download: true }));
    } catch (error) {
      setDocError("That file could not be downloaded. Please try again or contact us." + devDetail(error));
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
        <Notify text={docError} />
        <Notify text={result?.error} action={{ label: "Try again", onClick: () => setRevision((n) => n + 1) }} />

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
                  {(fileExtension(doc) || "file").slice(0, 4).toUpperCase()}
                </span>
                <span className="hp-doc__text">
                  <span className="hp-doc__name">{doc.title}</span>
                  <span className="hp-doc__meta">{describeDocument(doc)}</span>
                </span>
                <span className="hp-doc__actions">
                  <button type="button" className="hp-btn hp-btn--ghost" disabled={opening !== null}
                    aria-label={`View ${doc.title}`} onClick={() => viewDoc(doc)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
                    {opening?.id === doc.id && opening.action === "view" ? "Opening..." : "View"}
                  </button>
                  <button type="button" className="hp-btn hp-btn--primary" disabled={opening !== null}
                    aria-label={`Download ${doc.title}`} onClick={() => downloadDoc(doc)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {opening?.id === doc.id && opening.action === "download" ? "Preparing..." : "Download"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <PortalPagination label="Document pages" page={page} hasMore={!!result?.hasMore} onPage={setPage} />
      </main>
    </PortalShell>
  );
}
