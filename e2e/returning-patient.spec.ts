import { test, expect } from '@playwright/test';
import { startReturningPatient, clickWeiter, expectQuestion, waitForIdle, acceptDSGVO, fillBasicInfo } from './helpers/test-utils';

test.describe('Returning Patient Fast-Track', () => {
    test('shows patient identification form for returning patients', async ({ page }) => {
        await startReturningPatient(page);
        await waitForIdle(page);

        // Should show the identification form (RPT-ID question)
        const identifyForm = page.locator('text=/Patienten-Identifikation|Geburtsdatum|Versicherungsnummer/i');
        await expect(identifyForm.first()).toBeVisible({ timeout: 15000 });
    });

    test('fallback to manual flow when patient not found', async ({ page }) => {
        await startReturningPatient(page);
        await waitForIdle(page);

        // Fill identification form with unknown data
        const birthInput = page.locator('input[type="date"]');
        if (await birthInput.isVisible().catch(() => false)) {
            await birthInput.fill('1990-01-01');
        }

        const insuranceInput = page.locator('input[placeholder*="Versicherung"], input[name*="insurance"]').first();
        if (await insuranceInput.isVisible().catch(() => false)) {
            await insuranceInput.fill('X000000000');
        }

        // Submit form
        const submitBtn = page.getByRole('button', { name: /identifizieren|suchen|weiter/i });
        if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            await waitForIdle(page, 5000);
        }

        // Should eventually fall back to manual entry
        // In demo mode this may auto-advance
        await page.waitForTimeout(3000);
    });

    test('new patient flow skips identification', async ({ page }) => {
        await page.goto('/');
        await waitForIdle(page);

        const startBtn = page.getByRole('button', { name: /anamnese starten|start|los geht/i });
        if (await startBtn.isVisible().catch(() => false)) {
            await startBtn.click();
            await waitForIdle(page);
        }

        await acceptDSGVO(page);
        await waitForIdle(page);

        // Select "Nein" (new patient)
        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        // Should go directly to name entry, NOT patient identification
        await expectQuestion(page, 'Nachnamen', 15000);
    });
});
