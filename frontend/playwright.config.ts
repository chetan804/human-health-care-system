import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.HCS_BASE_URL || "http://localhost:5173",
    headless: true,
    trace: "off",
  },
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
});
