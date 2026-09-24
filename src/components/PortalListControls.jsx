// Search field and Previous/Next pager shared by the documents list and the
// admin people list. Same pill search as the Products filter bar (icon inside,
// 999px radius), restated for the portal's dark ground in Portal.css.

export function PortalSearch({ id, label, value, onChange, placeholder }) {
  return (
    <div className="hp-portal-search hp-reveal">
      <label className="hp-portal-search__label" htmlFor={id}>{label}</label>
      <div className="hp-portal-search__field">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input id={id} type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {value && (
          <button type="button" className="hp-portal-search__clear" aria-label="Clear search" onClick={() => onChange("")}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function PortalPagination({ label, page, hasMore, onPage }) {
  // Nothing to page through: a lone "Page 1" with two dead buttons is noise.
  if (page === 0 && !hasMore) return null;
  return (
    <nav className="hp-pagination" aria-label={label}>
      <button type="button" className="hp-pagination__btn hp-pagination__btn--prev" disabled={page === 0} onClick={() => onPage(page - 1)}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Previous
      </button>
      {/* Keyed on page so the counter replays its pop each time it changes. */}
      <span className="hp-pagination__count" key={page} aria-live="polite">Page {page + 1}</span>
      <button type="button" className="hp-pagination__btn hp-pagination__btn--next" disabled={!hasMore} onClick={() => onPage(page + 1)}>
        Next
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}
