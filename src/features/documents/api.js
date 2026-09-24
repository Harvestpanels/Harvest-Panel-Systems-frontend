import { reportError } from "../../utils/errorReporting";
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 25;

/** @typedef {{id: string, title: string, storage_path: string, size_bytes: number|null, uploaded_at: string}} DocumentRecord */
/** @typedef {{id: string, company_name: string}} AccountRecord */

function unwrap(result) {
  if (result.error) { reportError("portal_request_error"); throw result.error; }
  return result.data;
}

export async function getAccount(accountId, signal) {
  if (!accountId) return null;
  return unwrap(await supabase.from("accounts").select("id, company_name")
    .eq("id", accountId).abortSignal(signal).maybeSingle());
}

/** @returns {Promise<{documents: DocumentRecord[], hasMore: boolean}>} */
export async function listDocuments(accountId, page = 0, search = "", signal) {
  if (!accountId) return { documents: [], hasMore: false };
  let query = supabase.from("documents")
    .select("id, title, storage_path, size_bytes, uploaded_at")
    .eq("account_id", accountId)
    .order("uploaded_at", { ascending: false }).order("id");
  if (search.trim()) query = query.ilike("title", `%${search.trim().replace(/[%_\\]/g, "\\$&")}%`);
  const rows = unwrap(await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).abortSignal(signal));
  return { documents: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function uploadDocument({ file, accountId, title, profileId }) {
  if (!file?.size) throw new Error("Choose a file first.");
  if (!accountId) throw new Error("Choose which customer this is for.");
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${accountId}/${crypto.randomUUID()}-${safeName}`;
  const bucket = supabase.storage.from("partner-docs");
  unwrap(await bucket.upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false }));
  try {
    unwrap(await supabase.from("documents").insert({
      account_id: accountId, title: title.trim() || file.name, storage_path: path,
      size_bytes: file.size, content_type: file.type || null, uploaded_by: profileId,
    }));
  } catch {
    try {
      unwrap(await bucket.remove([path]));
    } catch {
      throw new Error("The document record could not be saved and the uploaded file could not be removed. Contact support before retrying.");
    }
    throw new Error("The document record could not be saved. The uploaded file was removed; please try again.");
  }
}

export async function getDocumentLink(doc) {
  // The RPC verifies access and records a link request using database identity/time.
  // It is not evidence that the recipient read or downloaded the file.
  unwrap(await supabase.rpc("record_document_access", { document_id: doc.id }));
  const data = unwrap(await supabase.storage.from("partner-docs").createSignedUrl(doc.storage_path, 60));
  if (!data?.signedUrl) throw new Error("The file link could not be created.");
  return data.signedUrl;
}

export async function listAdminRows(table, page, search, signal) {
  const accounts = table === "accounts";
  let query = supabase.from(table).select(accounts ? "id, company_name" : "id, email, full_name, account_id, role");
  if (search.trim()) query = query.ilike(accounts ? "company_name" : "email", `%${search.trim().replace(/[%_\\]/g, "\\$&")}%`);
  const rows = unwrap(await query.order(accounts ? "company_name" : "email").order("id")
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).abortSignal(signal));
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function moveProfile(profileId, accountId) {
  unwrap(await supabase.from("profiles").update({ account_id: accountId }).eq("id", profileId));
}
