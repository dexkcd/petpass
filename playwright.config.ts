import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke tests. They expect a running app with the demo seed
 * applied (pnpm db:seed). Point E2E_BASE_URL at the server under test.
 *
 *   pnpm dev            # in one terminal
 *   pnpm e2e            # in another
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
