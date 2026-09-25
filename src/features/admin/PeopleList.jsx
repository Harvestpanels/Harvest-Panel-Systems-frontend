import { useEffect, useState } from "react";
import { PortalPagination, PortalSearch } from "../../components/PortalListControls";
import { listPeople } from "../documents/api";
import Notify from "../../components/toast/Notify";

// One searchable list of people, reused for a company's members, the "Add
// people" picker and the People tab. `inAccount` / `notInAccount` narrow who
// is listed and `action(person)` renders the control on each row.
export default function PeopleList({ id, inAccount, notInAccount, action, showCompany = false, onOpenCompany, searchLabel, emptyText, revision = 0 }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null);
  const key = JSON.stringify([inAccount, notInAccount, page, search, revision, retry]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      listPeople(page, search, { inAccount, notInAccount }, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setResult({ key, ...data }); })
        .catch(() => { if (!controller.signal.aborted) setResult({ key, error: "People could not be loaded." }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [inAccount, notInAccount, page, search, key]);

  const current = result?.key === key ? result : null;
  const people = current?.rows ?? [];

  return (
    <>
      <PortalSearch id={id} label={searchLabel} placeholder="Name or email" value={search} onChange={(v) => { setSearch(v); setPage(0); }} />
      {!current && <p className="hp-panel__note" role="status">Loading people...</p>}
      <Notify text={current?.error} action={{ label: "Try again", onClick: () => setRetry((n) => n + 1) }} />
      {current?.rows && people.length === 0 && <p className="hp-portal__empty-note" role="status">{search.trim() ? "No people match." : emptyText}</p>}
      {people.length > 0 && (
        <ul className="hp-people">
          {people.map((p) => (
            <li className="hp-person" key={p.id}>
              <span className="hp-person__avatar" aria-hidden="true">{(p.full_name || p.email).slice(0, 1).toUpperCase()}</span>
              <span className="hp-person__text">
                <span className="hp-person__name">
                  {p.full_name || p.email}
                  {p.role === "admin" && <span className="hp-badge hp-badge--admin">Admin</span>}
                </span>
                <span className="hp-person__email">
                  {p.email}
                  {showCompany && (
                    <>
                      {" · "}
                      {p.account_id && onOpenCompany
                        ? <button type="button" className="hp-person__company" onClick={() => onOpenCompany({ id: p.account_id, company_name: p.company_name })}>{p.company_name}</button>
                        : <span>{p.company_name || "No company"}</span>}
                    </>
                  )}
                </span>
              </span>
              {action?.(p)}
            </li>
          ))}
        </ul>
      )}
      <PortalPagination label={searchLabel + " pages"} page={page} hasMore={!!current?.hasMore} onPage={setPage} />
    </>
  );
}
