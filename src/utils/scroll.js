export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Matches the breakpoint the nav itself switches layouts at (see the
// max-width: 1024px block in Nav.css) — desktop here means "wide enough to
// have the full pill nav," not just "has a mouse."
function isDesktopViewport() {
  return window.matchMedia("(min-width: 1025px)").matches;
}

export function scrollCenter(id) {
  // Keep nav visible during programmatic scrolls triggered by nav clicks
  document.querySelector(".hp-nav")?.classList.remove("hp-nav--hidden");
  const el = document.getElementById(id);
  if (!el) return;
  const glass = el.querySelector(".hp-glass") || el;
  const glassRect = glass.getBoundingClientRect();
  const vh = window.innerHeight;

  // Desktop: center the section vertically in the viewport. Mobile/tablet
  // keeps its own, separately-tuned landing (flush against the top of the
  // screen) untouched — the two were deliberately made to behave
  // differently, not left inconsistent by accident.
  const target = isDesktopViewport()
    ? window.scrollY + glassRect.top - (vh - glassRect.height) / 2
    : window.scrollY + glassRect.top;

  window.scrollTo({
    top: Math.max(0, target),
    left: 0,
    behavior: "smooth",
  });
}

export function navClick(e, id, closeMenu) {
  e.preventDefault();
  if (closeMenu) {
    closeMenu();
    // Wait for the mobile nav collapse animation (350ms) before measuring layout
    setTimeout(() => scrollCenter(id), 380);
  } else {
    scrollCenter(id);
  }
}
