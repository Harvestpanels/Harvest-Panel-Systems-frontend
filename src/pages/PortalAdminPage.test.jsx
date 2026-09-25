import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import PortalAdminPage from "./PortalAdminPage";

const api = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listPeople: vi.fn(),
  uploadDocument: vi.fn(),
  moveProfile: vi.fn(),
  renameCompany: vi.fn(),
  deleteEmptyCompany: vi.fn(),
  getAccount: vi.fn(),
  listDocuments: vi.fn(),
  deleteDocument: vi.fn(),
}));
vi.mock("../features/documents/api", () => api);
vi.mock("../hooks/useAuth", () => ({ useAuth: () => ({ profile: { id: "admin" } }) }));
vi.mock("../components/PortalShell", () => ({ default: ({ children }) => children }));

const ACME = { id: "a", company_name: "Acme", people: 2, documents: 1 };
const EMPTY = { id: "e", company_name: "test1", people: 0, documents: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  window.scrollTo = vi.fn();
  api.listCompanies.mockResolvedValue({ rows: [ACME, EMPTY], hasMore: false });
  api.listPeople.mockResolvedValue({ rows: [], hasMore: false });
  api.getAccount.mockResolvedValue({ id: "a", company_name: "Acme" });
  api.listDocuments.mockResolvedValue({ documents: [], hasMore: false });
});

const renderPage = () => render(<MemoryRouter><PortalAdminPage /></MemoryRouter>);
const openAcme = async () => fireEvent.click(await screen.findByRole("button", { name: /Acme/ }));

it("lists companies with their counts and flags empty ones", async () => {
  renderPage();
  expect(await screen.findByText("2 people · 1 document")).toBeInTheDocument();
  expect(screen.getByText("Empty, no people or documents")).toBeInTheDocument();
});

it("opens a company and uploads a document to it", async () => {
  api.uploadDocument.mockResolvedValue(undefined);
  renderPage();
  await openAcme();
  fireEvent.change(screen.getByLabelText("Document title"), { target: { value: "Example" } });
  fireEvent.submit(screen.getByRole("button", { name: "Upload and share" }).closest("form"));
  expect(await screen.findByText("Uploaded and shared with Acme.")).toBeInTheDocument();
  expect(api.uploadDocument).toHaveBeenCalledWith(expect.objectContaining({ accountId: "a", title: "Example", profileId: "admin" }));
  expect(screen.getByLabelText("Document title")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Upload and share" })).toBeEnabled();
});

it("re-enables upload after a rejected operation", async () => {
  api.uploadDocument.mockRejectedValue(new Error("Upload failed"));
  renderPage();
  await openAcme();
  fireEvent.submit(screen.getByRole("button", { name: "Upload and share" }).closest("form"));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Upload failed"));
  expect(screen.getByRole("button", { name: "Upload and share" })).toBeEnabled();
});

it("deletes an empty company after confirming and returns to the list", async () => {
  api.deleteEmptyCompany.mockResolvedValue(undefined);
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: /test1/ }));
  fireEvent.click(screen.getByRole("button", { name: "Delete company" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete test1" }));
  expect(await screen.findByText("Deleted test1.")).toBeInTheDocument();
  expect(api.deleteEmptyCompany).toHaveBeenCalledWith("e");
  expect(await screen.findByRole("heading", { name: "Companies" })).toBeInTheDocument();
});

it("People tab shows each person's company and opens it", async () => {
  api.listPeople.mockResolvedValue({ rows: [{ id: "p1", email: "pat@example.com", full_name: "Pat", role: "customer", account_id: "a", company_name: "Acme" }], hasMore: false });
  renderPage();
  fireEvent.click(screen.getByRole("tab", { name: "People" }));
  fireEvent.click(await screen.findByRole("button", { name: "Open company" }));
  expect(await screen.findByRole("heading", { name: "Acme" })).toBeInTheDocument();
});
