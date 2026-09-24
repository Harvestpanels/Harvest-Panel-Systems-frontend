import { submitAuthForm } from "../features/auth/actions";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import PortalShell from "../components/PortalShell";
import { isSupabaseConfigured } from "../lib/supabase";
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
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  // Same as the login page: a signed-in visitor has nothing to do here.
  if (!loading && session && !busy) return <Navigate to="/portal" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { data, error: err } = await submitAuthForm("signup", form);
    setBusy(false);
    if (err) return setError(err.message);
    // With email confirmation turned off, signUp signs the visitor straight
    // in. "Check your inbox" would then be a lie — go to the portal instead.
    if (data?.session) return navigate("/portal", { replace: true });
    setSent(true);
  }

  return (
    <PortalShell>
      <main className="hp-portal__center">
        <div className="hp-portal-card hp-reveal">
          <h1>Create an account</h1>
          <p className="hp-portal-card__sub">
            Confirm your email, then sign in. Documents appear here once our team shares
            them with your account.
          </p>

          {!isSupabaseConfigured ? (
            <p className="hp-portal-msg hp-portal-msg--error">
              The portal is temporarily unavailable. Please contact us for assistance.
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
      </main>
    </PortalShell>
  );
}
