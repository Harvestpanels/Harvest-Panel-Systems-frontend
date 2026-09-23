import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

// Landing page for the emailed reset link. The client is created with
// detectSessionInUrl, so by the time this renders Supabase has already traded
// the link token for a short-lived session — that session is what authorises
// the updateUser call below. No token handling of our own.
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

  async function handleSubmit(e) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));

    if (password.length < 8) {
      setError("Please use at least 8 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      // Nearly always an expired or already-used link.
      setError(err.message + " You may need a fresh reset link.");
      setBusy(false);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/portal", { replace: true }), 1200);
  }

  return (
    <PortalShell>
      <div className="hp-portal__center">
        <div className="hp-portal-card hp-reveal">
          <h1>New password</h1>
          <p className="hp-portal-card__sub">Choose a new password for your account.</p>

          {!isSupabaseConfigured ? (
            <p className="hp-portal-msg hp-portal-msg--error">The portal is not configured yet.</p>
          ) : done ? (
            <p className="hp-portal-msg hp-portal-msg--ok" role="status">
              Password updated. Taking you to your documents...
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
      </div>
    </PortalShell>
  );
}
