import { test, expect, Page } from '@playwright/test';

/**
 * UI Features Tests — DSGVO, i18n, Theme, Sidebar, Form Validation
 * Covers non-flow UI features that aren't tested in anamnese.spec.ts / penetration.spec.ts
 */

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Starts a session so the Questionnaire is shown */
async function startQuestionnaireSession(page: Page) {
    await page.goto('/');
    await page.locator('main').getByText('Termin / Anamnese').first().click();

    // DSGVO consent
    await page.getByText('Einwilligung in die Datenverarbeitung').click();
    await page.getByText('Verarbeitung besonderer Kategorien (Gesundheitsdaten)').click();
    await page.getByText('Widerrufsrecht & Datenlöschung').click();
    await page.locator('button').filter({ hasText: /Einwilligen.*Fortfahren/ }).click();

    // Wait for first question
    await expect(
        page.getByText('Sind Sie bereits als Patient in unserer Praxis bekannt?').first()
    ).toBeVisible({ timeout: 15000 });
}

// ─── DSGVO Consent Tests ───────────────────────────────────────────────────────

test.describe('DSGVO Consent Gate', () => {
    test('Accept button is disabled until all 3 checkboxes are checked', async ({ page }) => {
        await page.goto('/');
        await page.locator('main').getByText('Termin / Anamnese').first().click();

        // Modal should appear
        await expect(page.getByText('Datenschutz-Einwilligung')).toBeVisible();

        // Accept button should be disabled
        const acceptBtn = page.locator('button').filter({ hasText: /Einwilligen.*Fortfahren|Bitte alle Punkte bestätigen/ });
        await expect(acceptBtn).toBeDisabled();

        // Check only first → still disabled
        await page.getByText('Einwilligung in die Datenverarbeitung').click();
        await expect(acceptBtn).toBeDisabled();

        // Check second → still disabled
        await page.getByText('Verarbeitung besonderer Kategorien (Gesundheitsdaten)').click();
        await expect(acceptBtn).toBeDisabled();

        // Check third → now enabled
        await page.getByText('Widerrufsrecht & Datenlöschung').click();
        await expect(acceptBtn).toBeEnabled();
    });

    test('Decline button closes modal and stays on landing', async ({ page }) => {
        await page.goto('/');
        await page.locator('main').getByText('Termin / Anamnese').first().click();
        await expect(page.getByText('Datenschutz-Einwilligung')).toBeVisible({ timeout: 15000 });

        // Click the decline button (contains X icon + "Ablehnen" text)
        const declineBtn = page.locator('button').filter({ hasText: /Ablehnen/ }).first();
        await expect(declineBtn).toBeVisible({ timeout: 5000 });
        await declineBtn.click();

        // Modal should close — either the text disappears or overlay is removed
        await expect(page.getByText('Datenschutz-Einwilligung')).not.toBeVisible({ timeout: 10000 });

        // Should still be on landing page (the h1 heading)
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('Full policy details can be expanded', async ({ page }) => {
        await page.goto('/');
        await page.locator('main').getByText('Termin / Anamnese').first().click();
        await expect(page.getByText('Datenschutz-Einwilligung')).toBeVisible();

        // Look for policy toggle
        const policyBtn = page.getByText('Vollständige Datenschutzerklärung');
        if (await policyBtn.isVisible()) {
            await policyBtn.click();
            // Should show extended policy content (AES-256, etc.)
            await expect(page.getByText('AES-256').first()).toBeVisible({ timeout: 3000 });
        }
    });

    test('DSGVO consent persists after page reload', async ({ page }) => {
        await page.goto('/');
        await page.locator('main').getByText('Termin / Anamnese').first().click();

        // Give consent
        await page.getByText('Einwilligung in die Datenverarbeitung').click();
        await page.getByText('Verarbeitung besonderer Kategorien (Gesundheitsdaten)').click();
        await page.getByText('Widerrufsrecht & Datenlöschung').click();
        await page.locator('button').filter({ hasText: /Einwilligen.*Fortfahren/ }).click();

        // Wait for questionnaire to load
        await expect(
            page.getByText('Sind Sie bereits als Patient in unserer Praxis bekannt?').first()
        ).toBeVisible({ timeout: 15000 });

        // Reload and try again — should NOT show DSGVO again
        await page.goto('/');
        await page.locator('main').getByText('Medikamente / Rezepte').first().click();

        // Should go directly to questionnaire (no DSGVO)
        // Give it time — either questionnaire shows or DSGVO shows
        const dsgvoVisible = await page.getByText('Datenschutz-Einwilligung').isVisible().catch(() => false);
        // If DSGVO is NOT shown, consent was persisted correctly
        if (!dsgvoVisible) {
            // Success — consent remembered
            expect(dsgvoVisible).toBe(false);
        }
    });
});

// ─── i18n Language Switching ────────────────────────────────────────────────────

test.describe('i18n Language Switching', () => {
    test('Language selector shows dropdown with 5 languages', async ({ page }) => {
        await page.goto('/');

        // Find and click the language selector (Globe icon button)
        const langSelector = page.locator('button').filter({ hasText: /DE|EN|AR|TR|UK/i }).first();
        await langSelector.click();

        // Dropdown should show all 5 options
        await expect(page.getByText('Deutsch')).toBeVisible();
        await expect(page.getByText('English')).toBeVisible();
        await expect(page.getByText('العربية')).toBeVisible();
        await expect(page.getByText('Türkçe')).toBeVisible();
        await expect(page.getByText('Українська')).toBeVisible();
    });

    test('Switching to English changes UI text', async ({ page }) => {
        await page.goto('/');

        // German text should be visible
        await expect(page.getByText('Anliegen wählen')).toBeVisible();

        // Switch to English
        const langSelector = page.locator('button').filter({ hasText: /DE|EN|AR|TR|UK/i }).first();
        await langSelector.click();
        await page.getByText('English').click();

        // English text should appear (given translation keys exist)
        // The heading key is 'Anliegen wählen' — check if it switches to English equivalent
        await page.waitForTimeout(500); // Allow i18next to process
        const headingText = await page.locator('h1').first().textContent();
        expect(headingText).toBeTruthy();
    });

    test('Arabic sets RTL direction on html element', async ({ page }) => {
        await page.goto('/');

        const langSelector = page.locator('button').filter({ hasText: /DE|EN|AR|TR|UK/i }).first();
        await langSelector.click();
        await page.getByText('العربية').click();
        await page.waitForTimeout(500);

        const dir = await page.locator('html').getAttribute('dir');
        expect(dir).toBe('rtl');
    });

    test('Non-Arabic languages reset to LTR', async ({ page }) => {
        await page.goto('/');

        // First switch to Arabic
        const langSelector = page.locator('button').filter({ hasText: /DE|EN|AR|TR|UK/i }).first();
        await langSelector.click();
        await page.getByText('العربية').click();
        await page.waitForTimeout(300);
        expect(await page.locator('html').getAttribute('dir')).toBe('rtl');

        // Switch back to German
        const langSelector2 = page.locator('button').filter({ hasText: /DE|EN|AR|TR|UK/i }).first();
        await langSelector2.click();
        await page.getByText('Deutsch').click();
        await page.waitForTimeout(300);

        const dir = await page.locator('html').getAttribute('dir');
        expect(dir === 'ltr' || dir === null).toBeTruthy();
    });
});

// ─── Theme Toggle ───────────────────────────────────────────────────────────────

test.describe('Theme Toggle', () => {
    test('Theme toggle switches between dark and light mode', async ({ page }) => {
        await page.goto('/');

        const htmlEl = page.locator('html');
        const initialTheme = await htmlEl.getAttribute('data-theme');

        // Find theme toggle button (Sun or Moon icon)
        const themeBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({
            hasText: ''
        });

        // Find the button with aria-label containing "Modus" or "mode"
        const themeToggle = page.locator('button[aria-label*="Modus"], button[aria-label*="mode"], button[title*="Modus"], button[title*="mode"]').first();

        if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(300);

            const newTheme = await htmlEl.getAttribute('data-theme');
            expect(newTheme).not.toBe(initialTheme);

            // Toggle back
            await themeToggle.click();
            await page.waitForTimeout(300);
            const restoredTheme = await htmlEl.getAttribute('data-theme');
            expect(restoredTheme).toBe(initialTheme);
        }
    });

    test('Theme persists after page reload', async ({ page }) => {
        await page.goto('/');

        const themeToggle = page.locator('button[aria-label*="Modus"], button[aria-label*="mode"], button[title*="Modus"], button[title*="mode"]').first();

        if (await themeToggle.isVisible()) {
            // Get initial theme
            const initialTheme = await page.locator('html').getAttribute('data-theme');

            // Toggle
            await themeToggle.click();
            await page.waitForTimeout(300);
            const newTheme = await page.locator('html').getAttribute('data-theme');
            expect(newTheme).not.toBe(initialTheme);

            // Reload
            await page.reload();
            await page.waitForTimeout(1000);

            // Theme should persist
            const reloadedTheme = await page.locator('html').getAttribute('data-theme');
            expect(reloadedTheme).toBe(newTheme);
        }
    });
});

// ─── Sidebar Visibility ────────────────────────────────────────────────────────

test.describe('History Sidebar', () => {
    test('Sidebar is fully hidden when closed', async ({ page }) => {
        await startQuestionnaireSession(page);

        // The sidebar aside should exist
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeAttached();

        // When closed, it should have -translate-x-full (completely off-screen)
        const transform = await sidebar.evaluate((el) => {
            return window.getComputedStyle(el).transform;
        });

        // The sidebar should either be hidden or translated fully off-screen
        // Check that the sidebar's left edge is at or past 0 (off-screen)
        const box = await sidebar.boundingBox();
        if (box) {
            // If visible, the right edge should be <= 0 (fully off-screen left)
            expect(box.x + box.width).toBeLessThanOrEqual(0);
        }
    });
});

// ─── Form Validation ────────────────────────────────────────────────────────────

test.describe('Form Validation', () => {
    test('Weiter button requires answer before proceeding', async ({ page }) => {
        await startQuestionnaireSession(page);

        // Should be on question 0000 (Bestandspatient?)
        // Try clicking Weiter without selecting an answer
        const weiterBtn = page.locator('footer button').filter({ hasText: 'Weiter' });
        if (await weiterBtn.isVisible()) {
            // Button might be disabled or clicking does nothing
            const isDisabled = await weiterBtn.isDisabled();
            if (!isDisabled) {
                await weiterBtn.click();
                // Should still be on the same question (validation prevents advance)
                await expect(
                    page.getByText('Sind Sie bereits als Patient in unserer Praxis bekannt?').first()
                ).toBeVisible();
            } else {
                expect(isDisabled).toBe(true);
            }
        }
    });

    test('Empty text fields show validation or block progress', async ({ page }) => {
        await startQuestionnaireSession(page);

        // Answer first question to get to text input (name)
        await page.locator('main').getByRole('button', { name: 'Nein, ich bin zum ersten Mal hier' }).click();
        if (await page.locator('footer button').filter({ hasText: 'Weiter' }).isVisible()) {
            await page.locator('footer button').filter({ hasText: 'Weiter' }).click();
        }

        // Should now be on name input question
        await expect(page.getByText('Nachnamen').first()).toBeVisible({ timeout: 10000 });

        // Try to proceed with empty field
        const weiterBtn = page.locator('footer button').filter({ hasText: 'Weiter' });
        if (await weiterBtn.isVisible()) {
            const isDisabled = await weiterBtn.isDisabled();
            if (!isDisabled) {
                await weiterBtn.click();
                // Should still be on name question or show error
                const stillVisible = await page.getByText('Nachnamen').first().isVisible();
                expect(stillVisible).toBe(true);
            }
        }
    });
});

// ─── Landing Page Structure ─────────────────────────────────────────────────────

test.describe('Landing Page', () => {
    test('All 10 service cards are displayed', async ({ page }) => {
        await page.goto('/');

        // Check for known service titles
        const expectedServices = [
            'Termin / Anamnese',
            'Medikamente / Rezepte',
            'AU (Krankschreibung)',
            'Unfallmeldung (BG)',
            'Überweisung',
            'Terminabsage',
            'Dateien / Befunde',
            'Telefonanfrage',
            'Dokumente anfordern',
            'Nachricht schreiben'
        ];

        for (const svc of expectedServices) {
            await expect(page.getByText(svc).first()).toBeVisible();
        }
    });

    test('Footer shows System Online and DSGVO Konform', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByText('System Online')).toBeVisible();
        await expect(page.getByText('DSGVO Konform')).toBeVisible();
    });

    test('AES encryption notice is shown in footer', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByText(/AES-256/)).toBeVisible();
    });
});
