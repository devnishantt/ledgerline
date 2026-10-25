import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.API_URL ?? "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    screenshot: "off",
  },
  reporter: "list",
});
