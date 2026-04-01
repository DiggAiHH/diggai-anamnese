import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import type { FullConfig } from '@playwright/test';
import { AUTH_FIXTURE_FILE, type AuthFixtureBundle } from './helpers/auth-fixtures.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

const DEFAULT_TENANT = 'default';
const LOCAL_BASE_URL = 'http://localhost:5173';
const LOCAL_API_URL = 'http://localhost:3001/api';
const STAFF_PASSWORD = 'E2E-StaffPass123!';
const PWA_PASSWORD = 'E2E-PatientPass123!';

const LOCAL_FIXTURES: Omit<AuthFixtureBundle, 'mode' | 'baseURL' | 'apiURL'> = {
    tenantSubdomain: DEFAULT_TENANT,
    staff: {
        admin: {
            role: 'admin',
            username: 'e2e.admin',
            password: STAFF_PASSWORD,
            dashboardPath: '/verwaltung/admin',
        },
        arzt: {
            role: 'arzt',
            username: 'e2e.arzt',
            password: STAFF_PASSWORD,
            dashboardPath: '/verwaltung/arzt',
        },
        mfa: {
            role: 'mfa',
            username: 'e2e.mfa',
            password: STAFF_PASSWORD,
            dashboardPath: '/verwaltung/mfa',
        },
    },
    pwa: {
        registration: {
            patientNumber: 'E2E-PWA-REGISTER',
            birthDate: '1992-04-15',
            email: 'e2e.register@example.test',
            password: PWA_PASSWORD,
        },
        existing: {
            patientNumber: 'E2E-PWA-LOGIN',
            birthDate: '1988-11-03',
            email: 'e2e.existing@example.test',
            phone: '+491555501010',
            password: PWA_PASSWORD,
        },
    },
};

export default async function globalSetup(config: FullConfig): Promise<void> {
    const baseURL = normalizeUrl(resolveConfigBaseUrl(config));
    const apiURL = normalizeUrl(process.env.PLAYWRIGHT_API_URL || deriveApiUrl(baseURL));
    const fixtures = isLocalTarget(baseURL)
        ? await prepareLocalFixtures(baseURL, apiURL)
        : prepareExternalFixtures(baseURL, apiURL);

    if (!isLocalTarget(baseURL)) {
        await validateRemoteEnvironment(apiURL, fixtures);
    }

    await mkdir(path.dirname(AUTH_FIXTURE_FILE), { recursive: true });
    await writeFile(AUTH_FIXTURE_FILE, JSON.stringify(fixtures, null, 2), 'utf8');
}

async function prepareLocalFixtures(baseURL: string, apiURL: string): Promise<AuthFixtureBundle> {
    validateLocalPrerequisites();

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: resolvePracticeDatabaseUrl(),
            },
        },
    });

    try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;

        const tenant = await prisma.tenant.upsert({
            where: { subdomain: DEFAULT_TENANT },
            update: {
                name: 'DiggAI Default E2E',
                legalName: 'DiggAI Default E2E',
            },
            create: {
                subdomain: DEFAULT_TENANT,
                name: 'DiggAI Default E2E',
                legalName: 'DiggAI Default E2E',
            },
        });

        const staffPasswordHash = await bcrypt.hash(STAFF_PASSWORD, 12);
        await Promise.all([
            ensureStaffUser(prisma, tenant.id, LOCAL_FIXTURES.staff.admin, 'E2E Admin'),
            ensureStaffUser(prisma, tenant.id, LOCAL_FIXTURES.staff.arzt, 'E2E Arzt'),
            ensureStaffUser(prisma, tenant.id, LOCAL_FIXTURES.staff.mfa, 'E2E MFA'),
        ].map((operation) => operation.then(() => undefined)));

        const registrationPatient = await ensurePatient(prisma, tenant.id, LOCAL_FIXTURES.pwa.registration.patientNumber, LOCAL_FIXTURES.pwa.registration.birthDate, 'e2e.register.patient@example.test');
        const existingPatient = await ensurePatient(prisma, tenant.id, LOCAL_FIXTURES.pwa.existing.patientNumber, LOCAL_FIXTURES.pwa.existing.birthDate, LOCAL_FIXTURES.pwa.existing.email);

        await resetPatientAccount(prisma, registrationPatient.id);
        await ensurePatientAccount(prisma, existingPatient.id, LOCAL_FIXTURES.pwa.existing.email, LOCAL_FIXTURES.pwa.existing.phone, await bcrypt.hash(LOCAL_FIXTURES.pwa.existing.password, 12));

        await prisma.arztUser.updateMany({
            where: {
                tenantId: tenant.id,
                username: {
                    in: [
                        LOCAL_FIXTURES.staff.admin.username,
                        LOCAL_FIXTURES.staff.arzt.username,
                        LOCAL_FIXTURES.staff.mfa.username,
                    ],
                },
            },
            data: {
                passwordHash: staffPasswordHash,
                isActive: true,
            },
        });

        await prisma.patientAccount.updateMany({
            where: {
                patientId: existingPatient.id,
            },
            data: {
                isActive: true,
                deletedAt: null,
                deletionScheduledAt: null,
            },
        });

        return {
            mode: 'local',
            tenantSubdomain: DEFAULT_TENANT,
            baseURL: normalizeUrl(baseURL || LOCAL_BASE_URL),
            apiURL: normalizeUrl(apiURL || LOCAL_API_URL),
            staff: LOCAL_FIXTURES.staff,
            pwa: LOCAL_FIXTURES.pwa,
        };
    } finally {
        await prisma.$disconnect();
    }
}

