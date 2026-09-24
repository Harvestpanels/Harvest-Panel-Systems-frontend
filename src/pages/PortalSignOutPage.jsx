import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
//
// A plain GET never signs anyone out: a prefetch, a crawler or an <img> tag
// pointed at this URL would otherwise end the session. The visitor confirms
// with a button, unless in-app navigation passed `state: { confirmed: true }`.
export default function PortalSignOutPage() {
  usePageMeta({
    title: "Sign out | Harvest Panel Systems",
    description: "Sign out of the customer portal.",
    path: "/portal/signout",
    noindex: true,
  });
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const preconfirmed = location.state?.confirmed === true;
  // StrictMode mounts effects twice in development. Without this the sign-out
  // fires twice — harmless, but it races the redirect below.
  const ran = useRef(false);
  const [busy, setBusy] = useState(preconfirmed);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch {
      setError("Sign out failed. Please try again.");
      setBusy(false);
    }
  }, [signOut, navigate]);

  useEffect(() => {
    if (!preconfirmed || ran.current) return;
    ran.current = true;
    // Deferred a tick so the state updates inside run() are not synchronous
    // in the effect body (react-hooks/set-state-in-effect).
    const timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
  }, [preconfirmed, run]);

  return (
    <PortalShell>
      <main className="hp-portal__center">
        <div className="hp-portal-card hp-reveal">
          <h1>{busy ? "Signing out" : "Sign out"}</h1>
          <p className="hp-portal-card__sub" role={error ? "alert" : "status"}>
            {error || (busy ? "One moment." : "Sign out of the customer portal on this device?")}
          </p>
          {!busy && (
            <div className="hp-portal-card__actions">
              <button type="button" className="hp-btn hp-btn--primary" onClick={run}>
                {error ? "Try again" : "Sign out"}
              </button>
              <Link className="hp-portal__linkbtn" to="/portal">Cancel</Link>
            </div>
          )}
        </div>
      </main>
    </PortalShell>
  );
}
