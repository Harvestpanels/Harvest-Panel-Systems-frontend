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
