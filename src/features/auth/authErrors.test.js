import { expect, it, vi } from "vitest";
import { friendlyAuthError, friendlyAuthMessage } from "./authErrors";
import { authAction, submitAuthForm } from "./actions";

const supabaseMock = vi.hoisted(() => ({ auth: {} }));
vi.mock("../../lib/supabase", () => ({ supabase: supabaseMock }));

it("explains the project-wide email limit per form, with a way to reach us", () => {
  const err = { status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" };
  expect(friendlyAuthMessage(err, "signup")).toMatch(/can't send your confirmation email right now.*\(405\) 778-2808/);
  expect(friendlyAuthMessage(err, "forgot")).toMatch(/password reset email/);
  // The exact error from the live site: no code, just the message.
  expect(friendlyAuthMessage({ message: "email rate limit exceeded" }, "signup")).toMatch(/confirmation email/);
});

it("gives the exact wait for a per-address cooldown", () => {
  const err = { status: 429, message: "For security purposes, you can only request this after 42 seconds." };
  expect(friendlyAuthMessage(err, "signup")).toBe("For your security, please wait 42 seconds before requesting another email.");
  expect(friendlyAuthMessage({ message: "you can only request this after 120 seconds" })).toMatch(/2 minutes/);
});

it("separates too many sign-in attempts from other request limits", () => {
  const err = { status: 429, code: "over_request_rate_limit", message: "Request rate limit reached" };
  expect(friendlyAuthMessage(err, "signin")).toMatch(/sign-in attempts.*reset your password/);
  expect(friendlyAuthMessage(err)).toMatch(/Too many attempts/);
});

it("rewrites the common account errors", () => {
  expect(friendlyAuthMessage({ status: 400, code: "invalid_credentials", message: "Invalid login credentials" })).toMatch(/don't match/);
  expect(friendlyAuthMessage({ code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(/confirm your email first/);
  expect(friendlyAuthMessage({ code: "user_already_exists", message: "User already registered" })).toMatch(/already exists/);
  expect(friendlyAuthMessage({ code: "email_exists" }, "email")).toMatch(/already used by another account/);
  expect(friendlyAuthMessage({ code: "weak_password" })).toMatch(/stronger password/);
  expect(friendlyAuthMessage({ code: "same_password" })).toMatch(/different from your current/);
  expect(friendlyAuthMessage({ status: 503, message: "upstream" })).toMatch(/having trouble/);
});

it("keeps unknown messages, status and code intact", () => {
  expect(friendlyAuthMessage({ message: "Something specific" })).toBe("Something specific");
  expect(friendlyAuthError({ status: 400, code: "invalid_credentials", message: "x" })).toMatchObject({ status: 400, code: "invalid_credentials" });
});

it("authAction applies the wording for its form", async () => {
  const result = await authAction(async () => ({ data: null, error: { status: 429, message: "email rate limit exceeded" } }), "signup");
  expect(result.error.message).toMatch(/confirmation email/);
  expect(result.error.status).toBe(429);
});

it("password reset shows rate limits but stays uniform for everything else", async () => {
  const form = new FormData();
  form.set("email", "someone@example.com");
  supabaseMock.auth.resetPasswordForEmail = vi.fn().mockResolvedValue({ data: null, error: { status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" } });
  expect((await submitAuthForm("forgot", form)).error.message).toMatch(/password reset email/);
  supabaseMock.auth.resetPasswordForEmail = vi.fn().mockResolvedValue({ data: null, error: { status: 400, message: "User not found" } });
  expect((await submitAuthForm("forgot", form)).error.message).toBe("We could not send a reset request. Please try again later.");
});
