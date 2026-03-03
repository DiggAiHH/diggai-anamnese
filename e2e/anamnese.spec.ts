import { test, expect, Page } from '@playwright/test';

// Helper: click the inline Weiter button (exact match to avoid "Ja, weiter")
async function clickWeiter(page: Page) {
    const btn = page.getByRole('button', { name: 'Weiter', exact: true });
    await btn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => { });
    if (await btn.isVisible()) {
        await btn.click();
    }
}

// Helper: wait for a question heading (h2) to be visible
async function expectQuestion(page: Page, text: string, timeout = 15000) {
    const heading = page.locator('h2').filter({ hasText: text }).first();
    await expect(heading).toBeVisible({ timeout });
}

// Helper: DSGVO consent
async function acceptDSGVO(page: Page) {
    await expect(page.getByText('Datenschutz-Einwilligung')).toBeVisible({ timeout: 10000 });
    await page.click('text="Einwilligung in die Datenverarbeitung"');
    await page.click('text="Verarbeitung besonderer Kategorien (Gesundheitsdaten)"');
    await page.click('text="Widerrufsrecht & Datenlöschung"');
    await page.click('button:has-text("Einwilligen & Fortfahren")');
}

// Helper: fill basic identity questions (name, gender, birthdate)
async function fillBasicInfo(page: Page, gender: string, birthdate: string) {
    // 0001 - Nachname
    await expectQuestion(page, 'Geben Sie hier Ihren Nachnamen ein');
    await page.fill('input', 'TestNachname');
    await clickWeiter(page);

    // 0011 - Vorname
    await expectQuestion(page, 'Geben Sie hier Ihren Vornamen ein');
    await page.fill('input', 'TestVorname');
    await clickWeiter(page);

    // 0002 - Geschlecht
    await expectQuestion(page, 'Geschlecht');
    await page.locator('select').selectOption(gender);
    await clickWeiter(page);

    // 0003 - Geburtsdatum
    await expectQuestion(page, 'Geben Sie hier Ihr Geburtsdatum ein');
    await page.fill('input[type="date"]', birthdate);
    await clickWeiter(page);
}

// Helper: fill enrollment section (new patients only)
async function fillEnrollment(page: Page) {
    // 2000 - Versicherung
    await expectQuestion(page, 'Versicherungsstatus?');
    await page.click('button:has-text("Gesetzlich versichert")');
    await clickWeiter(page);

    // 2001 - Versichertennummer (optional)
    await expectQuestion(page, 'Versichertennummer');
    await clickWeiter(page);

    // 3000 - PLZ
    await expectQuestion(page, 'Wie lautet Ihre PLZ?');
    await page.fill('input[type="number"]', '12345');
    await clickWeiter(page);

    // 3001 - Wohnort
    await expectQuestion(page, 'Wohnort');
    await page.fill('input', 'Berlin');
    await clickWeiter(page);

    // 3002 - Straße
    await expectQuestion(page, 'Straße und Hausnummer');
    await page.fill('input', 'Teststr 1');
    await clickWeiter(page);

    // 3002a - Adresszusatz (optional)
    await expectQuestion(page, 'Adresszusatz');
    await clickWeiter(page);

    // 3003 - E-Mail (optional)
    await expectQuestion(page, 'E-Mail-Adresse (optional)');
    await clickWeiter(page);

    // 3004 - Telefon (optional)
    await expectQuestion(page, 'Telefonnummer (optional)');
    await clickWeiter(page);

    // 3005 - Weiter zum Anliegen
    await expectQuestion(page, 'Weiter zum gewählten Anliegen?');
    await page.click('button:has-text("Ja, weiter")');
    await clickWeiter(page);
}

