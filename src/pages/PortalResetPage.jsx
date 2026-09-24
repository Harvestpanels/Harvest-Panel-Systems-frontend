import { authAction } from "../features/auth/actions";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PortalShell from "../components/PortalShell";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

// Landing page for the emailed reset link. The client is created with
// detectSessionInUrl, so by the time this renders Supabase has already traded
// the link token for a short-lived session — that session is what authorises
// the updateUser call below. No token handling of our own.
//
// Only a recovery session may set a password here. Any other signed-in session
// is sent to Settings, which asks for the current password first — otherwise
// someone at an unlocked, signed-in browser could take over the account.
export default function PortalResetPage() {
  usePageMeta({
    title: "Choose a new password | Harvest Panel Systems",
    description: "Set a new portal password.",
    path: "/portal/reset",
    noindex: true,
  });
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { recovery, loading, endRecovery } = useAuth();

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => navigate("/portal", { replace: true }), 1200);
    return () => clearTimeout(timer);
  }, [done, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));

    if (password.length < 8) {
      setError("Please use at least 8 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    const { error: err } = await authAction(() => supabase.auth.updateUser({ password }));

    if (err) {
      // Nearly always an expired or already-used link.
      setError(err.message + " You may need a fresh reset link.");
      setBusy(false);
      return;
    }
    endRecovery();
    setDone(true);
  }

  return (
    <PortalShell>
      <main className="hp-portal__center">
        <div className="hp-portal-card hp-reveal">
          <h1>New password</h1>
          <p className="hp-portal-card__sub">Choose a new password for your account.</p>

          {!isSupabaseConfigured ? (
            <p className="hp-portal-msg hp-portal-msg--error">The portal is not configured yet.</p>
          ) : done ? (
            <p className="hp-portal-msg hp-portal-msg--ok" role="status">
              Password updated. Taking you to your documents...
            </p>
          ) : loading ? (
            <p className="hp-panel__note" role="status">Checking your reset link...</p>
          ) : !recovery ? (
            <p className="hp-portal-msg hp-portal-msg--error" role="alert">
              This page only works from a password reset email link. If you followed one, it may
              have expired or already been used. <Link to="/portal/forgot">Request a new reset link</Link>, or if you are
              signed in, change your password under <Link to="/portal/settings">Settings</Link>.
            </p>
          ) : (
            <form className="hp-portal-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="r-password">New password</label>
              <input id="r-password" name="password" type="password" autoComplete="new-password" required minLength={8} />
              {error && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{error}</p>}
              <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>
                {busy ? "Saving..." : "Save password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </PortalShell>
  );
}
