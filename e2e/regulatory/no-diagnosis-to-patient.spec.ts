/**
 * @file no-diagnosis-to-patient.spec.ts
 * @description Regulatorisches CI-Gate auf UI-Ebene — sicherstellen, dass das
 * AnmeldeHinweisOverlay (Patient-facing) keine Diagnose-Aussagen rendert.
 *
 * Ergänzt server/engine/__tests__/RoutingEngine.regulatory.test.ts (Unit-Ebene).
 * Beide zusammen sind die Beweisführung für „Kein Medizinprodukt"-Position.
 *
 * @see docs/REGULATORY_STRATEGY.md §6.4
 * @see docs/REGULATORY_POSITION.md §5
 */

import { expect, test } from '@playwright/test';

const VERBOTEN_PATIENT = [
    'Diagnose', 'diagnostisch', 'Verdacht', 'hindeuten',
    'medizinischen Notfall', 'Notfall-Erkennung',
    'lebensrettend', 'rettet Leben', 'lebensbedrohlich',
    'Krankheit', 'Therapie', 'Behandlung', 'Heilung',
    'Herzinfarkt', 'Schlaganfall', 'Subarachnoidalblutung', 'Donnerschlag',
    'Diabetisches Fußsyndrom', 'Polypharmazie',
    'Risiko-Score', 'Krebsrisiko', 'erhöhtes Risiko',
    'klinische Entscheidungsunterstützung', 'Clinical Decision Support',
    'Triage-System', 'Triage-Regel',
];

test.describe('Regulatorisches Gate — Patient-Output frei von Diagnose-Sprache', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Anmelde-Formular enthält Disclaimer „kein Medizinprodukt"', async ({ page }) => {
        // Akzeptiert mehrere mögliche Disclaimer-Formulierungen
        const disclaimer = page.getByText(/Anmelde-Software für Ihre Arztpraxis|kein Medizinprodukt|wenden Sie sich umgehend an das Praxispersonal/i).first();
        await expect(disclaimer).toBeVisible();
    });

    test('PRIORITY-Hinweis enthält keine Diagnose-Wörter (Brustschmerz-Auslöser)', async ({ page }) => {
        // Patient-Flow durchspielen bis zum Beschwerden-Atom (1002), Brustschmerz auswählen
        await startQuestionnaire(page);
        await selectBeschwerde(page, 'brust');

        // Warten auf das AnmeldeHinweisOverlay (oder das Vorgänger-RedFlagOverlay als Fallback während Migration)
        const overlay = page.getByTestId('anmelde-hinweis-overlay').or(page.getByTestId('red-flag-overlay'));
        await expect(overlay).toBeVisible({ timeout: 5000 });

        const text = (await overlay.innerText()).toLowerCase();
        for (const verboten of VERBOTEN_PATIENT) {
            expect(text, `Patient-Output enthält verbotenes Wort: ${verboten}`).not.toContain(verboten.toLowerCase());
        }

        // Positiv-Check: Patient muss handlungsrelevanten Hinweis sehen
        const hatHinweis =
            text.includes('praxispersonal') ||
            text.includes('praxisteam') ||
            text.includes('112') ||
            text.includes('telefonseelsorge') ||
            text.includes('anmeldung');
        expect(hatHinweis, `Patient-Output enthält keinen handlungsrelevanten Hinweis: "${text}"`).toBe(true);
    });

    test('Marketing-Texte auf Landing-Page enthalten keine Diagnose-Versprechen', async ({ page }) => {
        const body = (await page.locator('body').innerText()).toLowerCase();
        const marketingVerboten = [
            'rettet leben',
            'notfall-erkennung',
            'herzinfarkt-verdacht',
            'klinische entscheidungsunterstützung',
            'ki-gestützte triage',
        ];
        for (const phrase of marketingVerboten) {
            expect(body, `Landing-Page enthält verbotenes Marketing-Versprechen: "${phrase}"`).not.toContain(phrase);
        }
    });
});

// ─── Helpers ─────────────────────────────────────────────────────

async function startQuestionnaire(page: import('@playwright/test').Page) {
    // Best-effort: Start-Button auf der Landing- oder Anmelde-Seite klicken
    const startButton = page.getByRole('button', { name: /anmeld|fragebogen|start/i }).first();
    if (await startButton.isVisible()) {
        await startButton.click();
    }
}

async function selectBeschwerde(page: import('@playwright/test').Page, value: 'brust' | 'atemnot' | 'laehmung' | 'beine') {
    // Best-effort: Atom 1002 ist die Beschwerden-Liste
    const checkbox = page.getByTestId(`atom-1002-${value}`).or(page.getByLabel(new RegExp(value, 'i'))).first();
    await checkbox.click();
    const next = page.getByRole('button', { name: /weiter|next|absenden|prüfen/i }).first();
    if (await next.isVisible()) {
        await next.click();
    }
}
