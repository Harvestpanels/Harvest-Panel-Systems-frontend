import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import AdminDocumentList from "./AdminDocumentList";

const api = vi.hoisted(() => ({
  getAccount: vi.fn(),
  listDocuments: vi.fn(),
  deleteDocument: vi.fn(),
}));
vi.mock("./api", () => api);

const DOC = { id: "d1", title: "Spec sheet.pdf", storage_path: "a/x-Spec_sheet.pdf", size_bytes: 2048, uploaded_at: "2026-03-04T10:00:00Z" };
const ACCOUNT = { id: "a", company_name: "Acme" };

beforeEach(() => {
  vi.clearAllMocks();
  api.getAccount.mockResolvedValue(ACCOUNT);
  api.listDocuments.mockResolvedValue({ documents: [DOC], hasMore: false });
});

it("asks before deleting and can be cancelled", async () => {
  render(<AdminDocumentList account={ACCOUNT} revision={0} onMessage={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Delete Spec sheet.pdf" }));
  expect(screen.getByText(/can't be undone/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api.deleteDocument).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Delete Spec sheet.pdf" })).toBeInTheDocument();
});

it("deletes on confirm, reports success and refetches the list", async () => {
  api.deleteDocument.mockResolvedValue({ fileRemoved: true });
  const onMessage = vi.fn();
  render(<AdminDocumentList account={ACCOUNT} revision={0} onMessage={onMessage} />);
  fireEvent.click(await screen.findByRole("button", { name: "Delete Spec sheet.pdf" }));
  api.listDocuments.mockResolvedValue({ documents: [], hasMore: false });
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(onMessage).toHaveBeenCalledWith({ type: "ok", text: 'Deleted "Spec sheet.pdf".' }));
  expect(api.deleteDocument).toHaveBeenCalledWith(DOC);
  expect(await screen.findByText("No documents shared with this account yet.")).toBeInTheDocument();
});

it("warns when the row went but the stored file could not be removed", async () => {
  api.deleteDocument.mockResolvedValue({ fileRemoved: false });
  const onMessage = vi.fn();
  render(<AdminDocumentList account={ACCOUNT} revision={0} onMessage={onMessage} />);
  fireEvent.click(await screen.findByRole("button", { name: "Delete Spec sheet.pdf" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(onMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: "error" })));
});
