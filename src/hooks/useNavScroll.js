import { useEffect, useRef } from "react";

// Nav-only scroll behavior for pages without the hero video/parallax
// background: solid pill once scrolled, auto-hide on scroll down, and a
// hover-near-top reveal with delayed re-hide — mirrors the nav portion of
// useHeroParallax so the navbar behaves identically on every page.
export function useNavScroll(menuOpen) {
  const navRef = useRef(null);
  // Cached viewport height, not re-read from window.innerHeight on every
  // scroll tick — mobile Chrome/Safari collapse their toolbar as the page
  // scrolls, changing innerHeight mid-gesture independent of the user
  // resizing anything, which could flicker the solid-pill threshold right
  // as it crosses 40% of a shifting value. Updated only on a genuine
  // resize (see the effect below), not on that toolbar-driven noise.
  const vhRef = useRef(window.innerHeight);
  const vwRef = useRef(window.innerWidth);

  useEffect(() => {
    let raf = null;
    let hoverHideTimer = null;

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const vh = vhRef.current;

        // Not while the mobile menu is open — the open panel is the pill
        // itself (see .hp-nav--solid .hp-nav__pill in Nav.css, which scales
        // it down 1% and shifts it 2px), so toggling this mid-scroll while
        // it's open visibly "resized" the whole open menu, links, CTA and
        // all, out from under the user.
        if (!menuOpen) {
          navRef.current?.classList.toggle("hp-nav--solid", y > vh * 0.4);
        }

        // Also held visible while a desktop Menu/Categories dropdown is
        // open — those popups are anchored to the nav, so hiding the nav
        // out from under an open one would strand it (see Nav.jsx's
        // hp-nav--dropdown-open toggling).
        const dropdownOpen = navRef.current?.classList.contains("hp-nav--dropdown-open");
        if (!menuOpen && !dropdownOpen) {
          if (y < 80) {
            clearTimeout(hoverHideTimer);
            navRef.current?.classList.remove("hp-nav--hidden");
          } else {
            navRef.current?.classList.add("hp-nav--hidden");
          }
        }
        raf = null;
      });
    }

    function onMouseMove(e) {
      if (menuOpen || navRef.current?.classList.contains("hp-nav--dropdown-open")) return;
      if (e.clientY <= 100) {
        clearTimeout(hoverHideTimer);
        navRef.current?.classList.remove("hp-nav--hidden");
      } else if (window.scrollY >= 80) {
        clearTimeout(hoverHideTimer);
        hoverHideTimer = setTimeout(() => {
          if (window.scrollY >= 80) {
            navRef.current?.classList.add("hp-nav--hidden");
          }
        }, 1200);
      }
    }

    // See vhRef above — only trust a resize that also changed the width,
    // filtering out mobile browsers' toolbar-collapse-driven height noise.
    function onResize() {
      if (window.innerWidth !== vwRef.current) {
        vwRef.current = window.innerWidth;
        vhRef.current = window.innerHeight;
      }
    }
    window.addEventListener("resize", onResize);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      clearTimeout(hoverHideTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [menuOpen]);

  return navRef;
}
