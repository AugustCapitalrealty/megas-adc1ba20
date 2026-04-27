import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for MEGAS.
 *
 * Run locally:
 *   npx playwright install --with-deps   (first time only)
 *   npm run e2e                          (headless)
 *   npm run e2e:ui                       (interactive)
 *
 * The dev server is started automatically (vite on :8080).
 * Authenticated journeys use a mocked Supabase session injected via
 * `tests/e2e/fixtures/auth.ts` so the suite runs without Google OAuth.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 7_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});