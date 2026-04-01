import { defineConfig, devices } from '@playwright/test';

const DEFAULT_BASE_URL = 'http://localhost:5173';
const DEFAULT_API_URL = 'http://localhost:3001/api';

function stripTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}

function normalizeBaseUrl(value: string | undefined): string {
    return stripTrailingSlash(value || DEFAULT_BASE_URL);
}

function deriveApiUrl(baseUrl: string): string {
    try {
        const parsed = new URL(baseUrl);
        if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && parsed.port === '5173') {
            return DEFAULT_API_URL;
        }

        return stripTrailingSlash(new URL('/api', `${baseUrl}/`).toString());
    } catch {
        return DEFAULT_API_URL;
    }
}

function isLocalTarget(baseUrl: string): boolean {
    try {
        const parsed = new URL(baseUrl);
        return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
        return true;
    }
}

const baseURL = normalizeBaseUrl(process.env.PLAYWRIGHT_BASE_URL);
const apiURL = stripTrailingSlash(process.env.PLAYWRIGHT_API_URL || deriveApiUrl(baseURL));
const useExistingServer = process.env.PLAYWRIGHT_USE_EXISTING_SERVER === 'true';
const manageLocalServers = isLocalTarget(baseURL) && !useExistingServer;

process.env.PLAYWRIGHT_BASE_URL = baseURL;
process.env.PLAYWRIGHT_API_URL = apiURL;

export default defineConfig({
    testDir: './e2e',
    timeout: 120 * 1000,
    outputDir: 'test-results/artifacts',
    globalSetup: './e2e/global-setup.ts',
    expect: {
        timeout: 10000,
    },
    fullyParallel: false,
    retries: 0,
    workers: process.env.CI ? 1 : 2,
    reporter: [
        ['html', { open: 'never', outputFolder: 'test-results/html' }],
        ['json', { outputFile: 'test-results/report.json' }],
    ],
    use: {
        baseURL,
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
    webServer: manageLocalServers
        ? [
            {
                command: 'npm run dev:server',
                url: 'http://localhost:3001/api/live',
                reuseExistingServer: !process.env.CI,
                timeout: 180 * 1000,
            },
            {
                command: 'npm run dev',
                url: baseURL,
                reuseExistingServer: !process.env.CI,
                timeout: 180 * 1000,
            },
        ]
        : undefined,
});
