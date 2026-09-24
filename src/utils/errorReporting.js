// Only these fixed categories may cross the network. Never pass an Error,
// URL, user identifier, form value, or arbitrary context to this interface.
export const ERROR_CODES = Object.freeze([
  'render_error', 'uncaught_error', 'unhandled_rejection',
  'pipedrive_load_error', 'pipedrive_timeout', 'portal_request_error', 'auth_request_error',
]);

export function createErrorReporter({ enabled = false, fetcher = globalThis.fetch } = {}) {
  const sent = new Set();
  return function reportError(code) {
    if (!enabled || !ERROR_CODES.includes(code) || sent.has(code)) return;
    sent.add(code); // At most one of each category per page lifetime, even on failure.
    try {
      Promise.resolve(fetcher('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        keepalive: true,
      })).catch(() => {}); // Reporting must never produce another error event.
    } catch { /* Missing/offline transports must not interrupt recovery. */ }
  };
}

export const reportError = createErrorReporter({
  enabled: import.meta.env.PROD && import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true',
});

export function installGlobalErrorReporting(target = window, report = reportError) {
  const onError = () => report('uncaught_error');
  const onRejection = () => report('unhandled_rejection');
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