function prepareExternalFixtures(baseURL: string, apiURL: string): AuthFixtureBundle {
    return {
        mode: 'external',
        tenantSubdomain: requireEnv('PLAYWRIGHT_E2E_TENANT_SUBDOMAIN'),
        baseURL,
        apiURL,
        staff: {
            admin: {
                role: 'admin',
                username: requireEnv('PLAYWRIGHT_E2E_ADMIN_USERNAME'),
                password: requireEnv('PLAYWRIGHT_E2E_ADMIN_PASSWORD'),
                dashboardPath: '/verwaltung/admin',
            },
            arzt: {
                role: 'arzt',
                username: requireEnv('PLAYWRIGHT_E2E_ARZT_USERNAME'),
                password: requireEnv('PLAYWRIGHT_E2E_ARZT_PASSWORD'),
                dashboardPath: '/verwaltung/arzt',
            },
            mfa: {
                role: 'mfa',
                username: requireEnv('PLAYWRIGHT_E2E_MFA_USERNAME'),
                password: requireEnv('PLAYWRIGHT_E2E_MFA_PASSWORD'),
                dashboardPath: '/verwaltung/mfa',
            },
        },
        pwa: {
            registration: {
                patientNumber: requireEnv('PLAYWRIGHT_E2E_PWA_REGISTER_PATIENT_NUMBER'),
                birthDate: requireEnv('PLAYWRIGHT_E2E_PWA_REGISTER_BIRTH_DATE'),
                email: requireEnv('PLAYWRIGHT_E2E_PWA_REGISTER_EMAIL'),
                password: requireEnv('PLAYWRIGHT_E2E_PWA_REGISTER_PASSWORD'),
            },
            existing: {
                patientNumber: requireEnv('PLAYWRIGHT_E2E_PWA_EXISTING_PATIENT_NUMBER'),
                birthDate: requireEnv('PLAYWRIGHT_E2E_PWA_EXISTING_BIRTH_DATE'),
                email: requireEnv('PLAYWRIGHT_E2E_PWA_EXISTING_EMAIL'),
                phone: requireEnv('PLAYWRIGHT_E2E_PWA_EXISTING_PHONE'),
                password: requireEnv('PLAYWRIGHT_E2E_PWA_EXISTING_PASSWORD'),
            },
        },
    };
}

async function validateRemoteEnvironment(apiURL: string, fixtures: AuthFixtureBundle): Promise<void> {
    // 1. Liveness check
    const liveRes = await fetch(`${apiURL}/system/live`);
    if (liveRes.status !== 200) {
        throw new Error(
            `Remote API not reachable at ${apiURL}/system/live. HTTP ${liveRes.status}. Ensure Railway service is running.`,
        );
    }

    // 2. Staff arzt login check
    const loginRes = await fetch(`${apiURL}/arzt/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: fixtures.staff.arzt.username,
            password: fixtures.staff.arzt.password,
        }),
    });
    if (loginRes.status !== 200 && loginRes.status !== 201) {
        throw new Error(
            `Staff user '${fixtures.staff.arzt.username}' login failed (HTTP ${loginRes.status}). Create this user in the live DB first.`,
        );
    }

    // 3. PWA registration patient check — 201 = created, 409 = already exists, anything else = warning only
    const regData = fixtures.pwa.registration;
    const registerRes = await fetch(`${apiURL}/pwa/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            patientNumber: regData.patientNumber,
            birthDate: regData.birthDate,
            email: regData.email,
            password: regData.password,
        }),
    });
    if (registerRes.status !== 201 && registerRes.status !== 409) {
        console.warn(
            `[global-setup] PWA registration patient check returned HTTP ${registerRes.status}. ` +
            `Patient '${regData.email}' may not be seeded correctly in the live DB.`,
        );
    }
}

