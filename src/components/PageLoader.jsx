import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./PageLoader.css";
import logo from "../assets/images/General/harvest_panels_logo.png";
import { markAppReady } from "../utils/appReady";

// Full-viewport overlay shown until this page's critical first-view assets
// are ready (see usePageReady) — the page underneath still mounts and
// starts loading everything normally, this just sits on top so the
// visitor never sees an unstyled flash or a missing hero image/video
// frame before they land on it.
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

export default function PageLoader({ ready, onDone }) {
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);
  // Lazy useState initializer, not useRef(Date.now()) — the ref form calls
  // Date.now() directly during render (impure, flagged by the
  // react-hooks/purity rule); a lazy initializer function is the
  // sanctioned escape hatch since React guarantees it only runs once.
  const [mountedAt] = useState(() => Date.now());
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

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt;
    const startFadeDelay = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const startFadeTimer = setTimeout(() => setFading(true), startFadeDelay);
    return () => clearTimeout(startFadeTimer);
  }, [ready, mountedAt]);

  useEffect(() => {
    if (!fading) return;
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
  }, [fading]);

  if (!visible) return null;

  return (
    <div className={`hp-page-loader${fading ? " is-ready" : ""}`} aria-hidden={fading}>
      <img src={logo} alt="" className="hp-page-loader__logo" />
    </div>
  );
}
