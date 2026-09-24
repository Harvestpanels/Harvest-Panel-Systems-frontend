import { afterEach, expect, it, vi } from "vitest";
import { boundedFetch } from "./request";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function hangingFetch() {
  vi.stubGlobal("fetch", vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
    if (signal.aborted) reject(new Error("aborted"));
    signal.addEventListener("abort", () => reject(new Error("aborted")));
  })));
}
it("times out stalled network reads", async () => {
  vi.useFakeTimers(); hangingFetch();
  const request = boundedFetch("https://example.test");
  const check = expect(request).rejects.toThrow("aborted");
  await vi.advanceTimersByTimeAsync(15000);
  await check;
  expect(vi.getTimerCount()).toBe(0);
});
it("preserves route cancellation and clears its timeout", async () => {
  vi.useFakeTimers(); hangingFetch();
  const caller = new AbortController();
  const request = boundedFetch("https://example.test", { signal: caller.signal });
  const check = expect(request).rejects.toThrow("aborted");
  caller.abort(); await check;
  expect(vi.getTimerCount()).toBe(0);
});
