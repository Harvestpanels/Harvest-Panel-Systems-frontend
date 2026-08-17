import "./Lightbox.css";
import { useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 40;

// Given the fixed frame's size and a photo's natural (unscaled) dimensions,
// works out where an `object-fit: contain`-displayed image actually lands
// inside that frame — needed because the frame is now a fixed size (so
// portrait and landscape photos both occupy a similarly large area on
// screen, see Lightbox.css) while the caption/count overlay still needs to
// track the true edges of the visible photo, not the frame's empty
// letterbox space around it.
function computeContainBox(frame, natural) {
  if (!frame || !natural || !frame.width || !frame.height || !natural.width || !natural.height) return null;
  const frameRatio = frame.width / frame.height;
  const imgRatio = natural.width / natural.height;
  let width, height;
  if (imgRatio > frameRatio) {
    width = frame.width;
    height = width / imgRatio;
  } else {
    height = frame.height;
    width = height * imgRatio;
  }
  return { x: (frame.width - width) / 2, y: (frame.height - height) / 2, width, height };
}

// Swipe-to-navigate on the photo (touch devices — desktop pointers have no
// swipe gesture and already have arrow buttons/arrow keys). No pinch/
// double-tap zoom — removed per request, photos display at a fixed size.
function ZoomableImage({ src, alt, onNext, onPrev, onNaturalSize }) {
  const gestureRef = useRef({ startTouch: { x: 0, y: 0 }, active: false });

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    gestureRef.current = { startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY }, active: true };
  }

  function handleTouchMove(e) {
    if (!gestureRef.current.active || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - gestureRef.current.startTouch.x;
    const dy = e.touches[0].clientY - gestureRef.current.startTouch.y;
    // Once it's clearly more horizontal than vertical, claim the gesture
    // (block page scroll) — same disambiguation the gallery carousel uses,
    // so an intentional vertical scroll starting on the photo still works
    // normally instead of being hijacked.
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) e.preventDefault();
  }

  function handleTouchEnd(e) {
    if (!gestureRef.current.active || e.changedTouches.length !== 1) return;
    gestureRef.current.active = false;
    const dx = e.changedTouches[0].clientX - gestureRef.current.startTouch.x;
    const dy = e.changedTouches[0].clientY - gestureRef.current.startTouch.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onNext();
      else onPrev();
    }
  }

  return (
    <img
      src={src}
      alt={alt}
      className="hp-lightbox__img"
      onLoad={(e) => onNaturalSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}

export default function Lightbox({ images, index, onClose, onNext, onPrev }) {
  const item = images[index];
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const frameRef = useRef(null);

  // The frame (.hp-lightbox__figure) is now a fixed, large size (see
  // Lightbox.css) so portrait and landscape photos both occupy a similarly
  // prominent area on screen instead of a landscape photo — capped by the
  // frame's width — ending up short with lots of empty space around it.
  // Photos display via `object-fit: contain` within that frame, so the
  // caption/count overlay needs to track the true rendered bounds of the
  // photo (not the frame itself, which is often bigger than the photo).
  const [frameSize, setFrameSize] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  // Resets naturalSize the moment `index` changes, synchronously during
  // render rather than in an effect — this is React's own recommended
  // pattern for "clear derived state when a prop changes" (see "Adjusting
  // state when a prop changes" in the React docs). Doing it here instead
  // of after the fact avoids a frame (or longer, until the new photo
  // finishes loading) where the overlay is sized/positioned for the
  // previous photo's dimensions while already showing the new caption.
  const [prevIndex, setPrevIndex] = useState(index);
  if (index !== prevIndex) {
    setPrevIndex(index);
    setNaturalSize(null);
  }
  const visibleBox = computeContainBox(frameSize, naturalSize);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFrameSize({ width, height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation, focus trap, and scroll lock while the lightbox is
  // mounted (open). Moves focus into the dialog on open and restores it to
  // whatever triggered the lightbox (the gallery card) on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(
          'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose, onNext, onPrev]);

  return (
    <div
      ref={dialogRef}
      className="hp-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button ref={closeButtonRef} type="button" className="hp-lightbox__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </button>

      <figure className="hp-lightbox__figure" ref={frameRef}>
        {/* The clip (border-radius + overflow: hidden) lives on this
            wrapper — not the <img> itself, since a border-radius clip on
            an element also being scaled/translated via transform is a
            known browser rendering quirk (the GPU-composited layer's
            corner clip doesn't always perfectly track the transform).
            The caption/count/nav-group overlay is nested inside this same
            wrapper (not a separate sibling with its own border-radius)
            so it shares exactly one clip boundary with the image instead
            of two independently-positioned rounded corners that could be
            a sub-pixel off from each other, showing as a hairline gap. */}
        <div className="hp-lightbox__img-clip">
          <ZoomableImage
            key={index}
            src={item.src}
            alt={item.title}
            onNext={onNext}
            onPrev={onPrev}
            onNaturalSize={(w, h) => setNaturalSize({ width: w, height: h })}
          />
          {visibleBox && (
            <div
              className="hp-lightbox__photo-overlay"
              style={{ left: visibleBox.x, top: visibleBox.y, width: visibleBox.width, height: visibleBox.height }}
            >
              <span className="hp-lightbox__count">{index + 1} / {images.length}</span>
              <figcaption>
                <span className="hp-lightbox__use">{item.category}</span>
                <span className="hp-lightbox__title">{item.title}</span>
                <span className="hp-lightbox__desc">{item.desc}</span>
              </figcaption>
              <div className="hp-lightbox__nav-group">
                <button
                  type="button"
                  className="hp-lightbox__nav"
                  onClick={onPrev}
                  disabled={index === 0}
                  aria-label="Previous photo"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  type="button"
                  className="hp-lightbox__nav"
                  onClick={onNext}
                  disabled={index >= images.length - 1}
                  aria-label="Next photo"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </figure>
    </div>
  );
}
