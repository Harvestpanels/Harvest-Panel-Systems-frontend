import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import PortalAdminPage from "./PortalAdminPage";

const upload = vi.hoisted(() => vi.fn());
vi.mock("../features/documents/api", () => ({ listAdminRows: vi.fn().mockResolvedValue({ rows: [] }), moveProfile: vi.fn(), uploadDocument: upload, getAccount: vi.fn().mockResolvedValue(null), listDocuments: vi.fn().mockResolvedValue({ documents: [], hasMore: false }), deleteDocument: vi.fn() }));
vi.mock("../hooks/useAuth", () => ({ useAuth: () => ({ profile: { id: "admin" } }) }));
vi.mock("../components/PortalShell", () => ({ default: ({ children }) => children }));
vi.mock("../features/documents/AccountPicker", () => ({ default: ({ onChange }) => <button type="button" onClick={() => onChange({ id: "a", company_name: "Acme" })}>Choose account</button> }));

it("resets the saved form reference and clears busy after async success", async () => {
  upload.mockResolvedValue(undefined);
  render(<MemoryRouter><PortalAdminPage /></MemoryRouter>);
  fireEvent.click(screen.getByText("Choose account"));
  fireEvent.change(screen.getByLabelText("Document title"), { target: { value: "Example" } });
  fireEvent.submit(screen.getByRole("button", { name: "Upload and share" }).closest("form"));
  await screen.findByText("Uploaded and shared.");
  expect(screen.getByLabelText("Document title")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Upload and share" })).toBeEnabled();
});
it("re-enables upload after a rejected operation", async () => {
  upload.mockRejectedValue(new Error("Upload failed"));
  render(<MemoryRouter><PortalAdminPage /></MemoryRouter>);
  fireEvent.submit(screen.getByRole("button", { name: "Upload and share" }).closest("form"));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Upload failed"));
  expect(screen.getByRole("button", { name: "Upload and share" })).toBeEnabled();
});
