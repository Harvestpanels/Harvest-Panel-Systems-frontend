import { Fragment, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PageLoader from "./PageLoader";

// How long to keep waiting for a profile row before treating its absence as a
// failure rather than as the signup trigger still running. That trigger takes a
// fraction of a second in practice; anything past this is not slowness.
const PROFILE_GRACE_MS = 6000;

// Route guard. This is a convenience for the visitor, NOT a security boundary:
// it only decides what to render. The actual protection is Row Level Security
// in Postgres, which refuses to return another account's rows no matter what
// this component does.
export default function RequireAuth({ children, adminOnly = false }) {
  const { session, profile, loading, isAdmin, refreshProfile, signOut, error } = useAuth();
  const location = useLocation();
  const [graceOver, setGraceOver] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  // Only runs while we are actually waiting — a signed-in visitor with a
  // profile never starts the timer.
  const waitingForProfile = Boolean(session) && !profile && !loading;

  // Same shape as PageLoader's own timers: an early return rather than
  // resetting state here, since a synchronous setState in an effect body is
  // what react-hooks/set-state-in-effect exists to catch. The reset lives in
  // the "Try again" handler instead, which starts a fresh grace period.
  useEffect(() => {
    if (!waitingForProfile) return undefined;
    const timer = setTimeout(() => setGraceOver(true), PROFILE_GRACE_MS);
    return () => clearTimeout(timer);
  }, [waitingForProfile]);

  // Wait for the first session check before deciding, otherwise a refresh
  // bounces an already-signed-in user to the login page.
  // The site's own loading overlay, not a bare line of text: PortalShell shows
  // the same one a moment later, so using anything else here means the visitor
  // watches two different loading screens on the way to one page.
  // A retry from the recovery screen below also flips `loading`; keep that
  // screen up with its busy button instead of swapping to the overlay.
  if (loading && !retrying) return <PageLoader ready={false} />;

  if (error && !session) return <div className="hp-portal"><div className="hp-portal__center"><div className="hp-portal-card" role="alert"><h1>Could not check your session</h1><p className="hp-portal-card__sub">{error}</p><button type="button" className="hp-btn hp-btn--primary" onClick={() => window.location.reload()}>Reload</button></div></div></div>;

  if (!session) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />;
  }



  if (!profile) {
    // Signed in, but the signup trigger has not finished writing the profile
    // row yet — normal for the first second of a brand new account.
    if (!graceOver && !error && !retrying) return <PageLoader ready={false} />;

    // Past the grace period this is a failure, not slowness: the row is
    // missing, RLS refused it, or the request never came back. Without this
    // branch the visitor sat on the loading overlay indefinitely with no way
    // forward and no way out, which is worse than an honest dead end.
    return (
      <div className="hp-portal">
        <div className="hp-portal__center">
          <div className="hp-portal-card">
            <h1>We could not open your account</h1>
            <p className="hp-portal-card__sub">
              You are signed in, but we could not load your account details. This is usually a
              temporary connection problem.
            </p>

            {actionError && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{actionError}</p>}
            <div className="hp-portal-card__actions">
              <button
                type="button"
                className="hp-btn hp-btn--primary"
                disabled={retrying}
                onClick={async () => {
                  setRetrying(true);
                  setActionError(null);
                  // A fresh grace period: if the row simply has not landed yet,
                  // wait for it again rather than bouncing straight back here.
                  setGraceOver(false);
                  try { await refreshProfile(); } finally { setRetrying(false); }
                }}
              >
                {retrying ? "Trying again..." : "Try again"}
              </button>

              <button type="button" className="hp-portal__linkbtn" onClick={() => signOut().catch(() => setActionError("Sign out failed. Please try again."))}>
                Sign out
              </button>
            </div>

            <p className="hp-portal__alt">
              Still stuck? <Link to="/#contact">Contact us</Link> and we will sort it out.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (adminOnly && !isAdmin) return <Navigate to="/portal" replace />;
  return <Fragment key={`${profile.id}:${profile.account_id}`}>{children}</Fragment>;
}
