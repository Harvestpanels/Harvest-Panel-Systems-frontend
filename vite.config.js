import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath } from 'node:url'

// The public marketing site is static HTML in public/ (served as-is, clean URLs
// via vercel.json). This build produces two things from it:
//   portal.html     the React app, now used only for /portal/* (sign-in and documents)
//   site/chat.js    the site's chat assistant, loaded by every static page
// The chat entry gets a fixed file name so the static pages can reference it.
const root = (p) => fileURLToPath(new URL(p, import.meta.url))

// Dev only: the React app lives at /portal.html now, so send /portal/* there.
const portalRewrite = (req, _res, next) => {
  if (req.url && /^\/portal(\/|\?|$)/.test(req.url)) req.url = '/portal.html'
  next()
}
// Preview (used by the e2e tests) also mimics vercel.json's cleanUrls, so
// /products serves products.html.
const cleanUrls = (req, _res, next) => {
  const [path, query = ''] = (req.url || '').split('?')
  if (/^\/[A-Za-z0-9-]+$/.test(path) && path !== '/portal') req.url = `${path}.html${query ? `?${query}` : ''}`
  next()
}
const portalDevRewrite = () => ({
  name: 'hps-portal-dev-rewrite',
  configureServer(server) { server.middlewares.use(portalRewrite) },
  configurePreviewServer(server) { server.middlewares.use(portalRewrite); server.middlewares.use(cleanUrls) },
})


export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    portalDevRewrite(),
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
      input: {
        portal: root('./portal.html'),
        chat: root('./src/chat-entry.jsx'),
      },
      output: {
        // Fixed names for the chat bundle only (the static pages link to them).
        entryFileNames: (chunk) => (chunk.name === 'chat' ? 'site/chat.js' : 'assets/[name]-[hash].js'),
        assetFileNames: (asset) => {
          const names = asset.names ?? (asset.name ? [asset.name] : [])
          return names.includes('chat.css') ? 'site/chat.css' : 'assets/[name]-[hash][extname]'
        },
        // Split React runtime into its own chunk so it can be cached
        // independently of app code across deploys
        manualChunks: (id) => {
          const p = id.replace(/\\/g, '/');
          // Exact package dirs only; a bare 'node_modules/react' prefix would
          // also catch unrelated react-* packages. react-router is included on
          // purpose: it is on every page and changes rarely, like React itself.
          if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(p)) return 'react';
          // Supabase is only reached via lazy imports (portal pages and the
          // lazy AuthModal), so its own chunk keeps it off the chat bundle.
          if (p.includes('/node_modules/@supabase/')) return 'supabase';
        },
      },
    },
  },

  // Development headers; vercel.json owns deployment headers
  server: {
    headers: {
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
