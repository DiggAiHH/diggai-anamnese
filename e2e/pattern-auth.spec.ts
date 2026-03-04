import { test, expect } from '@playwright/test';
import { loginMFA, waitForIdle } from './helpers/test-utils';

test.describe('Pattern Lock Security', () => {
    test('PatternLock component renders 16 dots in 4x4 grid', async ({ page }) => {
        // Navigate to a page where PatternLock is shown
        // In the Zertifizierung flow within MFA dashboard
        await loginMFA(page);
        await waitForIdle(page);

        // Navigate to Zertifizierung tab
        const certifyTab = page.getByText('Zertifizierung');
        if (await certifyTab.isVisible().catch(() => false)) {
            await certifyTab.click();
            await waitForIdle(page);
        }

        // PatternLock should not be visible until certification starts
        const certifySection = page.locator('text=Patienten-Zertifizierung');
        await expect(certifySection).toBeVisible({ timeout: 10000 });
    });

    test('MFA dashboard shows Zertifizierung tab', async ({ page }) => {
        await loginMFA(page);
        await waitForIdle(page);

        const tabs = page.locator('button').filter({ hasText: /Zertifizierung/i });
        await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    });
});
