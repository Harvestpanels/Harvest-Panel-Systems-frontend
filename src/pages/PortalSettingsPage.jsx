import { useState } from "react";
import { Link } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { usePageMeta } from "../hooks/usePageMeta";

// Its own page, reached from the nav account menu. The two things that belong
// to the auth user rather than the profile row — password and sign-in email.
// Both go through supabase.auth.updateUser, the same call PortalResetPage uses.
//
// One panel each, side by side, so they read as two separate jobs instead of
// one long stack of inputs.
export default function PortalSettingsPage() {
  usePageMeta({
    title: "Settings | Harvest Panel Systems",
    description: "Manage your customer portal sign-in details.",
    path: "/portal/settings",
    noindex: true,
  });
  const { profile } = useAuth();
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [pwError, setPwError] = useState(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);
  const [emailError, setEmailError] = useState(null);

  async function handlePassword(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const confirm = String(data.get("confirm") || "");
    setPwMsg(null);
    setPwError(null);

    // Checked here only for an immediate answer; Supabase enforces the real
    // minimum and rejects a short password regardless.
    if (password.length < 8) return setPwError("Please use at least 8 characters.");
    if (password !== confirm) return setPwError("Those passwords do not match.");

    setPwBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setPwBusy(false);
    if (err) return setPwError(err.message);
    form.reset();
    setPwMsg("Password updated.");
  }

  async function handleEmail(e) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    setEmailMsg(null);
    setEmailError(null);
    setEmailBusy(true);

    // Supabase does not swap the address immediately — it emails the new one a
    // confirmation link, and the change lands only once that is clicked. Said
    // plainly below, or the form looks like it did nothing.
    const { error: err } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: window.location.origin + "/portal" }
    );
    setEmailBusy(false);
    if (err) return setEmailError(err.message);
    setEmailMsg("Confirmation sent. Your current address stays active until you click the link.");
  }

  return (
    <PortalShell>
      <main className="hp-portal__main">
        <h1 className="hp-portal__title hp-reveal">Settings</h1>
        <p className="hp-portal__hint hp-reveal">Manage how you sign in.</p>

        <div className="hp-panels hp-panels--spaced">
          <section className="hp-panel hp-reveal">
            <h2>Password</h2>
            <p className="hp-panel__note">
              At least 8 characters. You stay signed in on this device after changing it.
            </p>

            <form className="hp-portal-form hp-portal-form--dark" onSubmit={handlePassword} noValidate>
              <label htmlFor="s-password">New password</label>
              <input id="s-password" name="password" type="password" autoComplete="new-password" minLength={8} required />

              <label htmlFor="s-confirm">Confirm new password</label>
              <input id="s-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />

              {pwError && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{pwError}</p>}
              {pwMsg && <p className="hp-portal-msg hp-portal-msg--ok" role="status">{pwMsg}</p>}

              <button type="submit" className="hp-btn hp-btn--primary" disabled={pwBusy}>
                {pwBusy ? "Saving..." : "Update password"}
              </button>
            </form>
          </section>

          <section className="hp-panel hp-reveal">
            <h2>Email address</h2>
            <p className="hp-panel__note">
              You sign in as <strong>{profile?.email ?? "—"}</strong>. We email the new address a
              confirmation link before anything changes.
            </p>

            <form className="hp-portal-form hp-portal-form--dark" onSubmit={handleEmail} noValidate>
              <label htmlFor="s-email">New email</label>
              <input id="s-email" name="email" type="email" autoComplete="email" required />

              {emailError && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{emailError}</p>}
              {emailMsg && <p className="hp-portal-msg hp-portal-msg--ok" role="status">{emailMsg}</p>}

              <button type="submit" className="hp-btn hp-btn--primary" disabled={emailBusy}>
                {emailBusy ? "Sending..." : "Send confirmation"}
              </button>
            </form>

            <p className="hp-panel__note hp-panel__note--foot">
              Your name is on the <Link to="/portal/profile">Profile</Link> page.
            </p>
          </section>
        </div>
      </main>
    </PortalShell>
  );
}
