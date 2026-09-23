import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSessionHint } from "./useSessionHint";

// This hook decides whether the navbar shows "Log in" or the account avatar.
// It reads Supabase's own localStorage key WITHOUT importing the SDK, so the
// marketing pages do not pay ~220KB for it — which means it has to survive
// every shape that key can be in, including ones it does not recognise.
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useSessionHint", () => {
  it("reports signed out when there is no token", () => {
    const { result } = renderHook(() => useSessionHint());
    expect(result.current.signedIn).toBe(false);
    expect(result.current.email).toBe("");
  });

  it("reads the email out of a stored session", () => {
    localStorage.setItem("sb-test-auth-token", JSON.stringify({
      access_token: "x", user: { email: "jane@example.com" },
    }));
    const { result } = renderHook(() => useSessionHint());
    expect(result.current.signedIn).toBe(true);
    expect(result.current.email).toBe("jane@example.com");
  });

  it("still reports signed in when the token has no email on it", () => {
    localStorage.setItem("sb-test-auth-token", JSON.stringify({ access_token: "x" }));
    const { result } = renderHook(() => useSessionHint());
    expect(result.current.signedIn).toBe(true);
    expect(result.current.email).toBe("");
  });

  it("ignores keys that are not Supabase tokens", () => {
    localStorage.setItem("some-other-key", JSON.stringify({ user: { email: "no@example.com" } }));
    const { result } = renderHook(() => useSessionHint());
    expect(result.current.signedIn).toBe(false);
  });

  it("falls back to signed out on unparseable JSON instead of throwing", () => {
    // A corrupt value must degrade to "show Log in", never break the navbar on
    // every page of the site.
    localStorage.setItem("sb-test-auth-token", "{not json");
    const { result } = renderHook(() => useSessionHint());
    expect(result.current.signedIn).toBe(false);
  });

  it("survives localStorage throwing outright", () => {
    // Private mode and blocked site data both do this.
    vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
      throw new Error("access denied");
    });
    localStorage.setItem("sb-test-auth-token", JSON.stringify({ access_token: "x" }));
    const { result } = renderHook(() => useSessionHint());
    expect(result.current.signedIn).toBe(false);
  });
});
