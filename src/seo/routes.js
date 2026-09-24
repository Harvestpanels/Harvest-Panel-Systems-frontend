// Single source of truth for public route metadata.
// Used by: pages (via usePageMeta) at runtime, and scripts/prerender-meta.mjs
// at build time to write per-route static HTML for crawlers/social previews.
// Keep this file dependency-free (plain data) so Node can import it directly.

export const SITE_ORIGIN = "https://harvestpanels.com";

export const ROUTE_META = {
  "/": {
    title: "Harvest Panel Systems | Insulated Metal Panels & Doors",
    description: "Global distributor of Interior Insulated Metal Panels and Doors for Industrial, Commercial, and Residential projects. Stock inventory ships anywhere in the U.S. within 48 hours from our Oklahoma distribution center.",
    path: "/",
  },
  "/products": {
    title: "Products | Harvest Panel Systems",
    description: "Browse our complete line of insulated wall panels, roof panels, fire-rated panels, cold storage panels, doors, and trim & hardware.",
    path: "/products",
    breadcrumb: "Products",
  },
  "/specs": {
    title: "Panel Specs | Harvest Panel Systems",
    description: "PIR foam core details, color options, certifications, fire rating tolerances, and construction efficiency for Harvest Panel Systems insulated metal panels.",
    path: "/specs",
    breadcrumb: "Specs",
  },
  "/blog": {
    title: "Blog & News | Harvest Panel Systems",
    description: "Company news, industry insights, and project case studies from the Harvest Panel Systems team.",
    path: "/blog",
    breadcrumb: "Blog",
  },
};

// Routes that get a prerendered dist/<route>/index.html (all but "/").
export const PRERENDER_ROUTES = Object.keys(ROUTE_META).filter((p) => p !== "/");
