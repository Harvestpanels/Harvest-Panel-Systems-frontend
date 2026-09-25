import { reportError } from "../../utils/errorReporting";
import { supabase } from "../../lib/supabase";
import { downloadName } from "./format";

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

// Removes a document for everyone on its account. The row goes first: once
// it is gone the file is unreachable to customers (partner_docs_read only
// serves files that still have a row), so a failed file removal afterwards
// leaves an orphan only admins can see, never a broken entry in a customer's
// list. download history is removed with the row (on delete cascade).
export async function deleteDocument(doc) {
  const rows = unwrap(await supabase.from("documents").delete().eq("id", doc.id).select("id"));
  if (!rows?.length) throw new Error("The document could not be deleted. It may already have been removed.");
  try {
    unwrap(await supabase.storage.from("partner-docs").remove([doc.storage_path]));
    return { fileRemoved: true };
  } catch {
    return { fileRemoved: false };
  }
}

// `download: true` makes Storage serve the file as an attachment under
// `downloadName(doc)`, so the browser saves it instead of displaying it.
export async function getDocumentLink(doc, { download = false } = {}) {
  // The RPC verifies access and records a link request using database identity/time.
  // It is not evidence that the recipient read or downloaded the file.
  // Each step is labelled so a failure can be traced in development: both
  // steps end in the same customer-facing "could not be opened" message.
  const step = async (label, run) => {
    try {
      return unwrap(await run());
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`[documents] ${label} failed:`, error?.code || error?.statusCode || "", error?.message || error);
      throw error;
    }
  };
  await step("record_document_access RPC", () => supabase.rpc("record_document_access", { document_id: doc.id }));
  const data = await step("signed URL", () => supabase.storage.from("partner-docs")
    .createSignedUrl(doc.storage_path, 60, download ? { download: downloadName(doc) } : undefined));
  if (!data?.signedUrl) throw new Error("The file link could not be created.");
  return data.signedUrl;
}

export async function moveProfile(profileId, accountId) {
  unwrap(await supabase.from("profiles").update({ account_id: accountId }).eq("id", profileId));
}

function escapeLike(text) {
  return `%${text.trim().replace(/[%_\\]/g, "\\$&")}%`;
}

/** Companies with how many people and documents each has (admin only, via RLS). */
export async function listCompanies(page, search, signal) {
  let query = supabase.from("accounts").select("id, company_name, created_at, profiles(count), documents(count)");
  if (search.trim()) query = query.ilike("company_name", escapeLike(search));
  const rows = unwrap(await query.order("company_name").order("id")
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).abortSignal(signal));
  const companies = rows.slice(0, PAGE_SIZE).map(({ profiles, documents, ...company }) => ({
    ...company, people: profiles?.[0]?.count ?? 0, documents: documents?.[0]?.count ?? 0,
  }));
  return { rows: companies, hasMore: rows.length > PAGE_SIZE };
}

/**
 * People, ordered by email, with the name of their company. `inAccount`
 * limits to one company; `notInAccount` lists everyone else (for "Add
 * people"). Searches email and name.
 */
export async function listPeople(page, search, { inAccount, notInAccount } = {}, signal) {
  let query = supabase.from("profiles").select("id, email, full_name, account_id, role, accounts(company_name)");
  if (inAccount) query = query.eq("account_id", inAccount);
  if (notInAccount) query = query.or(`account_id.is.null,account_id.neq.${notInAccount}`);
  if (search.trim()) {
    // Commas and parentheses are PostgREST syntax inside or(); drop them.
    const term = escapeLike(search.replace(/[,()]/g, " "));
    query = query.or(`email.ilike.${term},full_name.ilike.${term}`);
  }
  const rows = unwrap(await query.order("email").order("id")
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).abortSignal(signal));
  const people = rows.slice(0, PAGE_SIZE).map(({ accounts, ...person }) => ({ ...person, company_name: accounts?.company_name ?? null }));
  return { rows: people, hasMore: rows.length > PAGE_SIZE };
}

export async function renameCompany(accountId, name) {
  const companyName = name.trim();
  if (!companyName) throw new Error("Please enter a company name.");
  const rows = unwrap(await supabase.from("accounts").update({ company_name: companyName }).eq("id", accountId).select("id, company_name"));
  if (!rows?.length) throw new Error("The company could not be renamed.");
  return rows[0];
}

// Only offered for a company with no people and no documents; the counts are
// re-read here so a stale screen can't delete a company someone was just
// moved into.
export async function deleteEmptyCompany(accountId) {
  const [company] = unwrap(await supabase.from("accounts").select("id, profiles(count), documents(count)").eq("id", accountId));
  if (!company) throw new Error("That company no longer exists.");
  if ((company.profiles?.[0]?.count ?? 0) > 0 || (company.documents?.[0]?.count ?? 0) > 0) {
    throw new Error("Only empty companies can be deleted. Move its people and delete its documents first.");
  }
  const rows = unwrap(await supabase.from("accounts").delete().eq("id", accountId).select("id"));
  if (!rows?.length) throw new Error("The company could not be deleted.");
}
