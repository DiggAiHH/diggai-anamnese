import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { loadAuthFixtures, type AuthFixtureBundle, type StaffAuthFixture } from './auth-fixtures.js';
import {
    dismissCookieBannerIfPresent,
    gotoWithRetry,
    seedCookieConsentForE2E,
    waitForIdle,
} from './test-utils.js';

export async function prepareAuthPage(page: Page, pathname: string): Promise<void> {
    await seedCookieConsentForE2E(page);
    await page.addInitScript(() => {
        sessionStorage.removeItem('diggai.staff.session');
        localStorage.removeItem('diggai-pwa-auth');
    });
    await gotoWithRetry(page, pathname);
    await waitForIdle(page);
    await dismissCookieBannerIfPresent(page);
}

export async function loginStaff(page: Page, fixture: StaffAuthFixture): Promise<void> {
    await prepareAuthPage(page, '/verwaltung/login');
    await page.getByTestId('staff-username').fill(fixture.username);
    await page.getByTestId('staff-password').fill(fixture.password);
    await page.getByTestId('staff-login-submit').click();
    await expect(page).toHaveURL(new RegExp(`${escapeForRegExp(fixture.dashboardPath)}$`), { timeout: 15000 });
    await waitForIdle(page, { includeNetworkIdle: false });
}

export async function loginAsAdmin(page: Page): Promise<void> {
    const fixtures = loadAuthFixtures();
    await loginStaff(page, fixtures.staff.admin);
}

export async function loginAsArzt(page: Page): Promise<void> {
    const fixtures = loadAuthFixtures();
    await loginStaff(page, fixtures.staff.arzt);
}

export async function loginAsMFA(page: Page): Promise<void> {
    const fixtures = loadAuthFixtures();
    await loginStaff(page, fixtures.staff.mfa);
}

export async function openPwaRegister(page: Page): Promise<void> {
    await prepareAuthPage(page, '/pwa/login');
    await page.getByTestId('pwa-tab-register').click();
    await waitForIdle(page);
}

export async function loginPwa(page: Page, identifier: string, password: string): Promise<void> {
    await prepareAuthPage(page, '/pwa/login');
    await page.getByTestId('pwa-login-identifier').fill(identifier);
    await page.getByTestId('pwa-login-password').fill(password);
    await page.getByTestId('pwa-login-submit').click();
    await expect(page).toHaveURL(/\/pwa\/dashboard$/, { timeout: 15000 });
    await waitForIdle(page, { includeNetworkIdle: false });
}

export async function expectApiOk(
    request: APIRequestContext,
    url: string,
    fixtures: AuthFixtureBundle,
): Promise<unknown> {
    const response = await request.get(url, {
        headers: { ...buildTenantHeaders(fixtures) },
    });

    expect(response.ok(), `${url} should respond with 2xx`).toBeTruthy();
    return response.json();
}

export async function expectApiUnauthorized(
    request: APIRequestContext,
    url: string,
    fixtures: AuthFixtureBundle,
): Promise<void> {
    const response = await request.get(url, {
        headers: { ...buildTenantHeaders(fixtures) },
    });

    expect(response.status()).toBe(401);
}

function buildTenantHeaders(fixtures: AuthFixtureBundle): Record<string, string> {
    return fixtures.tenantSubdomain ? { 'x-tenant-id': fixtures.tenantSubdomain } : {};
}

function escapeForRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
