import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// Holds the session for the whole app and keeps it in step with Supabase.
//
// `loading` starts true and only flips once the very first session check has
// resolved. Without it, every guarded route would flash its sign-in redirect
// on refresh before the restored session arrived — the single most common
// bug in a client-side auth setup.
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // Starts true only when there is actually a session to go and check. With
  // no Supabase config there is nothing to wait for, so this begins false and
  // the effect below returns without touching state at all.
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfile = useCallback(async (userId) => {
    if (!userId || !supabase) return setProfile(null);
    // RLS limits this to the caller's own row, so no filter on role is needed
    // here — the database will not return anyone else's profile.
    const { data } = await supabase
      .from("profiles")
      .select("id, account_id, full_name, email, role, created_at")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      await loadProfile(data.session?.user?.id);
      if (!cancelled) setLoading(false);
    });

    // Fires on sign-in, sign-out, token refresh and password recovery — in
    // this tab and in any other tab the user has open.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (cancelled) return;
      setSession(next ?? null);
      await loadProfile(next?.user?.id);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      configured: isSupabaseConfigured,
      refreshProfile: () => loadProfile(session?.user?.id),
      signOut: () => supabase?.auth.signOut(),
    }),
    [session, profile, loading, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
