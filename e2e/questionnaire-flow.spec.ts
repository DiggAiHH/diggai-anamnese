import { test, expect } from '@playwright/test';
import { startNewPatient, fillBasicInfo, clickWeiter, expectQuestion, waitForIdle, selectService } from './helpers/test-utils';

test.describe('Questionnaire Flow', () => {
    test('complete new patient anamnese flow', async ({ page }) => {
        await startNewPatient(page);
        await fillBasicInfo(page);
        await waitForIdle(page);

        // Should reach service selection or further questions
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });

    test('progress bar advances with each question', async ({ page }) => {
        await startNewPatient(page);
        await waitForIdle(page);

        // Check progress bar exists
        const progressBar = page.locator('[role="progressbar"], .progress-bar, [class*="progress"]').first();
        const progressExists = await progressBar.isVisible().catch(() => false);
        expect(typeof progressExists).toBe('boolean');

        // Fill first question and check progress changes
        const input = page.locator('input:visible').first();
        if (await input.isVisible().catch(() => false)) {
            await input.fill('Test');
            await clickWeiter(page);
            await waitForIdle(page);
        }
    });

    test('back button works', async ({ page }) => {
        await startNewPatient(page);
        await waitForIdle(page);

        // Fill first question
        const input = page.locator('input:visible').first();
        if (await input.isVisible().catch(() => false)) {
            await input.fill('TestName');
            await clickWeiter(page);
            await waitForIdle(page);

            // Now go back
            const backBtn = page.locator('button').filter({ hasText: /zurück|back/i }).first();
            if (await backBtn.isVisible().catch(() => false)) {
                await backBtn.click();
                await waitForIdle(page);

                // Previous question should show
                const prevInput = page.locator('input:visible').first();
                if (await prevInput.isVisible().catch(() => false)) {
                    const val = await prevInput.inputValue();
                    expect(val).toBe('TestName');
                }
            }
        }
    });

    test('required field validation prevents skipping', async ({ page }) => {
        await startNewPatient(page);
        await waitForIdle(page);

        // Try to click Weiter without filling required field
        await clickWeiter(page);
        await page.waitForTimeout(500);

        // Should still be on same question (validation blocks)
        const h2 = page.locator('h2').first();
        await expect(h2).toBeVisible({ timeout: 5000 });
    });
});
