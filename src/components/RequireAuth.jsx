import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Route guard. This is a convenience for the visitor, NOT a security boundary:
// it only decides what to render. The actual protection is Row Level Security
// in Postgres, which refuses to return another account's rows no matter what
// this component does.
export default function RequireAuth({ children, adminOnly = false }) {
  const { session, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Wait for the first session check before deciding, otherwise a refresh
  // bounces an already-signed-in user to the login page.
  if (loading) return <div className="hp-portal-loading">Loading…</div>;

  if (!session) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/portal" replace />;

  // Signed in, but the signup trigger has not finished writing the profile row
  // yet (a fraction of a second on first login).
  if (!profile) return <div className="hp-portal-loading">Preparing your account…</div>;

  return children;
}
