import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAuth from "./RequireAuth";

// The guard reads everything from useAuth, so the whole surface under test is
// what it renders for each combination of session/profile/loading.
const mockAuth = vi.fn();
vi.mock("../hooks/useAuth", () => ({ useAuth: () => mockAuth() }));

const SESSION = { user: { id: "u1", email: "jane@example.com" } };
const PROFILE = { id: "u1", email: "jane@example.com", role: "customer" };

function renderGuard(props = {}) {
  return render(
    <MemoryRouter initialEntries={["/portal"]}>
      <Routes>
        <Route path="/portal" element={<RequireAuth {...props}><p>Account content</p></RequireAuth>} />
        <Route path="/portal/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("RequireAuth", () => {
  it("renders the page once session and profile are both present", () => {
    mockAuth.mockReturnValue({ session: SESSION, profile: PROFILE, loading: false, isAdmin: false });
    renderGuard();
    expect(screen.getByText("Account content")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to the login page", () => {
    mockAuth.mockReturnValue({ session: null, profile: null, loading: false, isAdmin: false });
    renderGuard();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("waits rather than redirecting while the session check is still running", () => {
    // The bug this prevents: a refresh bouncing an already-signed-in user out.
    mockAuth.mockReturnValue({ session: null, profile: null, loading: true, isAdmin: false });
    renderGuard();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
    expect(screen.queryByText("Account content")).not.toBeInTheDocument();
  });

  it("keeps waiting during the grace period when the profile has not arrived", () => {
    mockAuth.mockReturnValue({ session: SESSION, profile: null, loading: false, isAdmin: false });
    renderGuard();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByText(/could not open your account/i)).not.toBeInTheDocument();
  });

  it("offers a way out once the profile fails to load", () => {
    // The regression this guards: before the recovery screen existed, this
    // state sat on the loading overlay forever with no retry and no sign-out.
    mockAuth.mockReturnValue({
      session: SESSION, profile: null, loading: false, isAdmin: false,
      refreshProfile: vi.fn(), signOut: vi.fn(),
    });
    renderGuard();
    act(() => { vi.advanceTimersByTime(7000); });

    expect(screen.getByText(/could not open your account/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("keeps a non-admin out of an admin-only route", () => {
    mockAuth.mockReturnValue({ session: SESSION, profile: PROFILE, loading: false, isAdmin: false });
    renderGuard({ adminOnly: true });
    expect(screen.queryByText("Account content")).not.toBeInTheDocument();
  });

  it("lets an admin through an admin-only route", () => {
    mockAuth.mockReturnValue({
      session: SESSION, profile: { ...PROFILE, role: "admin" }, loading: false, isAdmin: true,
    });
    renderGuard({ adminOnly: true });
    expect(screen.getByText("Account content")).toBeInTheDocument();
  });
});
