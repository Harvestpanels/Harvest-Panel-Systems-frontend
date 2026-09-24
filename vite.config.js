import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath } from 'node:url'
import { prerenderMeta } from './scripts/prerender-meta.mjs'

// After the bundle is written, emit dist/<route>/index.html for each public
// route in src/seo/routes.js with route-specific title/description/canonical/
// OG/Twitter tags (static meta for crawlers; the SPA hydrates unchanged).
const prerenderMetaPlugin = () => ({
  name: 'hps-prerender-meta',
  apply: 'build',
  closeBundle() {
    prerenderMeta(fileURLToPath(new URL('./dist', import.meta.url)))
  },
})

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    prerenderMetaPlugin(),
  ],

  build: {
    // ES2020 baseline (optional chaining, nullish coalescing kept native)
    target: 'es2020',

    // Vite 8 uses OXC by default (fastest minifier)
    minify: true,

    // Never ship source maps to production (leaks internal code structure)
    sourcemap: false,

    // Minify CSS
    cssMinify: true,

    // Inline assets smaller than 4 KB as base64 (avoids extra HTTP round-trips)
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        // Split React runtime into its own chunk so it can be cached
        // independently of app code across deploys
        manualChunks: (id) => {
          const p = id.replace(/\\/g, '/');
          // Exact package dirs only; a bare 'node_modules/react' prefix would
          // also catch unrelated react-* packages. react-router is included on
          // purpose: it is on every page and changes rarely, like React itself.
          if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(p)) return 'react';
          // Supabase is only reached via lazy imports (portal pages and the
          // lazy AuthModal), so its own chunk keeps it off marketing pages.
          if (p.includes('/node_modules/@supabase/')) return 'supabase';
        },
      },
    },
  },

  // Development headers; vercel.json owns deployment headers
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
