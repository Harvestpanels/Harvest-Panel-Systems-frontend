import { useCallback, useEffect, useState } from "react";

// Keeps a conditionally-rendered overlay (lightbox, dialog, chat panel)
// mounted briefly after `open` goes false so it can play its exit
// animation. While `closing` is true the component should add its
// `.is-closing` class; pass `onExited` as the element's onAnimationEnd and
// it unmounts once that animation finishes. The timeout is a fallback for
// the cases where animationend never fires (element hidden, tab in the
// background, CSS failed to load). Under reduced motion there is no exit
// animation, so it unmounts immediately.
const FALLBACK_MS = 300;

export function usePresence(open) {
  const [mounted, setMounted] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);

  // Adjust state during render when `open` changes (React's recommended
  // pattern for state derived from a prop) rather than in an effect.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setMounted(true);
    else if (
      typeof window === "undefined" ||
      !window.matchMedia ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setMounted(false);
    }
  }

  const closing = mounted && !open;

  useEffect(() => {
    if (!closing) return;
    const id = setTimeout(() => setMounted(false), FALLBACK_MS);
    return () => clearTimeout(id);
  }, [closing]);

  const onExited = useCallback((e) => {
    // Only the root element's own exit animation — not a child's, which
    // bubbles through the same handler.
    if (e && e.target !== e.currentTarget) return;
    if (!open) setMounted(false);
  }, [open]);

  return { mounted, closing, onExited };
}
