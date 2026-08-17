import { useEffect } from "react";

// Sets the document title and meta description for the current page. This
// is a client-rendered SPA with no server-side rendering, so social-preview
// crawlers (which only fetch the static index.html) never see these — but
// the browser tab title and Google's indexer (which does execute JS) both
// benefit from each route having its own values instead of sharing
// index.html's single static <title>/description for every page.
export function usePageMeta({ title, description }) {
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
  }, [title, description]);
}
