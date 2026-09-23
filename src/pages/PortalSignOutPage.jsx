import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { useAuth } from "../hooks/useAuth";
import { usePageMeta } from "../hooks/usePageMeta";

// Signing out as a route rather than a click handler in the navbar.
//
// <Nav> renders on every marketing page, where AuthProvider is not mounted and
// the Supabase SDK is deliberately absent (importing it there would add ~220KB
// to the main bundle for visitors who never open the portal — see
// useSessionHint and PortalLayout). A "Sign out" button in the nav would need
// that client. Linking here instead keeps the marketing bundle untouched: this
// route already sits inside the lazily-loaded portal chunk, so the SDK is
// fetched only by someone actually signing out.
export default function PortalSignOutPage() {
  usePageMeta({
    title: "Signing out | Harvest Panel Systems",
    description: "Signing out of the customer portal.",
    path: "/portal/signout",
    noindex: true,
  });
  const { signOut } = useAuth();
  const navigate = useNavigate();
  // StrictMode mounts effects twice in development. Without this the sign-out
  // fires twice — harmless, but it races the redirect below.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // Revokes the session and clears local storage. If the network call
      // fails the local session is dropped anyway, so they go home either way
      // rather than being stranded on this screen.
      await signOut();
      navigate("/", { replace: true });
    })();
  }, [signOut, navigate]);

  return (
    <PortalShell>
      <div className="hp-portal__center">
        <div className="hp-portal-card hp-reveal">
          <h1>Signing out</h1>
          <p className="hp-portal-card__sub">One moment.</p>
        </div>
      </div>
    </PortalShell>
  );
}
