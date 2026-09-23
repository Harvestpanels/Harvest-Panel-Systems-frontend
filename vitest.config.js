import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Kept separate from vite.config.js so the production build never loads test
// tooling. Vitest reads this file by name.
export default defineConfig({
  plugins: [react()],
  // Vitest's own esbuild pass transforms JSX before the React plugin sees it,
  // and defaults to the classic runtime — which emits React.createElement and
  // then fails with "React is not defined", since nothing imports React by
  // name. The app's build does not hit this; only the test pipeline does.
  esbuild: { jsx: "automatic" },
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
