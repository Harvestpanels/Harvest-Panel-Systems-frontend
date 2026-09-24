// Bound network waits while preserving callers' cancellation. Uploads get more
// time than metadata/auth reads; no request contents are logged here.
export async function boundedFetch(input, init = {}) {
  const controller = new AbortController();
  const caller = init.signal;
  const cancel = () => controller.abort(caller.reason);
  if (caller?.aborted) cancel();
  else caller?.addEventListener("abort", cancel, { once: true });
  const isUpload = init.body instanceof Blob || init.body instanceof FormData;
  const timer = setTimeout(() => controller.abort(), isUpload ? 120000 : 15000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener("abort", cancel);
  }
}
