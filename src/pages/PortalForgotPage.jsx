import { submitAuthForm } from "../features/auth/actions";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PortalShell from "../components/PortalShell";
import { isSupabaseConfigured } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

export default function PortalForgotPage() {
  usePageMeta({
    title: "Reset password | Harvest Panel Systems",
    description: "Reset your customer portal password.",
    path: "/portal/forgot",
    noindex: true,
  });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { session, loading } = useAuth();

  // Signed in already: the password is changed under Settings, not by email.
  if (!loading && session) return <Navigate to="/portal" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error: err } = await submitAuthForm("forgot", form);
    setBusy(false);
    if (err) return setError(err.message);
    setSent(true);
  }

  return (
    <PortalShell>
      <main className="hp-portal__center">
        <div className="hp-portal-card hp-reveal">
          <h1>Reset password</h1>
          <p className="hp-portal-card__sub">We will email you a link to choose a new one.</p>

          {!isSupabaseConfigured ? (
            <p className="hp-portal-msg hp-portal-msg--error">The portal is not configured yet.</p>
          ) : sent ? (
            <p className="hp-portal-msg hp-portal-msg--ok" role="status">
              If that email has an account, a reset link is on its way.
            </p>
          ) : (
            <form className="hp-portal-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="f-email">Email</label>
              <input id="f-email" name="email" type="email" autoComplete="email" required />
              {error && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{error}</p>}
              <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>
                {busy ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <p className="hp-portal__alt"><Link to="/portal/login">Back to sign in</Link></p>
        </div>
      </main>
    </PortalShell>
  );
}
