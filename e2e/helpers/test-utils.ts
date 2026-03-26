/**
 * Shared E2E test utilities for DiggAI Anamnese
 */
import { Page, expect, APIRequestContext } from '@playwright/test';

// ─── Test Credentials ───────────────────────────────────────

export const TEST_CREDENTIALS = {
    arzt: { username: 'admin', password: 'praxis2026' },
    mfa: { username: 'mfa', password: 'praxis2026' }
} as const;

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
export async function loginMFA(page: Page, username = TEST_CREDENTIALS.mfa.username, password = TEST_CREDENTIALS.mfa.password) {
    await page.goto('/mfa');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=MFA-Portal', { timeout: 10000 });
}

/** Login to Arzt dashboard */
export async function loginArzt(page: Page, username = TEST_CREDENTIALS.arzt.username, password = TEST_CREDENTIALS.arzt.password) {
    await page.goto('/arzt');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Arzt-Portal', { timeout: 10000 }).catch(() => {});
}

/** Login with "remember me" option */
export async function loginWithRememberMe(page: Page, username: string, password: string) {
    await page.goto('/arzt');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    
    // Check "remember me" checkbox if present
    const rememberMeCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /angemeldet|remember|merken/i });
    if (await rememberMeCheckbox.isVisible().catch(() => false)) {
        await rememberMeCheckbox.check();
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
    
    // Extract token from cookies or response
    const cookies = await response.headers()['set-cookie'];
    return cookies || '';
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
