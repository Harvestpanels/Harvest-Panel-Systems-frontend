import { useEffect, useState } from "react";

// Supabase persists its session in localStorage under "sb-<project-ref>-auth-token".
// Reading that key tells us whether someone is signed in WITHOUT importing the
// Supabase SDK — which matters because <Nav> renders on every marketing page,
// and importing the client there would pull ~220KB of auth code into the main
// bundle for visitors who never open the portal.
//
// This is a display hint only. It decides whether the nav shows "Log in" or an
// avatar, nothing more. Every actual permission check happens in Postgres via
// Row Level Security, so a stale or forged value here grants exactly nothing.
// If Supabase ever changes the storage key the hint simply goes quiet and the
// nav falls back to showing "Log in".
function readHint() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const email = parsed?.user?.email || parsed?.currentSession?.user?.email;
      if (email) return { signedIn: true, email };
      if (parsed?.access_token) return { signedIn: true, email: "" };
    }
  } catch {
    // Private mode, disabled storage, or a shape we do not recognise — fall
    // back to the signed-out view rather than breaking the navbar.
  }
  return { signedIn: false, email: "" };
}

export function useSessionHint() {
  const [hint, setHint] = useState(() => readHint());

  useEffect(() => {
    // Re-read when another tab signs in or out (Supabase writes that same
    // key, so the storage event fires), and when this tab regains focus
    // after a sign-out elsewhere.
    const update = () => setHint(readHint());
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    window.addEventListener("hps:session-change", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("hps:session-change", update);
    };
  }, []);

  return hint;
}