async function ensureStaffUser(
    prisma: PrismaClient,
    tenantId: string,
    fixture: AuthFixtureBundle['staff'][keyof AuthFixtureBundle['staff']],
    displayName: string,
): Promise<void> {
    const passwordHash = await bcrypt.hash(fixture.password, 12);

    await prisma.arztUser.upsert({
        where: {
            tenantId_username: {
                tenantId,
                username: fixture.username,
            },
        },
        update: {
            displayName,
            passwordHash,
            role: fixture.role.toUpperCase(),
            isActive: true,
        },
        create: {
            tenantId,
            username: fixture.username,
            displayName,
            passwordHash,
            role: fixture.role.toUpperCase(),
            isActive: true,
        },
    });
}

async function ensurePatient(
    prisma: PrismaClient,
    tenantId: string,
    patientNumber: string,
    birthDate: string,
    emailSeed: string,
): Promise<{ id: string }> {
    return prisma.patient.upsert({
        where: {
            tenantId_patientNumber: {
                tenantId,
                patientNumber,
            },
        },
        update: {
            birthDate: new Date(birthDate),
            hashedEmail: sha256(emailSeed),
        },
        create: {
            tenantId,
            patientNumber,
            birthDate: new Date(birthDate),
            hashedEmail: sha256(emailSeed),
        },
        select: { id: true },
    });
}

async function resetPatientAccount(prisma: PrismaClient, patientId: string): Promise<void> {
    const existingAccount = await prisma.patientAccount.findUnique({
        where: { patientId },
        select: { id: true },
    });

    if (!existingAccount) {
        return;
    }

    await prisma.$transaction([
        prisma.patientDevice.deleteMany({ where: { accountId: existingAccount.id } }),
        prisma.patientConsent.deleteMany({ where: { accountId: existingAccount.id } }),
        prisma.diaryEntry.deleteMany({ where: { accountId: existingAccount.id } }),
        prisma.measureTracking.deleteMany({ where: { accountId: existingAccount.id } }),
        prisma.providerMessage.deleteMany({ where: { accountId: existingAccount.id } }),
        prisma.patientAccount.delete({ where: { patientId } }),
    ]);
}

async function ensurePatientAccount(
    prisma: PrismaClient,
    patientId: string,
    email: string,
    phone: string,
    passwordHash: string,
): Promise<void> {
    const conflictingAccount = await prisma.patientAccount.findFirst({
        where: {
            email,
            NOT: { patientId },
        },
        select: { id: true },
    });

    if (conflictingAccount) {
        throw new Error(`Conflicting existing PWA account for ${email}`);
    }

    await prisma.patientAccount.upsert({
        where: { patientId },
        update: {
            email,
            phone,
            passwordHash,
            isActive: true,
            isVerified: true,
            verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            verificationToken: null,
            verificationExpiry: null,
            resetToken: null,
            resetTokenExpiry: null,
            deletedAt: null,
            deletionScheduledAt: null,
        },
        create: {
            patientId,
            email,
            phone,
            passwordHash,
            isActive: true,
            isVerified: true,
            verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
    });
}

function validateLocalPrerequisites(): void {
    if (!resolvePracticeDatabaseUrl()) {
        throw new Error('Missing database connection for Playwright auth fixtures.');
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be present and at least 32 characters for Playwright auth runs.');
    }

    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be present and 32 characters for Playwright auth runs.');
    }
}

function resolveConfigBaseUrl(config: FullConfig): string {
    const configured = config.projects.find((project) => project.name === 'chromium')?.use?.baseURL;
    return typeof configured === 'string' ? configured : process.env.PLAYWRIGHT_BASE_URL || LOCAL_BASE_URL;
}

function resolvePracticeDatabaseUrl(): string {
    return process.env.DATABASE_URL_PRACTICE || process.env.DATABASE_URL_BACKEND_1 || process.env.DATABASE_URL || '';
}

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required Playwright fixture environment variable: ${name}`);
    }
    return value;
}

function normalizeUrl(value: string): string {
    return value.replace(/\/+$/, '');
}

function deriveApiUrl(baseUrl: string): string {
    try {
        const parsed = new URL(baseUrl);
        if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && parsed.port === '5173') {
            return LOCAL_API_URL;
        }

        return normalizeUrl(new URL('/api', `${baseUrl}/`).toString());
    } catch {
        return LOCAL_API_URL;
    }
}

function isLocalTarget(baseUrl: string): boolean {
    try {
        const parsed = new URL(baseUrl);
        return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
        return true;
    }
}

function sha256(value: string): string {
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}
