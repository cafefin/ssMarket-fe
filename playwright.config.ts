import { defineConfig, devices } from "@playwright/test";

// The suite runs the real frontend and backend against a throwaway database.
// Requirements: Docker Compose services of ssMarket-be are up, and the
// backend repository is checked out next to this one (or E2E_BACKEND_DIR).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Tests create their own uniquely named people and listings, so they do
  // not interfere; one worker keeps a laptop responsive.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "./e2e/support/start-backend.sh",
      url: "http://localhost:4100/health",
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: "pipe",
    },
    {
      command: "./e2e/support/start-frontend.sh",
      url: "http://localhost:3100/login",
      timeout: 240_000,
      reuseExistingServer: false,
      stdout: "pipe",
    },
  ],
});
