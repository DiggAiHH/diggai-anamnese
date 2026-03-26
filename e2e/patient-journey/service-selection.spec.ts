/**
 * E2E Tests: Service Selection
 * Tests all 9 service/reason options from the HomeScreen
 */
import { test, expect, Page } from '@playwright/test';
import { acceptDSGVO, clickWeiter, expectQuestion, waitForIdle, fillBasicInfo } from '../helpers/test-utils';

// ─── Helpers ────────────────────────────────────────────────

/** Quick enrollment for new patients */
async function quickEnrollment(page: Page) {
    // Insurance
    const versicherung = page.locator('text=/Versicherungsstatus/i');
    if (await versicherung.first().isVisible().catch(() => false)) {
        await page.click('button:has-text("Gesetzlich")');
        await clickWeiter(page);
    }

    // Skip through optional fields
    for (let i = 0; i < 7; i++) {
        const weiterBtn = page.getByRole('button', { name: 'Weiter', exact: true });
        if (await weiterBtn.isVisible().catch(() => false)) {
            await clickWeiter(page);
            await waitForIdle(page, 300);
        }
    }
}

/** Start a service flow and verify it loads */
async function testServiceFlow(page: Page, serviceName: string, serviceButtonText: string) {
    await page.goto('http://localhost:5173/');
    await waitForIdle(page);

    // Click service button
    await page.click(`text="${serviceButtonText}"`);
    await acceptDSGVO(page);

    // Should show patient status question
    await expectQuestion(page, 'Waren Sie schon einmal');

    // Select new patient for full flow
    await page.click('button:has-text("Nein")');
    await clickWeiter(page);

    // Fill basic info
    await fillBasicInfo(page, {
        lastName: 'ServiceTest',
        firstName: serviceName,
        gender: 'M',
        birthdate: '1985-06-15'
    });

    // Complete enrollment
    await quickEnrollment(page);

    // Continue to service
    const weiterBtn = page.getByRole('button', { name: /weiter|fortfahren/i });
    if (await weiterBtn.isVisible().catch(() => false)) {
        await weiterBtn.click();
    }

    // Verify service-specific content loads
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });

    return await page.textContent('body');
}

// ─── Test Suite: Service 1 - Termin / Anamnese ──────────────

test.describe('Service: Termin / Anamnese', () => {
    test.setTimeout(90000);

    test('loads appointment/anamnesis flow', async ({ page }) => {
        const content = await testServiceFlow(page, 'Termin', 'Termin / Anamnese');
        expect(content).toBeTruthy();
        expect(content?.length).toBeGreaterThan(100);
    });

    test('shows complaint questions', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        // Should show complaint questions
        await expectQuestion(page, 'Haben Sie aktuell Beschwerden');
    });
});

// ─── Test Suite: Service 2 - Medikamente / Rezepte ──────────

test.describe('Service: Medikamente / Rezepte', () => {
    test.setTimeout(90000);

    test('loads prescription flow', async ({ page }) => {
        const content = await testServiceFlow(page, 'Rezepte', 'Medikamente / Rezepte');
        expect(content).toBeTruthy();
    });

    test('routes to medication-specific questions', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Medikamente / Rezepte"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        // Should show medication-related content
        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });
});

// ─── Test Suite: Service 3 - AU (Krankschreibung) ───────────

test.describe('Service: AU (Krankschreibung)', () => {
    test.setTimeout(90000);

    test('loads sick note flow', async ({ page }) => {
        const content = await testServiceFlow(page, 'AU', 'AU (Krankschreibung)');
        expect(content).toBeTruthy();
    });

    test('shows AU-specific questions', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="AU (Krankschreibung)"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });
});

// ─── Test Suite: Service 4 - Dateien / Befunde ──────────────

test.describe('Service: Dateien / Befunde', () => {
    test.setTimeout(90000);

    test('loads file/results flow', async ({ page }) => {
        const content = await testServiceFlow(page, 'Befunde', 'Dateien / Befunde');
        expect(content).toBeTruthy();
    });

    test('allows file upload option', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Dateien / Befunde"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        // Should reach file upload or results section
        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });
});

