import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

function NavDropdown({ label, items, onOpenChange }) {
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
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
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
    const updatePos = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPanelPos({ top: rect.bottom + 14, left: rect.left + rect.width / 2 });
    };
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
  }, [open]);

  return (
    <div className="hp-nav__menu-dropdown" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`hp-nav__menu-trigger${open ? " is-active" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
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
        {label}
      </button>
      {mounted && panelPos &&
        createPortal(
          <div
            ref={panelRef}
            className={`hp-nav__menu-panel${visualOpen ? " is-open" : ""}${hasEntered ? " has-entered" : ""}`}
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
            {items.map((item, i) => {
              // Computed here instead of a fixed set of :nth-child CSS
              // rules — that only covered up to the 10th item, so any
              // dropdown grown past that (Overview, once Memberships was
              // added) had its later items snap in instantly instead of
              // continuing the cascade. Same 0.02s base + 0.03s-per-item
              // progression the old rules used, just uncapped.
              const style = { animationDelay: `${(0.02 + i * 0.03).toFixed(2)}s` };
              return item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`hp-nav__menu-item${item.active ? " is-current" : ""}`}
                  style={style}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className={`hp-nav__menu-item${item.active ? " is-current" : ""}`}
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
function MobileDropdownGroup({ label, items, navigate, onNavigate, tabIndex, onExpandedChange }) {
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
    <div className="hp-nav__mobile-group">
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
        {label}
        <svg className="hp-nav__mobile-group-chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className={`hp-nav__mobile-group-panel${expanded ? " is-open" : ""}`}
        style={{ maxHeight: expanded ? height : 0 }}
      >
        <div ref={innerRef}>
          {items.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`hp-nav__mobile-group-item${item.active ? " is-current" : ""}`}
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
                className={`hp-nav__mobile-group-item${item.active ? " is-current" : ""}`}
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
  ctaLabel = "Get a quote",
  ctaHref = "#contact",
  ctaTo,
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
  // still animates immediately.
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
  // But expanding one of its accordion groups (Overview/Inquiry) grows
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
    mobilePanelRef.current?.classList.toggle("has-expanded-group", expanded.size > 0);
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
      // (its own padding included), which is exactly why "Inquiry" kept
      // reading as jammed up against the divider line no matter how much
      // CSS padding was added below it — the padding was there, just cut off.
      const containerStyle = window.getComputedStyle(el.parentElement);
      const containerPaddingY =
        parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);
      setMobileMaxHeight(Math.max(0, Math.min(el.scrollHeight + containerPaddingY, available)));
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
  // correct at any width where the pill has reached its 920px cap, but
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
  // min'd against the 920px cap) and combines it with the logo's intrinsic
  // rendered width, which — being a grid `auto` column — lays out at its
  // natural size regardless of how narrow the (currently clipped) pill is
  // at this moment.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const logoSlot = logoSlotRef.current;
    const inner = nav?.querySelector(".hp-nav__inner");
    if (!nav || !logoSlot || !inner) return;
    const measure = () => {
      const navStyle = getComputedStyle(nav);
      const navPadding = parseFloat(navStyle.paddingLeft) + parseFloat(navStyle.paddingRight);
      const pillFinalWidth = Math.min(920, nav.getBoundingClientRect().width - navPadding);
      const innerPaddingLeft = parseFloat(getComputedStyle(inner).paddingLeft) || 0;
      const logoWidth = logoSlot.getBoundingClientRect().width;
      if (pillFinalWidth <= 0 || logoWidth === 0) return;
      setFoldSlideX(innerPaddingLeft + logoWidth / 2 - pillFinalWidth / 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [navRef]);

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

  const desktopCta = ctaTo ? (
    <Link to={ctaTo} className="hp-nav__quote">{ctaLabel}</Link>
  ) : (
    <a href={ctaHref} className="hp-nav__quote" onClick={(e) => navClick(e, ctaHref.replace("#", ""))}>
      {ctaLabel}
    </a>
  );

  const mobileCta = ctaTo ? (
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

  return (
    <nav className={`hp-nav${menuOpen ? " hp-nav--open" : ""}${entranceReady ? "" : " hp-nav--anim-hold"}`} ref={navRef} aria-label="Main navigation">
      {/* Shown only while the pill is folding/unfolding: starts centered
          over the folded circle, then slides left to land exactly where
          the real logo (inside .hp-nav__inner below) sits, handing off to
          it there instead of just fading away mid-air. Kept outside the
          pill (which animates its own width/radius for the circle shape)
          so this slide stays a pure translateX with no distortion.
          Unmounted entirely once `folding` goes false (not just hidden),
          so it can never replay from a later viewport change. */}
      {folding && (
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
            Overview/Categories/Inquiry grouping as desktop when `dropdowns`
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
          className={`hp-nav__mobile${menuOpen ? " is-open" : ""}`}
          aria-hidden={!menuOpen}
          style={{
            maxHeight: menuOpen ? mobileMaxHeight : 0,
            transition: instantResize ? "none" : undefined,
          }}
        >
          <div ref={mobileInnerRef}>
            {dropdowns.length > 0
              ? (
                  <>
                    {(desktopLinks ?? []).map((link) =>
                      renderLink(link, { tabIndex: menuOpen ? 0 : -1, onNavigate: () => setMenuOpen(false) })
                    )}
                    {dropdowns.map((dropdown) => (
                      <MobileDropdownGroup
                        key={dropdown.key}
                        label={dropdown.label}
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
        <div className={`hp-nav__mobile-cta-wrap${menuOpen ? " is-open" : ""}`} ref={mobileCtaWrapRef}>
          {mobileCta}
        </div>
      </div>
    </nav>
  );
}
