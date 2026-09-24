import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import PortalSignOutPage from "./PortalSignOutPage";
import PortalSettingsPage from "./PortalSettingsPage";
import PortalResetPage from "./PortalResetPage";

const auth = vi.hoisted(() => ({ value: {} }));
const sb = vi.hoisted(() => ({ signInWithPassword: vi.fn(), updateUser: vi.fn() }));
vi.mock("../hooks/useAuth", () => ({ useAuth: () => auth.value }));
vi.mock("../components/PortalShell", () => ({ default: ({ children }) => children }));
vi.mock("../lib/supabase", () => ({ isSupabaseConfigured: true, supabase: { auth: sb } }));

beforeEach(() => {
  vi.resetAllMocks();
  auth.value = { user: { email: "jane@example.com" }, session: {}, loading: false, signOut: vi.fn().mockResolvedValue(), endRecovery: vi.fn() };
});

function at(element, state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/x", state }]}>
      <Routes><Route path="/x" element={element} /><Route path="/" element={<p>Home</p>} /></Routes>
    </MemoryRouter>
  );
}

it("does not sign out on a plain visit, only after confirming", async () => {
  at(<PortalSignOutPage />);
  expect(auth.value.signOut).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await screen.findByText("Home");
  expect(auth.value.signOut).toHaveBeenCalledTimes(1);
});

it("signs out straight away when in-app navigation confirmed it", async () => {
  at(<PortalSignOutPage />, { confirmed: true });
  await screen.findByText("Home");
  expect(auth.value.signOut).toHaveBeenCalledTimes(1);
});

it("refuses a password change when the current password is wrong", async () => {
  sb.signInWithPassword.mockResolvedValue({ error: { status: 400, message: "Invalid login credentials" } });
  at(<PortalSettingsPage />);
  fireEvent.change(screen.getAllByLabelText("Current password")[0], { target: { value: "wrong-one" } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "newpassword1" } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "newpassword1" } });
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("current password is incorrect"));
  expect(sb.signInWithPassword).toHaveBeenCalledWith({ email: "jane@example.com", password: "wrong-one" });
  expect(sb.updateUser).not.toHaveBeenCalled();
});

it("only offers the reset form during a recovery session", () => {
  auth.value = { ...auth.value, recovery: false };
  const { unmount } = at(<PortalResetPage />);
  expect(screen.queryByLabelText("New password")).toBeNull();
  expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  unmount();
  auth.value = { ...auth.value, recovery: true };
  at(<PortalResetPage />);
  expect(screen.getByLabelText("New password")).toBeInTheDocument();
});
