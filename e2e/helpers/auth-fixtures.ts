import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type StaffAuthRole = 'arzt' | 'mfa' | 'admin';

export interface StaffAuthFixture {
    role: StaffAuthRole;
    username: string;
    password: string;
    dashboardPath: string;
}

export interface PwaRegistrationFixture {
    patientNumber: string;
    birthDate: string;
    email: string;
    password: string;
}

export interface PwaExistingAccountFixture {
    patientNumber: string;
    birthDate: string;
    email: string;
    phone: string;
    password: string;
}

export interface AuthFixtureBundle {
    mode: 'local' | 'external';
    tenantSubdomain: string;
    baseURL: string;
    apiURL: string;
    staff: {
        admin: StaffAuthFixture;
        arzt: StaffAuthFixture;
        mfa: StaffAuthFixture;
    };
    pwa: {
        registration: PwaRegistrationFixture;
        existing: PwaExistingAccountFixture;
    };
}

export const AUTH_FIXTURE_FILE = path.resolve(process.cwd(), 'test-results', 'auth-fixtures.json');

export function loadAuthFixtures(): AuthFixtureBundle {
    if (existsSync(AUTH_FIXTURE_FILE)) {
        return JSON.parse(readFileSync(AUTH_FIXTURE_FILE, 'utf8')) as AuthFixtureBundle;
    }

    return buildFallbackFixtures();
}

export function buildApiUrl(fixtures: AuthFixtureBundle, pathname: string): string {
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${fixtures.apiURL}${normalizedPath}`;
}

export function buildTenantHeaders(fixtures: AuthFixtureBundle): Record<string, string> {
    return fixtures.tenantSubdomain ? { 'x-tenant-id': fixtures.tenantSubdomain } : {};
}

function buildFallbackFixtures(): AuthFixtureBundle {
    const baseURL =
        process.env.E2E_BASE_URL
        ?? process.env.PLAYWRIGHT_BASE_URL
        ?? process.env.BASE_URL
        ?? 'http://localhost:5173';

    const apiURL =
        process.env.E2E_API_URL
        ?? process.env.API_URL
        ?? `${baseURL.replace(/\/+$/, '')}/api`;

    const tenantSubdomain = process.env.E2E_TENANT_SUBDOMAIN ?? 'default';

    const adminUsername = process.env.E2E_ADMIN_USERNAME ?? 'admin';
    const arztUsername = process.env.E2E_ARZT_USERNAME ?? 'arzt';
    const mfaUsername = process.env.E2E_MFA_USERNAME ?? 'mfa';

    const adminPassword =
        process.env.E2E_ADMIN_PASSWORD
        ?? process.env.E2E_STAFF_PASSWORD
        ?? process.env.ARZT_PASSWORD
        ?? 'praxis2026';

    const arztPassword =
        process.env.E2E_ARZT_PASSWORD
        ?? process.env.E2E_STAFF_PASSWORD
        ?? 'arzt1234';

    const mfaPassword =
        process.env.E2E_MFA_PASSWORD
        ?? process.env.E2E_STAFF_PASSWORD
        ?? process.env.MFA_PASSWORD
        ?? 'mfa1234';

    const pwaPatientNumber = process.env.E2E_PWA_PATIENT_NUMBER ?? 'P-10001';
    const pwaBirthDate = process.env.E2E_PWA_BIRTH_DATE ?? '1965-03-14';
    const pwaEmail = process.env.E2E_PWA_EMAIL ?? 'max.schmidt@demo.de';
    const pwaPassword = process.env.E2E_PWA_PASSWORD ?? 'PatientPass123!';
    const pwaPhone = process.env.E2E_PWA_PHONE ?? '01701234567';

    return {
        mode: (process.env.E2E_MODE as 'local' | 'external') ?? 'local',
        tenantSubdomain,
        baseURL,
        apiURL,
        staff: {
            admin: {
                role: 'admin',
                username: adminUsername,
                password: adminPassword,
                dashboardPath: '/verwaltung/admin',
            },
            arzt: {
                role: 'arzt',
                username: arztUsername,
                password: arztPassword,
                dashboardPath: '/verwaltung/arzt',
            },
            mfa: {
                role: 'mfa',
                username: mfaUsername,
                password: mfaPassword,
                dashboardPath: '/verwaltung/mfa',
            },
        },
        pwa: {
            registration: {
                patientNumber: pwaPatientNumber,
                birthDate: pwaBirthDate,
                email: pwaEmail,
                password: pwaPassword,
            },
            existing: {
                patientNumber: pwaPatientNumber,
                birthDate: pwaBirthDate,
                email: pwaEmail,
                phone: pwaPhone,
                password: pwaPassword,
            },
        },
    };
}
