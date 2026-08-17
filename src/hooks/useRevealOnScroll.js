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
export function useRevealOnScroll() {
  const revealRegistry = useRef(new Set());
  const observerRef = useRef(null);

  function registerReveal(el) {
    if (!el || revealRegistry.current.has(el)) return;
    revealRegistry.current.add(el);
    observerRef.current?.observe(el);
  }

  useLayoutEffect(() => {
    const vh = window.innerHeight;
    revealRegistry.current.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        el.classList.add("is-visible");
      }
    });
  }, []);

  useEffect(() => {
    const isTouch = window.matchMedia("(hover: none)").matches;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            // will-change lives here, not in the CSS class itself (see
            // the comment on .hp-reveal in App.css) — set right before
            // the transition starts, cleared once it actually ends, so
            // only elements currently mid-reveal carry the GPU-layer
            // cost instead of every revealed element on the page holding
            // it forever.
            el.style.willChange = "opacity, transform";
            el.addEventListener(
              "transitionend",
              () => { el.style.willChange = ""; },
              { once: true }
            );
            el.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: isTouch ? "0px 0px -5% 0px" : "0px 0px -10% 0px" }
    );
    observerRef.current = observer;
    revealRegistry.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return { registerReveal };
}
