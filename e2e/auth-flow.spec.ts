import { expect, test } from '@playwright/test';
import { buildApiUrl, loadAuthFixtures } from './helpers/auth-fixtures.js';
import {
    expectApiOk,
    expectApiUnauthorized,
    loginPwa,
    loginStaff,
    openPwaRegister,
    prepareAuthPage,
} from './helpers/auth-helpers.js';
import { gotoWithRetry, waitForIdle } from './helpers/test-utils.js';

const fixtures = loadAuthFixtures();
const staffMeUrl = buildApiUrl(fixtures, '/arzt/me');
const pwaDashboardUrl = buildApiUrl(fixtures, '/pwa/dashboard');

test.describe('staff-auth', () => {
    test('redirects guests from protected staff dashboards to the login screen', async ({ page }) => {
        for (const protectedPath of ['/verwaltung/arzt', '/verwaltung/mfa', '/verwaltung/admin']) {
            await prepareAuthPage(page, protectedPath);
            await expect(page).toHaveURL(/\/verwaltung\/login$/, { timeout: 15000 });
        }
    });

    test('logs in as arzt and verifies the server session', async ({ page }) => {
        await loginStaff(page, fixtures.staff.arzt);

        const me = await expectApiOk(page.context().request, staffMeUrl, fixtures) as { user: { role: string } };
        expect(me.user.role).toBe('arzt');
    });

    test('logs in as mfa and verifies the server session', async ({ page }) => {
        await loginStaff(page, fixtures.staff.mfa);

        const me = await expectApiOk(page.context().request, staffMeUrl, fixtures) as { user: { role: string } };
        expect(me.user.role).toBe('mfa');
    });

    test('logs in as admin and verifies the server session', async ({ page }) => {
        await loginStaff(page, fixtures.staff.admin);

        const me = await expectApiOk(page.context().request, staffMeUrl, fixtures) as { user: { role: string } };
        expect(me.user.role).toBe('admin');
    });

    test('redirects logged-in staff away from dashboards outside their role', async ({ page }) => {
        await loginStaff(page, fixtures.staff.mfa);
        await gotoWithRetry(page, '/verwaltung/admin');
        await expect(page).toHaveURL(/\/verwaltung\/mfa$/, { timeout: 15000 });
    });

    test('logs out staff users and revokes dashboard access', async ({ page }) => {
        await loginStaff(page, fixtures.staff.admin);

        await page.getByTestId('staff-logout').click();
        await expect(page).toHaveURL(/\/verwaltung\/login$/, { timeout: 15000 });

        await gotoWithRetry(page, '/verwaltung/admin');
        await expect(page).toHaveURL(/\/verwaltung\/login$/, { timeout: 15000 });
        await expectApiUnauthorized(page.context().request, staffMeUrl, fixtures);
    });

    test('shows one generic error for invalid staff logins', async ({ page }) => {
        await prepareAuthPage(page, '/verwaltung/login');
        await page.getByTestId('staff-username').fill('ghost.user');
        await page.getByTestId('staff-password').fill('WrongPassword123!');
        await page.getByTestId('staff-login-submit').click();

        const alert = page.getByRole('alert');
        await expect(alert).toBeVisible({ timeout: 15000 });
        await expect(alert).not.toContainText('ghost.user');
        await expect(page).toHaveURL(/\/verwaltung\/login$/);
    });
});

