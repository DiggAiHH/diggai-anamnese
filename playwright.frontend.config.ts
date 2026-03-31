import { defineConfig, devices } from '@playwright/test';

/**
 * Frontend-only Playwright config — runs E2E tests against the Vite dev server
 * without requiring a running backend/database.
 * Used for CI/CD scenarios where only the frontend is available.
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 60 * 1000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false,
    retries: 1,
    workers: 2,
    reporter: [['html', { outputFolder: 'playwright-report-frontend' }], ['list']],
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        locale: 'de-DE',
        viewport: { width: 1280, height: 720 },
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 7'] },
        },
    ],
    // Reuse the already-running Vite server
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30 * 1000,
    },
});
