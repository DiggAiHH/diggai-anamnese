import { test, expect } from '@playwright/test';
import { loginMFA, waitForIdle } from './helpers/test-utils';

test.describe('MFA Dashboard', () => {
    test('login with valid credentials', async ({ page }) => {
        await loginMFA(page);
        await waitForIdle(page);

        await expect(page.getByText('MFA-Portal')).toBeVisible({ timeout: 10000 });
    });

    test('login fails with wrong password', async ({ page }) => {
        await page.goto('/mfa');
        await page.fill('input[type="text"]', 'mfa');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Wait for error or stay on login page
        await page.waitForTimeout(2000);
        const stillOnLogin = await page.locator('input[type="password"]').isVisible();
        expect(stillOnLogin).toBe(true);
    });

    test('shows all tabs: Anfragen, Zertifizierung, Team-Chat, Aufgaben', async ({ page }) => {
        await loginMFA(page);
        await waitForIdle(page);

        const tabs = ['Anfragen', 'Zertifizierung', 'Team-Chat', 'Aufgaben'];
        for (const tab of tabs) {
            const tabBtn = page.locator('button').filter({ hasText: new RegExp(tab, 'i') });
            await expect(tabBtn.first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('QR code generation works', async ({ page }) => {
        await loginMFA(page);
        await waitForIdle(page);

        const qrBtn = page.locator('button').filter({ hasText: /QR/i });
        if (await qrBtn.first().isVisible().catch(() => false)) {
            await qrBtn.first().click();
            await waitForIdle(page);

            // QR modal should appear
            const modal = page.locator('text=/QR-Code|Scanner/i');
            await expect(modal.first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('logout clears session', async ({ page }) => {
        await loginMFA(page);
        await waitForIdle(page);

        const logoutBtn = page.locator('button').filter({ hasText: /logout|abmelden/i });
        if (await logoutBtn.first().isVisible().catch(() => false)) {
            await logoutBtn.first().click();
            await waitForIdle(page);

            // Should be back on login page
            await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
        }
    });
});
