import { useEffect, useState } from "react";
import { PortalPagination, PortalSearch } from "../../components/PortalListControls";
import { listCompanies } from "../documents/api";
import Notify from "../../components/toast/Notify";

const countLabel = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Every company, with how many people and documents it has. Empty ones (left
// behind when a test signup's user is deleted) are labelled so they stand out.
export default function CompanyList({ onOpen, revision }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null);
  const key = JSON.stringify([page, search, revision, retry]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      listCompanies(page, search, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setResult({ key, ...data }); })
        .catch(() => { if (!controller.signal.aborted) setResult({ key, error: "Companies could not be loaded." }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, search, key]);

  const current = result?.key === key ? result : null;
  const rows = current?.rows ?? [];

  return (
    <section className="hp-panel hp-reveal">
      <h2>Companies</h2>
      <p className="hp-panel__note">Open a company to share documents with it and manage who is in it.</p>
      <PortalSearch id="company-search" label="Search companies" placeholder="Company name"
        value={search} onChange={(v) => { setSearch(v); setPage(0); }} />
      {!current && <p className="hp-panel__note" role="status">Loading companies...</p>}
      <Notify text={current?.error} action={{ label: "Try again", onClick: () => setRetry((n) => n + 1) }} />
      {current?.rows && rows.length === 0 && <p className="hp-portal__empty-note" role="status">No companies match.</p>}
      {rows.length > 0 && (
        <ul className="hp-company-list">
          {rows.map((company) => {
            const empty = company.people === 0 && company.documents === 0;
            return (
              <li key={company.id}>
                <button type="button" className={"hp-company" + (empty ? " is-empty" : "")} onClick={() => onOpen(company)}>
                  <span className="hp-company__mark" aria-hidden="true">{company.company_name.slice(0, 1).toUpperCase()}</span>
                  <span className="hp-company__text">
                    <span className="hp-company__name">{company.company_name}</span>
                    <span className="hp-company__meta">
                      {empty
                        ? "Empty, no people or documents"
                        : `${countLabel(company.people, "person", "people")} · ${countLabel(company.documents, "document", "documents")}`}
                    </span>
                  </span>
                  <span className="hp-company__open" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <PortalPagination label="Company pages" page={page} hasMore={!!current?.hasMore} onPage={setPage} />
    </section>
  );
}
