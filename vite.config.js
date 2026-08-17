import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],

  build: {
    // Target modern browsers — smaller, faster output
    target: 'es2017',

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
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }
        },
      },
    },
  },

  // Dev server security headers (mirrors production _headers file)
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
