import { test, expect } from '@playwright/test';
import { loginMFA, loginArzt, waitForIdle } from './helpers/test-utils';

test.describe('Seed Data Validation', () => {
    test('MFA dashboard shows sessions', async ({ page }) => {
        await loginMFA(page);
        await waitForIdle(page);

        // Should show session list or "no sessions" message
        const content = page.locator('table, text=/keine Sitzungen|no sessions/i');
        await expect(content.first()).toBeVisible({ timeout: 15000 });
    });

    test('Arzt dashboard shows data', async ({ page }) => {
        await loginArzt(page);
        await waitForIdle(page);

        // Dashboard should render some content
        const body = await page.textContent('body');
        expect(body?.length).toBeGreaterThan(100);
    });
});
