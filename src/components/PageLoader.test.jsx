import { lazy, Suspense, StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PageLoader from "./PageLoader";
import PageLoaderProvider from "../context/PageLoaderProvider";

afterEach(() => vi.useRealTimers());

it("retains the animated logo across loading stages and completes once", () => {
  vi.useFakeTimers();
  const done = vi.fn();
  const stage = (key, ready) => (
    <StrictMode><PageLoaderProvider>
      <PageLoader key={key} ready={ready} onDone={done} />
    </PageLoaderProvider></StrictMode>
  );
  const view = render(stage("chunk", false));
  const logo = view.container.querySelector(".hp-page-loader__logo");
  act(() => vi.advanceTimersByTime(300));
  view.rerender(stage("auth", false));
  expect(view.container.querySelector(".hp-page-loader__logo")).toBe(logo);
  act(() => vi.advanceTimersByTime(300));
  view.rerender(stage("documents", true));
  expect(view.container.querySelector(".hp-page-loader__logo")).toBe(logo);
  act(() => vi.advanceTimersByTime(300));
  expect(logo.parentElement).toHaveClass("is-ready");
  expect(done).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(500));
  expect(view.container.querySelector(".hp-page-loader")).toBeNull();
  expect(done).toHaveBeenCalledTimes(1);
  view.rerender(stage("next-page", false));
  expect(view.container.querySelector(".hp-page-loader__logo")).not.toBe(logo);
});

it("does not finish while another loading stage is pending", () => {
  vi.useFakeTimers();
  const done = vi.fn();
  const view = render(<PageLoaderProvider>
    <PageLoader ready onDone={done} />
    <PageLoader ready={false} />
  </PageLoaderProvider>);
  act(() => vi.advanceTimersByTime(5000));
  expect(view.container.querySelectorAll(".hp-page-loader")).toHaveLength(1);
  expect(done).not.toHaveBeenCalled();
});


it("keeps the same overlay through a real lazy Suspense and readiness handoff", async () => {
  vi.useFakeTimers();
  let resolveChunk;
  const done = vi.fn();
  const LazyPage = lazy(() => new Promise(resolve => { resolveChunk = resolve; }));
  function Page({ ready }) {
    return <main><button>Destination</button><PageLoader ready={ready} onDone={done} /></main>;
  }
  const tree = (ready) => <StrictMode><PageLoaderProvider>
    <Suspense fallback={<PageLoader ready={false} />}><LazyPage ready={ready} /></Suspense>
  </PageLoaderProvider></StrictMode>;
  const view = render(tree(false));
  const logo = view.container.querySelector(".hp-page-loader__logo");
  act(() => vi.advanceTimersByTime(300));
  await act(async () => resolveChunk({ default: Page }));
  expect(view.container.querySelector(".hp-page-loader__logo")).toBe(logo);
  expect(view.container.querySelector("main")).toHaveAttribute("inert");
  act(() => vi.advanceTimersByTime(1000));
  expect(done).not.toHaveBeenCalled();
  view.rerender(tree(true));
  act(() => vi.advanceTimersByTime(1));
  act(() => vi.advanceTimersByTime(500));
  expect(done).toHaveBeenCalledTimes(1);
  expect(view.container.querySelector(".hp-page-loader")).toBeNull();
  expect(view.container.querySelector("main")).not.toHaveAttribute("inert");
});

it("announces loading, contains focus, and restores focus and existing inert state", () => {
  vi.useFakeTimers();
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const view = render(<PageLoaderProvider>
    <main><button>Hidden control</button></main><aside inert>Already inert</aside>
    <PageLoader ready />
  </PageLoaderProvider>);
  const status = view.getByRole("status");
  expect(status).toHaveTextContent("Loading page, please wait.");
  expect(status).toHaveFocus();
  expect(trigger).toHaveAttribute("inert");
  view.getByText("Hidden control").focus();
  expect(status).toHaveFocus();
  act(() => vi.advanceTimersByTime(900));
  expect(status).toHaveAttribute("aria-live", "polite");
  act(() => vi.advanceTimersByTime(500));
  expect(trigger).toHaveFocus();
  expect(trigger).not.toHaveAttribute("inert");
  expect(view.container.querySelector("aside")).toHaveAttribute("inert");
  trigger.remove();
});

it("cancels fade completion when a stage becomes pending or unmounts", () => {
  vi.useFakeTimers();
  const done = vi.fn();
  const tree = ready => <PageLoaderProvider><PageLoader ready={ready} onDone={done} /></PageLoaderProvider>;
  const view = render(tree(true));
  act(() => vi.advanceTimersByTime(900));
  view.rerender(tree(false));
  act(() => vi.advanceTimersByTime(2000));
  expect(done).not.toHaveBeenCalled();
  expect(view.getByRole("status")).not.toHaveClass("is-ready");
  view.rerender(tree(true));
  view.unmount();
  act(() => vi.runAllTimers());
  expect(done).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});


it("ignores an abandoned lazy route resolving after a different route completes", async () => {
  vi.useFakeTimers();
  let resolveChunk;
  const abandonedDone = vi.fn();
  const destinationDone = vi.fn();
  const LazyPage = lazy(() => new Promise(resolve => { resolveChunk = resolve; }));
  const tree = abandoned => <PageLoaderProvider>
    <Suspense fallback={<PageLoader ready={false} />}>
      {abandoned ? <LazyPage /> : <main><PageLoader ready onDone={destinationDone} /></main>}
    </Suspense>
  </PageLoaderProvider>;
  const view = render(tree(true));
  const logo = view.container.querySelector(".hp-page-loader__logo");
  view.rerender(tree(false));
  expect(view.container.querySelector(".hp-page-loader__logo")).toBe(logo);
  act(() => vi.advanceTimersByTime(900));
  act(() => vi.advanceTimersByTime(500));
  expect(destinationDone).toHaveBeenCalledTimes(1);
  await act(async () => resolveChunk({ default: () => <PageLoader ready onDone={abandonedDone} /> }));
  act(() => vi.runAllTimers());
  expect(abandonedDone).not.toHaveBeenCalled();
  expect(view.queryByRole("status")).toBeNull();
  expect(view.container.querySelector("main")).not.toHaveAttribute("inert");
});