// Helper: fill Beschwerden-Detail (1000 → 1001 → 1004-1007)
async function fillBeschwerdenDetail(page: Page, opts: {
    dauer: string; haeufigkeit: string; ausloser: string; veraenderung: string;
}) {
    // 1000
    await expectQuestion(page, 'Haben Sie aktuell Beschwerden?');
    await page.click('button:has-text("Ja")');
    await clickWeiter(page);

    // 1001
    await expectQuestion(page, 'Wie lange bestehen Ihre Beschwerden?');
    await page.locator('select').selectOption(opts.dauer);
    await clickWeiter(page);

    // 1004 - Häufigkeit
    await expectQuestion(page, 'Wie häufig treten die Beschwerden auf?');
    await page.locator('select').selectOption(opts.haeufigkeit);
    await clickWeiter(page);

    // 1005 - Auslöser
    await expectQuestion(page, 'Gibt es einen Auslöser für die Beschwerden?');
    await page.click(`button:has-text("${opts.ausloser}")`);
    await clickWeiter(page);

    // 1006 - Veränderung
    await expectQuestion(page, 'Haben sich die Beschwerden verändert?');
    await page.locator('select').selectOption(opts.veraenderung);
    await clickWeiter(page);

    // 1007 - Auffälligkeiten
    await expectQuestion(page, 'Haben Sie folgende Auffälligkeiten bemerkt?');
    await page.click('button:has-text("Keine der genannten")');
    await clickWeiter(page);
}

test.describe('Anamnese App E2E', () => {
    test.setTimeout(120000);

    test('New Patient: Full flow with Triage Alert on Brustschmerzen', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        // 0000 - New patient
        await expectQuestion(page, 'Sind Sie bereits als Patient in unserer Praxis bekannt?');
        await page.click('button:has-text("Nein, ich bin zum ersten Mal hier")');
        await clickWeiter(page);

        // Basic info + enrollment for new patients
        await fillBasicInfo(page, 'W', '1980-01-01');
        await fillEnrollment(page);

        // Beschwerden detail chain
        await fillBeschwerdenDetail(page, {
            dauer: 'wenige_tage',
            haeufigkeit: 'taeglich',
            ausloser: 'Ohne erkennbaren Auslöser',
            veraenderung: 'zunehmend',
        });

        // 1002 - Wo Beschwerden? - select Brustschmerzen for triage
        await expectQuestion(page, 'Wo haben Sie Beschwerden?');
        await page.click('button:has-text("Brustschmerzen")');

        // Triage overlay
        await expect(page.getByText('MEDIZINISCHER NOTFALL')).toBeVisible({ timeout: 10000 });
        await page.click('button:has-text("Ich habe die Warnung gelesen")');
        await page.click('button:has-text("Trotzdem fortfahren")');
        await clickWeiter(page);
    });

    test('Existing Patient: Beschwerden-Detail & Body Region Routing to Angiologie', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        // 0000 - Existing patient (skip enrollment)
        await expectQuestion(page, 'Sind Sie bereits als Patient in unserer Praxis bekannt?');
        await page.click('button:has-text("Ja, ich bin bereits Patient")');
        await clickWeiter(page);

        // Basic info → goes directly to 1000 for existing patients
        await fillBasicInfo(page, 'M', '1994-06-15');

        // Beschwerden detail chain
        await fillBeschwerdenDetail(page, {
            dauer: 'wenige_wochen',
            haeufigkeit: 'episodisch',
            ausloser: 'Belastung/Gehen',
            veraenderung: 'unveraendert',
        });

        // 1002 - Body region → Beine → Angiologie
        await expectQuestion(page, 'Wo haben Sie Beschwerden?');
        await page.click('button:has-text("Beinschmerzen / Schwellung")');
        await clickWeiter(page);

        // Should route to angiologische Beschwerden (1010)
        await expectQuestion(page, 'Welche angiologischen Beschwerden haben Sie?');
    });

    test('Translations: German keys display correctly', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.click('text="Termin / Anamnese"');
        await acceptDSGVO(page);

        // Verify question renders
        await expectQuestion(page, 'Sind Sie bereits als Patient in unserer Praxis bekannt?');
        await expect(page.locator('button:has-text("Weiter")')).toBeVisible();

        // Navigate to check Nachname
        await page.click('button:has-text("Ja, ich bin bereits Patient")');
        await clickWeiter(page);
        await expectQuestion(page, 'Geben Sie hier Ihren Nachnamen ein');
        await page.fill('input', 'Trans');
        await clickWeiter(page);

        // Vorname
        await expectQuestion(page, 'Geben Sie hier Ihren Vornamen ein');
    });
});
