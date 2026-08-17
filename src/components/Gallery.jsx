import "./Gallery.css";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useGalleryCarousel } from "../hooks/useGalleryCarousel";

// Below this, swiping past the last card's edge should feel like there's
// somewhere further to go — a real, physical drag rather than a snap.
const SWIPE_THRESHOLD_PX = 40;

// Accumulated wheel delta (mouse wheel notches report on deltaY, trackpad
// two-finger swipes report on deltaX — summing both lets either gesture
// drive the carousel) needed before advancing exactly one card. Roughly
// one mouse wheel notch (~100-120) or a short trackpad flick.
const WHEEL_THRESHOLD = 60;
// How long to ignore further wheel input right after a step, so one
// continuous trackpad gesture (which fires many small wheel events) only
// advances a single card instead of racing through several. Matches the
// track's own CSS transition duration (see .hp-gallery-track in
// Gallery.css) plus a small buffer, so the next step never interrupts the
// current one mid-animation.
const WHEEL_LOCK_MS = 550;

export default function Gallery({ images, registerReveal, onSelect }) {
  const {
    galleryViewportRef,
    galleryIndex,
    galleryCols,
    galleryStepPx,
    galleryMaxIndex,
    galleryNext,
    galleryPrev,
  } = useGalleryCarousel(images);
  // Kept fresh after every render (not just at effect-setup time) so the
  // wheel handler below always sees the *current* index/max — it's
  // declared once in an effect that doesn't re-run on every index change,
  // so without this it would keep checking against whatever index
  // happened to exist when the listener was first attached. Synced in a
  // layout effect rather than during render itself — refs are an escape
  // hatch for exactly this ("remember a value for an event handler"), not
  // something render is supposed to touch.
  const indexRef = useRef(galleryIndex);
  const maxIndexRef = useRef(galleryMaxIndex);
  useLayoutEffect(() => {
    indexRef.current = galleryIndex;
    maxIndexRef.current = galleryMaxIndex;
  });

  // Touch swipe on the track (mobile has no other way to advance besides
  // the small prev/next buttons up in the header — a horizontally-sliding
  // carousel with no swipe support reads as broken on a touch device,
  // where swiping is the expected gesture). `intent` starts null each
  // touch and gets decided on the first move past a few px: once it's
  // "horizontal", the gesture is treated as ours and page scroll is
  // suppressed; once "vertical", we back off entirely and let the page
  // scroll normally, matching how native carousels disambiguate the two.
  const touchRef = useRef({ x: 0, y: 0, intent: null });

  function handleTouchStart(e) {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, intent: null };
  }

  function handleTouchMove(e) {
    const state = touchRef.current;
    const t = e.touches[0];
    const dx = t.clientX - state.x;
    const dy = t.clientY - state.y;

    if (state.intent === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      state.intent = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (state.intent === "horizontal") e.preventDefault();
  }

  function handleTouchEnd(e) {
    const state = touchRef.current;
    if (state.intent !== "horizontal") return;
    const dx = e.changedTouches[0].clientX - state.x;
    if (dx <= -SWIPE_THRESHOLD_PX) galleryNext();
    else if (dx >= SWIPE_THRESHOLD_PX) galleryPrev();
  }

  // CSS `:hover` only gets re-evaluated on an actual pointer-movement
  // event — it doesn't know or care that a card just slid out from under
  // an otherwise-still cursor. Sliding the track (via the CSS transition
  // below) means the card visually under the mouse changes throughout that
  // ~0.5s animation while the mouse itself never moves, so without this,
  // whatever card happened to be hovered when the step started stays stuck
  // showing the hover state (its zoom/dim-siblings effect) for the whole
  // transition, while the card sliding into place under the cursor shows
  // nothing until the user physically twitches the mouse. Tracking the
  // last real pointer position and re-dispatching a synthetic mousemove at
  // those same coordinates on every animated frame forces the browser to
  // redo its hit-test against the *current* layout, keeping :hover
  // accurate to what's really under the cursor throughout the slide.
  const pointerRef = useRef({ x: 0, y: 0, inside: false });
  // Snapshot of where the cursor was sitting when a wheel-driven step
  // suppressed the dim/blur effect (see the wheel effect below). Cleared
  // only once the cursor genuinely moves away from that spot — a fixed
  // timeout instead would lift the suppression the instant it expires
  // regardless of whether the mouse has actually moved, and since it's
  // completely ordinary for a user to stop scrolling with the cursor still
  // resting on whatever card ended up centered, that would immediately
  // re-trigger the exact dim-siblings/blur look on the neighbors the
  // suppression exists to prevent — right as the suppression window ends,
  // with no mouse movement involved at all.
  const scrollAnchorRef = useRef(null);
  function handleMouseMove(e) {
    pointerRef.current = { x: e.clientX, y: e.clientY, inside: true };
    const anchor = scrollAnchorRef.current;
    if (anchor && (Math.abs(e.clientX - anchor.x) > 2 || Math.abs(e.clientY - anchor.y) > 2)) {
      scrollAnchorRef.current = null;
      galleryViewportRef.current?.classList.remove("is-scrolling");
    }
  }
  function handleMouseLeave() {
    pointerRef.current.inside = false;
  }

  const hoverRafRef = useRef(null);
  function startHoverRefresh() {
    if (hoverRafRef.current != null) return;
    function tick() {
      const pointer = pointerRef.current;
      if (pointer.inside) {
        window.dispatchEvent(new MouseEvent("mousemove", {
          clientX: pointer.x,
          clientY: pointer.y,
          bubbles: true,
          cancelable: true,
          view: window,
        }));
      }
      hoverRafRef.current = requestAnimationFrame(tick);
    }
    hoverRafRef.current = requestAnimationFrame(tick);
  }
  function stopHoverRefresh() {
    if (hoverRafRef.current == null) return;
    cancelAnimationFrame(hoverRafRef.current);
    hoverRafRef.current = null;
  }
  useEffect(() => stopHoverRefresh, []);

  // Desktop only (hover-capable, fine-pointer devices) — mobile already has
  // touch swipe above, and touchscreens report `hover: none` here so this
  // never double-handles the same gesture. Lets a mouse wheel or a
  // trackpad's two-finger scroll advance the carousel one card at a time
  // while hovering it, instead of requiring the small prev/next buttons —
  // the actual movement is just galleryNext/galleryPrev updating the
  // index, so it animates via the track's own CSS transition (smooth,
  // consistent with clicking the buttons) rather than following the raw
  // scroll distance 1:1. Attached as a native listener (not JSX onWheel)
  // specifically so `preventDefault()` actually takes effect — React
  // attaches wheel listeners passively by default, which silently ignores
  // preventDefault and lets the page scroll anyway.
  const wheelStateRef = useRef({ accum: 0, locked: false });
  useEffect(() => {
    const viewport = galleryViewportRef.current;
    if (!viewport) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    function onWheel(e) {
      const rawDelta = e.deltaX + e.deltaY;
      const direction = rawDelta > 0 ? 1 : rawDelta < 0 ? -1 : 0;
      // Already at the end the gesture is pointing toward — there's
      // nothing left for the carousel to do with this scroll, so don't
      // capture it at all. Without this check, every wheel event over the
      // gallery got `preventDefault()`'d unconditionally, which meant a
      // visitor scrolling down with the cursor resting over an
      // already-fully-scrolled gallery could never reach the sections
      // below it — the page just sat there no matter how much they
      // scrolled, since the carousel kept swallowing the gesture and
      // doing nothing with it (galleryNext() at the max index is already
      // a no-op).
      const atBoundary =
        (direction > 0 && indexRef.current >= maxIndexRef.current) ||
        (direction < 0 && indexRef.current <= 0);
      if (atBoundary) return;

      e.preventDefault();
      const state = wheelStateRef.current;
      if (state.locked) return;
      state.accum += rawDelta;
      if (Math.abs(state.accum) < WHEEL_THRESHOLD) return;
      if (state.accum > 0) galleryNext();
      else galleryPrev();
      state.accum = 0;
      state.locked = true;
      startHoverRefresh();
      // Suppresses the sibling-dim-on-hover effect (see .hp-gallery-track
      // in Gallery.css): that effect scales non-hovered cards down to
      // 0.97, and scaling a raster image by a non-integer factor forces
      // the browser to resample it — visually reading as a slight blur.
      // That's a fine deliberate-hover cue when a user is genuinely
      // comparing cards, but scrolling drags the cursor across cards
      // incidentally, so it read as a stray blur stuck on whichever card
      // the cursor passed over. Lifted on genuine mouse movement (see
      // handleMouseMove/scrollAnchorRef above), not on a timer — see that
      // comment for why a timer alone re-triggers the exact thing this is
      // meant to prevent.
      viewport.classList.add("is-scrolling");
      scrollAnchorRef.current = { x: pointerRef.current.x, y: pointerRef.current.y };
      setTimeout(() => {
        state.locked = false;
        stopHoverRefresh();
      }, WHEEL_LOCK_MS);
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [galleryViewportRef, galleryNext, galleryPrev]);

  return (
    <section className="hp-section" id="gallery">
      <div className="hp-section__inner">
        <div className="hp-glass">
          <div className="hp-gallery-header">
            <div>
              <p className="hp-section__eyebrow hp-reveal" ref={registerReveal}>Photo gallery</p>
              <h2 className="hp-reveal" ref={registerReveal}>Projects from the field</h2>
              <p className="hp-gallery-header__desc hp-reveal" ref={registerReveal}>
                Real installs across industrial, commercial, and residential
                builds, browse panels, doors, and finished interiors from
                projects shipped and installed nationwide.
              </p>
            </div>
            <div className="hp-gallery-header__nav hp-reveal" ref={registerReveal}>
              <button
                type="button"
                className="hp-gallery-nav"
                onClick={galleryPrev}
                disabled={galleryIndex === 0}
                aria-label="Previous photos"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                type="button"
                className="hp-gallery-nav"
                onClick={galleryNext}
                disabled={galleryIndex >= galleryMaxIndex}
                aria-label="Next photos"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>

          <div
            className="hp-gallery-viewport hp-reveal"
            ref={(el) => { galleryViewportRef.current = el; registerReveal(el); }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="hp-gallery-track"
              style={{
                transform: `translateX(-${galleryIndex * galleryStepPx}px)`,
                "--cols": galleryCols,
              }}
            >
              {images.map((img, i) => (
                <button
                  type="button"
                  className="hp-gallery-card"
                  key={img.src}
                  onClick={() => onSelect(i)}
                  aria-label={`View "${img.title}" full screen`}
                >
                  <img src={img.src} alt={img.title} loading="lazy" decoding="async" />
                  <span className="hp-gallery-card__label">
                    <span className="hp-gallery-card__use">{img.category}</span>
                    <span className="hp-gallery-card__caption">{img.title}</span>
                    <span className="hp-gallery-card__desc"><span>{img.desc}</span></span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
