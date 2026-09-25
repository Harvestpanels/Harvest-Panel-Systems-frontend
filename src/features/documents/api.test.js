import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDocumentLink, uploadDocument, listDocuments, getAccount } from "./api";

const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), bucket: { upload: vi.fn(), remove: vi.fn(), createSignedUrl: vi.fn() } }));
vi.mock("../../lib/supabase", () => ({ supabase: { from: mock.from, rpc: mock.rpc, storage: { from: () => mock.bucket } } }));
const input = { file: new File(["pdf"], "quote.pdf", { type: "application/pdf" }), title: "Quote", accountId: "account-a", profileId: "admin" };

beforeEach(() => {
  vi.resetAllMocks();
  mock.bucket.upload.mockResolvedValue({ data: {} });
  mock.bucket.remove.mockResolvedValue({ data: {} });
});

describe("document operations", () => {
  it("records the document after uploading with an account-scoped path", async () => {
    const insert = vi.fn().mockResolvedValue({ data: {} });
    mock.from.mockReturnValue({ insert });
    await uploadDocument(input);
    expect(mock.bucket.upload.mock.calls[0][0]).toMatch(/^account-a\/.+-quote.pdf$/);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ account_id: "account-a", uploaded_by: "admin", title: "Quote" }));
    expect(mock.bucket.remove).not.toHaveBeenCalled();
  });
  it("removes an uploaded object when registration fails", async () => {
    mock.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: new Error("db") }) });
    await expect(uploadDocument(input)).rejects.toThrow("uploaded file was removed");
    expect(mock.bucket.remove).toHaveBeenCalledWith([mock.bucket.upload.mock.calls[0][0]]);
  });
  it("identifies failed cleanup rather than claiming rollback succeeded", async () => {
    mock.from.mockReturnValue({ insert: vi.fn().mockRejectedValue(new Error("offline")) });
    mock.bucket.remove.mockResolvedValue({ error: new Error("offline") });
    await expect(uploadDocument(input)).rejects.toThrow("could not be removed");
  });
  it("awaits the audit RPC before signing and blocks signing when authorization fails", async () => {
    mock.rpc.mockResolvedValue({ error: new Error("denied") });
    await expect(getDocumentLink({ id: "doc", storage_path: "a/doc" })).rejects.toThrow("denied");
    expect(mock.rpc).toHaveBeenCalledWith("record_document_access", { document_id: "doc" });
    expect(mock.bucket.createSignedUrl).not.toHaveBeenCalled();
    mock.rpc.mockResolvedValue({ data: 1 });
    mock.bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://example.test/file" } });
    expect(await getDocumentLink({ id: "doc", storage_path: "a/doc" })).toBe("https://example.test/file");
  });
  it("asks Storage for an attachment named after the title when downloading", async () => {
    mock.rpc.mockResolvedValue({ data: 1 });
    mock.bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://example.test/file" } });
    const doc = { id: "doc", title: "1st upload", storage_path: "a/uuid-quote.pdf" };
    await getDocumentLink(doc);
    expect(mock.bucket.createSignedUrl).toHaveBeenLastCalledWith("a/uuid-quote.pdf", 60, undefined);
    await getDocumentLink(doc, { download: true });
    expect(mock.bucket.createSignedUrl).toHaveBeenLastCalledWith("a/uuid-quote.pdf", 60, { download: "1st upload.pdf" });
    expect(mock.rpc).toHaveBeenCalledTimes(2);
  });
  it("scopes account and document queries even for an admin and bounds page size", async () => {
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), abortSignal: vi.fn(), maybeSingle: vi.fn() };
    for (const key of Object.keys(query)) query[key].mockReturnValue(query);
    query.abortSignal.mockResolvedValue({ data: Array.from({ length: 26 }, (_, id) => ({ id })) });
    mock.from.mockReturnValue(query);
    const result = await listDocuments("account-b", 2, "");
    expect(query.eq).toHaveBeenCalledWith("account_id", "account-b");
    expect(query.range).toHaveBeenCalledWith(50, 75);
    expect(result.documents).toHaveLength(25);
    expect(result.hasMore).toBe(true);
    query.abortSignal.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: { id: "account-b" } });
    await getAccount("account-b");
    expect(query.eq).toHaveBeenCalledWith("id", "account-b");
  });
});
