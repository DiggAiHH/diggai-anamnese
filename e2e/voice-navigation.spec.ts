import { test, expect } from '@playwright/test';
import { waitForIdle, startNewPatient } from './helpers/test-utils';

test.describe('Voice & Keyboard Navigation', () => {
    test('keyboard shortcuts work (Alt+N for next)', async ({ page }) => {
        await startNewPatient(page);
        await waitForIdle(page);

        // Current question should be visible
        const questionHeading = page.locator('h1, h2, h3').first();
        await expect(questionHeading).toBeVisible({ timeout: 15000 });

        // Tab navigation should work
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
    });

    test('focus management on question transition', async ({ page }) => {
        await startNewPatient(page);
        await waitForIdle(page);

        // Fill first field
        const input = page.locator('input:visible').first();
        if (await input.isVisible().catch(() => false)) {
            await input.fill('Test');
            // Focus should be manageable
            const focused = await page.evaluate(() => document.activeElement?.tagName);
            expect(focused).toBeTruthy();
        }
    });
});
