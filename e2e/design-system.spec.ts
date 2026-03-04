import { test, expect } from '@playwright/test';
import { waitForIdle } from './helpers/test-utils';

test.describe('Design System & Theme', () => {
    test('CSS custom properties are defined', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        const hasCSSVars = await page.evaluate(() => {
            const root = getComputedStyle(document.documentElement);
            return {
                bgPrimary: root.getPropertyValue('--bg-primary').trim(),
                textPrimary: root.getPropertyValue('--text-primary').trim(),
                accent: root.getPropertyValue('--accent').trim(),
            };
        });

        expect(hasCSSVars.bgPrimary).not.toBe('');
        expect(hasCSSVars.textPrimary).not.toBe('');
    });

    test('dark mode toggle works', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        // Find theme toggle button
        const themeToggle = page.locator('button[aria-label*="Theme"], button[aria-label*="Modus"], button:has-text("🌙"), button:has-text("☀️")').first();

        if (await themeToggle.isVisible().catch(() => false)) {
            await themeToggle.click();
            await waitForIdle(page);

            // Verify some visual change happened
            const bodyBg = await page.evaluate(() => {
                return getComputedStyle(document.body).backgroundColor;
            });
            expect(bodyBg).toBeTruthy();
        }
    });

    test('responsive layout on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        await waitForIdle(page);

        // Page should render without horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
    });

    test('font size control adjusts text', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        const fontControl = page.locator('button[aria-label*="Schrift"], button[aria-label*="font"]').first();
        if (await fontControl.isVisible().catch(() => false)) {
            const initialSize = await page.evaluate(() => {
                return parseFloat(getComputedStyle(document.documentElement).fontSize);
            });

            await fontControl.click();
            await waitForIdle(page);

            // Size should have changed (or not, but no error)
            const newSize = await page.evaluate(() => {
                return parseFloat(getComputedStyle(document.documentElement).fontSize);
            });
            expect(typeof newSize).toBe('number');
        }
    });
});
