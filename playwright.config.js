import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
    { name: "firefox", testMatch: "responsive.spec.js", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testMatch: "responsive.spec.js", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173", reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: "https://portal-test.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", VITE_ERROR_REPORTING_ENABLED: "false" },
  },
});
