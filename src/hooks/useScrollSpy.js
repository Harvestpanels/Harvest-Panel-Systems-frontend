import { useEffect, useState } from "react";

// Tracks which of the given section ids is currently "active" — the last
// one whose top has scrolled up past the nav — for highlighting the
// matching item in the Overview/Categories/Inquiry nav dropdowns. Plain
// rAF-coalesced scroll listener, consistent with the project's other
// scroll-driven hooks (useHeroParallax/useNavScroll). Sections that are
// hidden (display: none — e.g. a filtered-out Products category) are
// skipped via offsetParent, since a hidden element's rect collapses to all
// zeros and would otherwise look like it's always scrolled past.
export function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!ids.length) return;
    let raf = null;

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const navH = document.querySelector(".hp-nav")?.offsetHeight ?? 70;
        const threshold = navH + 40;
        let current = null;
        for (const id of ids) {
          const el = document.getElementById(id);
          if (!el || el.offsetParent === null) continue;
          if (el.getBoundingClientRect().top <= threshold) current = id;
        }
        setActiveId(current);
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ids]);

  return activeId;
}
