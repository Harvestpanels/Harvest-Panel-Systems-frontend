import { useState } from "react";
import { Link } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

export default function PortalSignupPage() {
  usePageMeta({
    title: "Create an account | Harvest Panel Systems",
    description: "Create a customer portal account.",
    path: "/portal/signup",
    noindex: true,
  });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));

    if (password.length < 8) {
      setError("Please use a password of at least 8 characters.");
      return;
    }

    setBusy(true);
    setError(null);

    const { error: err } = await supabase.auth.signUp({
      email: String(form.get("email")).trim(),
      password,
      options: {
        // Read by the handle_new_user() trigger to name the new account and
        // profile. Deliberately never carries a role: that is written
        // server-side as 'customer' and only an admin can change it.
        data: {
          full_name: String(form.get("full_name")).trim(),
          company: String(form.get("company")).trim(),
        },
        // Confirming the email creates a session, so send them straight to
          // their documents. /portal/login would only bounce them onward,
          // and landing on a sign-in form after clicking "confirm" reads
          // as though the confirmation failed.
          emailRedirectTo: window.location.origin + "/portal",
      },
    });

    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <PortalShell>
      <div className="hp-portal__center">
        <div className="hp-portal-card hp-reveal">
          <h1>Create an account</h1>
          <p className="hp-portal-card__sub">
            Confirm your email, then sign in. Documents appear here once our team shares
            them with your account.
          </p>

          {!isSupabaseConfigured ? (
            <p className="hp-portal-msg hp-portal-msg--error">
              The portal is not configured yet. Add the Supabase environment variables and redeploy.
            </p>
          ) : sent ? (
            <p className="hp-portal-msg hp-portal-msg--ok" role="status">
              Check your inbox for a confirmation link, then sign in.
            </p>
          ) : (
            <form className="hp-portal-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="s-name">Full name</label>
              <input id="s-name" name="full_name" type="text" autoComplete="name" required />

              <label htmlFor="s-company">Company</label>
              <input id="s-company" name="company" type="text" autoComplete="organization" required />

              <label htmlFor="s-email">Email</label>
              <input id="s-email" name="email" type="email" autoComplete="email" required />

              <label htmlFor="s-password">Password</label>
              <input id="s-password" name="password" type="password" autoComplete="new-password" required minLength={8} />

              {error && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{error}</p>}

              <button type="submit" className="hp-btn hp-btn--primary" disabled={busy}>
                {busy ? "Creating..." : "Create account"}
              </button>
            </form>
          )}

          <p className="hp-portal__alt">Already have an account? <Link to="/portal/login">Sign in</Link></p>
        </div>
      </div>
    </PortalShell>
  );
}
