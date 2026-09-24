import { useEffect, useState } from "react";
import { listAdminRows } from "./api";
import { PortalPagination } from "../../components/PortalListControls";

export default function AccountPicker({ value, onChange }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const key = `${page}:${search}`;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      listAdminRows("accounts", page, search, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setResult({ key, ...data }); })
        .catch(() => { if (!controller.signal.aborted) setResult({ key, error: "Accounts could not be loaded. Change the search to retry." }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, search, key]);
  const current = result?.key === key ? result : null;
  return <div className="hp-account-picker">
    <label htmlFor="account-search">Find customer account</label>
    <input id="account-search" type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
    <label htmlFor="a-account">Customer account</label>
    <select id="a-account" name="account_id" required value={value?.id || ""} onChange={(e) => onChange(current?.rows?.find((account) => account.id === e.target.value) || null)}>
      <option value="">Choose an account</option>
      {value && !current?.rows?.some((account) => account.id === value.id) && <option value={value.id}>{value.company_name}</option>}
      {current?.rows?.map((account) => <option key={account.id} value={account.id}>{account.company_name}</option>)}
    </select>
    {!current && <p className="hp-panel__note" role="status">Loading accounts…</p>}
    {current?.error && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{current.error}</p>}
    {current?.rows && current.rows.length === 0 && <p className="hp-portal__empty-note" role="status">No accounts match.</p>}
    <PortalPagination label="Account pages" page={page} hasMore={!!current?.hasMore} onPage={setPage} />
  </div>;
}
