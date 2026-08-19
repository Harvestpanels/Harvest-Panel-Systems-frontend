import { lazy, Suspense, useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { scrollCenter } from "./utils/scroll";
import ChatWidget from "./components/ChatWidget";

// Route-level code splitting — each page (plus everything it imports:
// components, hooks, and every image it references) only downloads when a
// visitor actually navigates there, instead of all three shipping in one
// bundle up front. A visitor landing on "/" never needs ProductsPage's
// code at all, and vice versa.
const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const SpecsPage = lazy(() => import("./pages/SpecsPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// React Router keeps the browser's scroll position across navigations by
// default (it's an SPA — there's no real page load to reset it), so
// without this, landing on a new route mid-scroll from the previous one
// would leave you scrolled partway down the new page instead of at its top.
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // A plain refresh re-mounts this component with whatever hash happened
  // to still be in the address bar (e.g. "#contact" left over from an
  // earlier "Request pricing" click) — a refresh should always land at the
  // top regardless. Only an actual in-app navigation to a hash link (this
  // effect re-running later, after the first mount) should scroll to that
  // section. This ref distinguishes the two: true only for this component's
  // very first effect run, i.e. the initial page load/refresh itself.
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const firstRun = isInitialLoad.current;
    // Flipped via a deferred timer rather than immediately: React Strict
    // Mode intentionally mounts, cleans up, and re-runs effects once
    // synchronously in development to surface bugs, and flipping the flag
    // right away would make that harmless second pass see firstRun=false —
    // wrongly triggering the hash-scroll branch on what's still really the
    // same initial load. Cancelling the timer in cleanup means both
    // Strict Mode passes see firstRun=true, while any later, genuinely
    // user-triggered navigation (which only happens after a real gap)
    // correctly sees it as false.
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 0);

    // A link like "/#contact" (e.g. the Products page's "Request pricing"
    // CTA) needs to land on that section instead of the top of the page —
    // reusing the same scrollCenter used for in-page nav clicks, which
    // centers short sections in the viewport rather than just pinning
    // them to the top. The target section only exists once the new
    // route's page component has mounted, so this waits a frame before
    // looking for it.
    if (hash && !firstRun) {
      const raf = requestAnimationFrame(() => scrollCenter(hash.slice(1)));
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
    // The site sets `scroll-behavior: smooth` globally on <html>, which
    // would otherwise turn this into a ~700ms animated scroll-up instead
    // of landing on the new page already at the top — explicit "instant"
    // overrides that.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return () => clearTimeout(timer);
  }, [pathname, hash]);
  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      {/* No visible fallback UI — the page's own dark body background
          (see --hp-dark in App.css) already shows during this brief gap,
          and each page chunk is small enough on a real connection that a
          spinner would just flash on and off, reading as more broken than
          a plain, momentary continuation of the page background. */}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/specs" element={<SpecsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      {/* Global floating assistant — rendered once here (not per-page) and
          imported eagerly rather than lazily, so it's present on every
          route immediately, including during a page chunk's own load. */}
      <ChatWidget />
    </>
  );
}

export default App;
