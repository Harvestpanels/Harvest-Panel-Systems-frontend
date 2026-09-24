import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./PageLoader.css";
import logo from "../assets/images/General/harvest_panels_logo.png";
import { markAppReady } from "../utils/appReady";

// Shared first-view loading status. Content mounts underneath while declared
// posters/logo settle; decorative video and offscreen media load independently.
const FADE_OUT_MS = 500;
// On a fast load (small/cached assets), `ready` can flip true within a
// couple hundred ms of mount — starting the fade-out immediately at that
// point makes the whole loader read as a single quick flicker rather than
// a deliberate loading screen. Holding it visible for at least this long
// (measured from mount, not from when `ready` flips) keeps it
// recognizable as an actual loading animation instead of a flash, while
// still not adding any delay on a slow load, where the real asset loading
// time already exceeds this floor.
const MIN_VISIBLE_MS = 900;
export default function LoadingOverlay({ ready, onDone }) {
  const overlayRef = useRef(null);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mountedAt] = useState(Date.now);
  // Read via a ref inside the effect below, not as a dependency directly —
  // callers typically pass an inline arrow function (a fresh identity every
  // render), and depending on it directly would re-run that effect (and
  // restart its timer) on every parent re-render that happens to occur
  // while fading, indefinitely postponing onDone if the parent re-renders
  // often enough.
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => {
    onDoneRef.current = onDone;
  });

  // Inert sibling branches all the way to body, including portals added later.
  // No wrapper is introduced, so existing layout selectors keep working.
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!visible || !overlay) return;
    const previousFocus = document.activeElement;
    const originals = new Map();
    const blockBackground = () => {
      let branch = overlay;
      while (branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling === branch || originals.has(sibling)) continue;
          originals.set(sibling, sibling.getAttribute("inert"));
          sibling.setAttribute("inert", "");
        }
        branch = branch.parentElement;
        if (branch === document.body) break;
      }
    };
    blockBackground();
    overlay.focus({ preventScroll: true });
    const keepFocus = (event) => {
      if (!overlay.contains(event.target)) overlay.focus({ preventScroll: true });
    };
    document.addEventListener("focusin", keepFocus);
    const observer = new MutationObserver(blockBackground);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", keepFocus);
      originals.forEach((value, element) => {
        if (value === null) element.removeAttribute("inert");
        else element.setAttribute("inert", value);
      });
      const target = previousFocus?.isConnected && previousFocus !== document.body
        && !overlay.contains(previousFocus)
        && !previousFocus.closest("[inert]") ? previousFocus
        : document.querySelector("#hp-main") || document.querySelector("main");
      if (target && !target.closest("[inert]")) {
        const tabIndex = target.getAttribute("tabindex");
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        if (tabIndex === null) target.removeAttribute("tabindex");
        else target.setAttribute("tabindex", tabIndex);
      }
    };
  }, [visible]);

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt;
    const startFadeDelay = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const startFadeTimer = setTimeout(() => setFading(true), startFadeDelay);
    return () => clearTimeout(startFadeTimer);
  }, [ready, mountedAt]);

  useEffect(() => {
    if (!fading || !ready) return;
    // `onDone` fires here — once the overlay has actually fully faded out,
    // not when `ready` first flips or when the fade merely starts — so a
    // page can hold its own content's entrance animations (hero fades,
    // section cascades) until the visitor can actually see them, instead
    // of those animations running to completion hidden behind this
    // overlay the whole time.
    const removeTimer = setTimeout(() => {
      setVisible(false);
      onDoneRef.current?.();
      // Also unblocks ChatWidget's own entrance (see appReady.js) — it's
      // mounted once in App.jsx outside any page's tree, so it has no
      // direct access to this page's `loaderDone` state otherwise.
      markAppReady();
    }, FADE_OUT_MS);
    return () => clearTimeout(removeTimer);
  }, [fading, ready]);

  if (!visible) return null;

  return (
    <div ref={overlayRef} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className={`hp-page-loader${fading && ready ? " is-ready" : ""}`}>
      <span className="hp-page-loader__status">Loading page, please wait.</span>
      <img
        src={logo}
        alt=""
        className="hp-page-loader__logo"
      />
    </div>
  );
}
