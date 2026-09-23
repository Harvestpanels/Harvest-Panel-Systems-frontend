import { lazy, Suspense, useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { scrollCenter } from "./utils/scroll";
import ChatWidget from "./components/ChatWidget";
import RequireAuth from "./components/RequireAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader from "./components/PageLoader";
import AuthModalProvider from "./context/AuthModalProvider";

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

// Customer portal. Lazy like every other route, so none of its code — or the
// Supabase client it pulls in — ships to a visitor who only reads the
// marketing pages.
const PortalLayout = lazy(() => import("./pages/PortalLayout"));
const PortalLoginPage = lazy(() => import("./pages/PortalLoginPage"));
const PortalSignupPage = lazy(() => import("./pages/PortalSignupPage"));
const PortalForgotPage = lazy(() => import("./pages/PortalForgotPage"));
const PortalResetPage = lazy(() => import("./pages/PortalResetPage"));
const PortalPage = lazy(() => import("./pages/PortalPage"));
const PortalProfilePage = lazy(() => import("./pages/PortalProfilePage"));
const PortalSettingsPage = lazy(() => import("./pages/PortalSettingsPage"));
const PortalAdminPage = lazy(() => import("./pages/PortalAdminPage"));
const PortalSignOutPage = lazy(() => import("./pages/PortalSignOutPage"));

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
    <AuthModalProvider>
      <ScrollToTop />
      {/* First thing in the tab order on every page, so a keyboard or screen
          reader user can jump the navbar instead of tabbing through it on
          every route. Visually hidden until focused (see .hp-skip-link). */}
      <a className="hp-skip-link" href="#hp-main">Skip to content</a>

      <ErrorBoundary>
      {/* The loading screen, not `null`.

          This was `null`, reasoning that a chunk loads fast enough that a
          loader would flash on and off. That holds for the marketing pages,
          whose chunk is already in flight before anything is on screen. It
          does not hold for the portal: a portal page only starts fetching its
          chunk once the session check has passed, well after its loading
          screen is up. React hides a suspended tree with display:none rather
          than unmounting it, so the loader vanished and `null` left a bare
          dark screen for ~300ms before it returned — on the portal only,
          which is why its loading looked unlike the homepage's.

          Measured, visible loader appears -> disappears:
            before  /products       401ms -> 1509ms   one continuous run
                    /portal         404 -> 424, then 747 -> 1835   blank 323ms
                    /portal/profile 382 -> 408, then 708 -> 1828   blank 326ms
            after   /products        98ms -> 1512ms
                    /portal          63ms -> 1788ms   one continuous run

          Navigation is unaffected: the loader is on screen for the same time
          either way (1287ms vs 1273ms Home->Products, 1271ms vs 1284ms on a
          cached route), because each page mounts its own PageLoader as soon as
          it renders regardless. */}
      <Suspense fallback={<PageLoader ready={false} />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/specs" element={<SpecsPage />} />
          <Route path="/blog" element={<BlogPage />} />

          {/* Portal. The three public routes stay reachable signed-out;
              everything under RequireAuth waits for the session check before
              rendering so a refresh does not bounce a signed-in user to the
              login screen. RequireAuth only decides what to render — the real
              protection is Row Level Security in Postgres. */}
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<RequireAuth><PortalPage /></RequireAuth>} />
            <Route path="login" element={<PortalLoginPage />} />
            <Route path="signup" element={<PortalSignupPage />} />
            <Route path="forgot" element={<PortalForgotPage />} />
            <Route path="reset" element={<PortalResetPage />} />
            <Route path="profile" element={<RequireAuth><PortalProfilePage /></RequireAuth>} />
            <Route path="settings" element={<RequireAuth><PortalSettingsPage /></RequireAuth>} />
            {/* Not wrapped in RequireAuth: arriving here already signed out
                (a stale nav, a second tab) should still land you home, not
                bounce you to a sign-in form. */}
            <Route path="signout" element={<PortalSignOutPage />} />
            <Route path="admin" element={<RequireAuth adminOnly><PortalAdminPage /></RequireAuth>} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      {/* Global floating assistant — rendered once here (not per-page) and
          imported eagerly rather than lazily, so it's present on every
          route immediately, including during a page chunk's own load. */}
      <ChatWidget />
      {/* Vercel's page-view/traffic analytics — tracks route changes
          automatically (via useLocation internally), so it only needs to
          be mounted once here, same as ChatWidget above. No-ops entirely
          when not actually deployed on Vercel. */}
      <Analytics />
    </AuthModalProvider>
  );
}

export default App;
