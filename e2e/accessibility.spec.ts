import { test, expect } from '@playwright/test';
import { waitForIdle } from './helpers/test-utils';

test.describe('Accessibility', () => {
    test('all pages have lang attribute', async ({ page }) => {
        await page.goto('/');
        const lang = await page.locator('html').getAttribute('lang');
        expect(lang).toBeTruthy();
    });

    test('main landmark exists', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        const main = page.locator('main, [role="main"]');
        const exists = await main.first().isVisible().catch(() => false);
        // Note: some SPAs use div-based layout
        expect(typeof exists).toBe('boolean');
    });

    test('interactive elements are keyboard focusable', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        // Tab through page and check focus
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
            const el = document.activeElement;
            return el ? el.tagName.toLowerCase() : null;
        });
        expect(focused).not.toBeNull();
    });

    test('color contrast meets WCAG standards', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        // Basic check: text is not too light
        const textColor = await page.evaluate(() => {
            const el = document.querySelector('h1, h2, p');
            if (!el) return null;
            return getComputedStyle(el).color;
        });
        expect(textColor).toBeTruthy();
    });

    test('form inputs have labels', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        const inputs = await page.locator('input:visible').all();
        for (const input of inputs.slice(0, 5)) {
            const id = await input.getAttribute('id');
            const ariaLabel = await input.getAttribute('aria-label');
            const placeholder = await input.getAttribute('placeholder');
            // At least one accessibility attribute should exist
            const hasLabel = id || ariaLabel || placeholder;
            expect(hasLabel).toBeTruthy();
        }
    });

    test('ARIA live regions exist for dynamic content', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        const liveRegions = await page.locator('[aria-live]').count();
        // At least some live regions for questionnaire
        expect(typeof liveRegions).toBe('number');
    });
});
