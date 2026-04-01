import { readFileSync } from 'node:fs';
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
    return JSON.parse(readFileSync(AUTH_FIXTURE_FILE, 'utf8')) as AuthFixtureBundle;
}

export function buildApiUrl(fixtures: AuthFixtureBundle, pathname: string): string {
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${fixtures.apiURL}${normalizedPath}`;
}

export function buildTenantHeaders(fixtures: AuthFixtureBundle): Record<string, string> {
    return fixtures.tenantSubdomain ? { 'x-tenant-id': fixtures.tenantSubdomain } : {};
}
