import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { useAuth } from "../hooks/useAuth";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

export default function PortalLoginPage() {
  usePageMeta({
    title: "Sign in | Harvest Panel Systems",
    description: "Customer portal sign in.",
    path: "/portal/login",
    noindex: true,
  });
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (opened from a bookmark, say) — go straight through
  // rather than showing a form that would be a no-op.
  if (!loading && session) return <Navigate to="/portal" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });

    if (err) {
      // Supabase returns one message for both "no such user" and "wrong
      // password" on purpose: telling them apart would let anyone probe which
      // email addresses have accounts. Shown as-is rather than "improved".
      setError(err.message);
      setBusy(false);
      return;
    }
    navigate(location.state?.from || "/portal", { replace: true });
  }

  return (
    <PortalShell>
      <div className="hp-portal__center">
        <div className="hp-portal-card hp-reveal">
          <h1>Sign in</h1>
          <p className="hp-portal-card__sub">Access documents shared with your account.</p>

          {!isSupabaseConfigured ? (
            <p className="hp-portal-msg hp-portal-msg--error">
              The portal is not configured yet. Add the Supabase environment variables and redeploy.
            </p>
          ) : (
            <form className="hp-portal-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="p-email">Email</label>
              <input id="p-email" name="email" type="email" autoComplete="email" required />

              <label htmlFor="p-password">Password</label>
              <input id="p-password" name="password" type="password" autoComplete="current-password" required />

              {error && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{error}</p>}

              <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <p className="hp-portal__alt"><Link to="/portal/forgot">Forgot your password?</Link></p>
          <p className="hp-portal__alt">No account yet? <Link to="/portal/signup">Create one</Link></p>
        </div>
      </div>
    </PortalShell>
  );
}
