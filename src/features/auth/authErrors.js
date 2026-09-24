import { CONTACT } from "../../data/site";

// Turns a Supabase Auth error into a sentence a customer can act on.
//
// Supabase's own messages ("email rate limit exceeded", "Invalid login
// credentials") are written for developers, and some leak how the backend
// works. Matching is on the stable `code` first, then the HTTP status, then the
// message text as a last resort (older SDK versions and some endpoints omit
// `code`). `context` picks the wording, since the same code means different
// things on different forms, e.g. an email limit on signup vs. a password reset.
//
// The original `status` and `code` are kept on the returned object, so callers
// that branch on them (PortalSettingsPage's wrong-current-password check) keep
// working.

const CALL_US = `call us at ${CONTACT.phone}`;

// What the email couldn't do, per form, for the "too many emails" message.
const EMAIL_PURPOSE = {
  signup: "send your confirmation email",
  forgot: "send a password reset email",
  email: "send the confirmation to your new address",
};

function waitPhrase(message) {
  // "For security purposes, you can only request this after 42 seconds."
  const seconds = Number(/after (\d+) seconds?/i.exec(message || "")?.[1]);
  if (!seconds) return null;
  return seconds <= 60 ? `${seconds} second${seconds === 1 ? "" : "s"}` : `${Math.ceil(seconds / 60)} minutes`;
}

export function friendlyAuthMessage(error, context = "generic") {
  const code = error?.code || "";
  const status = error?.status;
  const raw = String(error?.message || "");
  const is = (pattern) => pattern.test(raw);

  // Per-address cooldown between emails: we know exactly how long to wait.
  const wait = waitPhrase(raw);
  if (wait) return `For your security, please wait ${wait} before requesting another email.`;

  if (code === "over_email_send_rate_limit" || is(/email rate limit/i)) {
    const purpose = EMAIL_PURPOSE[context] || "send that email";
    return `We can't ${purpose} right now because a lot of emails went out in a short time. Please try again in a little while, or ${CALL_US} and we'll help you directly.`;
  }
  if (code === "over_request_rate_limit" || code === "over_sms_send_rate_limit" || status === 429 || is(/rate limit|too many requests/i)) {
    return context === "signin"
      ? "Too many sign-in attempts. Please wait a few minutes and try again, or reset your password."
      : "Too many attempts in a short time. Please wait a few minutes and try again.";
  }

  if (code === "invalid_credentials" || is(/invalid login credentials/i)) {
    return "That email and password don't match. Check both and try again, or reset your password.";
  }
  if (code === "email_not_confirmed" || is(/email not confirmed/i)) {
    return "Please confirm your email first. Check your inbox (and spam folder) for the link we sent.";
  }
  if (code === "user_already_exists" || code === "email_exists" || is(/already (registered|been registered|exists)/i)) {
    return context === "email"
      ? "That email address is already used by another account."
      : "An account with this email already exists. Try signing in, or reset your password.";
  }
  if (code === "weak_password" || is(/password should be|weak password/i)) {
    return "Please choose a stronger password: at least 8 characters, ideally mixing letters, numbers and symbols.";
  }
  if (code === "same_password" || is(/different from the old password/i)) {
    return "Your new password must be different from your current one.";
  }
  if (code === "email_address_invalid" || code === "validation_failed" || is(/invalid (email|format)/i)) {
    return "Please enter a valid email address.";
  }
  if (code === "signup_disabled" || is(/signups not allowed/i)) {
    return `New accounts are paused at the moment. Please ${CALL_US} and we'll set one up for you.`;
  }
  if (code === "session_expired" || code === "session_not_found" || code === "refresh_token_not_found" || is(/session (expired|missing)|jwt expired/i)) {
    return "Your session has expired. Please sign in again.";
  }
  if (code === "reauthentication_needed" || code === "reauthentication_not_valid") {
    return "For your security, please sign out and sign back in, then try again.";
  }
  if (typeof status === "number" && status >= 500) {
    return `Our sign-in service is having trouble right now. Please try again in a few minutes, or ${CALL_US}.`;
  }
  return raw || "Something went wrong. Please try again.";
}

export function friendlyAuthError(error, context) {
  if (!error) return error;
  return { message: friendlyAuthMessage(error, context), status: error.status, code: error.code };
}
