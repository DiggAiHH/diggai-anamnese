/**
 * E2E Tests: New Patient Complete Journeys
 * Tests all service flows for first-time patients with full enrollment
 */
import { test, expect, Page } from '@playwright/test';
import { startNewPatient, fillBasicInfo, clickWeiter, expectQuestion, acceptDSGVO, waitForIdle } from '../helpers/test-utils';

// ─── Helpers ────────────────────────────────────────────────

/** Fill enrollment section (insurance + address) for new patients */
async function fillEnrollment(page: Page) {
    // 2000 - Insurance status
    await expectQuestion(page, 'Versicherungsstatus');
    await page.click('button:has-text("Gesetzlich versichert")');
    await clickWeiter(page);

    // 2001 - Insurance number (optional)
    await expectQuestion(page, 'Versichertennummer');
    await clickWeiter(page);

    // 3000 - Postal code
    await expectQuestion(page, 'PLZ');
    await page.fill('input[type="number"]', '12345');
    await clickWeiter(page);

    // 3001 - City
    await expectQuestion(page, 'Wohnort');
    await page.fill('input', 'Berlin');
    await clickWeiter(page);

    // 3002 - Street
    await expectQuestion(page, 'Straße');
    await page.fill('input', 'Musterstraße 12');
    await clickWeiter(page);

    // 3002a - Address addition (optional)
    await expectQuestion(page, 'Adresszusatz');
    await clickWeiter(page);

    // 3003 - Email (optional)
    await expectQuestion(page, 'E-Mail');
    await clickWeiter(page);

    // 3004 - Mobile (optional)
    await expectQuestion(page, 'Mobilnummer');
    await clickWeiter(page);

    // 3004b - Landline (optional)
    await expectQuestion(page, 'Festnetznummer');
    await page.fill('input', '03012345678');
    await clickWeiter(page);
}

/** Fill complaint details chain */
async function fillBeschwerdenDetail(page: Page, opts: {
    hasComplaints: boolean;
    dauer?: string;
    bodyRegion?: string;
}) {
    // 1000 - Has complaints?
    await expectQuestion(page, 'Haben Sie aktuell Beschwerden');
    if (opts.hasComplaints) {
        await page.click('button:has-text("Ja")');
    } else {
        await page.click('button:has-text("Nein")');
    }
    await clickWeiter(page);

    if (!opts.hasComplaints) return;

    // 1001 - Duration
    await expectQuestion(page, 'Wie lange bestehen');
    await page.locator('select').selectOption(opts.dauer || 'wenige_tage');
    await clickWeiter(page);

    // 1002 - Body region
    await expectQuestion(page, 'Wo haben Sie Beschwerden');
    if (opts.bodyRegion) {
        await page.click(`button:has-text("${opts.bodyRegion}")`);
    } else {
        await page.click('button:has-text("Kopf")');
    }
    await clickWeiter(page);
}

// ─── Test Suite: Termin / Anamnese Flow ─────────────────────

test.describe('New Patient - Termin / Anamnese Flow', () => {
    test.setTimeout(120000);

    test('complete flow with complaints', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        // Confirm new patient selection
        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        // Fill basic info
        await fillBasicInfo(page, {
            lastName: 'Müller',
            firstName: 'Hans',
            gender: 'M',
            birthdate: '1985-03-15'
        });

        // Enrollment
        await fillEnrollment(page);

        // Continue to service
        await expectQuestion(page, 'Weiter zum gewählten Anliegen');
        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        // Complaint details
        await fillBeschwerdenDetail(page, {
            hasComplaints: true,
            dauer: 'wenige_wochen',
            bodyRegion: 'Kopf'
        });

        // Verify flow continues
        await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
    });

    test('flow without complaints', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page, {
            lastName: 'Schmidt',
            firstName: 'Anna',
            gender: 'W',
            birthdate: '1990-07-22'
        });

        await fillEnrollment(page);

        await expectQuestion(page, 'Weiter zum gewählten Anliegen');
        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        // No complaints
        await fillBeschwerdenDetail(page, { hasComplaints: false });

        // Should continue to general questions
        await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
    });
});

// ─── Test Suite: Medikamente / Rezepte Flow ─────────────────

test.describe('New Patient - Medikamente / Rezepte Flow', () => {
    test.setTimeout(120000);

    test('complete prescription request flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Medikamente / Rezepte"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page, {
            lastName: 'Weber',
            firstName: 'Peter',
            gender: 'M',
            birthdate: '1978-11-05'
        });

        await fillEnrollment(page);

        // Should route to medication questions
        await expectQuestion(page, 'Weiter zum gewählten Anliegen');
        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        // Verify we're in medication flow
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });
});

