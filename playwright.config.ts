import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: 'list',
  testDir: './e2e',
  timeout: 45_000,
  workers: 2,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'corepack pnpm run dev',
    reuseExistingServer: true,
    timeout: 120_000,
    url: 'http://localhost:3000/login',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
});
