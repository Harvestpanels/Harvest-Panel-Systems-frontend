import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import AuthProvider from "./AuthProvider";
import { useAuth } from "../hooks/useAuth";

const mock = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn(), from: vi.fn(), callback: null }));
vi.mock("../lib/supabase", () => ({ isSupabaseConfigured: true, supabase: {
  auth: { getSession: mock.getSession, onAuthStateChange: mock.onAuthStateChange, signOut: vi.fn() }, from: mock.from,
} }));
function Probe() {
  const { user, profile, loading, error } = useAuth();
  return <p>{JSON.stringify({ user: user?.id, profile: profile?.id, loading, error })}</p>;
}
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
const session = (id) => ({ user: { id } });
let requests;
beforeEach(() => {
  vi.resetAllMocks();
  requests = new Map();
  mock.getSession.mockResolvedValue({ data: { session: session("a") } });
  mock.onAuthStateChange.mockImplementation((callback) => { mock.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; });
  mock.from.mockImplementation(() => {
    let id;
    const q = { select: () => q, eq: (_field, value) => { id = value; return q; }, abortSignal: () => q, maybeSingle: () => { const d = deferred(); requests.set(id, d); return d.promise; } };
    return q;
  });
});
it("discards an old user's profile after identity changes", async () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(requests.has("a")).toBe(true));
  act(() => mock.callback("SIGNED_IN", session("b")));
  await waitFor(() => expect(requests.has("b")).toBe(true));
  await act(async () => requests.get("b").resolve({ data: { id: "b" } }));
  await act(async () => requests.get("a").resolve({ data: { id: "a" } }));
  expect(screen.getByText(/"profile":"b"/)).toBeInTheDocument();
  expect(screen.queryByText(/"profile":"a"/)).toBeNull();
});
it("does not restore a profile after sign-out", async () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(requests.has("a")).toBe(true));
  act(() => mock.callback("SIGNED_OUT", null));
  await act(async () => requests.get("a").resolve({ data: { id: "a" } }));
  expect(screen.getByText(/"loading":false/)).not.toHaveTextContent('"profile":"a"');
});
it("does not refetch a profile merely because a token refreshes", async () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(requests.has("a")).toBe(true));
  await act(async () => requests.get("a").resolve({ data: { id: "a" } }));
  act(() => mock.callback("TOKEN_REFRESHED", session("a")));
  expect(mock.from).toHaveBeenCalledTimes(1);
});
it("exposes failed session initialization as a recovery state", async () => {
  mock.getSession.mockRejectedValue(new Error("offline"));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/could not check your session/)).toHaveTextContent('"loading":false'));
});
