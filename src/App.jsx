import { lazy, Suspense, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { useRouteScroll } from "./hooks/useRouteScroll";
import ChatWidget from "./components/ChatWidget";
import RequireAuth from "./components/RequireAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader from "./components/PageLoader";
import PageLoaderProvider from "./context/PageLoaderProvider";
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

function ScrollToTop() {
  useRouteScroll();
  return null;
}

// Short opacity fade on the page content when navigating between top-level
// sections. Keyed on the first path segment only: different top-level routes
// remount anyway, but nested portal routes share PortalLayout, and keying on
// the full pathname would remount (and re-run) that layout on every portal
// link. The first render is skipped so it doesn't stack on top of the
// initial PageLoader reveal.
function RouteFade({ children }) {
  const { pathname } = useLocation();
  const section = pathname.split("/")[1];
  const [prevSection, setPrevSection] = useState(section);
  const [hasNavigated, setHasNavigated] = useState(false);
  if (section !== prevSection) {
    setPrevSection(section);
    setHasNavigated(true);
  }
  return (
    <div key={section} className={hasNavigated ? "hp-route-fade" : undefined}>
      {children}
    </div>
  );
}

function App() {

  return (
    <AuthModalProvider>
      <PageLoaderProvider>
      <ScrollToTop />
      {/* First thing in the tab order on every page, so a keyboard or screen
          reader user can jump the navbar instead of tabbing through it on
          every route. Visually hidden until focused (see .hp-skip-link). */}
      <a className="hp-skip-link" href="#hp-main">Skip to content</a>

      <ErrorBoundary>
      {/* Each loading stage registers with the persistent overlay outside Suspense. */}
      <RouteFade>
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
      </RouteFade>
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
      </PageLoaderProvider>
    </AuthModalProvider>
  );
}

export default App;
