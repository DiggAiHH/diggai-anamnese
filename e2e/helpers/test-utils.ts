/**
 * Shared E2E test utilities for DiggAI Anamnese
 */
import { Page, expect, APIRequestContext } from '@playwright/test';

// ─── Test Credentials ───────────────────────────────────────

const DEFAULT_ARZT_USERNAME = process.env.E2E_ARZT_USERNAME ?? 'admin';
const DEFAULT_MFA_USERNAME = process.env.E2E_MFA_USERNAME ?? 'mfa';
const DEFAULT_ARZT_PASSWORD = process.env.E2E_ARZT_PASSWORD ?? process.env.ARZT_PASSWORD ?? '';
const DEFAULT_MFA_PASSWORD = process.env.E2E_MFA_PASSWORD ?? DEFAULT_ARZT_PASSWORD;

export const TEST_CREDENTIALS = {
    arzt: { username: DEFAULT_ARZT_USERNAME, password: DEFAULT_ARZT_PASSWORD },
    mfa: { username: DEFAULT_MFA_USERNAME, password: DEFAULT_MFA_PASSWORD }
} as const;

function assertPasswordConfigured(password: string, envHints: string) {
    if (!password) {
        throw new Error(`Missing E2E password configuration. Set ${envHints} in your environment.`);
    }
}

// ─── Navigation Helpers ─────────────────────────────────────

/** Click the "Weiter" (Next) button */
export async function clickWeiter(page: Page) {
    await dismissSessionRecoveryDialogIfPresent(page);

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
    const heading = page.locator('h1, h2, h3').filter({ hasText: text }).first();
    await expect(heading).toBeVisible({ timeout });
}

/** Wait for page to be idle (network + animations) */
type WaitForIdleOptions = {
    timeout?: number;
    includeNetworkIdle?: boolean;
    settleMs?: number;
};

const E2E_COOKIE_CONSENT = {
    essential: true,
    functional: false,
    analytics: false,
    timestamp: '1970-01-01T00:00:00.000Z',
    version: '1.0.0',
} as const;

const E2E_DSGVO_CONSENT = {
    consentAt: '1970-01-01T00:00:00.000Z',
    signatureHash: 'e2e-signature-hash',
    signatureData: 'e2e-signature-data',
} as const;

function isTimeoutLikeError(error: unknown): boolean {
    return error instanceof Error && /timeout|timed out/i.test(error.message);
}

async function waitForLoadStateWithPolicy(
    page: Page,
    state: 'domcontentloaded' | 'load' | 'networkidle',
    timeout: number,
    allowTimeout: boolean,
) {
    try {
        await page.waitForLoadState(state, { timeout });
    } catch (error) {
        if (!allowTimeout || !isTimeoutLikeError(error)) {
            throw error;
        }
    }
}

export async function waitForIdle(page: Page, timeoutOrOptions: number | WaitForIdleOptions = 3000) {
    const options = typeof timeoutOrOptions === 'number'
        ? { timeout: timeoutOrOptions }
        : timeoutOrOptions;

    const timeout = options.timeout ?? 3000;
    const includeNetworkIdle = options.includeNetworkIdle ?? true;
    const settleMs = options.settleMs ?? 300;

    await waitForLoadStateWithPolicy(page, 'domcontentloaded', timeout, false);
    await waitForLoadStateWithPolicy(page, 'load', timeout, true);

    if (includeNetworkIdle) {
        await waitForLoadStateWithPolicy(page, 'networkidle', Math.min(timeout, 2000), true);
    }

    await page.waitForTimeout(settleMs);
}

/** Navigate with retry to survive transient dev-server connection drops */
export async function gotoWithRetry(page: Page, url: string, attempts = 3) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await page.goto(url, { waitUntil: 'load', timeout: 20000 });
            return;
        } catch (error) {
            lastError = error;
            if (attempt === attempts) {
                throw lastError;
            }
            await page.waitForTimeout(750 * attempt);
        }
    }
}

