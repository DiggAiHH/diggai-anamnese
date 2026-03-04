/**
 * Shared E2E test utilities for DiggAI Anamnese
 */
import { Page, expect } from '@playwright/test';

// ─── Navigation Helpers ─────────────────────────────────────

/** Click the "Weiter" (Next) button */
export async function clickWeiter(page: Page) {
    const btn = page.getByRole('button', { name: 'Weiter', exact: true });
    await btn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await btn.isVisible()) {
        await btn.click();
    }
}

/** Click the "Zurück" (Back) button */
export async function clickZurueck(page: Page) {
    const btn = page.getByRole('button', { name: /zurück/i });
    await btn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await btn.isVisible()) {
        await btn.click();
    }
}

/** Wait for a question heading to be visible */
export async function expectQuestion(page: Page, text: string, timeout = 15000) {
    const heading = page.locator('h2').filter({ hasText: text }).first();
    await expect(heading).toBeVisible({ timeout });
}

/** Wait for page to be idle (network + animations) */
export async function waitForIdle(page: Page, timeout = 3000) {
    await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
    await page.waitForTimeout(300);
}

// ─── DSGVO / Consent ────────────────────────────────────────

/** Accept the DSGVO consent modal */
export async function acceptDSGVO(page: Page) {
    await expect(page.getByText('Datenschutz-Einwilligung')).toBeVisible({ timeout: 10000 });
    await page.click('text="Einwilligung in die Datenverarbeitung"');
    await page.click('text="Verarbeitung besonderer Kategorien (Gesundheitsdaten)"');
    await page.click('text="Widerrufsrecht & Datenlöschung"');
    await page.click('button:has-text("Einwilligen & Fortfahren")');
}

// ─── Question Flow Helpers ──────────────────────────────────

/** Start a new patient flow */
export async function startNewPatient(page: Page) {
    await page.goto('/');
    await waitForIdle(page);

    // HomeScreen → Start
    const startBtn = page.getByRole('button', { name: /anamnese starten|start|los geht/i });
    if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click();
        await waitForIdle(page);
    }

    // DSGVO
    await acceptDSGVO(page);
    await waitForIdle(page);

    // 0000: Waren Sie schon einmal hier?
    await expectQuestion(page, 'Waren Sie schon einmal');
    await page.click('button:has-text("Nein")');
    await clickWeiter(page);
}

/** Start a returning patient flow */
export async function startReturningPatient(page: Page) {
    await page.goto('/');
    await waitForIdle(page);

    const startBtn = page.getByRole('button', { name: /anamnese starten|start|los geht/i });
    if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click();
        await waitForIdle(page);
    }

    await acceptDSGVO(page);
    await waitForIdle(page);

    await expectQuestion(page, 'Waren Sie schon einmal');
    await page.click('button:has-text("Ja")');
    await clickWeiter(page);
}

/** Fill basic identity fields (name, gender, birthdate) */
export async function fillBasicInfo(page: Page, opts?: { lastName?: string; firstName?: string; gender?: string; birthdate?: string }) {
    const { lastName = 'TestNachname', firstName = 'TestVorname', gender = 'maennlich', birthdate = '1990-01-15' } = opts || {};

    await expectQuestion(page, 'Nachnamen');
    await page.fill('input', lastName);
    await clickWeiter(page);

    await expectQuestion(page, 'Vornamen');
    await page.fill('input', firstName);
    await clickWeiter(page);

    await expectQuestion(page, 'Geschlecht');
    await page.locator('select').selectOption(gender);
    await clickWeiter(page);

    await expectQuestion(page, 'Geburtsdatum');
    await page.fill('input[type="date"]', birthdate);
    await clickWeiter(page);
}

/** Select a service/reason in the 0003 or service selection question */
export async function selectService(page: Page, service: string) {
    await page.click(`button:has-text("${service}")`);
    await clickWeiter(page);
}

// ─── Login Helpers ──────────────────────────────────────────

/** Login to MFA dashboard */
export async function loginMFA(page: Page, username = 'mfa', password = 'praxis2026') {
    await page.goto('/mfa');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=MFA-Portal', { timeout: 10000 });
}

/** Login to Arzt dashboard */
export async function loginArzt(page: Page, username = 'admin', password = 'praxis2026') {
    await page.goto('/arzt');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Arzt-Portal', { timeout: 10000 }).catch(() => {});
}

// ─── Assertion Helpers ──────────────────────────────────────

/** Expect a toast/notification with text */
export async function expectToast(page: Page, text: string, timeout = 5000) {
    await expect(page.locator(`text=${text}`)).toBeVisible({ timeout });
}

/** Expect no accessibility violations (basic ARIA check) */
export async function checkBasicA11y(page: Page) {
    // Check all interactive elements have accessible names
    const buttons = await page.locator('button:visible').all();
    for (const btn of buttons) {
        const name = await btn.getAttribute('aria-label') || await btn.innerText().catch(() => '');
        expect(name.length, `Button missing accessible name`).toBeGreaterThan(0);
    }
}

/** Check that page has no console errors */
export async function collectConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
}

// ─── State Helpers ──────────────────────────────────────────

/** Clear session storage and local storage */
export async function clearAppState(page: Page) {
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
}

/** Get app demo mode flag */
export async function isDemoMode(page: Page): Promise<boolean> {
    return page.evaluate(() => {
        return !window.location.hostname.includes('localhost') ||
               !(window as unknown as Record<string, unknown>).__DEMO_MODE__ === false;
    });
}
