// Post-build: write dist/<route>/index.html copies of dist/index.html with
// route-specific <title>, description, canonical, og:* and twitter:* tags so
// crawlers and social previews see correct metadata without JS. The body and
// script/link tags are untouched, so the SPA boots and hydrates identically.
// Vercel serves filesystem matches before rewrites, so these files win.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_META, PRERENDER_ROUTES, SITE_ORIGIN } from "../src/seo/routes.js";


const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function setAttr(html, re, value, label) {
  if (!re.test(html)) throw new Error(`prerender-meta: tag not found in dist/index.html: ${label}`);
  return html.replace(re, (_m, pre, _old, post) => `${pre}${value}${post}`);
}

export function renderRoute(html, meta) {
  const url = `${SITE_ORIGIN}${meta.path}`;
  const t = esc(meta.title), d = esc(meta.description);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  const tags = [
    [/(<meta name="description" content=")([^"]*)(")/, d, "description"],
    [/(<link rel="canonical" href=")([^"]*)(")/, url, "canonical"],
    [/(<meta property="og:url" content=")([^"]*)(")/, url, "og:url"],
    [/(<meta property="og:title" content=")([^"]*)(")/, t, "og:title"],
    [/(<meta property="og:description" content=")([^"]*)(")/, d, "og:description"],
    [/(<meta name="twitter:title" content=")([^"]*)(")/, t, "twitter:title"],
    [/(<meta name="twitter:description" content=")([^"]*)(")/, d, "twitter:description"],
  ];
  for (const [re, v, label] of tags) html = setAttr(html, re, v, label);
  if (meta.breadcrumb) {
    const ld = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: meta.breadcrumb, item: url },
      ],
    };
    html = html.replace("</head>", `  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  </head>`);
  }
  return html;
}

// Runs automatically from the Vite plugin in vite.config.js (closeBundle), so
// plain `vite build` / `npm run build` both produce the files. Can also be run
// standalone: `node scripts/prerender-meta.mjs`.
export function prerenderMeta(dist) {
  const base = readFileSync(join(dist, "index.html"), "utf8");
  for (const route of PRERENDER_ROUTES) {
    const out = join(dist, route.replace(/^\//, ""), "index.html");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderRoute(base, ROUTE_META[route]));
    console.log(`prerender-meta: wrote ${route}/index.html`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prerenderMeta(join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "dist"));
}
