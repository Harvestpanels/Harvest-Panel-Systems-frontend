import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import AuthProvider from "../context/AuthProvider";
import PageLoader from "../components/PageLoader";

// Wraps every /portal route in the auth session provider.
//
// This exists as its own lazily-loaded route element rather than wrapping the
// whole app in App.jsx: AuthProvider imports the Supabase client, and an eager
// import pulled the entire SDK into the main bundle — about 220KB that every
// visitor reading the marketing pages had to download before seeing anything.
// Loaded here, the SDK only arrives when someone actually opens the portal.
export default function PortalLayout() {
  return (
    <AuthProvider>
      {/* Its own boundary, showing the loading screen rather than App.jsx's
          `null` fallback.

          A portal page only starts fetching its chunk once RequireAuth has a
          session, which is well after the loading screen in index.html has
          handed over. While that chunk is in flight React suspends — and a
          suspended tree is hidden with display:none, not unmounted, so the
          loader that was on screen vanished and the null fallback left the
          page blank for about 300ms. That read as a blink between two loading
          screens, and only on the portal: every marketing page has its chunk
          in hand before the handover, so it never suspends at this point.

          ready={false} because this only means "the code is still arriving" —
          the page's own PageLoader takes over the moment it mounts, and that
          one decides when loading has actually finished. */}
      <Suspense fallback={<PageLoader ready={false} />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  );
}
