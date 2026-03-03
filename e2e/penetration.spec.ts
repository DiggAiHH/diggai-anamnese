import { test, expect } from '@playwright/test';

test.describe('Anamnese App - Penetration & Architecture Functionality Tests', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            const level = msg.type();
            const text = msg.text();
            const location = msg.location();
            console.log(`BROWSER [${level}] ${text} (${location.url}:${location.lineNumber})`);
        });
        page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));
    });

    async function dsgvoWorkflow(page) {
        // Accept Data processing
        await page.getByText('Einwilligung in die Datenverarbeitung').click();
        await page.getByText('Verarbeitung besonderer Kategorien').click();
        await page.getByText('Widerrufsrecht & Datenlöschung').click();

        await page.getByText('Einwilligen & Fortfahren').click();
    }

    async function passBoringSection(page) {
        // Questions 4100, 4110 (Impfungen, Familie)
        // Many are optional or we just click Weiter
        const optionalIds = ['4100', '4110'];
        for (let i = 0; i < optionalIds.length; i++) {
            await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
            await page.waitForTimeout(200); // Wait for transition
        }
    }

    test('1. Triage Red-Flag Modal triggers correctly on Emergency (Brustschmerzen)', async ({ page }) => {
        await page.goto('/');

        // Landing Page - Select Termin / Anamnese
        await page.locator('main').getByText('Termin / Anamnese').first().click();

        // Consent Form
        await dsgvoWorkflow(page);

        // 0000: Sind Sie bereits Patient?
        await page.locator('main').getByRole('button', { name: 'Ja, ich bin bereits Patient', exact: true }).click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 0001: Nachname
        await page.locator('main').locator('input[type="text"]').fill('Mustermann');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 0011: Vorname
        await page.locator('main').locator('input[type="text"]').fill('Max');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 0002: Geschlecht -> Männlich
        await page.locator('main').locator('select').selectOption('M');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 0003: Geburtsdatum (Erwachsener)
        await page.locator('main').locator('input[type="date"]').fill('1980-01-01');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 1000: Beschwerden aktuell? -> Ja
        await page.locator('main').getByRole('button', { name: 'Ja', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 1001: Wie lange?
        await page.locator('main').locator('select').selectOption('wenige_tage');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 1002: Beschwerden Wo? -> Brustschmerzen (Red Flag)
        await page.locator('main').getByText('Brustschmerzen / Herzensenge (Notfall!)').click();

        // Check if Red Flag Overlay triggers
        await expect(page.getByText('⚠️ MEDIZINISCHER NOTFALL')).toBeVisible();

        // Wait for countdown (6s to be safe)
        await page.waitForTimeout(6000);

        // Click "Ich habe die Warnung gelesen"
        await page.getByText('Ich habe die Warnung gelesen').click();

        // Click "Trotzdem fortfahren"
        await page.getByText('Trotzdem fortfahren').click();

        // Modal has vanished
        await expect(page.getByText('⚠️ MEDIZINISCHER NOTFALL')).not.toBeVisible();
    });

    test('2. Context-Aware Routing: Schwangerschaft (8800) appears for Female (W) < 50', async ({ page }) => {
        await page.goto('/');

        // Starts Flow
        await page.locator('main').getByText('Termin / Anamnese').first().click();
        await dsgvoWorkflow(page);

        await page.locator('main').getByRole('button', { name: 'Ja, ich bin bereits Patient', exact: true }).click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="text"]').fill('Musterfrau');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="text"]').fill('Maria');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Female
        await page.locator('main').locator('select').selectOption('W');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Age ~ 30 (Birthdate: 1995-01-01)
        await page.locator('main').locator('input[type="date"]').fill('1995-01-01');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Beschwerden -> Nein
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 4000: Größe
        await page.locator('main').locator('input[type="number"]').fill('170');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 4001: Gewicht
        await page.locator('main').locator('input[type="number"]').fill('65');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 4002: Raucher -> Nein
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Optional sections
        await passBoringSection(page);

        // 5000: Diabetes -> Nein
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 6000: Beeinträchtigung -> Nein
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 6002: Implantate -> Nein
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 6004: Blutverdünner -> Nein
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 6006: Allergien -> Nein
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 7000: Gesundheitsstörungen -> Keine (we select Bluthochdruck instead)
        await page.locator('main').getByText('Bluthochdruck').click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 8000: Vorerkrankungen -> Thrombose
        await page.locator('main').getByText('Thrombose').click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // --> SCHWANGERSCHAFTSFRAGE MUST APPEAR (8800)
        const pregnantText = page.locator('main').getByText('Schwangerschafts-Abfrage');
        await expect(pregnantText).toBeVisible({ timeout: 10000 });
        await page.locator('main').getByText('Ja, möglicherweise').click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // --> MEDIKAMENTE (8900)
        const medText = page.locator('main').getByText('Welche Medikamente erhalten Sie aktuell?');
        await expect(medText).toBeVisible({ timeout: 10000 });
    });

    test('3. Context-Aware Routing: Schwangerschaft does NOT appear for Male (M)', async ({ page }) => {
        await page.goto('/');

        await page.locator('main').getByText('Termin / Anamnese').first().click();
        await dsgvoWorkflow(page);

        await page.locator('main').getByRole('button', { name: 'Ja, ich bin bereits Patient', exact: true }).click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="text"]').fill('Mustermann');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="text"]').fill('Max');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Male
        await page.locator('main').locator('select').selectOption('M');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Age ~ 30
        await page.locator('main').locator('input[type="date"]').fill('1995-01-01');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Beschwerden -> Nein
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Height/Weight
        await page.locator('main').locator('input[type="number"]').fill('180');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="number"]').fill('80');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Rauchen
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Skip middle
        await passBoringSection(page);

        // Diab, Beeintr, Impl, Blutv, Allerg
        for (let i = 0; i < 5; i++) {
            await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
            await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        }

        // Gesundheitsstörungen & Vorerkrankungen (linear)
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // --> MEDIKAMENTE (8900) SHOULD APPEAR DIRECTLY (Skipping 8800)
        const medText = page.locator('main').getByText('Welche Medikamente erhalten Sie aktuell?');
        await expect(medText).toBeVisible({ timeout: 10000 });

        const pregnantText = page.getByText('Schwangerschafts-Abfrage');
        await expect(pregnantText).not.toBeVisible();
    });

    test('4. Parallel Routing: Multiselect follow-ups added to queue correctly', async ({ page }) => {
        await page.goto('/');
        await page.locator('main').getByText('Termin / Anamnese').first().click();
        await dsgvoWorkflow(page);

        await page.locator('main').getByRole('button', { name: 'Ja, ich bin bereits Patient', exact: true }).click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="text"]').fill('Mustermann');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="text"]').fill('Max');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('select').selectOption('M');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="date"]').fill('1980-01-01');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 1000: Beschwerden -> Ja
        await page.locator('main').getByRole('button', { name: 'Ja', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 1001: Wie lange -> wenige Tage
        await page.locator('main').locator('select').selectOption('wenige_tage');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 1002: Wo? -> Kopf, Hals, Rücken (NOT critical triage for this test)
        await page.locator('main').getByText('Kopf').click();
        await page.locator('main').getByText('Hals / Rachen').click();
        await page.locator('main').getByText('Rücken / Rückenschmerzen').click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 1003: Kurze Beschreibung
        await page.locator('main').locator('textarea').fill('Multiple areas of discomfort');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Height/Weight/Rauchen
        await page.locator('main').locator('input[type="number"]').fill('180');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').locator('input[type="number"]').fill('80');
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // Skip middle
        await passBoringSection(page);

        // Diab, Beeintr, Impl, Blutv, Allerg
        for (let i = 0; i < 5; i++) {
            await page.locator('main').getByRole('button', { name: 'Nein', exact: true }).first().click();
            await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();
        }

        // 7000: Multiselect -> Blutung AND Lunge (should trigger both follow-ups)
        await page.locator('main').getByText('Blutung/Gerinnungsstörung').click();
        await page.locator('main').getByText('Chronische Lungenerkrankung (Asthma/COPD)').click();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 7001: Blutung detail
        await expect(page.locator('main').getByText('Welche Gerinnungsstörung haben Sie?')).toBeVisible();
        await page.locator('main').getByRole('button', { name: 'Weiter', exact: true }).click();

        // 7002: Lunge detail (POPPED FROM QUEUE!)
        await expect(page.locator('main').getByText('Welche Lungenerkrankung haben Sie?')).toBeVisible();
    });
});
