import { useContext } from "react";
import { AuthContext } from "../context/authContext";

// Session + profile for the signed-in user. Returns:
//   session  - Supabase session, or null when signed out
//   profile  - the matching public.profiles row (account_id, role, name)
//   loading  - true until the initial session check finishes
//   isAdmin  - convenience flag; the database enforces this too
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
