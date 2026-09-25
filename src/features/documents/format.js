// Shared by the customer document list (PortalPage) and the admin one
// (AdminDocumentList) so both describe a file the same way.

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? mb.toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

const DATE = { year: "numeric", month: "short", day: "numeric" };

// "Mar 4, 2026 · 1.2 MB"
export function describeDocument(doc) {
  const size = formatSize(doc.size_bytes);
  return new Date(doc.uploaded_at).toLocaleDateString(undefined, DATE) + (size ? " · " + size : "");
}

// The stored file's real extension ("pdf"), from storage_path rather than the
// title: titles are free text ("1st upload") and often have no extension.
export function fileExtension(doc) {
  const name = String(doc.storage_path || doc.title || "").split("/").pop();
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

// Name the browser saves a download as: the title, with the file's extension
// added when the title doesn't already end in it.
export function downloadName(doc) {
  const ext = fileExtension(doc);
  const title = String(doc.title || "document").trim().replace(/[\\/:*?"<>|]+/g, "-");
  return ext && !title.toLowerCase().endsWith("." + ext) ? `${title}.${ext}` : title;
}