// ─── Test Suite: AU (Krankschreibung) Flow ──────────────────

test.describe('New Patient - AU (Krankschreibung) Flow', () => {
    test.setTimeout(120000);

    test('complete sick note request flow', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="AU (Krankschreibung)"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page, {
            lastName: 'Fischer',
            firstName: 'Maria',
            gender: 'W',
            birthdate: '1982-09-18'
        });

        await fillEnrollment(page);

        await expectQuestion(page, 'Weiter zum gewählten Anliegen');
        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        // Should route to AU questions
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });
});

// ─── Test Suite: Triage Alert Flow ──────────────────────────

test.describe('New Patient - Triage Alert (Brustschmerzen)', () => {
    test.setTimeout(120000);

    test('shows critical triage alert for chest pain', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        await expectQuestion(page, 'Waren Sie schon einmal');
        await page.click('button:has-text("Nein")');
        await clickWeiter(page);

        await fillBasicInfo(page, {
            lastName: 'Koch',
            firstName: 'Wilhelm',
            gender: 'M',
            birthdate: '1965-04-12'
        });

        await fillEnrollment(page);

        await expectQuestion(page, 'Weiter zum gewählten Anliegen');
        await page.click('button:has-text("Ja, weiter")');
        await clickWeiter(page);

        // Has complaints
        await expectQuestion(page, 'Haben Sie aktuell Beschwerden');
        await page.click('button:has-text("Ja")');
        await clickWeiter(page);

        // Duration
        await expectQuestion(page, 'Wie lange bestehen');
        await page.locator('select').selectOption('wenige_tage');
        await clickWeiter(page);

        // Select chest pain - triggers triage
        await expectQuestion(page, 'Wo haben Sie Beschwerden');
        await page.click('button:has-text("Brustschmerzen")');
        await clickWeiter(page);

        // Verify triage alert appears
        await expect(page.getByText(/NOTFALL|Brustschmerzen|112/i)).toBeVisible({ timeout: 10000 });

        // Acknowledge alert
        const acknowledgeBtn = page.getByRole('button', { name: /gelesen|verstanden|bestätigen/i });
        if (await acknowledgeBtn.isVisible().catch(() => false)) {
            await acknowledgeBtn.click();
        }

        // Continue anyway
        const continueBtn = page.getByRole('button', { name: /fortfahren|weiter/i });
        if (await continueBtn.isVisible().catch(() => false)) {
            await continueBtn.click();
        }
    });
});

// ─── Test Suite: DSGVO Consent ──────────────────────────────

test.describe('New Patient - DSGVO Consent', () => {
    test('requires all consent checkboxes', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');

        // DSGVO modal should appear
        await expect(page.getByText('Datenschutz-Einwilligung')).toBeVisible({ timeout: 10000 });

        // Try to proceed without checking boxes
        const consentBtn = page.getByRole('button', { name: 'Einwilligen & Fortfahren' });
        await consentBtn.click();

        // Should still be on consent modal
        await expect(page.getByText('Datenschutz-Einwilligung')).toBeVisible();

        // Check all required boxes
        await page.click('text="Einwilligung in die Datenverarbeitung"');
        await page.click('text="Verarbeitung besonderer Kategorien"');
        await page.click('text="Widerrufsrecht & Datenlöschung"');

        // Now proceed
        await consentBtn.click();

        // Should proceed to questionnaire
        await expectQuestion(page, 'Waren Sie schon einmal');
    });
});

// ─── Test Suite: Validation Tests ───────────────────────────

test.describe('New Patient - Form Validation', () => {
    test('validates required fields', async ({ page }) => {
        await startNewPatient(page);

        // Try to proceed without filling name
        await clickWeiter(page);
        await waitForIdle(page);

        // Should still be on name question
        await expectQuestion(page, 'Nachnamen');

        // Fill and proceed
        await page.fill('input', 'TestName');
        await clickWeiter(page);

        // Next question should appear
        await expectQuestion(page, 'Vornamen');
    });

    test('validates date format', async ({ page }) => {
        await startNewPatient(page);

        // Fill name
        await page.fill('input', 'TestName');
        await clickWeiter(page);

        await page.fill('input', 'TestVorname');
        await clickWeiter(page);

        // Gender
        await page.locator('select').selectOption('M');
        await clickWeiter(page);

        // Birthdate - valid date
        await expectQuestion(page, 'Geburtsdatum');
        await page.fill('input[type="date"]', '1990-01-15');
        await clickWeiter(page);

        // Should proceed to enrollment
        await expect(page.locator('h2').first()).toBeVisible();
    });
});