// ─── DSGVO / Consent ────────────────────────────────────────

/** Reset persisted session to avoid recovery modal between tests */
export async function resetPersistedSessionForE2E(page: Page) {
    await page.addInitScript(() => {
        localStorage.removeItem('anamnese-session');
        localStorage.removeItem('anamnese_salt');
    });
}

/** Dismiss session recovery modal if it appears */
export async function dismissSessionRecoveryDialogIfPresent(page: Page) {
    const recoveryTitle = page.getByText(/Sitzung fortsetzen\?/i);
    const isVisible = await recoveryTitle.isVisible().catch(() => false);
    if (!isVisible) {
        return;
    }

    const discardBtn = page.getByRole('button', { name: /Verwerfen/i }).first();
    if (await discardBtn.isVisible().catch(() => false)) {
        await discardBtn.click();
    } else {
        await page.locator('button[title*="Verwerfen"]').first().click();
    }

    await recoveryTitle.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
}

/** Pre-seed cookie consent in localStorage for deterministic E2E startup */
export async function seedCookieConsentForE2E(page: Page) {
    await page.addInitScript((consent) => {
        localStorage.setItem('cookie_consent', JSON.stringify(consent));
    }, E2E_COOKIE_CONSENT);
}

/** Pre-seed DSGVO consent keys to skip interactive consent game in E2E */
export async function seedDSGVOConsentForE2E(page: Page) {
    await page.addInitScript((consent) => {
        localStorage.setItem('dsgvo_consent', consent.consentAt);
        localStorage.setItem('dsgvo_signature_hash', consent.signatureHash);
        localStorage.setItem('dsgvo_signature_data', consent.signatureData);
    }, E2E_DSGVO_CONSENT);
}

/** Dismiss cookie banner if present (TTDSG consent) */
export async function dismissCookieBannerIfPresent(page: Page) {
    const dialog = page.getByRole('dialog', { name: /Cookie-Einstellungen/i });
    const isVisible = await dialog.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false);
    if (isVisible) {
        const essentialOnlyButton = dialog.getByRole('button', { name: /Nur Essenzielle/i });
        if (await essentialOnlyButton.isVisible().catch(() => false)) {
            await essentialOnlyButton.click();
        } else {
            await dialog.getByRole('button', { name: /Alle akzeptieren/i }).click();
        }
        await expect(dialog).toBeHidden({ timeout: 5000 });
    }
}

/**
 * Accept initial consent step (supports modern ConsentFlow and legacy DSGVO modal).
 * Returns true when a consent UI was detected and handled.
 */
export async function acceptDSGVO(page: Page): Promise<boolean> {
    await dismissCookieBannerIfPresent(page);

    // Modern clinical consent flow in Questionnaire
    const modernConsentHeading = page.getByRole('heading', { name: /Ihre Daten sind sicher/i });
    const isModernConsentVisible = await modernConsentHeading.isVisible().catch(() => false);
    if (isModernConsentVisible) {
        const treatmentCheckbox = page.locator('#consent-treatment');
        const dataProcessingCheckbox = page.locator('#consent-data');

        if (await treatmentCheckbox.count() > 0) {
            await treatmentCheckbox.setChecked(true, { force: true });
        }
        if (await dataProcessingCheckbox.count() > 0) {
            await dataProcessingCheckbox.setChecked(true, { force: true });
        }

        const startQuestionnaireBtn = page.getByRole('button', { name: /Fragebogen starten|Einwilligen & Fortfahren/i });
        await startQuestionnaireBtn.click({ timeout: 8000 });
        return true;
    }

    // Legacy DSGVO modal flow
    const legacyTitle = page.getByText('Datenschutz-Einwilligung');
    const isLegacyVisible = await legacyTitle.isVisible().catch(() => false);
    if (isLegacyVisible) {
        await page.click('text="Einwilligung in die Datenverarbeitung"');
        await page.click('text="Verarbeitung besonderer Kategorien (Gesundheitsdaten)"');
        await page.click('text="Widerrufsrecht & Datenlöschung"');
        await page.click('button:has-text("Einwilligen & Fortfahren")');
        return true;
    }

    return false;
}

