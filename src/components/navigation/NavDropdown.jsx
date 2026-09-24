import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { onOtherPanelOpened } from "../../utils/floatingPanels";

// Matches the panel's own transition duration in Nav.css — the panel stays
// mounted this long after `open` goes false so its fade/slide-out can
// actually play instead of just vanishing on the closing click.
const PANEL_CLOSE_MS = 160;

// Smallest gap a dropdown panel keeps from the viewport edge when clamped.
const EDGE_GAP = 12;

export default function NavDropdown({
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

  useEffect(() => onOtherPanelOpened("desktop-nav", () => {
    pendingFocusRef.current = null;
    setOpen(false);
  }), []);

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
    const handleResize = () => {
      if (window.matchMedia("(max-width: 1024px)").matches) {
        pendingFocusRef.current = null;
        setOpen(false);
      } else updatePos();
    };
    // Capture-phase so scrolling any ancestor repositions the panel;
    // coalesced to one measurement per frame and passive so it never
    // blocks scrolling.
    let scrollRaf = 0;
    const handleScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        updatePos();
      });
    };
    const scrollOpts = { capture: true, passive: true };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, scrollOpts);
    return () => {
      cancelAnimationFrame(scrollRaf);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, scrollOpts);
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
            inert={!open}
            aria-hidden={!open}
            className={`hp-nav__menu-panel${panelClassName ? " " + panelClassName : ""}${visualOpen ? " is-open" : ""}${hasEntered ? " has-entered" : ""}`}
            style={{ top: panelPos.top, left: panelPos.left, maxHeight: `calc(100dvh - ${panelPos.top + EDGE_GAP}px)` }}
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
                  state={item.state}
                  className={`hp-nav__menu-item${item.active ? " is-current" : ""}${extra}`}
                  style={style}
                  tabIndex={open ? 0 : -1}
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
                  tabIndex={open ? 0 : -1}
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
