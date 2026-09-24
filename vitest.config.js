import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Kept separate from vite.config.js so the production build never loads test
// tooling. Vitest reads this file by name.
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom, not a real browser: these are unit tests for logic and rendering.
    // Anything depending on real layout, scroll position or video decoding is
    // verified against a live build instead — jsdom would report confident
    // nonsense for all three.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    css: false,
  },
});