async function clickPatientFlowStartButton(page: Page): Promise<boolean> {
    const serviceStartButton = page.getByRole('button', { name: /termin\s*\/\s*anamnese/i }).first();
    if (await serviceStartButton.isVisible().catch(() => false)) {
        await serviceStartButton.click({ timeout: 10000, force: true });
        return true;
    }

    const genericStartButton = page.getByRole('button', { name: /jetzt starten/i }).first();
    if (await genericStartButton.isVisible().catch(() => false)) {
        await genericStartButton.click({ timeout: 10000, force: true });
        return true;
    }

    return false;
}

async function enterPatientServiceFlow(page: Page) {
    const landingHeading = page.getByRole('heading', { name: /Anliegen wählen/i }).first();
    await landingHeading.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});

    let clickedStart = await clickPatientFlowStartButton(page);

    if (!clickedStart) {
        await gotoWithRetry(page, '/patient', 2);
        await waitForIdle(page);
        await dismissCookieBannerIfPresent(page);
        await dismissSessionRecoveryDialogIfPresent(page);
        clickedStart = await clickPatientFlowStartButton(page);
    }

    if (!clickedStart) {
        throw new Error('Could not find a start button on /patient landing page.');
    }

    await waitForIdle(page, { timeout: 8000, includeNetworkIdle: true, settleMs: 400 });

    const stillOnLanding = await landingHeading.isVisible().catch(() => false);
    if (stillOnLanding) {
        const clickedRetry = await clickPatientFlowStartButton(page);
        if (!clickedRetry) {
            throw new Error('Start button click did not transition away from landing page.');
        }
        await waitForIdle(page, { timeout: 8000, includeNetworkIdle: true, settleMs: 400 });
    }
}

// ─── Question Flow Helpers ──────────────────────────────────

/** Start a new patient flow */
export async function startNewPatient(page: Page) {
    await resetPersistedSessionForE2E(page);
    await seedCookieConsentForE2E(page);
    await seedDSGVOConsentForE2E(page);
    await gotoWithRetry(page, '/patient');
    await waitForIdle(page);
    await dismissCookieBannerIfPresent(page);
    await dismissSessionRecoveryDialogIfPresent(page);

    await enterPatientServiceFlow(page);

    await acceptDSGVO(page);
    await waitForIdle(page);

    // 0000: First patient-status question (wording changed in latest flow)
    await expect(
        page.locator('h1, h2, h3').filter({ hasText: /Waren Sie schon einmal|Sind Sie bereits als Patient/i }).first()
    ).toBeVisible({ timeout: 15000 });

    const noButton = page.getByRole('button', { name: /Nein|zum ersten Mal/i }).first();
    if (await noButton.isVisible().catch(() => false)) {
        await noButton.click();
    } else {
        await page.click('button:has-text("Nein")');
    }
    await clickWeiter(page);
}

