import { afterEach, describe, expect, it, vi } from 'vitest';
import { createErrorReporter, installGlobalErrorReporting, ERROR_CODES } from './errorReporting';
import handler from '../../api/client-error';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('category-only reporting', () => {
  it('is opt-in and rejects arbitrary details', () => {
    const fetcher = vi.fn();
    createErrorReporter({ fetcher })('render_error');
    const report = createErrorReporter({ enabled: true, fetcher });
    report(new Error('secret')); report('secret@example.com');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('deduplicates and never transmits additional arguments or credentials', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
    const report = createErrorReporter({ enabled: true, fetcher });
    report('render_error', { token: 'secret' }); report('render_error');
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/api/client-error', expect.objectContaining({
      body: '{"code":"render_error"}', credentials: 'omit', referrerPolicy: 'no-referrer',
    }));
    expect(() => createErrorReporter({ enabled: true, fetcher: () => { throw Error(); } })('render_error')).not.toThrow();
  });
  it('registers and removes global listeners without reading event payloads', () => {
    const target = new EventTarget();
    const report = vi.fn();
    const cleanup = installGlobalErrorReporting(target, report);
    target.dispatchEvent(new Event('error'));
    target.dispatchEvent(new Event('unhandledrejection'));
    expect(report.mock.calls).toEqual([['uncaught_error'], ['unhandled_rejection']]);
    cleanup(); target.dispatchEvent(new Event('error'));
    expect(report).toHaveBeenCalledTimes(2);
  });
});

describe('client-error endpoint', () => {
  const request = (body = '{"code":"render_error"}', headers = {}, method = 'POST') => new Request('https://site.example/api/client-error', {
    method, headers: { origin: 'https://site.example', 'content-type': 'application/json', ...headers },
    ...(method === 'POST' ? { body } : {}),
  });
  const enable = () => {
    vi.stubEnv('CLIENT_ERROR_LOGGING_ENABLED', 'true');
    vi.stubEnv('CLIENT_ERROR_ALLOWED_ORIGINS', 'https://site.example');
  };
  it('logs only allowed categories; client and server allowlists agree', async () => {
    enable(); const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    for (const code of ERROR_CODES) {
      expect((await handler(request(JSON.stringify({ code })))).status).toBe(204);
      expect(log).toHaveBeenLastCalledWith(JSON.stringify({ event: 'client_error', code }));
    }
  });
  it('rejects bad origins, methods, content types, malformed and oversized bodies without logs', async () => {
    enable(); const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const cases = [
      [request(undefined, {}, 'GET'), 405],
      [request(undefined, { origin: 'https://evil.example' }), 403],
      [request(undefined, { origin: 'null' }), 403],
      [request(undefined, { origin: '' }), 403],
      [request(undefined, { 'content-type': 'text/plain' }), 415],
      [request('invalid'), 400], [request('null'), 400],
      [request('{"code":"secret"}'), 400],
      [request('{"code":"render_error","email":"secret"}'), 400],
      [request('x'.repeat(129)), 413],
      [request(undefined, { 'content-length': '129' }), 413],
      [request('é'.repeat(65)), 413],
    ];
    for (const [req, status] of cases) expect((await handler(req)).status).toBe(status);
    expect(log).not.toHaveBeenCalled();
  });
  it('defaults off and fails closed with no configured origins', async () => {
    vi.stubEnv('CLIENT_ERROR_LOGGING_ENABLED', 'false');
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect((await handler(request())).status).toBe(204);
    enable(); vi.stubEnv('CLIENT_ERROR_ALLOWED_ORIGINS', '');
    expect((await handler(request())).status).toBe(403);
    expect(log).not.toHaveBeenCalled();
  });
});
