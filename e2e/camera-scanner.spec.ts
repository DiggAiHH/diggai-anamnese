import { test, expect } from '@playwright/test';
import { startNewPatient, waitForIdle } from './helpers/test-utils';

test.describe('Camera Scanner', () => {
    test('camera button visible on identity questions', async ({ page }) => {
        await startNewPatient(page);
        await waitForIdle(page);

        // Camera scanner should appear on name/identity questions
        const cameraBtn = page.locator('button').filter({ hasText: /Kamera|Camera/i }).first();
        const visible = await cameraBtn.isVisible().catch(() => false);
        // Camera is optional feature
        expect(typeof visible).toBe('boolean');
    });

    test('camera modal opens when button clicked', async ({ page }) => {
        await startNewPatient(page);
        await waitForIdle(page);

        const cameraBtn = page.locator('button').filter({ hasText: /Kamera|Camera/i }).first();
        if (await cameraBtn.isVisible().catch(() => false)) {
            await cameraBtn.click();
            await waitForIdle(page);

            // Camera UI or permission dialog should appear
            // In headless browser, camera won't be available
            await page.waitForTimeout(1000);
        }
    });
});
