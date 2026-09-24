import { useEffect, useRef, useState } from "react";
import { getAccount, listDocuments } from "./api";

// Same debounce as the admin people search: one request per pause in typing,
// not one per keystroke.
const SEARCH_DEBOUNCE_MS = 250;

// Returns the latest settled result, even while a newer one is loading, so the
// list stays on screen instead of flashing "Loading documents..." per keystroke.
// `stale` is true while that newer request is still in flight.
export function useAccountDocuments(accountId, page, search, revision) {
  const key = JSON.stringify([accountId, page, search, revision]);
  const [result, setResult] = useState(null);
  const lastSearch = useRef(search);
  useEffect(() => {
    const controller = new AbortController();
    // Only typing is debounced; paging and retries fetch immediately.
    const delay = lastSearch.current === search ? 0 : SEARCH_DEBOUNCE_MS;
    lastSearch.current = search;
    let timeout;
    const start = setTimeout(() => {
      timeout = setTimeout(() => {
        controller.abort();
        setResult({ key, documents: [], error: "Loading timed out. Please try again." });
      }, 15000);
      Promise.all([getAccount(accountId, controller.signal), listDocuments(accountId, page, search, controller.signal)])
        .then(([account, docs]) => {
          if (!controller.signal.aborted) setResult({ key, ...docs, company: account?.company_name ?? "" });
        }).catch(() => {
          if (!controller.signal.aborted) setResult({ key, documents: [], error: "We could not load your documents. Please try again." });
        }).finally(() => clearTimeout(timeout));
    }, delay);
    return () => { clearTimeout(start); clearTimeout(timeout); controller.abort(); };
  }, [accountId, page, search, key]);
  return result ? { ...result, stale: result.key !== key } : null;
}