test.describe.serial('pwa-auth', () => {
    test('validates missing required registration fields before submit', async ({ page }) => {
        await openPwaRegister(page);
        await page.getByTestId('pwa-register-birth-date').fill(fixtures.pwa.registration.birthDate);
        await page.getByTestId('pwa-register-password').fill(fixtures.pwa.registration.password);
        await page.getByTestId('pwa-register-confirm-password').fill(fixtures.pwa.registration.password);
        await page.getByTestId('pwa-register-submit').click();

        const patientFieldIsInvalid = await page.getByTestId('pwa-register-patient-number').evaluate((element) => {
            return !(element as HTMLInputElement).checkValidity();
        });

        expect(patientFieldIsInvalid).toBe(true);
        await expect(page).toHaveURL(/\/pwa\/login$/);
    });

    test('rejects registration passwords shorter than 12 characters in the UI', async ({ page }) => {
        await openPwaRegister(page);
        await page.getByTestId('pwa-register-patient-number').fill(fixtures.pwa.registration.patientNumber);
        await page.getByTestId('pwa-register-birth-date').fill(fixtures.pwa.registration.birthDate);
        await page.getByTestId('pwa-register-password').fill('ShortPass1!');
        await page.getByTestId('pwa-register-confirm-password').fill('ShortPass1!');
        await page.getByTestId('pwa-register-submit').click();

        await expect(page.getByRole('alert')).toContainText(/12 Zeichen/);
        await expect(page).toHaveURL(/\/pwa\/login$/);
    });

    test('rejects mismatched registration passwords', async ({ page }) => {
        await openPwaRegister(page);
        await page.getByTestId('pwa-register-patient-number').fill(fixtures.pwa.registration.patientNumber);
        await page.getByTestId('pwa-register-birth-date').fill(fixtures.pwa.registration.birthDate);
        await page.getByTestId('pwa-register-password').fill(fixtures.pwa.registration.password);
        await page.getByTestId('pwa-register-confirm-password').fill('MismatchPass123!');
        await page.getByTestId('pwa-register-submit').click();

        await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
        await expect(page).toHaveURL(/\/pwa\/login$/);
    });

    test('registers a known patient, auto-logs in, persists auth state, and loads the dashboard API', async ({ page }) => {
        await openPwaRegister(page);
        await page.getByTestId('pwa-register-patient-number').fill(fixtures.pwa.registration.patientNumber);
        await page.getByTestId('pwa-register-birth-date').fill(fixtures.pwa.registration.birthDate);
        await page.getByTestId('pwa-register-email').fill(fixtures.pwa.registration.email);
        await page.getByTestId('pwa-register-password').fill(fixtures.pwa.registration.password);
        await page.getByTestId('pwa-register-confirm-password').fill(fixtures.pwa.registration.password);
        await page.getByTestId('pwa-register-submit').click();

        await expect(page).toHaveURL(/\/pwa\/dashboard$/, { timeout: 15000 });
        await expectApiOk(page.context().request, pwaDashboardUrl, fixtures);

        const persistedState = await page.evaluate(() => {
            const raw = localStorage.getItem('diggai-pwa-auth');
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } | Record<string, unknown>;
            return ('state' in parsed ? parsed.state : parsed) as Record<string, unknown> | null;
        });

        expect(persistedState?.isAuthenticated).toBe(true);
        expect(typeof persistedState?.token).toBe('string');

        await page.reload();
        await waitForIdle(page, { includeNetworkIdle: false });
        await expect(page).toHaveURL(/\/pwa\/dashboard$/, { timeout: 15000 });
        await expectApiOk(page.context().request, pwaDashboardUrl, fixtures);
    });

    test('rejects duplicate registration once the portal account exists', async ({ page }) => {
        await openPwaRegister(page);
        await page.getByTestId('pwa-register-patient-number').fill(fixtures.pwa.registration.patientNumber);
        await page.getByTestId('pwa-register-birth-date').fill(fixtures.pwa.registration.birthDate);
        await page.getByTestId('pwa-register-email').fill(fixtures.pwa.registration.email);
        await page.getByTestId('pwa-register-password').fill(fixtures.pwa.registration.password);
        await page.getByTestId('pwa-register-confirm-password').fill(fixtures.pwa.registration.password);
        await page.getByTestId('pwa-register-submit').click();

        await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
        await expect(page).toHaveURL(/\/pwa\/login$/);
    });

    test('logs in with email for an existing PWA account', async ({ page }) => {
        await loginPwa(page, fixtures.pwa.existing.email, fixtures.pwa.existing.password);
        await expectApiOk(page.context().request, pwaDashboardUrl, fixtures);
    });

    test('shows an error for wrong PWA passwords', async ({ page }) => {
        await prepareAuthPage(page, '/pwa/login');
        await page.getByTestId('pwa-login-identifier').fill(fixtures.pwa.existing.email);
        await page.getByTestId('pwa-login-password').fill('WrongPassword123!');
        await page.getByTestId('pwa-login-submit').click();

        await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
        await expect(page).toHaveURL(/\/pwa\/login$/);
    });

    test('logs in with patient number for an existing PWA account', async ({ page }) => {
        await loginPwa(page, fixtures.pwa.existing.patientNumber, fixtures.pwa.existing.password);
        await expectApiOk(page.context().request, pwaDashboardUrl, fixtures);
    });

    test('logs out from the PWA and blocks returning to the dashboard', async ({ page }) => {
        await loginPwa(page, fixtures.pwa.existing.patientNumber, fixtures.pwa.existing.password);
        await gotoWithRetry(page, '/pwa/settings');
        await waitForIdle(page, { includeNetworkIdle: false });
        await page.getByTestId('pwa-logout').click();

        await expect(page).toHaveURL(/\/pwa\/login$/, { timeout: 15000 });
        await gotoWithRetry(page, '/pwa/dashboard');
        await expect(page).toHaveURL(/\/pwa\/login$/, { timeout: 15000 });
        await expectApiUnauthorized(page.context().request, pwaDashboardUrl, fixtures);
    });
});
