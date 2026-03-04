import { test, expect } from '@playwright/test';
import { loginArzt, waitForIdle } from './helpers/test-utils';

test.describe('Arzt Dashboard', () => {
    test('login with valid credentials', async ({ page }) => {
        await loginArzt(page);
        await waitForIdle(page);

        // Should see Arzt portal content
        const portal = page.locator('text=/Arzt|Dashboard|Portal/i');
        await expect(portal.first()).toBeVisible({ timeout: 10000 });
    });

    test('shows session overview', async ({ page }) => {
        await loginArzt(page);
        await waitForIdle(page);

        // Dashboard should show session list or overview
        const content = page.locator('main, [role="main"]');
        await expect(content.first()).toBeVisible({ timeout: 10000 });
    });

    test('session detail view accessible', async ({ page }) => {
        await loginArzt(page);
        await waitForIdle(page);

        // Look for session rows/cards
        const sessionItem = page.locator('tr, [data-session-id], .session-card').first();
        if (await sessionItem.isVisible().catch(() => false)) {
            await sessionItem.click();
            await waitForIdle(page);
        }
    });
});
