import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import "./AuthModal.css";

// Drives the focus trap below. Kept up here so the handler reads as logic
// rather than a wall of selectors.
const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select, textarea";

// Sign in / create account / reset password, as a dialog over whatever page
// you were already on — the pattern most SaaS sites use now, because sending
// someone to a separate page to log in loses their place.
//
// The modal covers the happy paths only. /portal/login and friends stay real
// routes: a password-reset email has to land somewhere, and a direct link to
// the sign-in page should still work.
//
// Behaviour deliberately matches Lightbox.jsx, this site's other dialog:
// Escape closes, clicking the backdrop closes, the page behind is
// scroll-locked, focus moves in on open and returns to whatever opened it.
export default function AuthModal({ onClose }) {
  const [view, setView] = useState("signin"); // signin | signup | forgot
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(null);
  const cardRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: Tab past the last control wraps to the first, Shift+Tab
      // before the first wraps to the last. Without it, tabbing walks out of
      // the dialog and into the page behind, which a screen reader user
      // cannot tell is still there.
      if (e.key !== "Tab") return;
      const focusables = cardRef.current?.querySelectorAll(FOCUSABLE);
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  // Two cases, one effect. On open: already signed in (came back with a live
  // session) — skip the form rather than asking someone to log in twice.
  // While open: Supabase syncs auth state between tabs, so if the visitor
  // confirms their email in the tab that link opened, this tab hears about it
  // and moves on instead of sitting on "check your inbox" forever.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let done = false;

    const go = () => {
      if (done) return;
      done = true;
      onClose();
      navigate("/portal");
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });

    return () => sub?.subscription?.unsubscribe();
  }, [onClose, navigate]);

  function switchTo(next) {
    setView(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    setError(null);
    setNotice(null);
    setBusy(true);

    if (view === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      // Supabase returns one message for both "no such user" and "wrong
      // password" on purpose — telling them apart would let anyone probe
      // which email addresses have accounts. Surfaced as-is.
      if (err) return setError(err.message);
      onClose();
      navigate("/portal");
      return;
    }

    if (view === "signup") {
      if (password.length < 8) {
        setBusy(false);
        return setError("Please use a password of at least 8 characters.");
      }
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Read by the handle_new_user() trigger. Never carries a role —
          // that is written server-side and only an admin can change it.
          data: {
            full_name: String(form.get("full_name") || "").trim(),
            company: String(form.get("company") || "").trim(),
          },
          // Confirming the email creates a session, so send them straight to
          // their documents. /portal/login would only bounce them onward,
          // and landing on a sign-in form after clicking "confirm" reads
          // as though the confirmation failed.
          emailRedirectTo: window.location.origin + "/portal",
        },
      });
      setBusy(false);
      if (err) return setError(err.message);
      return setNotice("Check your inbox for a confirmation link, then sign in.");
    }

    // forgot — always reports success, so this cannot be used to discover
    // which addresses have accounts.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/portal/reset",
    });
    setBusy(false);
    setNotice("If that email has an account, a reset link is on its way.");
  }

  const heading =
    view === "signin" ? "Sign in" : view === "signup" ? "Create an account" : "Reset password";
  const sub =
    view === "signin"
      ? "Access documents shared with your account."
      : view === "signup"
        ? "Documents appear here once our team shares them with your account."
        : "We will email you a link to choose a new password.";

  return (
    <div
      className="hp-authmodal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hp-authmodal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="hp-authmodal__card" ref={cardRef}>
        <button
          ref={closeRef}
          type="button"
          className="hp-authmodal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <h2 id="hp-authmodal-title" className="hp-authmodal__title">{heading}</h2>
        <p className="hp-authmodal__sub">{sub}</p>

        {!isSupabaseConfigured ? (
          <p className="hp-authmodal__msg hp-authmodal__msg--error">
            The portal is not configured yet.
          </p>
        ) : (
          <form className="hp-authmodal__form" onSubmit={handleSubmit} noValidate>
            {view === "signup" && (
              <>
                <label htmlFor="m-name">Full name</label>
                <input id="m-name" name="full_name" type="text" autoComplete="name" required />

                <label htmlFor="m-company">Company</label>
                <input id="m-company" name="company" type="text" autoComplete="organization" required />
              </>
            )}

            <label htmlFor="m-email">Email</label>
            <input id="m-email" name="email" type="email" autoComplete="email" required />

            {view !== "forgot" && (
              <>
                <label htmlFor="m-password">Password</label>
                <input
                  id="m-password"
                  name="password"
                  type="password"
                  autoComplete={view === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={view === "signup" ? 8 : undefined}
                />
              </>
            )}

            {error && (
              <p className="hp-authmodal__msg hp-authmodal__msg--error" role="alert">{error}</p>
            )}
            {notice && (
              <p className="hp-authmodal__msg hp-authmodal__msg--ok" role="status">{notice}</p>
            )}

            <button type="submit" className="hp-btn hp-btn--primary hp-authmodal__submit" disabled={busy}>
              {busy ? "Working…" : heading}
            </button>
          </form>
        )}

        <div className="hp-authmodal__alt">
          {view === "signin" ? (
            <>
              <button type="button" className="hp-authmodal__link" onClick={() => switchTo("forgot")}>
                Forgot your password?
              </button>
              <span>
                No account yet?{" "}
                <button type="button" className="hp-authmodal__link" onClick={() => switchTo("signup")}>
                  Create one
                </button>
              </span>
            </>
          ) : (
            <button type="button" className="hp-authmodal__link" onClick={() => switchTo("signin")}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
