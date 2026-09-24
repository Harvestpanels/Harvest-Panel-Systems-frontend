import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MOBILE_MENU_CLOSE_MS } from "./constants";

// Mobile equivalent of NavDropdown: instead of a floating popover (there's
// nowhere sensible to float one on a narrow screen), each group is an
// inline accordion — tap the label, its items expand right underneath it
// within the mobile panel. Independent open state per group (not
// accordion-exclusive), each with its own measured max-height (via
// ResizeObserver on its content) so the expand/collapse transition tracks
// that group's real item count rather than a guessed constant.
export default function MobileDropdownGroup({
  label, items, navigate, onNavigate, tabIndex, onExpandedChange,
  // Optional replacement for the plain text label — the account group shows
  // the visitor's avatar and email here instead of a word.
  trigger,
  // Extra class on the group wrapper, for a variant that needs its own
  // spacing or divider (see .hp-nav__mobile-group--account).
  className = "",
}) {
  const [expanded, setExpanded] = useState(false);
  const innerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.scrollHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`hp-nav__mobile-group${className ? " " + className : ""}`}>
      <button
        type="button"
        className={`hp-nav__mobile-group-toggle${expanded ? " is-expanded" : ""}`}
        aria-expanded={expanded}
        tabIndex={tabIndex}
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          onExpandedChange?.(next);
        }}
      >
        {trigger ?? label}
        <svg className="hp-nav__mobile-group-chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className={`hp-nav__mobile-group-panel${expanded ? " is-open" : ""}`}
        inert={!expanded || tabIndex === -1}
        aria-hidden={!expanded || tabIndex === -1}
        style={{ maxHeight: expanded ? height : 0 }}
      >
        <div className="hp-nav__mobile-group-panel-inner" ref={innerRef}>
          {items.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                state={item.state}
                className={`hp-nav__mobile-group-item${item.active ? " is-current" : ""}${item.danger ? " is-danger" : ""}`}
                tabIndex={expanded ? tabIndex : -1}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate();
                  setTimeout(() => navigate(item.to, { state: item.state }), MOBILE_MENU_CLOSE_MS);
                }}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className={`hp-nav__mobile-group-item${item.active ? " is-current" : ""}${item.danger ? " is-danger" : ""}`}
                tabIndex={expanded ? tabIndex : -1}
                onClick={() => { item.onClick(); onNavigate(); }}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

