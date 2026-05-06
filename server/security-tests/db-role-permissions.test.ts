// @ts-nocheck
/**
 * @module db-role-permissions.test
 * @description C2 — DB-Permission-Test für Postgres-Rollen-Trennung Capture/Suite
 *
 * Verifiziert, dass die SQL-Rollen-Trennung aus `prisma/sql/01_postgres_roles.sql`
 * tatsächlich greift — Capture-Role darf keine Class-IIa-Tabellen schreiben.
 * Das ist die Defense-in-Depth-Ebene unterhalb des B4-Code-Guards.
 *
 * Anker: DiggAi-Restrukturierungs-Plan v1.0 §5.2,
 *        Open-Items-Tracker C1 (Setup) + C2 (dieser Test),
 *        TECH_DOC_OUTLINE_MDR_ANHANG_II.md §3.3 (V&V-Tests).
 *
 * Voraussetzungen:
 *   1. `01_postgres_roles.sql` wurde gegen die Test-/Stage-Datenbank ausgeführt
 *   2. `DATABASE_URL_CAPTURE` ENV-Variable zeigt auf einen Connection-String mit Rolle `diggai_capture`
 *   3. Die Test-DB enthält mindestens einen Tenant + Patient + PatientSession (Seed)
 *
 * Test-Skip-Verhalten:
 *   - Wenn `DATABASE_URL_CAPTURE` nicht gesetzt ist, werden alle Tests
 *     mit `it.skip` übersprungen. Das hält lokale Dev-Workflows + bestehende
 *     CI ohne Postgres-Rollen weiterhin grün; der Test wird grün, sobald
 *     C1 in Stage / Production aktiviert ist.
 *
 * CI-Aktivierung (Phase 4 oder früher):
 *   GitHub Actions Secret `DATABASE_URL_CAPTURE` setzen, dann lädt der ci.yml
 *   den passenden Test-Container mit ausgeführtem 01_postgres_roles.sql vorab.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

// Skip-Helper: gibt entweder it (wenn DB konfiguriert) oder it.skip zurück.
const captureUrl = process.env.DATABASE_URL_CAPTURE;
const captureIsConfigured = typeof captureUrl === 'string' && captureUrl.startsWith('postgresql://');
const itIfCapture = captureIsConfigured ? it : it.skip;

// Hilfsfunktion: Prisma-Client mit Capture-Rolle.
// Wir injizieren die alternative DATABASE_URL nur in diesen Tests, damit
// der globale Prisma-Singleton aus server/db.ts unbeeinflusst bleibt.
function makeCapturePrisma() {
    return new PrismaClient({
        datasources: { db: { url: captureUrl } },
    });
}

// Pattern, das Postgres bei Permission-Denied wirft.
// Prisma serialisiert das als P2010 oder P2025 mit Substring "permission denied".
const PERMISSION_DENIED_PATTERN = /permission denied|insufficient privilege|P201[0-9]/i;

describe('C2 — Postgres-Rollen Capture: Class-IIa-Schreib-Restriktionen', () => {
    let capturePrisma: PrismaClient | null = null;

    beforeAll(() => {
        if (!captureIsConfigured) {
            console.warn('[db-role-permissions.test] DATABASE_URL_CAPTURE nicht gesetzt — Tests werden übersprungen.');
            return;
        }
        capturePrisma = makeCapturePrisma();
    });

    afterAll(async () => {
        if (capturePrisma) {
            await capturePrisma.$disconnect();
        }
    });

    // ── 1) Class-IIa-Tabellen sind für Capture verboten (INSERT) ──────────
    itIfCapture('lehnt INSERT in TherapyPlan ab', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        await expect(
            capturePrisma.$executeRawUnsafe(
                `INSERT INTO "TherapyPlan" (id, "patientId", "createdAt") VALUES ($1, $2, NOW())`,
                crypto.randomUUID(),
                'fake-patient-id',
            ),
        ).rejects.toThrow(PERMISSION_DENIED_PATTERN);
    });

    itIfCapture('lehnt INSERT in ClinicalAlert ab', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        await expect(
            capturePrisma.$executeRawUnsafe(
                `INSERT INTO "ClinicalAlert" (id, "sessionId", severity, category, title, message, "triggerRule", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                crypto.randomUUID(),
                'fake-session-id',
                'WARNING',
                'TEST',
                'test',
                'test message',
                'test-rule',
            ),
        ).rejects.toThrow(PERMISSION_DENIED_PATTERN);
    });

    itIfCapture('lehnt INSERT in TriageEvent ab', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        await expect(
            capturePrisma.$executeRawUnsafe(
                `INSERT INTO "TriageEvent" (id, "sessionId", level, "atomId", message, "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
                crypto.randomUUID(),
                'fake-session-id',
                'CRITICAL',
                '0001',
                'test',
            ),
        ).rejects.toThrow(PERMISSION_DENIED_PATTERN);
    });

    itIfCapture('lehnt INSERT in TherapyMeasure ab', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        await expect(
            capturePrisma.$executeRawUnsafe(
                `INSERT INTO "TherapyMeasure" (id, "planId", description, "createdAt") VALUES ($1, $2, $3, NOW())`,
                crypto.randomUUID(),
                'fake-plan-id',
                'test',
            ),
        ).rejects.toThrow(PERMISSION_DENIED_PATTERN);
    });

    // ── 2) UPDATE auf Class-IIa-Tabellen muss ebenfalls scheitern ──────────
    itIfCapture('lehnt UPDATE in TherapyPlan ab', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        await expect(
            capturePrisma.$executeRawUnsafe(
                `UPDATE "TherapyPlan" SET "updatedAt" = NOW() WHERE id = $1`,
                'any-id',
            ),
        ).rejects.toThrow(PERMISSION_DENIED_PATTERN);
    });

    // ── 3) DELETE auf Class-IIa-Tabellen muss scheitern ──────────────────
    itIfCapture('lehnt DELETE in ClinicalAlert ab', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        await expect(
            capturePrisma.$executeRawUnsafe(
                `DELETE FROM "ClinicalAlert" WHERE id = $1`,
                'any-id',
            ),
        ).rejects.toThrow(PERMISSION_DENIED_PATTERN);
    });
});

describe('C2 — Postgres-Rollen Capture: erlaubte Capture-Operationen', () => {
    let capturePrisma: PrismaClient | null = null;

    beforeAll(() => {
        if (!captureIsConfigured) return;
        capturePrisma = makeCapturePrisma();
    });

    afterAll(async () => {
        if (capturePrisma) {
            await capturePrisma.$disconnect();
        }
    });

    // SELECT auf alle Tabellen muss funktionieren (Capture liest auch Class-IIa-Tabellen).
    itIfCapture('erlaubt SELECT auf TherapyPlan', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        // Kein expect(... .rejects). Wir erwarten, dass es nicht wirft.
        await capturePrisma.$queryRawUnsafe(`SELECT count(*) FROM "TherapyPlan"`);
    });

    itIfCapture('erlaubt SELECT auf ClinicalAlert', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        await capturePrisma.$queryRawUnsafe(`SELECT count(*) FROM "ClinicalAlert"`);
    });

    // INSERT in Capture-Tabelle muss funktionieren.
    itIfCapture('erlaubt INSERT in Patient (Capture-Tabelle)', async () => {
        if (!capturePrisma) throw new Error('Setup fehlt');
        const testId = crypto.randomUUID();
        try {
            // Wir versuchen ein dünnes Insert. Wenn die Tabelle Pflicht-FK auf Tenant hat,
            // bekommen wir einen FK-Fehler (P2003), nicht permission-denied — beide
            // Akzeptanz-Pfade sind ok, denn beide beweisen, dass die ROLE selbst nicht
            // blockiert hat.
            await capturePrisma.$executeRawUnsafe(
                `INSERT INTO "Patient" (id, "tenantId", "createdAt") VALUES ($1, $2, NOW())`,
                testId,
                'non-existent-tenant',
            );
        } catch (err: any) {
            const msg = String(err?.message ?? err);
            // OK: Permission-Denied wäre der schlechte Fall. FK-Fehler ist ok.
            expect(msg).not.toMatch(PERMISSION_DENIED_PATTERN);
        } finally {
            // Aufräumen, falls der Insert doch durchging (z. B. Test-Tenant existiert)
            try {
                await capturePrisma.$executeRawUnsafe(
                    `DELETE FROM "Patient" WHERE id = $1`,
                    testId,
                );
            } catch {
                // Tabellen-spezifischer DELETE-Reject ist hier ok — wir testen nicht DELETE.
            }
        }
    });
});

describe('C2 — Setup-Status', () => {
    it('zeigt Setup-Status', () => {
        if (captureIsConfigured) {
            console.log('[db-role-permissions.test] DATABASE_URL_CAPTURE konfiguriert — alle Tests werden ausgeführt.');
        } else {
            console.log('[db-role-permissions.test] DATABASE_URL_CAPTURE nicht gesetzt — Permission-Tests werden übersprungen. Setup: prisma/sql/01_postgres_roles.sql ausführen + ENV setzen.');
        }
        // Dieser Test passt immer — er dient nur der Sichtbarkeit.
        expect(true).toBe(true);
    });
});
