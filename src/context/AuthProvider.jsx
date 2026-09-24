import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "./authContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// A password-reset link lands with `type=recovery` in the URL hash. Read at
// module load, before the SDK's detectSessionInUrl strips it, and backed by the
// PASSWORD_RECOVERY event below. Remembered for the tab so a reload of the
// reset page still works; any other session is NOT allowed to set a password
// without the current one (see PortalResetPage / PortalSettingsPage).
const RECOVERY_KEY = "hps:recovery";
function readRecovery() {
  if (typeof window === "undefined") return false;
  if (/(^|[#&])type=recovery(&|$)/.test(window.location.hash)) return true;
  try { return window.sessionStorage.getItem(RECOVERY_KEY) === "1"; } catch { return false; }
}
function writeRecovery(on) {
  try {
    if (on) window.sessionStorage.setItem(RECOVERY_KEY, "1");
    else window.sessionStorage.removeItem(RECOVERY_KEY);
  } catch { /* storage blocked: the in-memory flag still works this visit */ }
}

// Session identity and profile requests have separate lifecycles. A response
// for an old user is never exposed while the next user's request is pending.
export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ session: null, initialized: !isSupabaseConfigured, error: null });
  const [record, setRecord] = useState(null);
  const [revision, setRevision] = useState(0);
  const [recovery, setRecovery] = useState(readRecovery);
  const userId = auth.session?.user?.id;
  const requestKey = JSON.stringify([userId, revision]);
  // Callers of refreshProfile waiting for the refetch it started to settle.
  const waiters = useRef([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    let receivedEvent = false;
    const timer = setTimeout(() => {
      if (active) setAuth({ session: null, initialized: true, error: "We could not check your session. Reload to try again." });
    }, 15000);
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      receivedEvent = true;
      if (active && event === "PASSWORD_RECOVERY") { writeRecovery(true); setRecovery(true); }
      if (active && !session) { writeRecovery(false); setRecovery(false); }
      if (active && !session) setRecord(null);
      clearTimeout(timer);
      if (active) setAuth({ session, initialized: true, error: null });
      if (active) window.dispatchEvent(new Event("hps:session-change"));
    });
    supabase.auth.getSession().then(({ data: result, error }) => {
      if (!active || receivedEvent) return;
      clearTimeout(timer);
      setAuth({ session: result?.session ?? null, initialized: true, error: error ? "We could not check your session. Reload to try again." : null });
    }).catch(() => {
      if (!active || receivedEvent) return;
      clearTimeout(timer);
      setAuth({ session: null, initialized: true, error: "We could not check your session. Reload to try again." });
    });
    return () => { active = false; clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId || !supabase) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      controller.abort();
      if (active) setRecord({ userId, key: requestKey, profile: null, error: "Loading your profile timed out." });
    }, 15000);
    supabase.from("profiles").select("id, account_id, full_name, email, role, created_at")
      .eq("id", userId).abortSignal(controller.signal).maybeSingle()
      .then(({ data, error }) => {
        if (active && !controller.signal.aborted) setRecord({ userId, key: requestKey, profile: data ?? null, error: error ? "We could not load your account details." : null });
      }).catch(() => {
        if (active && !controller.signal.aborted) setRecord({ userId, key: requestKey, profile: null, error: "We could not load your account details." });
      }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [userId, requestKey]);

  const profile = userId && record?.userId === userId ? record.profile : null;
  const error = auth.error || (userId && record?.key === requestKey ? record.error : null);
  const loading = !auth.initialized || Boolean(userId && (record?.userId !== userId || (!record?.profile && record?.key !== requestKey)));
  // Resolves once the refetch settles (success or failure), so a "Try again"
  // button can stay in its busy state for exactly that long.
  const refreshProfile = useCallback(() => new Promise((resolve) => {
    waiters.current.push(resolve);
    setRevision((value) => value + 1);
  }), []);
  const settled = !userId || record?.key === requestKey;
  useEffect(() => {
    if (!settled || waiters.current.length === 0) return;
    const pending = waiters.current;
    waiters.current = [];
    pending.forEach((resolve) => resolve());
  }, [settled, requestKey]);
  const signOut = useCallback(async () => {
    const result = await supabase?.auth.signOut();
    if (result?.error) throw new Error("We could not sign you out. Please try again.");
  }, []);
  const endRecovery = useCallback(() => { writeRecovery(false); setRecovery(false); }, []);
  const value = useMemo(() => ({
    session: auth.session, user: auth.session?.user ?? null, profile, loading, error,
    isAdmin: profile?.role === "admin", configured: isSupabaseConfigured, refreshProfile, signOut,
    recovery: recovery && Boolean(auth.session), endRecovery,
  }), [auth.session, profile, loading, error, refreshProfile, signOut, recovery, endRecovery]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
