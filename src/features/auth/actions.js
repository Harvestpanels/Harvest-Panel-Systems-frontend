import { reportError } from "../../utils/errorReporting";
import { supabase } from "../../lib/supabase";
import { friendlyAuthError } from "./authErrors";

// All forms use the same validation and rejected-promise handling. Returned
// errors are rewritten into customer-facing wording (see authErrors.js, where
// `context` is explained); credentials and backend payloads are never logged.
export async function authAction(operation, context) {
  try {
    const result = await operation();
    return result?.error ? { ...result, error: friendlyAuthError(result.error, context) } : result;
  } catch {
    reportError("auth_request_error");
    return { data: null, error: { message: "We could not connect. Please try again." } };
  }
}

export function passwordError(password, confirm = password) {
  if (password.length < 8) return "Please use at least 8 characters.";
  if (password !== confirm) return "Those passwords do not match.";
  return null;
}

export async function submitAuthForm(view, form) {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const invalid = (message) => ({ error: { message } });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return invalid("Please enter a valid email address.");
  if (view === "signin") {
    if (!password) return invalid("Please enter your password.");
    return authAction(() => supabase.auth.signInWithPassword({ email, password }), "signin");
  }
  if (view === "signup") {
    const full_name = String(form.get("full_name") || "").trim();
    const company = String(form.get("company") || "").trim();
    const error = passwordError(password);
    if (error) return invalid(error);
    if (!full_name || !company) return invalid("Please enter your name and company.");
    return authAction(() => supabase.auth.signUp({ email, password, options: {
      data: { full_name, company }, emailRedirectTo: `${window.location.origin}/portal`,
    } }), "signup");
  }
  const result = await authAction(() => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/portal/reset`,
  }), "forgot");
  // A uniform response for valid addresses avoids account enumeration. Rate
  // limits are the exception: they say nothing about whether an account
  // exists, and "try again later" is useless without knowing why.
  if (result.error?.status === 429 || /over_.*rate_limit/.test(result.error?.code || "")) return result;
  if (result.error) return invalid("We could not send a reset request. Please try again later.");
  return result;
}
