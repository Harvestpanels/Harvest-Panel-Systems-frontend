import { Outlet } from "react-router-dom";
import AuthProvider from "../context/AuthProvider";

// Wraps every /portal route in the auth session provider.
//
// This exists as its own lazily-loaded route element rather than wrapping the
// whole app in App.jsx: AuthProvider imports the Supabase client, and an eager
// import pulled the entire SDK into the main bundle — about 220KB that every
// visitor reading the marketing pages had to download before seeing anything.
// Loaded here, the SDK only arrives when someone actually opens the portal.
//
// Deliberately no Suspense boundary of its own. One was added here briefly to
// cover the moment a portal page's chunk is still arriving, but it made things
// worse: its fallback mounted a PageLoader, then that one unmounted and the
// page's own PageLoader mounted in its place. The swap restarted both the pulse
// animation and the loader's minimum-visible timer, so the portal's loading
// screen hitched and ran ~300ms longer than every other page's. Falling through
// to App.jsx's boundary means exactly one PageLoader mounts per portal page,
// the same as on the marketing pages.
export default function PortalLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
