import { useEffect } from "react";

const SITE_ORIGIN = "https://harvestpanels.com";

// Route metadata for the live browser document only. Static social crawlers
// still receive index.html; this hook does not provide server-rendered metadata.
export function usePageMeta({ title, description, path, noindex = false }) {
  useEffect(() => {
    const restore = [];
    function setTag(selector, tag, identity, attribute, value) {
      let node = document.head.querySelector(selector);
      const created = !node;
      if (created) {
        node = document.createElement(tag);
        Object.entries(identity).forEach(([key, val]) => node.setAttribute(key, val));
        document.head.appendChild(node);
      }
      const previous = node.getAttribute(attribute);
      node.setAttribute(attribute, value);
      restore.push(() => {
        if (created) node.remove();
        else if (previous === null) node.removeAttribute(attribute);
        else node.setAttribute(attribute, previous);
      });
    }
    function meta(kind, key, value) {
      setTag(`meta[${kind}="${key}"]`, "meta", { [kind]: key }, "content", value);
    }
    if (title) {
      const previous = document.title;
      document.title = title;
      restore.push(() => { document.title = previous; });
      meta("property", "og:title", title);
      meta("name", "twitter:title", title);
    }
    if (description) {
      meta("name", "description", description);
      meta("property", "og:description", description);
      meta("name", "twitter:description", description);
    }
    if (path) {
      // Retain the route pathname but always use the production origin, even
      // on previews or when callers supply an absolute URL. Drop query/hash.
      const route = new URL(path, `${SITE_ORIGIN}/`);
      const url = `${SITE_ORIGIN}${route.pathname}`;
      setTag('link[rel="canonical"]', "link", { rel: "canonical" }, "href", url);
      meta("property", "og:url", url);
      meta("name", "twitter:url", url);
    }
    // Resolve the existing shared artwork against the same origin as route URLs.
    for (const [kind, key] of [["property", "og:image"], ["name", "twitter:image"]]) {
      const content = document.head.querySelector(`meta[${kind}="${key}"]`)?.getAttribute("content");
      if (content) meta(kind, key, new URL(content, `${SITE_ORIGIN}/`).href);
    }
    if (noindex) meta("name", "robots", "noindex, follow");
    return () => restore.reverse().forEach((undo) => undo());
  }, [title, description, path, noindex]);
}