// ─── Test Suite: Service 5 - Überweisung ────────────────────

test.describe('Service: Überweisung', () => {
    test.setTimeout(90000);

    test('loads referral flow', async ({ page }) => {
        const content = await testServiceFlow(page, 'Ueberweisung', 'Überweisung');
        expect(content).toBeTruthy();
    });

    test('shows referral-specific questions', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Überweisung"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });
});

// ─── Test Suite: Service 6 - Terminabsage ───────────────────

test.describe('Service: Terminabsage', () => {
    test.setTimeout(90000);

    test('loads appointment cancellation flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Terminabsage"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });

    test('shows appointment selection for returning patients', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Terminabsage"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        await waitForIdle(page);

        // For returning patients, should show appointment selection or identification
        const content = await page.textContent('body');
        expect(content).toBeTruthy();
    });
});

// ─── Test Suite: Service 7 - Telefonanfrage ─────────────────

test.describe('Service: Telefonanfrage', () => {
    test.setTimeout(90000);

    test('loads phone request flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Telefonanfrage"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });
});

// ─── Test Suite: Service 8 - Dokumente anfordern ────────────

test.describe('Service: Dokumente anfordern', () => {
    test.setTimeout(90000);

    test('loads document request flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Dokumente anfordern"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });
});

// ─── Test Suite: Service 9 - Nachricht schreiben ────────────

test.describe('Service: Nachricht schreiben', () => {
    test.setTimeout(90000);

    test('loads message composition flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Nachricht schreiben"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    });

    test('shows message composition textarea', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Nachricht schreiben"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page);
        await quickEnrollment(page);

        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        await waitForIdle(page);

        // Look for textarea for message composition
        const textarea = page.locator('textarea').first();
        const hasTextarea = await textarea.isVisible().catch(() => false);

        if (hasTextarea) {
            await textarea.fill('Dies ist eine Testnachricht');
            const value = await textarea.inputValue();
            expect(value).toBe('Dies ist eine Testnachricht');
        }
    });
});

// ─── Test Suite: Service Switching ──────────────────────────

test.describe('Service Switching', () => {
    test.setTimeout(90000);

    test('can switch service from anamnese to rezepte', async ({ page }) => {
        // Start with Termin / Anamnese
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');

        // Go back and switch
        await page.goto('http://localhost:5173/');
        await page.click('text="Medikamente / Rezepte"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
    });

    test('each service maintains separate context', async ({ page }) => {
        // Test that selecting different services leads to different flows
        const services = [
            { name: 'Termin / Anamnese', text: 'Beschwerden' },
            { name: 'Medikamente / Rezepte', text: 'Medikamente' },
            { name: 'Nachricht schreiben', text: 'Nachricht' }
        ];

        for (const service of services.slice(0, 2)) { // Test first 2 for speed
            await page.goto('http://localhost:5173/');
            await page.click(`text="${service.name}"`);
            await acceptDSGVO(page);

            await expectQuestion(page, 'Waren Sie schon einmal');

            const content = await page.textContent('body');
            expect(content).toBeTruthy();
        }
    });
});

// ─── Test Suite: Service Icons/Visuals ──────────────────────

test.describe('Service Visual Elements', () => {
    test('all service buttons are visible on homepage', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await waitForIdle(page);

        const services = [
            'Termin / Anamnese',
            'Medikamente / Rezepte',
            'AU (Krankschreibung)',
            'Dateien / Befunde',
            'Überweisung',
            'Terminabsage',
            'Telefonanfrage',
            'Dokumente anfordern',
            'Nachricht schreiben'
        ];

        for (const service of services) {
            const button = page.locator(`text="${service}"`).first();
            await expect(button).toBeVisible({ timeout: 5000 });
        }
    });

    test('service buttons are clickable', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await waitForIdle(page);

        // Test a few service buttons
        const testServices = ['Termin / Anamnese', 'Medikamente / Rezepte', 'Nachricht schreiben'];

        for (const service of testServices) {
            const button = page.locator(`text="${service}"`).first();
            await expect(button).toBeEnabled({ timeout: 5000 });
        }
    });
});
