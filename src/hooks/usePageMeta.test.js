import { afterEach, beforeEach, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageMeta } from "./usePageMeta";

const content = (key) => document.head.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.getAttribute("content");
let original;
beforeEach(() => { original = document.head.innerHTML; });
afterEach(() => { document.head.innerHTML = original; });

it("updates route and social tags with a consistent origin, then restores existing metadata", () => {
  document.head.innerHTML = '<title>Original</title><meta name="description" content="Default"><meta property="og:title" content="Social"><meta property="og:image" content="/og-image.png"><meta name="twitter:image" content="/og-image.png"><link rel="canonical" href="/original"><meta name="robots" content="index, follow">';
  const initial = document.head.innerHTML;
  const { rerender, unmount } = renderHook((props) => usePageMeta(props), {
    initialProps: { title: "Products", description: "Panels", path: "/products?x=1#top", noindex: true },
  });
  expect(document.title).toBe("Products");
  for (const key of ["og:title", "twitter:title"]) expect(content(key)).toBe("Products");
  for (const key of ["description", "og:description", "twitter:description"]) expect(content(key)).toBe("Panels");
  for (const key of ["og:url", "twitter:url"]) expect(content(key)).toBe("https://harvestpanels.com/products");
  for (const key of ["og:image", "twitter:image"]) expect(content(key)).toBe("https://harvestpanels.com/og-image.png");
  expect(content("robots")).toBe("noindex, follow");
  rerender({ title: "Specs", description: "Details", path: "https://preview.example/specs", noindex: false });
  expect(document.head.querySelector('[rel="canonical"]').href).toBe("https://harvestpanels.com/specs");
  expect(content("og:title")).toBe("Specs");
  expect(content("robots")).toBe("index, follow");
  unmount();
  expect(document.head.innerHTML).toBe(initial);
});

it("removes created tags and restores absent attributes when options clear", () => {
  document.head.innerHTML = '<title>Base</title><meta name="description">';
  const { rerender, unmount } = renderHook((props) => usePageMeta(props), {
    initialProps: { title: "Missing", description: "Temporary", path: "missing", noindex: true },
  });
  expect(content("robots")).toBe("noindex, follow");
  rerender({});
  expect(document.title).toBe("Base");
  expect(document.head.querySelector('meta[name="description"]')).not.toHaveAttribute("content");
  expect(document.head.querySelector('[rel="canonical"]')).toBeNull();
  expect(content("robots")).toBeUndefined();
  unmount();
});
