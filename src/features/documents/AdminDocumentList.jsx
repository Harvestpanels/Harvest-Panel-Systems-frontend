import { useState } from "react";
import { PortalPagination, PortalSearch } from "../../components/PortalListControls";
import { deleteDocument } from "./api";
import { describeDocument } from "./format";
import { useAccountDocuments } from "./useAccountDocuments";

// The documents already shared with one account, with a two-step delete: the
// first click asks, the second (on the same row) removes it for everyone on
// that account. RLS (documents_admin_write, partner_docs_admin_write) is what
// actually limits deleting to admins.
export default function AdminDocumentList({ account, revision, onMessage }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [localRevision, setLocalRevision] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const result = useAccountDocuments(account.id, page, search, revision + localRevision);
  const docs = result?.documents ?? null;

  async function remove(doc) {
    setDeleting(doc.id);
    onMessage(null);
    try {
      const { fileRemoved } = await deleteDocument(doc);
      onMessage(fileRemoved
        ? { type: "ok", text: `Deleted "${doc.title}".` }
        : { type: "error", text: `"${doc.title}" was removed from the account, but its file could not be deleted from storage. Customers can no longer open it; remove the file in Supabase Storage when convenient.` });
      setConfirming(null);
      // Stepping back a page when the last row on it goes keeps the list from
      // landing on an empty page.
      if (docs?.length === 1 && page > 0) setPage(page - 1);
      setLocalRevision((n) => n + 1);
    } catch (error) {
      onMessage({ type: "error", text: error.message || "The document could not be deleted. Please try again." });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PortalSearch id="admin-doc-search" label="Search this account's documents" placeholder="Search by document name"
        value={search} onChange={(v) => { setSearch(v); setPage(0); setConfirming(null); }} />
      {docs === null && <p className="hp-panel__note" role="status">Loading documents...</p>}
      {result?.error && (
        <p className="hp-portal-msg hp-portal-msg--error" role="alert">
          {result.error} <button type="button" className="hp-btn hp-btn--ghost" onClick={() => setLocalRevision((n) => n + 1)}>Try again</button>
        </p>
      )}
      {docs && !result.error && docs.length === 0 && (
        <p className="hp-portal__empty-note" role="status">
          {search.trim() ? "No documents match." : "No documents shared with this account yet."}
        </p>
      )}
      {docs && docs.length > 0 && (
        <ul className="hp-doc-list hp-doc-list--admin" aria-busy={result.stale || undefined}>
          {docs.map((doc) => (
            <li className={"hp-doc" + (confirming === doc.id ? " is-confirming" : "")} key={doc.id}>
              <span className="hp-doc__file" aria-hidden="true">
                {(doc.title.split(".").pop() || "doc").slice(0, 4).toUpperCase()}
              </span>
              <span className="hp-doc__text">
                <span className="hp-doc__name">{doc.title}</span>
                <span className="hp-doc__meta">
                  {confirming === doc.id ? "Delete for everyone on this account? This can't be undone." : describeDocument(doc)}
                </span>
              </span>
              {confirming === doc.id ? (
                <span className="hp-doc__actions">
                  <button type="button" className="hp-btn hp-btn--danger" disabled={deleting !== null} onClick={() => remove(doc)}>
                    {deleting === doc.id ? "Deleting..." : "Delete"}
                  </button>
                  <button type="button" className="hp-btn hp-btn--ghost" disabled={deleting !== null} onClick={() => setConfirming(null)}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" className="hp-btn hp-btn--ghost hp-doc__delete" disabled={deleting !== null}
                  aria-label={`Delete ${doc.title}`} onClick={() => setConfirming(doc.id)}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <PortalPagination label="Account document pages" page={page} hasMore={!!result?.hasMore} onPage={(p) => { setPage(p); setConfirming(null); }} />
    </>
  );
}
