import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount between tests so a leftover tree cannot satisfy the next one's query.
afterEach(cleanup);

// jsdom implements none of these, and the app uses all of them. Without stubs
// the component under test throws on mount and the failure reads like a bug in
// the component rather than a gap in the environment.
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}

// usePageReady waits on this; jsdom has no font loading at all.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve(), status: "loaded" },
    configurable: true,
  });
}

// Several components call it on mount; jsdom's version throws "not implemented".
Element.prototype.scrollIntoView = vi.fn();
