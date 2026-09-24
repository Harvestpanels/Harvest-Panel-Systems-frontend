import { useEffect, useLayoutEffect, useRef } from "react";

// Registers elements for scroll-reveal, then fades/slides them in once
// they enter the viewport (via IntersectionObserver). A synchronous
// useLayoutEffect pass runs first so elements already in view on load
// (e.g. after a refresh mid-scroll) don't flash hidden before paint.
//
// Elements can also be registered well after the initial mount — e.g. a
// search/filter UI that swaps one subtree for another. registerReveal
// observes those on the spot instead of relying solely on the one-time
// mount pass, so newly-mounted content that's already on screen reveals
// itself immediately rather than staying stuck invisible forever.
//
// `enabled` (default true) gates both the initial "already in view" pass
// and the IntersectionObserver setup — pass `false` while a page's own
// PageLoader overlay is still covering the screen (see usePageReady/
// PageLoader) so above-the-fold content doesn't finish its whole reveal
// transition hidden behind that overlay before the visitor ever sees it.
// `registerReveal` itself still works normally either way — elements are
// added to the registry regardless, they just aren't observed/revealed
// until `enabled` flips true, at which point this effect re-runs and
// catches every element registered so far.
export function useRevealOnScroll(enabled = true) {
  const revealRegistry = useRef(new Set());
  const observerRef = useRef(null);

  function registerReveal(el) {
    if (!el || revealRegistry.current.has(el)) return;
    revealRegistry.current.add(el);
    observerRef.current?.observe(el);
  }

  useLayoutEffect(() => {
    if (!enabled) return;
    const vh = window.innerHeight;
    revealRegistry.current.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        el.classList.add("is-visible");
      }
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const registry = revealRegistry.current;
    const isTouch = window.matchMedia("(hover: none)").matches;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            // A reveal runs once. Let the browser manage compositing rather
            // than retaining GPU hints when no transition actually fires.
            el.classList.add("is-visible");
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: isTouch ? "0px 0px -5% 0px" : "0px 0px -10% 0px" }
    );
    observerRef.current = observer;
    registry.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      observerRef.current = null;
      registry.forEach(el => {
        if (!el.isConnected) registry.delete(el);
      });
    };
  }, [enabled]);

  return { registerReveal };
}