/** Start a returning patient flow */
export async function startReturningPatient(page: Page) {
    await resetPersistedSessionForE2E(page);
    await seedCookieConsentForE2E(page);
    await seedDSGVOConsentForE2E(page);
    await gotoWithRetry(page, '/patient');
    await waitForIdle(page);
    await dismissCookieBannerIfPresent(page);
    await dismissSessionRecoveryDialogIfPresent(page);

    await enterPatientServiceFlow(page);

    await acceptDSGVO(page);
    await waitForIdle(page);

    await expect(
        page.locator('h1, h2, h3').filter({ hasText: /Waren Sie schon einmal|Sind Sie bereits als Patient/i }).first()
    ).toBeVisible({ timeout: 15000 });

    const yesButton = page.getByRole('button', { name: /Ja|bereits Patient/i }).first();
    if (await yesButton.isVisible().catch(() => false)) {
        await yesButton.click();
    } else {
        await page.click('button:has-text("Ja")');
    }
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
export async function loginMFA(page: Page, username = TEST_CREDENTIALS.mfa.username, password = TEST_CREDENTIALS.mfa.password) {
    assertPasswordConfigured(password, 'E2E_MFA_PASSWORD, E2E_ARZT_PASSWORD, or ARZT_PASSWORD');

    await page.goto('/mfa');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=MFA-Portal', { timeout: 10000 });
}

/** Login to Arzt dashboard */
export async function loginArzt(page: Page, username = TEST_CREDENTIALS.arzt.username, password = TEST_CREDENTIALS.arzt.password) {
    assertPasswordConfigured(password, 'E2E_ARZT_PASSWORD or ARZT_PASSWORD');

    await page.goto('/arzt');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Arzt-Portal', { timeout: 10000 }).catch(() => {});
}

/** Login with "remember me" option */
export async function loginWithRememberMe(page: Page, username: string, password: string) {
    assertPasswordConfigured(password, 'E2E_ARZT_PASSWORD or ARZT_PASSWORD');

    await page.goto('/arzt');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    
    // Check "remember me" checkbox if present
    const rememberMeCheckboxByLabel = page.getByLabel(/angemeldet|remember|merken/i).first();
    if (await rememberMeCheckboxByLabel.isVisible().catch(() => false)) {
        await rememberMeCheckboxByLabel.check();
    } else {
        const rememberMeCheckbox = page.locator('input[type="checkbox"][name*="remember" i], input[type="checkbox"][id*="remember" i]').first();
        if (await rememberMeCheckbox.isVisible().catch(() => false)) {
            await rememberMeCheckbox.check();
        }
    }
    
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Arzt-Portal', { timeout: 10000 }).catch(() => {});
}

/** Logout from dashboard */
export async function logout(page: Page) {
    const logoutBtn = page.locator('button').filter({ hasText: /logout|abmelden/i });
    if (await logoutBtn.first().isVisible().catch(() => false)) {
        await logoutBtn.first().click();
        await waitForIdle(page);
    }
}

// ─── API Helpers ────────────────────────────────────────────

/** Create API request context with auth */
export async function createAuthenticatedContext(request: APIRequestContext, username: string, password: string): Promise<string> {
    const response = await request.post('/api/arzt/login', {
        data: { username, password }
    });
    
    if (!response.ok()) {
        throw new Error(`Login failed: ${response.status()}`);
    }
    
    const cookieHeader = response
        .headersArray()
        .filter(header => header.name.toLowerCase() === 'set-cookie')
        .map(header => header.value.split(';')[0]?.trim())
        .filter((cookie): cookie is string => Boolean(cookie && cookie.length > 0))
        .join('; ');

    return cookieHeader;
}

/** Create a test session via API */
export async function createTestSession(request: APIRequestContext, authCookie: string, patientData?: {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    gender?: string;
}): Promise<string> {
    const defaultData = {
        firstName: 'Test',
        lastName: 'Patient',
        birthDate: '1990-01-15',
        gender: 'maennlich',
        ...patientData
    };
    
    const response = await request.post('/api/sessions', {
        data: defaultData,
        headers: {
            'Cookie': authCookie
        }
    });
    
    if (!response.ok()) {
        throw new Error(`Failed to create session: ${response.status()}`);
    }
    
    const data = await response.json();
    return data.id || data.sessionId;
}

/** Submit a test answer via API */
export async function submitTestAnswer(
    request: APIRequestContext, 
    authCookie: string, 
    sessionId: string, 
    atomId: string, 
    value: unknown
): Promise<void> {
    const response = await request.post('/api/answers', {
        data: {
            sessionId,
            atomId,
            value
        },
        headers: {
            'Cookie': authCookie
        }
    });
    
    if (!response.ok()) {
        throw new Error(`Failed to submit answer: ${response.status()}`);
    }
}

/** Create a triage alert via API (for testing triage acknowledgment) */
export async function createTriageAlert(
    request: APIRequestContext,
    authCookie: string,
    sessionId: string,
    level: 'CRITICAL' | 'WARNING' | 'INFO',
    ruleId: string = 'TEST_RULE'
): Promise<void> {
    const response = await request.post('/api/triage/test-alert', {
        data: {
            sessionId,
            level,
            ruleId,
            details: `Test ${level} alert`
        },
        headers: {
            'Cookie': authCookie
        }
    }).catch(() => null);
    
    // If the test endpoint doesn't exist, we'll create via answers
    if (!response || !response.ok()) {
        // Submit answers that trigger specific triage rules
        const triageTriggerAnswers: Record<string, { atomId: string; value: unknown }[]> = {
            'CRITICAL': [
                { atomId: '0060', value: true }, // chest pain
                { atomId: '0061', value: 'severe' }, // severe chest pain
            ],
            'WARNING': [
                { atomId: '0100', value: true }, // fever
                { atomId: '0101', value: 39.5 }, // high fever
            ]
        };
        
        const answers = triageTriggerAnswers[level] || [];
        for (const answer of answers) {
            await submitTestAnswer(request, authCookie, sessionId, answer.atomId, answer.value);
        }
    }
}

/** Get sessions list via API */
export async function getSessions(request: APIRequestContext, authCookie: string, filters?: {
    status?: string;
    patient?: string;
}): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.patient) params.append('patient', filters.patient);
    
    const response = await request.get(`/api/sessions?${params.toString()}`, {
        headers: {
            'Cookie': authCookie
        }
    });
    
    if (!response.ok()) {
        throw new Error(`Failed to get sessions: ${response.status()}`);
    }
    
    return response.json();
}

