import { useEffect } from "react";

// Sets the document title, meta description, and canonical URL for the
// current page. This is a client-rendered SPA with no server-side
// rendering, so social-preview crawlers (which only fetch the static
// index.html) never see these — but the browser tab title and Google's
// indexer (which does execute JS) both benefit from each route having its
// own values instead of sharing index.html's single static
// <title>/description/canonical for every page. `path` is the route's own
// path (e.g. "/products") — without a per-route canonical tag, every page
// pointed at the same implicit canonical (the URL last set), which risks
// Google treating the other routes as duplicate content of whichever page
// happened to render most recently.
export function usePageMeta({ title, description, path, noindex = false }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }
    if (path) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", `https://harvestpanels.com${path}`);
    }
    // index.html's own <meta name="robots"> defaults every route to
    // "index, follow" — noindex pages (currently just the 404 catch-all)
    // override that here rather than by editing the static HTML, and
    // restore it on unmount so navigating from a noindex page to a real
    // one doesn't leave the override behind.
    if (noindex) {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      const prevContent = robotsMeta?.getAttribute("content");
      robotsMeta?.setAttribute("content", "noindex, follow");
      return () => robotsMeta?.setAttribute("content", prevContent ?? "index, follow");
    }
  }, [title, description, path, noindex]);
}
