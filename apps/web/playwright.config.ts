import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

/**
 * E2E runs against a production build in `.next-prod` (the service worker only registers in
 * production). Build first: `pnpm e2e:build`. Two viewports per the brief: 360×640 and 1280×800.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'sw-TZ',
    timezoneId: 'Africa/Dar_es_Salaam',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 640 },
        storageState: 'e2e/.auth/owner.json',
      },
    },
    {
      name: 'desktop',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        storageState: 'e2e/.auth/owner.json',
      },
    },
  ],
  webServer: {
    command: `NEXT_DIST_DIR=.next-prod pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
