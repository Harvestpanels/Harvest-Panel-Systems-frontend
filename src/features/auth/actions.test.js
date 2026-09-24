import { expect, it, vi } from "vitest";
import { authAction, passwordError, submitAuthForm } from "./actions";
vi.mock("../../lib/supabase", () => ({ supabase: {} }));

it("turns thrown network failures into recoverable form errors", async () => {
  const result = await authAction(() => Promise.reject(new Error("private backend details")));
  expect(result.error.message).toBe("We could not connect. Please try again.");
});
it("validates required values consistently across auth entry points", async () => {
  const form = new FormData();
  expect((await submitAuthForm("signin", form)).error.message).toMatch(/email/);
  form.set("email", "hello@example.com");
  expect((await submitAuthForm("signin", form)).error.message).toMatch(/password/);
  form.set("password", "longpassword");
  expect((await submitAuthForm("signup", form)).error.message).toMatch(/name and company/);
  expect(passwordError("12345678", "different")).toMatch(/do not match/);
});
