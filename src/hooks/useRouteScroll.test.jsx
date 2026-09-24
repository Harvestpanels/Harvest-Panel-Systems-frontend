import { lazy, Suspense } from "react";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { useRouteScroll, waitForHash } from "./useRouteScroll";
import { scrollCenter } from "../utils/scroll";
import PageLoader from "../components/PageLoader";
import PageLoaderProvider from "../context/PageLoaderProvider";

vi.mock("../utils/scroll", () => ({ scrollCenter: vi.fn() }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it("scrolls an initial encoded hash only after lazy content and loader finish", async () => {
  vi.useFakeTimers();
  let resolveChunk;
  const LazyPage = lazy(() => new Promise(resolve => { resolveChunk = resolve; }));
  function Scroll() { useRouteScroll(); return null; }
  function Page() { return <main id="contact us"><PageLoader ready /></main>; }
  render(<MemoryRouter initialEntries={["/page#contact%20us"]}><PageLoaderProvider>
    <Scroll /><Suspense fallback={<PageLoader ready={false} />}><LazyPage /></Suspense>
  </PageLoaderProvider></MemoryRouter>);
  act(() => vi.advanceTimersByTime(2000));
  expect(scrollCenter).not.toHaveBeenCalled();
  await act(async () => resolveChunk({ default: Page }));
  act(() => vi.advanceTimersByTime(1));
  expect(scrollCenter).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(500));
  act(() => vi.advanceTimersByTime(100));
  expect(scrollCenter).toHaveBeenCalledExactlyOnceWith("contact us");
});

it("cancels a previous hash on navigation and on unmount", () => {
  vi.useFakeTimers();
  let navigate;
  function Scroll() { useRouteScroll(); navigate = useNavigate(); return null; }
  const view = render(<MemoryRouter initialEntries={["/#old"]}><Scroll /><div id="next" /></MemoryRouter>);
  act(() => navigate("/#next"));
  const old = document.createElement("div"); old.id = "old"; document.body.append(old);
  act(() => vi.advanceTimersByTime(100));
  expect(scrollCenter).toHaveBeenCalledExactlyOnceWith("next");
  act(() => navigate("/#missing"));
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  old.remove();
});

it("bounds missing-target retries and handles malformed hashes", () => {
  vi.useFakeTimers();
  const cancel = waitForHash("#missing");
  act(() => vi.advanceTimersByTime(10000));
  expect(vi.getTimerCount()).toBe(0);
  expect(scrollCenter).not.toHaveBeenCalled();
  cancel();
  expect(() => waitForHash("#%broken")()).not.toThrow();
});

it("cancels a scheduled layout frame", () => {
  vi.useFakeTimers();
  const target = document.createElement("div"); target.id = "ready"; document.body.append(target);
  waitForHash("#ready")();
  act(() => vi.runAllTimers());
  expect(scrollCenter).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  target.remove();
});
