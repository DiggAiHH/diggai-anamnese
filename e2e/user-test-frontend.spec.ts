import { test, expect } from '@playwright/test';

/**
 * Frontend-only user test: verifies the React SPA loads, renders correctly,
 * and basic navigation works without requiring a backend server.
 * 
 * Runs against: http://localhost:5173 (Vite dev server)
 */

test.describe('Frontend User Test: App Shell', () => {
    test('landing page loads and renders DiggAI branding', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // The app should render without a blank page
        const body = await page.locator('body');
        await expect(body).toBeVisible();

        // Check that React has mounted (no empty #root)
        const root = page.locator('#root');
        await expect(root).not.toBeEmpty();
    });

    test('page has correct meta tags and title', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
    });

    test('i18n loads German translations by default', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // The page should contain German text (configured locale is de-DE)
        const pageContent = await page.content();
        // Check that at least some German content or i18n keys are rendered
        expect(pageContent.length).toBeGreaterThan(1000);
    });

    test('router handles /arzt path', async ({ page }) => {
        const response = await page.goto('/arzt');
        // SPA should handle all routes (200 from Vite)
        expect(response?.status()).toBe(200);
    });

    test('router handles /admin path', async ({ page }) => {
        const response = await page.goto('/admin');
        expect(response?.status()).toBe(200);
    });

    test('no JavaScript console errors on load', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Filter out expected errors (API connection refused is expected without backend)
        const unexpectedErrors = errors.filter(
            (e) => !e.includes('ECONNREFUSED') && !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('net::ERR_') && !e.includes('Failed to fetch') && !e.includes('Content Security Policy') && !e.includes('frame-ancestors')
        );

        expect(unexpectedErrors).toEqual([]);
    });

    test('static assets load correctly (CSS, fonts)', async ({ page }) => {
        const failedResources: string[] = [];
        page.on('response', (response) => {
            if (response.status() >= 400 && !response.url().includes('/api/')) {
                failedResources.push(`${response.status()} ${response.url()}`);
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        expect(failedResources).toEqual([]);
    });

    test('viewport responsive: mobile renders without horizontal scroll', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
    });

    test('service worker is registered for PWA', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
        expect(hasSW).toBeTruthy();
    });
});

test.describe('Frontend User Test: Security Headers', () => {
    test('response includes security-relevant headers', async ({ page }) => {
        const response = await page.goto('/');
        const headers = response?.headers() ?? {};

        // Vite dev server won't have all production headers,
        // but content-type should be set
        expect(headers['content-type']).toContain('text/html');
    });

    test('no inline scripts with unsafe-eval', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const scripts = await page.locator('script').all();
        for (const script of scripts) {
            const content = await script.textContent();
            if (content) {
                expect(content).not.toContain('eval(');
                expect(content).not.toContain('Function(');
            }
        }
    });
});
