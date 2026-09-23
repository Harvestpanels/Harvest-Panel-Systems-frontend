import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AuthModalContext } from "../context/authModalContext";
import { useSessionHint } from "../hooks/useSessionHint";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import "./Nav.css";
import { navClick, scrollToTop } from "../utils/scroll";
import { announcePanelOpened, onOtherPanelOpened } from "../utils/floatingPanels";

// Matches the mobile dropdown's own max-height collapse duration (see
// .hp-nav__mobile in Nav.css) — the same delay navClick already uses for
// anchor links from the mobile menu.
const MOBILE_MENU_CLOSE_MS = 380;

// Total length of the hp-nav-fold-in animation (see Nav.css) plus a small
// buffer.
const FOLD_ANIMATION_MS = 1650;

const HOME_NAV_LINKS = [
  { to: "/blog", label: "Blog" },
  { to: "/products", label: "Products" },
  { to: "/specs", label: "Specs" },
  { id: "why", label: "Who We Are" },
  { id: "panels", label: "Overview" },
  { id: "gallery", label: "Gallery" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact Us" },
];

// Matches the panel's own transition duration in Nav.css — the panel stays
// mounted this long after `open` goes false so its fade/slide-out can
// actually play instead of just vanishing on the closing click.
const PANEL_CLOSE_MS = 160;

// Smallest gap a dropdown panel keeps from the viewport edge when clamped.
const EDGE_GAP = 12;

function NavDropdown({
  label,
  items,
  onOpenChange,
  // Optional custom trigger. Without these it renders the plain text
  // trigger the Menu/FAQs dropdowns use.
  triggerClassName,
  triggerContent,
  triggerLabel,
  // Extra class on the popover itself. It is portaled to <body>, so it cannot
  // be reached with a descendant selector from the trigger.
  panelClassName,
  // Optional non-interactive block pinned above the items, e.g. the signed-in
  // email address on the account menu.
  header,
}) {
  const [open, setOpen] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Trails `open` by one frame on the way in (and matches it instantly on
  // the way out) — this is what the panel's `.is-open` class is actually
  // keyed off. Mounting straight into `.is-open` would mean its very first
  // paint already has the open transform/opacity, so the CSS transition
  // would have nothing to animate from; painting one frame in the closed
  // state first, then flipping this on (via rAF below), gives it something
  // to transition.
  const [visualOpen, setVisualOpen] = useState(false);
  // True from the moment the entrance animation starts through the whole
  // closing transition — only reset at the very start of the *next* open.
  // Without this, items snapped to invisible the instant closing began: the
  // staggered entrance (.hp-nav__menu-item-in) only applies while the panel
  // has .is-open, so the moment that class is removed the animation stops
  // matching and the item's opacity falls back to its base rule — and CSS
  // transitions do not smoothly animate away from a value that was being
  // driven by a now-inapplicable animation (verified empirically: it's an
  // instant jump in Chromium, not a transition), so a plain `transition:
  // opacity` on the base rule didn't fix it. Instead, once an item has
  // actually entered, its CSS fallback becomes opacity: 1 instead of 0 (see
  // .hp-nav__menu-panel.has-entered in Nav.css) — closing then just relies
  // on the panel's own opacity fading out to visually take the items with
  // it (nested opacity is multiplicative), rather than each item needing
  // its own independent, and in practice unreliable, exit transition.
  const [hasEntered, setHasEntered] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  // The panel node as state, not just a ref, so the clamping pass below can be
  // keyed on it actually attaching. A ref alone cannot do that: it never
  // triggers a render, and the rAF pass runs before React has committed the
  // panel, so it would measure null.
  const [panelEl, setPanelEl] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  // useCallback so the identity is stable — an inline ref would be torn down
  // and re-attached on every render, re-firing the effect endlessly.
  const setPanelRef = useCallback((node) => {
    panelRef.current = node;
    setPanelEl(node);
  }, []);
  // Set by the trigger's own ArrowDown/ArrowUp handler (below) when the
  // menu isn't open yet — read once the panel finishes mounting so opening
  // via the keyboard lands focus on the first (or last) item, same as any
  // native <select>/ARIA menu.
  const pendingFocusRef = useRef(null);

  function focusItem(position) {
    const els = Array.from(panelRef.current?.querySelectorAll(".hp-nav__menu-item") ?? []);
    if (!els.length) return;
    els[position === "last" ? els.length - 1 : 0].focus();
  }

  // React-Compiler-compliant "adjust state during render" alternative to a
  // setState-on-mount effect (see react-hooks/set-state-in-effect):
  // mounting and starting the close-transition both need to happen the
  // instant `open` changes, not after an effect pass, so they're derived
  // here rather than in a useEffect body.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setHasEntered(false);
    } else {
      setVisualOpen(false);
    }
  }

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // Centred under its trigger, then clamped to stay fully on screen.
  //
  // The clamp matters for the account menu: it is wider than the Menu/FAQs
  // panels and hangs off an avatar at the pill's right edge, so between
  // 1025px and ~1150px a purely centred panel ran past the right edge.
  // Clamping rather than right-anchoring keeps it centred wherever there is
  // room, which is how the Menu and FAQs panels behave.
  //
  // The width is read from the mounted panel, so the very first pass (before
  // it exists) is unclamped; the layout effect below re-runs this as soon as
  // the panel attaches, while it is still transparent.
  const updatePos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centre = rect.left + rect.width / 2;
    const half = (panelRef.current?.offsetWidth ?? 0) / 2;
    const viewport = document.documentElement.clientWidth;
    const left = half
      ? Math.min(Math.max(centre, half + EDGE_GAP), viewport - half - EDGE_GAP)
      : centre;
    setPanelPos({ top: rect.bottom + 14, left });
  }, []);

  // Flips the panel into its visible state one frame after mounting, so
  // the CSS transition has a closed starting point to animate from.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      setVisualOpen(true);
      setHasEntered(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Re-runs the moment the panel attaches, which is the first point its width
  // can be measured and therefore the first point it can be clamped. A layout
  // effect so the correction lands before the browser paints — and the panel is
  // still transparent at this point either way, so it is never visible.
  useLayoutEffect(() => {
    if (panelEl) updatePos();
  }, [panelEl, updatePos]);

  // Lands focus on the first/last item after a keyboard-triggered open
  // (ArrowDown/ArrowUp on the trigger — see pendingFocusRef below). Keyed
  // on `panelPos` rather than `open`/`mounted`: the portal's items don't
  // actually exist in the DOM until the position effect below has measured
  // the trigger and set panelPos (mounting the panel is otherwise gated on
  // `mounted && panelPos` together) — focusing any earlier just finds
  // nothing to focus.
  useEffect(() => {
    if (!panelPos || !pendingFocusRef.current) return;
    focusItem(pendingFocusRef.current);
    pendingFocusRef.current = null;
  }, [panelPos]);

  // Keeps the panel in the DOM for a beat after `open` flips false, so the
  // CSS close transition (see .hp-nav__menu-panel losing .is-open) can run
  // instead of the panel just disappearing on the closing click.
  useEffect(() => {
    if (open || !mounted) return;
    const timer = setTimeout(() => setMounted(false), PANEL_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const handleOutside = (e) => {
      if (wrapRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Native <select>/ARIA-menu convention: closing via Escape returns
      // focus to what opened the menu, rather than leaving it stranded on
      // an item that's about to unmount.
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  return (
    <div className="hp-nav__menu-dropdown" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`${triggerClassName || "hp-nav__menu-trigger"}${open ? " is-active" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          const position = e.key === "ArrowDown" ? "first" : "last";
          if (open) focusItem(position);
          else {
            pendingFocusRef.current = position;
            setOpen(true);
          }
        }}
      >
        {triggerContent ?? label}
      </button>
      {mounted && panelPos &&
        createPortal(
          <div
            ref={setPanelRef}
            className={`hp-nav__menu-panel${panelClassName ? " " + panelClassName : ""}${visualOpen ? " is-open" : ""}${hasEntered ? " has-entered" : ""}`}
            style={{ top: panelPos.top, left: panelPos.left }}
            onKeyDown={(e) => {
              const els = Array.from(panelRef.current?.querySelectorAll(".hp-nav__menu-item") ?? []);
              if (!els.length) return;
              const idx = els.indexOf(document.activeElement);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                els[(idx + 1) % els.length].focus();
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                els[(idx - 1 + els.length) % els.length].focus();
              } else if (e.key === "Home") {
                e.preventDefault();
                els[0].focus();
              } else if (e.key === "End") {
                e.preventDefault();
                els[els.length - 1].focus();
              }
            }}
          >
            {header && <div className="hp-nav__menu-header">{header}</div>}
            {items.map((item, i) => {
              // Computed here instead of a fixed set of :nth-child CSS
              // rules — that only covered up to the 10th item, so any
              // dropdown grown past that (Overview, once Memberships was
              // added) had its later items snap in instantly instead of
              // continuing the cascade. Same 0.02s base + 0.03s-per-item
              // progression the old rules used, just uncapped.
              const style = { animationDelay: `${(0.02 + i * 0.03).toFixed(2)}s` };
              // `separated` draws a hairline above the item (used to set Sign
              // out apart from the navigation entries); `danger` tints it.
              const extra = `${item.separated ? " is-separated" : ""}${item.danger ? " is-danger" : ""}`;
              return item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`hp-nav__menu-item${item.active ? " is-current" : ""}${extra}`}
                  style={style}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className={`hp-nav__menu-item${item.active ? " is-current" : ""}${extra}`}
                  style={style}
                  onClick={() => { item.onClick(); setOpen(false); }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

// Mobile equivalent of NavDropdown: instead of a floating popover (there's
// nowhere sensible to float one on a narrow screen), each group is an
// inline accordion — tap the label, its items expand right underneath it
// within the mobile panel. Independent open state per group (not
// accordion-exclusive), each with its own measured max-height (via
// ResizeObserver on its content) so the expand/collapse transition tracks
// that group's real item count rather than a guessed constant.
function MobileDropdownGroup({
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
        style={{ maxHeight: expanded ? height : 0 }}
      >
        <div className="hp-nav__mobile-group-panel-inner" ref={innerRef}>
          {items.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`hp-nav__mobile-group-item${item.active ? " is-current" : ""}${item.danger ? " is-danger" : ""}`}
                tabIndex={tabIndex}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate();
                  setTimeout(() => navigate(item.to), MOBILE_MENU_CLOSE_MS);
                }}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className={`hp-nav__mobile-group-item${item.active ? " is-current" : ""}${item.danger ? " is-danger" : ""}`}
                tabIndex={tabIndex}
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

// The account menu behind the nav avatar. Plain `to` links, deliberately:
// <Nav> renders on every marketing page, where AuthProvider is NOT mounted
// (it is lazy-loaded with the portal — see PortalLayout), so nothing here may
// call useAuth or touch the Supabase client. Signing out therefore navigates
// to /portal/signout, which does hold the SDK and revokes the session there.
const ACCOUNT_ITEMS = [
  { to: "/portal", label: "Your documents" },
  { to: "/portal/profile", label: "Profile" },
  { to: "/portal/settings", label: "Settings" },
  { to: "/portal/signout", label: "Sign out", separated: true, danger: true },
];

export default function Nav({
  menuOpen,
  setMenuOpen,
  navRef,
  logo,
  links = HOME_NAV_LINKS,
  // Desktop-only override for `links` — pages that group everything into
  // `dropdowns` (see below) pass an empty array here so the flat list only
  // shows up in the mobile dropdown, which has no room for nested menus.
  desktopLinks,
  logoTo,
  // The nav CTA is the customer portal sign-in. By default it opens the
  // AuthModal over the current page rather than navigating: `onCtaClick`
  // wins over `ctaTo` (a real route) and `ctaHref` (an in-page anchor),
  // both of which are still supported for any page that wants them.
  ctaLabel = "Log in",
  ctaHref = "#contact",
  ctaTo,
  onCtaClick,
  // Desktop-only popover menus, e.g. [{ key, label, items }] — same shape
  // NavDropdown takes. Mobile always uses the flat `links` list instead,
  // since a dropdown nested inside the mobile dropdown is awkward UX.
  dropdowns = [],
  // False while a page's own PageLoader overlay is still covering the
  // screen (see usePageReady/PageLoader) — holds the pill's fold-in
  // entrance (and the mobile hamburger's pop-in) frozen at its very first
  // frame via CSS `animation-play-state: paused` (see ".hp-nav--anim-hold"
  // in Nav.css). This does NOT change the animation itself — same
  // keyframes, same duration, same easing — it only delays when it starts,
  // the same technique ChatWidget's own launcher entrance uses (see
  // appReady.js). Defaults to true so a page that doesn't wire this up
  // still animates immediately, same as before this existed.
  entranceReady = true,
}) {
  // Plays once per mount (every page navigation), then goes away for good.
  // Driven by React state rather than a CSS class alone: the mobile
  // breakpoint (see Nav.css, max-width: 1024px) sets `animation: none` on
  // the fold elements to disable the transition below desktop widths,
  // which interrupts the animation mid-flight instead of letting it
  // finish — so a plain onAnimationEnd-only class removal never fires,
  // and the class stays attached indefinitely. If the viewport later
  // crosses back above 1024px (e.g. zooming with ctrl+scroll), `animation`
  // flips from `none` back to the real keyframes and the browser restarts
  // the whole fold/slide sequence from scratch. This timeout guarantees
  // `folding` flips to false shortly after mount regardless of whether the
  // animation ever got to finish naturally, and the fold overlay is fully
  // unmounted (not just hidden) once it does — so no later viewport change
  // can resurrect either one.
  const [folding, setFolding] = useState(true);
  // Marks the mobile circle's one-time entrance bounce (see
  // hp-nav-mobile-pop-in in Nav.css) as finished, permanently — without
  // this, closing the mobile menu removes the `.hp-nav--open` override
  // that cancels the animation and the base pop-in rule takes over again,
  // replaying the bounce on every open/close instead of just once on load.
  const [poppedIn, setPoppedIn] = useState(false);
  // How far the fold overlay's logo needs to slide (translateX) to land
  // exactly on the real logo underneath it — see the layout effect below.
  // Recomputed on window resize too, so the fold/slide sequence (which can
  // still be mid-flight while a user drags a desktop window's edge) always
  // targets the logo's actual current position rather than a value baked
  // in for whatever width the page happened to load at.
  const [foldSlideX, setFoldSlideX] = useState(null);
  const [pillFinalWidth, setPillFinalWidth] = useState(null);
  const logoSlotRef = useRef(null);
  const navigate = useNavigate();
  // Tracks which desktop dropdowns are currently open, toggled straight onto
  // the nav's own DOM node rather than through React state, since
  // useHeroParallax's scroll/hover auto-hide logic reads this class
  // directly and doesn't need a re-render here to do it. A Set keyed by key
  // (rather than a plain increment/decrement counter) makes add/delete
  // idempotent, so it stays correct even though each NavDropdown's effect
  // re-fires on every Nav re-render (its onOpenChange prop is a fresh
  // function identity each time).
  const openDropdownsRef = useRef(new Set());
  const handleDropdownOpenChange = (key, isOpen) => {
    const open = openDropdownsRef.current;
    if (isOpen) open.add(key);
    else open.delete(key);
    navRef.current?.classList.toggle("hp-nav--dropdown-open", open.size > 0);
  };

  // The mobile panel itself is static (no internal scroll — see its own
  // .is-open rule in Nav.css), sized to exactly fit its collapsed content.
  // But expanding one of its accordion groups (Menu/FAQs) grows
  // past that fixed height, and with no scroll there'd be no way to reach
  // whatever that growth pushes past the bottom edge. Same
  // Set-of-open-keys pattern as the desktop dropdowns above, just toggling
  // a scroll-enabling class on the mobile panel instead — scrolling only
  // becomes available while at least one group is actually expanded, not
  // as a permanent feature of the panel.
  const mobilePanelRef = useRef(null);
  const expandedGroupsRef = useRef(new Set());
  // The panel's max-height update triggered by an accordion resize should
  // apply instantly, no CSS transition of its own (see instantResizeRef
  // below) — set directly here, in the same click that actually expands or
  // collapses a group, rather than inferred from ResizeObserver timing.
  // (An earlier version tried to detect "this resize came from an
  // accordion, not the menu's own open/close" by timing how soon after
  // menuOpen changed the resize happened — the pill's own width-shift
  // animation on open/close fires this same ResizeObserver continuously
  // for its own ~0.35s, on width alone, so that heuristic kept
  // misfiring and killing the open/close transition it was supposed to
  // leave alone. Tying it directly to the actual user action that causes
  // an accordion-driven resize sidesteps the guesswork entirely.)
  const instantResizeRef = useRef(false);
  const handleGroupExpandedChange = (key, isExpanded) => {
    const expanded = expandedGroupsRef.current;
    if (isExpanded) expanded.add(key);
    else expanded.delete(key);
    // React state, not classList.toggle on the node: the panel's className is
    // rendered from state (it also carries `is-overflowing`), so the next
    // render would wipe an imperatively-added class straight back off — which
    // is exactly what stopped an expanded group from being scrollable.
    setHasExpandedGroup(expanded.size > 0);
    instantResizeRef.current = true;
  };

  // `.hp-nav__mobile` is `overflow: hidden` (not scrollable) whenever no
  // accordion group is expanded — but `overflow: hidden` only clips
  // visually, it doesn't capture wheel/touch input, so scrolling with the
  // pointer over the panel in that state was scrolling the *page*
  // underneath instead of doing nothing, exactly as if the panel wasn't
  // there. `overscroll-behavior: contain` (see Nav.css) already handles
  // containment correctly once a group *is* expanded and the panel is
  // genuinely scrollable; this only needs to block input the rest of the
  // time, while the menu is open but static.
  useEffect(() => {
    if (!menuOpen) return;
    const panel = mobilePanelRef.current;
    if (!panel) return;
    function blockScrollThrough(e) {
      if (!panel.classList.contains("has-expanded-group")) e.preventDefault();
    }
    panel.addEventListener("wheel", blockScrollThrough, { passive: false });
    panel.addEventListener("touchmove", blockScrollThrough, { passive: false });
    return () => {
      panel.removeEventListener("wheel", blockScrollThrough);
      panel.removeEventListener("touchmove", blockScrollThrough);
    };
  }, [menuOpen]);

  // The mobile panel's open height is measured off its real content (via
  // ResizeObserver) rather than a guessed flat constant, so it fits any
  // link/dropdown combination without clipping. Capped to whatever's
  // actually left in the viewport below the header row — if content would
  // exceed that, `.hp-nav__mobile.is-open` scrolls internally instead
  // (see Nav.css) rather than overflowing off-screen.
  const mobileInnerRef = useRef(null);
  const mobileCtaWrapRef = useRef(null);
  const [mobileMaxHeight, setMobileMaxHeight] = useState(0);
  // True when the collapsed list alone is taller than the space available, so
  // the panel has to scroll. Without this the panel only scrolled while an
  // accordion was expanded, and on a short viewport (or a zoomed-in browser)
  // the last rows of the menu were simply clipped and unreachable.
  const [mobileOverflows, setMobileOverflows] = useState(false);
  // Whether any accordion group is currently open. Also turns scrolling on,
  // since expanding one grows the content past the panel's capped height.
  const [hasExpandedGroup, setHasExpandedGroup] = useState(false);
  // Mirrors instantResizeRef into actual rendered style (see the JSX
  // below) — an accordion group expanding/collapsing inside the panel
  // (see MobileDropdownGroup) changes the panel's real content height
  // continuously for the ~0.3s its own transition runs, and this panel's
  // max-height was *also* CSS-transitioning in response, at a different
  // duration, chasing an ever-changing target — so the outer panel
  // visibly kept stretching for ~150-190ms after the accordion itself had
  // already finished, instead of the two moving in sync. The accordion's
  // own transition is already the only motion that needs to be visible
  // here; this panel just needs to always be exactly big enough to
  // contain it, tracking instantly with no lag or separate animation of
  // its own. Opening/closing the whole menu is the one case that
  // *should* animate smoothly (see instantResizeRef.current reset below).
  const [instantResize, setInstantResize] = useState(false);
  const [prevMenuOpenForInstant, setPrevMenuOpenForInstant] = useState(menuOpen);
  if (menuOpen !== prevMenuOpenForInstant) {
    setPrevMenuOpenForInstant(menuOpen);
    if (instantResize) setInstantResize(false);
  }
  // Ref mutation can't happen inline during render (disallowed
  // react-hooks/refs) — `useLayoutEffect`, not `useEffect`, so it's
  // cleared synchronously before paint, same instant as the state update
  // above, rather than after — avoids a one-frame gap where a stale
  // `true` could still be read.
  useLayoutEffect(() => {
    instantResizeRef.current = false;
  }, [menuOpen]);

  // Groups unmount with the menu, so their expanded state has to be dropped
  // too — otherwise the panel reopens still flagged as expanded.
  useEffect(() => {
    if (menuOpen) return;
    expandedGroupsRef.current.clear();
    setHasExpandedGroup(false);
  }, [menuOpen]);
  useEffect(() => {
    const el = mobileInnerRef.current;
    if (!el) return;
    const measure = () => {
      const navTop = navRef.current?.getBoundingClientRect().top ?? 0;
      const headerHeight = navRef.current?.querySelector(".hp-nav__inner")?.getBoundingClientRect().height ?? 0;
      // The CTA sits below this scrollable list now (see the render below
      // and its own comment), always visible rather than part of what
      // scrolls — so its height has to come out of the same "available"
      // budget the list is capped to, or the two together would still
      // overflow past the viewport exactly as before.
      const ctaHeight = mobileCtaWrapRef.current?.getBoundingClientRect().height ?? 0;
      const available = window.innerHeight - navTop - headerHeight - ctaHeight - 16;
      setInstantResize(instantResizeRef.current);
      // The resulting maxHeight is applied to `el`'s *parent* (.hp-nav__mobile
      // — the padded container, see Nav.css), not to `el` itself (this
      // inner div has no padding of its own). Without adding that
      // container's own top/bottom padding back in here, the box ends up
      // a bit shorter than its real content, and since it's `overflow:
      // hidden` (no scrolling — see Nav.css), that shortfall doesn't show
      // up as a scrollbar, it silently clips the bottom of the last item
      // (its own padding included), which is exactly why "FAQs" kept
      // reading as jammed up against the divider line no matter how much
      // CSS padding was added below it — the padding was there, just cut off.
      const containerStyle = window.getComputedStyle(el.parentElement);
      const containerPaddingY =
        parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);
      // Rounded up before it is applied: a fractional content height (the
      // usual case — borders and line boxes rarely land on whole pixels) gets
      // floored into clientHeight, leaving scrollHeight 1px larger and the
      // panel permanently "overflowing" by a pixel. That was enough to show a
      // scrollbar on a menu that actually fits.
      const content = Math.ceil(el.scrollHeight + containerPaddingY);
      setMobileMaxHeight(Math.max(0, Math.min(content, available)));
      // Tolerance on top of that, so a stray pixel from a later reflow cannot
      // flip scrolling on either.
      setMobileOverflows(content > available + 2);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
    // Re-measured on menuOpen too: the header row's own height/padding
    // changes between closed and open (see .hp-nav--open .hp-nav__inner in
    // Nav.css), which shifts how much room is actually left for the panel.
  }, [navRef, menuOpen]);

  // Both the mobile menu and the chat widget are fixed-position overlays
  // that don't share a parent (this is per-page, ChatWidget is mounted
  // once in App.jsx outside the routed pages) — announcing/listening via
  // a plain window event is how they stay mutually exclusive on a small
  // screen without one stacked awkwardly on top of the other.
  useEffect(() => {
    if (menuOpen) announcePanelOpened("nav");
  }, [menuOpen]);

  useEffect(() => onOtherPanelOpened("nav", () => setMenuOpen(false)), [setMenuOpen]);

  // Gated on `entranceReady`, not run unconditionally on mount — the CSS
  // animation itself is frozen at its very first frame the whole time
  // `entranceReady` is false (see ".hp-nav--anim-hold" in Nav.css), so its
  // real ~1.6s runtime only starts once this does too. Starting this timer
  // from mount regardless (real wall-clock time) would flip `folding` to
  // false — tearing down the fold classes — before the still-paused
  // animation ever got a chance to actually play.
  useEffect(() => {
    if (!entranceReady) return;
    const timer = setTimeout(() => setFolding(false), FOLD_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [entranceReady]);

  // The fold overlay's slide distance (the -402px in hp-nav-fold-logo,
  // Nav.css) was a hardcoded constant tuned for one specific pill width —
  // correct at any width where the pill has reached its 1060px cap, but
  // that's an assumption baked into the number rather than something the
  // animation actually adapts to. Computing it instead makes the animation
  // land on the real logo at whatever width the pill actually settles at,
  // so it can't visually drift out of sync if that assumption ever stops
  // holding (a breakpoint changes, the cap changes, a window is resized
  // mid-animation, etc.) — "responsive" in the sense of tracking real
  // layout, not a viewport-width media query.
  //
  // This does *not* measure the real logo's live position directly: this
  // effect runs synchronously before the first paint, which is exactly
  // when the fold animation's own 0% keyframe (pill collapsed to a 84px
  // circle) is already in effect. The logo sits inside that same animating
  // pill, so measuring it at this instant would capture its position
  // within the collapsed circle, not its final expanded position — the
  // wrong number entirely. Instead this computes the pill's eventual
  // settled width analytically (from the nav's own non-animating box,
  // min'd against the pill's own max-width) and combines it with the logo's intrinsic
  // rendered width, which — being a grid `auto` column — lays out at its
  // natural size regardless of how narrow the (currently clipped) pill is
  // at this moment.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const logoSlot = logoSlotRef.current;
    const inner = nav?.querySelector(".hp-nav__inner");
    const pill = nav?.querySelector(".hp-nav__pill");
    if (!nav || !logoSlot || !inner || !pill) return;
    const measure = () => {
      const navStyle = getComputedStyle(nav);
      const navPadding = parseFloat(navStyle.paddingLeft) + parseFloat(navStyle.paddingRight);
      // Read off .hp-nav__pill's own `max-width` rather than duplicating
      // that number here. The fold animation only ever animates the pill's
      // `width`/`height`/`border-radius` (see hp-nav-fold-in in Nav.css),
      // never its `max-width`, so this computed value is already the
      // pill's real settled cap even at this instant — while it's still
      // clipped to the 84px collapsed circle and its *rendered* width
      // would be useless. Keeping it read-not-copied means widening the
      // pill in CSS lengthens this slide automatically, instead of the two
      // silently drifting apart and landing the logo in the wrong place.
      const pillStyle = getComputedStyle(pill);
      const pillMaxWidth = parseFloat(pillStyle.maxWidth);
      const pillCap = Number.isFinite(pillMaxWidth) ? pillMaxWidth : Infinity;
      const pillFinalWidth = Math.min(pillCap, nav.getBoundingClientRect().width - navPadding);
      // The pill is `box-sizing: border-box` (set globally in App.css) with
      // its own 1px border, so its *content* box — which is what
      // .hp-nav__inner's padding is measured from, and therefore where the
      // real logo actually sits — starts one border-width inside the
      // border box that pillFinalWidth describes. Leaving this out landed
      // the overlay exactly 1px left of the real logo, so the handoff
      // ended on a small but real sideways jump instead of a clean
      // crossfade in place (measured: deltaPx -1 at every viewport width).
      const pillBorderLeft = parseFloat(pillStyle.borderLeftWidth) || 0;
      const innerPaddingLeft = parseFloat(getComputedStyle(inner).paddingLeft) || 0;
      const logoWidth = logoSlot.getBoundingClientRect().width;
      if (pillFinalWidth <= 0 || logoWidth === 0) return;
      setFoldSlideX(pillBorderLeft + innerPaddingLeft + logoWidth / 2 - pillFinalWidth / 2);
      // Shared with the pill's own fold-in keyframe (see hp-nav-fold-in in
      // Nav.css) so its width animation ends at exactly the width this
      // slide distance was computed against — see that keyframe's comment.
      setPillFinalWidth(pillFinalWidth);
    };
    measure();
    window.addEventListener("resize", measure);

    // Re-measure once the logo image itself has actually decoded. On a
    // first visit (cold cache) this effect runs before that image exists:
    // .hp-logo__img is `height: 44px; width: auto` with no width/height
    // attributes, so an undecoded image lays out 0px wide, the logoWidth
    // guard above bails, and --fold-slide-x is never set — leaving the
    // animation to fall back to the hardcoded distance in Nav.css, which
    // is tuned for a different pill width and lands the logo well off its
    // real resting spot. That mismatch is exactly the "logo teleports on
    // first load, fine after a refresh" bug: on a refresh the image is
    // already cached, so it measures correctly on the very first pass.
    const logoImg = logoSlot.querySelector("img");
    if (logoImg && !logoImg.complete) {
      logoImg.addEventListener("load", measure);
      logoImg.addEventListener("error", measure);
    }

    return () => {
      window.removeEventListener("resize", measure);
      logoImg?.removeEventListener("load", measure);
      logoImg?.removeEventListener("error", measure);
    };
    // `entranceReady` is a dependency so this re-measures right as the
    // intro is unpaused (see the hp-nav--anim-hold gate) — the page's own
    // PageLoader waits on that same logo image before flipping it true, so
    // this pass is guaranteed to measure a fully laid-out logo no matter
    // how slow the first load was.
  }, [navRef, entranceReady]);

  const logoEl = logoTo ? (
    <Link to={logoTo} className="hp-logo" aria-label="Harvest Panel Systems, home">
      <img src={logo} alt="Harvest Panel Systems" className="hp-logo__img" />
    </Link>
  ) : (
    <button className="hp-logo" onClick={scrollToTop} aria-label="Harvest Panel Systems, scroll to top">
      <img src={logo} alt="Harvest Panel Systems" className="hp-logo__img" />
    </button>
  );

  const renderLink = (link, { onNavigate, ...extraProps } = {}) => {
    if (link.to) {
      // From the mobile dropdown (onNavigate present), route changes used
      // to fire immediately on click — the whole Nav (and the mobile menu
      // with it) would unmount mid-way through its own 0.38s close
      // animation, cutting it off abruptly instead of letting it finish
      // like anchor-link clicks already do (see navClick's matching
      // delay). Desktop links have no menu to close, so they keep
      // navigating immediately.
      const handleClick = onNavigate
        ? (e) => {
            e.preventDefault();
            onNavigate();
            setTimeout(() => navigate(link.to), MOBILE_MENU_CLOSE_MS);
          }
        : undefined;
      return (
        <Link key={link.to} to={link.to} onClick={handleClick} {...extraProps}>
          {link.label}
        </Link>
      );
    }
    // `onClick`, when given, fully replaces the default anchor-scroll
    // (e.g. a page with filterable sections needs to clear its filters
    // before scrolling, or the target section could still be hidden).
    const handleClick = link.onClick
      ? (e) => {
          e.preventDefault();
          link.onClick();
          onNavigate?.();
        }
      : (e) => navClick(e, link.id, onNavigate);
    return (
      <a key={link.id} href={`#${link.id}`} onClick={handleClick} {...extraProps}>
        {link.label}
      </a>
    );
  };

  // Falls back to the app-wide auth modal when a page does not pass its own
  // handler, so every <Nav> gets the sign-in dialog without each page having
  // to wire it up. Read via useContext rather than the useAuth-style hook
  // because that hook throws without a provider, and Nav should still render
  // (with its ctaTo/ctaHref behaviour) outside one.
  const authModal = useContext(AuthModalContext);
  const handleCta = onCtaClick || authModal?.openAuthModal;

  // Signed in: the CTA becomes an avatar linking to the portal, the way most
  // SaaS sites swap their sign-in button once you have an account. See
  // useSessionHint for why this does not read the Supabase client directly.
  const { signedIn, email } = useSessionHint();
  const initial = (email || "?").trim().charAt(0).toUpperCase();

  const desktopCta = signedIn ? (
    <NavDropdown
      panelClassName="hp-nav__menu-panel--account"
      triggerClassName="hp-nav__avatar"
      triggerLabel={email ? `Account: ${email}` : "Account"}
      triggerContent={<span aria-hidden="true">{initial}</span>}
      header={email || "Signed in"}
      items={ACCOUNT_ITEMS}
      onOpenChange={(isOpen) => handleDropdownOpenChange("account", isOpen)}
    />
  ) : handleCta ? (
    <button type="button" className="hp-nav__quote" onClick={handleCta}>{ctaLabel}</button>
  ) : ctaTo ? (
    <Link to={ctaTo} className="hp-nav__quote">{ctaLabel}</Link>
  ) : (
    <a href={ctaHref} className="hp-nav__quote" onClick={(e) => navClick(e, ctaHref.replace("#", ""))}>
      {ctaLabel}
    </a>
  );

  // Nothing in the CTA slot once signed in: "Log in" no longer applies, and
  // Sign out now lives inside the account accordion (see mobileDropdowns).
  // The wrapper collapses to nothing on its own when this is null.
  const mobileCta = signedIn ? null : handleCta ? (
    <button
      type="button"
      className="hp-nav__quote hp-nav__mobile-cta"
      tabIndex={menuOpen ? 0 : -1}
      onClick={() => { setMenuOpen(false); handleCta(); }}
    >
      {ctaLabel}
    </button>
  ) : ctaTo ? (
    <Link to={ctaTo} className="hp-nav__quote hp-nav__mobile-cta" tabIndex={menuOpen ? 0 : -1}>
      {ctaLabel}
    </Link>
  ) : (
    <a
      href={ctaHref}
      className="hp-nav__quote hp-nav__mobile-cta"
      tabIndex={menuOpen ? 0 : -1}
      onClick={(e) => navClick(e, ctaHref.replace("#", ""), () => setMenuOpen(false))}
    >
      {ctaLabel}
    </a>
  );

  // Desktop keeps `dropdowns` untouched — adding a seventh trigger there would
  // widen the pill's link row and break its alignment with the other pages.
  // Sign out is not repeated here; it is the mobile CTA directly below.
  // Signed in, the account entries become the last accordion in the mobile
  // panel, triggered by the avatar rather than a word — the phone equivalent
  // of the desktop popover, and it sits where the old "Sign out" row was.
  // Sign out is one of its items now rather than a separate CTA below, so
  // there is a single account control instead of two.
  //
  // Desktop keeps `dropdowns` untouched: a seventh trigger there would widen
  // the pill's link row and break its alignment with the other pages.
  const mobileDropdowns = signedIn
    ? [...dropdowns.map((d, i) =>
        // The account row draws its own divider (the heavier one that matches
        // the header rule under the logo), so the group directly above it
        // drops its bottom border — otherwise the two stack into a double line.
        i === dropdowns.length - 1
          ? { ...d, className: "hp-nav__mobile-group--flush" }
          : d
      ), {
        key: "account",
        className: "hp-nav__mobile-group--account",
        items: ACCOUNT_ITEMS,
        trigger: (
          <span className="hp-nav__mobile-account">
            <span className="hp-nav__mobile-account-avatar" aria-hidden="true">{initial}</span>
            <span className="hp-nav__mobile-account-email">{email || "Your account"}</span>
          </span>
        ),
        label: email || "Your account",
      }]
    : dropdowns;

  return (
    <nav className={`hp-nav${menuOpen ? " hp-nav--open" : ""}${entranceReady ? "" : " hp-nav--anim-hold"}`} ref={navRef} aria-label="Main navigation">
      {/* Shown only while the pill is folding/unfolding: starts centered
          over the folded circle, then slides left to land exactly where
          the real logo (inside .hp-nav__inner below) sits, handing off to
          it there instead of just fading away mid-air. Kept outside the
          pill (which animates its own width/radius for the circle shape)
          so this slide stays a pure translateX with no distortion.
          Unmounted entirely once `folding` goes false (not just hidden),
          so it can never replay from a later viewport change.

          Also gated on foldSlideX having actually been measured, so this
          can never animate against Nav.css's hardcoded fallback distance —
          that fallback is tuned for one specific pill width and lands the
          logo away from its real resting spot, which reads as the logo
          teleporting at the handoff. Nothing is lost by waiting: while the
          measurement is still pending, the page's own PageLoader is still
          covering the navbar, and this intro is paused behind it anyway
          (see hp-nav--anim-hold). */}
      {folding && foldSlideX !== null && (
        <div
          className="hp-nav__fold-logo"
          aria-hidden="true"
          style={foldSlideX !== null ? { "--fold-slide-x": `${foldSlideX}px` } : undefined}
        >
          <img src={logo} alt="" />
        </div>
      )}
      <div
        className={`hp-nav__pill${folding ? " hp-nav__pill--fold" : ""}${poppedIn ? " has-popped-in" : ""}`}
        style={pillFinalWidth !== null ? { "--pill-final-width": `${pillFinalWidth}px` } : undefined}
        onAnimationEnd={(e) => {
          // Plays once on every mount — i.e. every page navigation, since
          // each page mounts its own fresh Nav — folding the pill in and
          // revealing the (already page-specific) links/button. A held
          // animation would otherwise permanently block the pill's other
          // transform-driven states (the solid-on-scroll effect, the
          // mobile hover scale), so it's stripped once it finishes.
          if (e.animationName === "hp-nav-fold-in") setFolding(false);
          if (e.animationName === "hp-nav-mobile-pop-in") setPoppedIn(true);
        }}
      >
        <div className="hp-nav__inner">
          {/* Deliberately NOT wrapped in the same fade-in as the group
              below: nested opacity compounds, so if the logo shared a
              fading ancestor with the links/button, it would visibly fade
              in too — a second, subtler fade stacked right on top of the
              fold-logo overlay's own fade-out, which read as a flicker. It
              gets its own instant reveal instead (see .hp-nav__logo-slot
              in Nav.css), snapping to visible in sync with the overlay
              disappearing rather than fading in underneath it. */}
          <div className="hp-nav__logo-slot" ref={logoSlotRef}>{logoEl}</div>
          <div className="hp-nav__inner-content">
            <div className="hp-nav__links">
              {(desktopLinks ?? links).map((link) => renderLink(link))}
              {dropdowns.map((dropdown) => (
                <NavDropdown
                  key={dropdown.key}
                  label={dropdown.label}
                  items={dropdown.items}
                  onOpenChange={(isOpen) => handleDropdownOpenChange(dropdown.key, isOpen)}
                />
              ))}
            </div>
            {desktopCta}
            <button
              className={`hp-nav__hamburger${menuOpen ? " is-open" : ""}`}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="hp-nav__hamburger-bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
        {/* Mobile dropdown — same plain top-level links (Home/Products) plus
            Menu/FAQs grouping as desktop when `dropdowns`
            is supplied, rendered as inline accordions instead of floating
            popovers; falls back to the flat `links` list for pages that
            don't use dropdowns at all (e.g. the 404 page). The CTA is a
            sibling *outside* this scrollable region (see below) rather
            than its last item — on a short viewport (landscape phones,
            a zoomed-in desktop browser) this list alone can already
            exceed the available height and needs to scroll internally;
            burying the primary "Get a quote" CTA at the bottom of that
            same scroll area meant it needed scrolling past every link
            just to become visible. Pinning it outside means it's always
            visible the instant the menu opens, and only the links above
            it ever need to scroll. */}
        <div
          ref={mobilePanelRef}
          className={`hp-nav__mobile${menuOpen ? " is-open" : ""}${mobileOverflows ? " is-overflowing" : ""}${hasExpandedGroup ? " has-expanded-group" : ""}`}
          aria-hidden={!menuOpen}
          style={{
            maxHeight: menuOpen ? mobileMaxHeight : 0,
            transition: instantResize ? "none" : undefined,
          }}
        >
          <div ref={mobileInnerRef}>
            {mobileDropdowns.length > 0
              ? (
                  <>
                    {(desktopLinks ?? []).map((link) =>
                      renderLink(link, { tabIndex: menuOpen ? 0 : -1, onNavigate: () => setMenuOpen(false) })
                    )}
                    {mobileDropdowns.map((dropdown) => (
                      <MobileDropdownGroup
                        key={dropdown.key}
                        label={dropdown.label}
                        trigger={dropdown.trigger}
                        className={dropdown.className}
                        items={dropdown.items}
                        navigate={navigate}
                        onNavigate={() => setMenuOpen(false)}
                        tabIndex={menuOpen ? 0 : -1}
                        onExpandedChange={(isExpanded) => handleGroupExpandedChange(dropdown.key, isExpanded)}
                      />
                    ))}
                  </>
                )
              : links.map((link) =>
                  renderLink(link, { tabIndex: menuOpen ? 0 : -1, onNavigate: () => setMenuOpen(false) })
                )}
          </div>
        </div>
        {/* Omitted entirely when there is no CTA (signed in — Sign out lives in
            the account accordion instead). Rendering it empty would still show
            its divider and padding as a blank bar under the menu. */}
        {mobileCta && (
          <div className={`hp-nav__mobile-cta-wrap${menuOpen ? " is-open" : ""}`} ref={mobileCtaWrapRef}>
            {mobileCta}
          </div>
        )}
      </div>
    </nav>
  );
}
