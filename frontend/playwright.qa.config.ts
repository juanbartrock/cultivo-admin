import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de QA de navegación contra la app YA PUBLICADA.
 * No levanta webServer: apunta a PLAYWRIGHT_BASE_URL (por defecto producción).
 *
 *   set -a; . /home/deploy/.config/secrets/cultivo-admin-login.env; set +a
 *   QA_LABEL=fase0 npm run qa:nav
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /qa-nav\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://cultivo.ramsesvii.com',
    trace: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    },
  ],
});
