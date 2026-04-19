/**
 * Playwright Konfiguration für DiggAI Volltest
 * 
 * Läuft gegen die Live-Seite (diggai.de) OHNE globalSetup,
 * da kein Backend und keine DB-Fixtures nötig sind.
 * 
 * Ausführung:
 *   npx playwright test --config=playwright.volltest.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://diggai.de';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'volltest-*.spec.ts',
  timeout: 30 * 1000,
  outputDir: 'test-results/volltest',
  
  // KEIN globalSetup — wir brauchen keine DB-Fixtures für Frontend-Tests
  // globalSetup: undefined,
  
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'test-results/volltest-html' }],
    ['json', { outputFile: 'test-results/volltest-report.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    locale: 'de-DE',
    viewport: { width: 1280, height: 720 },
    screenshot: 'on',
    video: 'on-first-retry',
    // Ignore HTTPS errors on custom domains
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // KEIN webServer — testen gegen Live-Site
});
