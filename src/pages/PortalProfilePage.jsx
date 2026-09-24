import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { getAccount } from "../features/documents/api";
import { authAction } from "../features/auth/actions";
import { usePageMeta } from "../hooks/usePageMeta";

// Its own page, reached from the nav account menu.
//
// Two panels side by side rather than one narrow column: what you can change,
// and what only our team can. Only `full_name` is editable — email needs a
// confirmation round-trip so it lives under Settings, and role and account_id
// are refused by the guard trigger in schema.sql whatever this page sends, so
// they show as read-only facts instead of disabled inputs.
export default function PortalProfilePage() {
  usePageMeta({
    title: "Profile | Harvest Panel Systems",
    description: "Your customer portal profile.",
    path: "/portal/profile",
    noindex: true,
  });
  const { profile, user, isAdmin, refreshProfile } = useAuth();
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [seededFor, setSeededFor] = useState(profile?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  // Seeded from the profile once it arrives, then owned by the input. Written
  // during render rather than in an effect (react-hooks/set-state-in-effect):
  // keying on the profile id means it seeds once per user, so a later
  // background refresh cannot overwrite what is being typed.
  if (profile?.id && profile.id !== seededFor) {
    setSeededFor(profile.id);
    setFullName(profile.full_name ?? "");
  }

  useEffect(() => {
    const controller = new AbortController();
    getAccount(profile?.account_id, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setCompany(data?.company_name ?? ""); })
      .catch(() => { if (!controller.signal.aborted) setError("Your company details could not be loaded."); });
    return () => controller.abort();
  }, [profile?.account_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim()) return setError("Please enter your full name.");
    setBusy(true);
    setMsg(null);
    setError(null);

    // .select() returns the rows actually written. RLS silently filters an
    // update it refuses, so zero rows is a failure, not a success.
    const { data, error: err } = await authAction(() => supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", profile.id)
      .select("id"));

    setBusy(false);
    if (err) return setError(err.message);
    if (!data || data.length === 0) return setError("Your profile could not be saved. Please try again.");
    setError(null);
    refreshProfile();   // so the name updates everywhere reading it from context
    setMsg("Profile updated.");
  }

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";
  const unchanged = fullName.trim() === (profile?.full_name ?? "").trim();

  return (
    <PortalShell>
      <main className="hp-portal__main">
        {company && <p className="hp-portal__company hp-reveal">{company}</p>}
        <h1 className="hp-portal__title hp-reveal">Profile</h1>
        <p className="hp-portal__hint hp-reveal">Your details on this account.</p>

        <div className="hp-panels hp-panels--spaced">
          <section className="hp-panel hp-reveal">
            <h2>Your details</h2>
            <p className="hp-panel__note">This is the name our team sees when you get in touch.</p>

            <form className="hp-portal-form hp-portal-form--dark" onSubmit={handleSubmit} noValidate>
              <label htmlFor="p-name">Full name</label>
              <input
                id="p-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <label htmlFor="p-email">Email</label>
              <input id="p-email" type="email" value={user?.email ?? ""} readOnly />
              <p className="hp-field-note">
                Change this under <Link to="/portal/settings">Settings</Link>.
              </p>

              {error && <p className="hp-portal-msg hp-portal-msg--error" role="alert">{error}</p>}
              {msg && <p className="hp-portal-msg hp-portal-msg--ok" role="status">{msg}</p>}

              <button
                type="submit"
                className="hp-btn hp-btn--primary"
                disabled={busy || unchanged || !fullName.trim()}
              >
                {busy ? "Saving..." : "Save changes"}
              </button>
            </form>
          </section>

          <section className="hp-panel hp-reveal">
            <h2>Account</h2>
            <p className="hp-panel__note">Set by our team. Contact us if anything here is wrong.</p>

            <dl className="hp-facts">
              <div>
                <dt>Company</dt>
                <dd>{company || "—"}</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>
                  <span className={`hp-badge${isAdmin ? " hp-badge--admin" : ""}`}>
                    {isAdmin ? "Administrator" : "Customer"}
                  </span>
                </dd>
              </div>
              {joined && (
                <div>
                  <dt>Member since</dt>
                  <dd>{joined}</dd>
                </div>
              )}
            </dl>

            {isAdmin && (
              <p className="hp-panel__note hp-panel__note--foot">
                <Link to="/portal/admin">Open admin tools</Link> to share documents and manage accounts.
              </p>
            )}
          </section>
        </div>
      </main>
    </PortalShell>
  );
}
