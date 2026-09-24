// Keep the server allowlist explicit; never import a browser/Vite module here.
const ERROR_CODES = [
  'render_error', 'uncaught_error', 'unhandled_rejection',
  'pipedrive_load_error', 'pipedrive_timeout', 'portal_request_error', 'auth_request_error',
];

export const config = { runtime: 'edge' };
const MAX_BYTES = 128;
const reply = (status, headers = {}) => new Response(null, {
  status, headers: { 'Cache-Control': 'no-store', ...headers },
});

export default async function handler(request) {
  if (request.method !== 'POST') return reply(405, { Allow: 'POST' });
  if (process.env.CLIENT_ERROR_LOGGING_ENABLED !== 'true') return reply(204);
  const origins = (process.env.CLIENT_ERROR_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('origin');
  if (!origin || !origins.includes(origin) || origin === 'null') return reply(403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415);
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) return reply(413);

  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    let size = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return reply(413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !ERROR_CODES.includes(body.code)) return reply(400);
    console.info(JSON.stringify({ event: 'client_error', code: body.code }));
    return reply(204);
  } catch {
    return reply(400);
  }
}
