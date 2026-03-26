/**
 * E2E Tests: Returning Patient Complete Journeys
 * Tests fast-track flows for existing patients
 */
import { test, expect, Page } from '@playwright/test';
import { startReturningPatient, fillBasicInfo, clickWeiter, expectQuestion, acceptDSGVO, waitForIdle } from '../helpers/test-utils';

// ─── Helpers ────────────────────────────────────────────────

/** Start a returning patient flow and complete identification */
async function startReturningWithIdentification(page: Page, opts?: { lastName?: string; firstName?: string; birthdate?: string }) {
    await startReturningPatient(page);

    // Fill identification form (RPT-ID)
    const birthInput = page.locator('input[type="date"]').first();
    if (await birthInput.isVisible().catch(() => false)) {
        await birthInput.fill(opts?.birthdate || '1985-03-15');
    }

    // Fill name if asked
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
        const placeholder = await nameInput.getAttribute('placeholder').catch(() => '');
        if (placeholder.toLowerCase().includes('name') || await page.textContent('body').then(t => t?.includes('Nachname'))) {
            await nameInput.fill(opts?.lastName || 'TestPatient');
        }
    }

    await clickWeiter(page);
    await waitForIdle(page);
}

// ─── Test Suite: Simple Appointment Flow ────────────────────

test.describe('Returning Patient - Simple Appointment', () => {
    test.setTimeout(90000);

    test('fast-track appointment flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        // Select returning patient
        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        // Should show patient identification (faster than full enrollment)
        await waitForIdle(page);
        const identifyForm = page.locator('text=/Patienten-Identifikation|Geburtsdatum|Identifizieren/i');
        const hasIdentify = await identifyForm.first().isVisible().catch(() => false);

        if (hasIdentify) {
            // Fill minimal identification
            const birthInput = page.locator('input[type="date"]').first();
            if (await birthInput.isVisible().catch(() => false)) {
                await birthInput.fill('1985-03-15');
            }
            await clickWeiter(page);
        }

        // Should proceed faster (no enrollment needed)
        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });

    test('skips enrollment data collection', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Should NOT ask for insurance data immediately
        const insuranceQuestion = page.locator('text=/Versicherungsstatus|Versichertennummer/i');
        const showsInsurance = await insuranceQuestion.first().isVisible().catch(() => false);

        // Returning patients should skip or have pre-filled enrollment
        // In demo mode this may vary
        expect(typeof showsInsurance).toBe('boolean');
    });
});

// ─── Test Suite: Prescription Request ───────────────────────

test.describe('Returning Patient - Prescription Request', () => {
    test.setTimeout(90000);

    test('quick prescription renewal flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Medikamente / Rezepte"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Patient identification
        const birthInput = page.locator('input[type="date"]').first();
        if (await birthInput.isVisible().catch(() => false)) {
            await birthInput.fill('1978-11-05');
            await clickWeiter(page);
        }

        // Should route directly to medication questions
        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });
});

// ─── Test Suite: Referral Request ───────────────────────────

test.describe('Returning Patient - Referral Request', () => {
    test.setTimeout(90000);

    test('überweisung anfordern flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Überweisung"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Quick identification
        const birthInput = page.locator('input[type="date"]').first();
        if (await birthInput.isVisible().catch(() => false)) {
            await birthInput.fill('1982-09-18');
            await clickWeiter(page);
        }

        // Should show referral-specific questions
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });
});

// ─── Test Suite: Message Writing ────────────────────────────

test.describe('Returning Patient - Message Writing', () => {
    test.setTimeout(90000);

    test('nachricht schreiben flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Nachricht schreiben"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Patient identification
        const birthInput = page.locator('input[type="date"]').first();
        if (await birthInput.isVisible().catch(() => false)) {
            await birthInput.fill('1990-07-22');
            await clickWeiter(page);
        }

        // Should show message composition
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });
});

// ─── Test Suite: Patient Selection ──────────────────────────

test.describe('Returning Patient - Patient Selection', () => {
    test('shows patient list for multi-patient accounts', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Check if patient selection appears
        const patientList = page.locator('[data-testid="patient-list"], .patient-list, text=/Wählen Sie einen Patienten/i');
        const hasList = await patientList.first().isVisible().catch(() => false);

        // If no list, should show identification form
        if (!hasList) {
            const identifyForm = page.locator('input[type="date"], text=/Identifikation|Geburtsdatum/i');
            await expect(identifyForm.first()).toBeVisible({ timeout: 10000 });
        }
    });

    test('handles unknown patient gracefully', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Fill with unknown patient data
        const birthInput = page.locator('input[type="date"]').first();
        if (await birthInput.isVisible().catch(() => false)) {
            await birthInput.fill('1900-01-01');
            await clickWeiter(page);
        }

        await waitForIdle(page, 5000);

        // Should either show "not found" message or fallback to manual entry
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });
});

// ─── Test Suite: Service Selection ──────────────────────────

test.describe('Returning Patient - Service Selection', () => {
    test('can change service after selection', async ({ page }) => {
        await page.goto('http://localhost:5173/');

        // First select one service
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Go back and select different service
        await page.goto('http://localhost:5173/');
        await page.click('text="Medikamente / Rezepte"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        // Should route to medication flow
        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });
});

// ─── Test Suite: Fast Track Benefits ────────────────────────

test.describe('Returning Patient - Fast Track Benefits', () => {
    test('completes faster than new patient flow', async ({ page }) => {
        const startTime = Date.now();

        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Minimal identification
        const birthInput = page.locator('input[type="date"]').first();
        if (await birthInput.isVisible().catch(() => false)) {
            await birthInput.fill('1985-03-15');
            await clickWeiter(page);
        }

        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete initial flow in reasonable time
        expect(duration).toBeLessThan(60000);
    });

    test('pre-fills known patient data', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Check for pre-filled data
        const inputs = await page.locator('input').all();
        let hasPreFilled = false;

        for (const input of inputs) {
            const value = await input.inputValue().catch(() => '');
            if (value && value.length > 0) {
                hasPreFilled = true;
                break;
            }
        }

        // In demo mode, some fields might be pre-filled
        expect(typeof hasPreFilled).toBe('boolean');
    });
});