/** Assign session to doctor via API */
export async function assignSession(
    request: APIRequestContext,
    authCookie: string,
    sessionId: string,
    doctorId: string
): Promise<void> {
    const response = await request.post(`/api/sessions/${sessionId}/assign`, {
        data: { doctorId },
        headers: {
            'Cookie': authCookie
        }
    });
    
    if (!response.ok()) {
        throw new Error(`Failed to assign session: ${response.status()}`);
    }
}

/** Complete session via API */
export async function completeSession(
    request: APIRequestContext,
    authCookie: string,
    sessionId: string
): Promise<void> {
    const response = await request.post(`/api/sessions/${sessionId}/complete`, {
        headers: {
            'Cookie': authCookie
        }
    });
    
    if (!response.ok()) {
        throw new Error(`Failed to complete session: ${response.status()}`);
    }
}

// ─── UI Helpers ─────────────────────────────────────────────

/** Wait for toast/notification */
export async function waitForToast(page: Page, text: string, timeout = 5000) {
    const toast = page.locator('[role="alert"], .toast, .notification').filter({ hasText: text });
    await expect(toast.first()).toBeVisible({ timeout });
}

/** Dismiss all visible modals */
export async function dismissModals(page: Page) {
    const closeButtons = page.locator('button[aria-label="Close"], button:has-text("Schließen"), button:has-text("Abbrechen")');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
        const btn = closeButtons.nth(i);
        if (await btn.isVisible().catch(() => false)) {
            await btn.click();
            await page.waitForTimeout(200);
        }
    }
}

/** Scroll element into view */
export async function scrollIntoView(page: Page, selector: string) {
    await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) element.scrollIntoView({ behavior: 'instant', block: 'center' });
    }, selector);
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

/** Expect element to have specific CSS class */
export async function expectHasClass(page: Page, selector: string, className: string) {
    const element = page.locator(selector).first();
    const classAttr = await element.getAttribute('class');
    expect(classAttr).toContain(className);
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

/** Simulate session timeout by clearing cookies */
export async function simulateSessionTimeout(page: Page) {
    await page.context().clearCookies();
    await page.reload();
}

/** Wait for network idle and animations */
export async function waitForStableState(page: Page, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForTimeout(500);
}
