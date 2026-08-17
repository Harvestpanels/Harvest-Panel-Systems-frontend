import { useEffect, useRef, useState } from "react";

// Animates a displayed integer smoothly toward `target` whenever it
// changes, instead of the text snapping straight to the new number.
export function useCountUp(target, duration = 400) {
  const [displayValue, setDisplayValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);
  const mountedOnceRef = useRef(false);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // All state updates happen inside this scheduled callback (not
    // synchronously in the effect body) so the very first paint and any
    // instant-snap cases still go through a single rAF tick.
    rafRef.current = requestAnimationFrame(() => {
      const isFirstRun = !mountedOnceRef.current;
      mountedOnceRef.current = true;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const from = fromRef.current;
      const delta = target - from;

      if (isFirstRun || delta === 0 || reducedMotion) {
        fromRef.current = target;
        setDisplayValue(target);
        return;
      }

      const start = performance.now();
      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - progress) * (1 - progress);
        setDisplayValue(Math.round(from + delta * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          fromRef.current = target;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayValue;
}
