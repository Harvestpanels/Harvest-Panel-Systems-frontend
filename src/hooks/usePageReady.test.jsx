import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { READY_CEILING_MS, usePageReady } from "./usePageReady";

let images;
beforeEach(() => {
  vi.useFakeTimers();
  images = [];
  vi.stubGlobal("Image", class {
    complete = false;
    removeAttribute = vi.fn();
    constructor() { images.push(this); }
  });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("waits only for declared images and resolves errors without fetching videos", async () => {
  const assets = ["poster.webp", "logo.png", "logo.png"];
  const offscreen = document.createElement("img");
  offscreen.src = "offscreen.png";
  offscreen.loading = "lazy";
  const video = document.createElement("video");
  video.src = "large.mp4";
  document.body.append(offscreen, video);
  const { result } = renderHook(() => usePageReady(assets));
  expect(images.map(image => image.src)).toEqual(["poster.webp", "logo.png"]);
  await act(async () => { images[0].onload(); images[1].onerror(); });
  expect(result.current).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  expect(images.every(image => image.onload === null && image.onerror === null)).toBe(true);
  offscreen.remove(); video.remove();
});

it("caps stalled images and cleans up requests", () => {
  const assets = ["stalled.png"];
  const { result } = renderHook(() => usePageReady(assets));
  act(() => vi.advanceTimersByTime(READY_CEILING_MS));
  expect(result.current).toBe(true);
  expect(images[0].removeAttribute).toHaveBeenCalledWith("src");
  expect(vi.getTimerCount()).toBe(0);
});

it("cancels obsolete declarations and ignores their late completion", async () => {
  const first = ["first.png"], second = ["second.png"];
  const { result, rerender, unmount } = renderHook(({ assets }) => usePageReady(assets), { initialProps: { assets: first } });
  const stale = images[0].onload;
  rerender({ assets: second });
  await act(async () => stale());
  expect(result.current).toBe(false);
  expect(images[0].onload).toBeNull();
  expect(images[0].removeAttribute).toHaveBeenCalledWith("src");
  unmount();
  expect(images[1].onload).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

it("uses a stable default across rerenders", async () => {
  const { result, rerender } = renderHook(() => usePageReady());
  await act(async () => {});
  expect(result.current).toBe(true);
  rerender();
  expect(result.current).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
