import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 120 * 1000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false,
    retries: 0,
    workers: process.env.CI ? 1 : 2,
    reporter: [['html'], ['json', { outputFile: 'test-results.json' }]],
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
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
