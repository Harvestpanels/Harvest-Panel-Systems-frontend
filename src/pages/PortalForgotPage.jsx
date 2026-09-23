import { useState } from "react";
import { Link } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

export default function PortalForgotPage() {
  usePageMeta({
    title: "Reset password | Harvest Panel Systems",
    description: "Reset your customer portal password.",
    path: "/portal/forgot",
    noindex: true,
  });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setBusy(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/portal/reset",
    });

    // Always reports success, even for an address with no account. Saying "no
    // such user" would turn this form into a way to discover which of your
    // customers hold portal logins.
    setSent(true);
    setBusy(false);
  }

  return (
    <PortalShell>
      <div className="hp-portal__center">
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
              <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>
                {busy ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <p className="hp-portal__alt"><Link to="/portal/login">Back to sign in</Link></p>
        </div>
      </div>
    </PortalShell>
  );
}
