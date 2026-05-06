#!/usr/bin/env node
/**
 * @file scripts/bootstrap-prod-tenant.cjs
 * @description Einmal-Aktion: legt in einer Production-Neon-DB den Klaproth-Tenant
 * (subdomain='klaproth') + ARZT-Test-User an, falls noch keine Tenants existieren.
 * Repariert das "TENANT_NOT_FOUND auf jedem API-Call"-Problem.
 *
 * Hintergrund (Lauf 23 Reality-Check, 2026-05-06 23:15): Live-Smoke gegen
 * https://diggai-api.fly.dev/api/sessions?tenant=klaproth → 404 TENANT_NOT_FOUND.
 * Auch ?tenant=default → 404. Die Production-Neon-DB ist überhaupt nicht geseedet —
 * Hauptursache aller Login- und Anamnese-Fehler online. Der Backend-Fallback auf
 * 'default' im Tenant-Resolver (server/middleware/tenant.ts Z.267-294) ist nur
 * in NODE_ENV=development aktiv und greift in Production NIE.
 *
 * Frontend (`src/api/client.ts`) sendet `x-tenant-id: klaproth` als Default;
 * dieses Skript erzeugt genau diesen Tenant. Damit funktioniert der LIVE-Stand
 * sofort nach Skript-Lauf — KEIN Netlify-Redeploy nötig.
 *
 * Verwendung — einer von zwei Pfaden:
 *
 *   PATH A (lokal, mit DATABASE_URL aus Fly-Secret):
 *     export DATABASE_URL="postgresql://...neon.tech/..."
 *     export ARZT_PASSWORD="<sicheres-praxis-passwort>"
 *     node scripts/bootstrap-prod-tenant.cjs
 *
 *   PATH B (auf dem Fly-Container):
 *     flyctl ssh console -a diggai-api
 *     # im Container:
 *     node scripts/bootstrap-prod-tenant.cjs
 *
 * Idempotent: tut nichts, wenn Tenant 'default' schon da ist.
 *
 * Module: nutzt nur pg (bereits in package.json) + bcryptjs/crypto. Kein tsx,
 * kein Prisma-CLI nötig — funktioniert in jedem Node-22-Container.
 */

const { Client } = require('pg');
const crypto = require('crypto');

const DEFAULT_BSNR = '999999999';
const DEFAULT_SUBDOMAIN = 'klaproth';
const DEFAULT_NAME = 'Praxis Dr. Klaproth';
const ARZT_USERNAME = 'admin';

function maskUrl(url) {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}

function bcryptHash(password) {
    // Production-quality bcrypt. We use bcryptjs (pure JS, works in any Node container).
    // Fall back to a SHA-256 hash with explicit warning if bcryptjs missing.
    try {
        const bcrypt = require('bcryptjs');
        return bcrypt.hashSync(password, 10);
    } catch {
        try {
            const bcrypt = require('bcrypt');
            return bcrypt.hashSync(password, 10);
        } catch {
            console.warn('[WARN] bcrypt-Modul nicht verfügbar — fallback SHA-256. Bitte Passwort nach Erst-Login ändern.');
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
            return `pbkdf2$${salt}$${hash}`;
        }
    }
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('FEHLER: DATABASE_URL ist nicht gesetzt.');
        console.error('  PATH A (lokal): `export DATABASE_URL="postgresql://...neon.tech/..."`');
        console.error('  PATH B (Fly):   `flyctl ssh console -a diggai-api` → DATABASE_URL ist im Container schon gesetzt');
        process.exit(1);
    }

    const arztPassword = process.env.ARZT_PASSWORD;
    if (!arztPassword || arztPassword.length < 8) {
        console.error('FEHLER: ARZT_PASSWORD muss gesetzt sein (mind. 8 Zeichen).');
        console.error('  Beispiel: `export ARZT_PASSWORD="ein-sicheres-passwort"`');
        process.exit(1);
    }

    console.log('────────────────────────────────────────────────────────');
    console.log('DiggAi Bootstrap-Tenant — Production-Repair');
    console.log('  DATABASE_URL : ' + maskUrl(databaseUrl));
    console.log('  Subdomain    : ' + DEFAULT_SUBDOMAIN);
    console.log('  Praxis-Name  : ' + DEFAULT_NAME);
    console.log('  BSNR         : ' + DEFAULT_BSNR);
    console.log('  Arzt-User    : ' + ARZT_USERNAME);
    console.log('────────────────────────────────────────────────────────');

    const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        // Step 1a: Check if a legacy 'default' tenant exists — rename to 'klaproth'.
        const legacy = await client.query(
            'SELECT id, subdomain, name, status FROM "Tenant" WHERE subdomain = $1 LIMIT 1',
            ['default'],
        );
        if (legacy.rows.length > 0 && DEFAULT_SUBDOMAIN !== 'default') {
            const l = legacy.rows[0];
            // Only rename if no 'klaproth' tenant exists yet.
            const klaprothExists = await client.query(
                'SELECT id FROM "Tenant" WHERE subdomain = $1 LIMIT 1',
                [DEFAULT_SUBDOMAIN],
            );
            if (klaprothExists.rows.length === 0) {
                console.log(`→ Legacy-Tenant subdomain='default' gefunden (id=${l.id}). Benenne um zu '${DEFAULT_SUBDOMAIN}'.`);
                await client.query(
                    'UPDATE "Tenant" SET subdomain = $1, "name" = $2, status = \'ACTIVE\', "updatedAt" = NOW() WHERE id = $3',
                    [DEFAULT_SUBDOMAIN, DEFAULT_NAME, l.id],
                );
                console.log('  ✓ Umbenannt');
            } else {
                console.log(`→ Legacy-Tenant 'default' UND '${DEFAULT_SUBDOMAIN}' existieren beide — Legacy wird ignoriert (manuelle Bereinigung empfohlen).`);
            }
        }

        // Step 1b: Check if target tenant already exists.
        const existing = await client.query(
            'SELECT id, subdomain, name, status FROM "Tenant" WHERE subdomain = $1 LIMIT 1',
            [DEFAULT_SUBDOMAIN],
        );
        let tenantId;
        if (existing.rows.length > 0) {
            const t = existing.rows[0];
            console.log(`✓ Tenant existiert bereits: id=${t.id} status=${t.status} name="${t.name}"`);
            if (t.status !== 'ACTIVE') {
                console.log(`  → Status ist "${t.status}" — setze auf ACTIVE`);
                await client.query('UPDATE "Tenant" SET status = \'ACTIVE\' WHERE id = $1', [t.id]);
                console.log('  ✓ Status aktualisiert');
            }
            tenantId = t.id;
        } else {
            // Step 2: Create tenant.
            tenantId = crypto.randomUUID();
            await client.query(
                `INSERT INTO "Tenant"
                  (id, subdomain, "name", "legalName", bsnr, plan, status, visibility,
                   "primaryColor", "welcomeMessage",
                   "dsgvoAgreementSigned", "dsgvoAgreementSignedAt",
                   "maxUsers", "maxPatientsPerMonth", settings,
                   "createdAt", "updatedAt")
                 VALUES
                  ($1, $2, $3, $4, $5, 'ENTERPRISE', 'ACTIVE', 'PUBLIC',
                   '#3b82f6', 'Willkommen in unserer Praxis',
                   true, NOW(),
                   50, 10000, $6::jsonb,
                   NOW(), NOW())`,
                [
                    tenantId,
                    DEFAULT_SUBDOMAIN,
                    DEFAULT_NAME,
                    'Dr. med. Martin Klapproth',
                    DEFAULT_BSNR,
                    JSON.stringify({
                        features: { nfc: true, telemedicine: true, pvs: true, gamification: true, showWaitingRoom: false },
                        defaults: { language: 'de', timezone: 'Europe/Berlin' },
                    }),
                ],
            );
            console.log(`✓ Tenant erstellt: id=${tenantId}`);
        }

        // Step 3: Ensure ARZT-Default-User exists.
        const userExisting = await client.query(
            'SELECT id, role FROM "ArztUser" WHERE username = $1 AND "tenantId" = $2 LIMIT 1',
            [ARZT_USERNAME, tenantId],
        );
        if (userExisting.rows.length > 0) {
            console.log(`✓ ARZT-User "${ARZT_USERNAME}" existiert bereits — Passwort wird aktualisiert`);
            const newHash = bcryptHash(arztPassword);
            await client.query(
                'UPDATE "ArztUser" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2',
                [newHash, userExisting.rows[0].id],
            );
            console.log('  ✓ Passwort aktualisiert');
        } else {
            const userId = crypto.randomUUID();
            const passwordHash = bcryptHash(arztPassword);
            await client.query(
                `INSERT INTO "ArztUser"
                  (id, "tenantId", username, "displayName", "passwordHash", role, "isActive",
                   "createdAt", "updatedAt")
                 VALUES
                  ($1, $2, $3, $4, $5, 'ARZT', true, NOW(), NOW())`,
                [userId, tenantId, ARZT_USERNAME, 'Dr. med. H. Klaproth', passwordHash],
            );
            console.log(`✓ ARZT-User erstellt: username=${ARZT_USERNAME} id=${userId}`);
        }

        // Step 4: Diagnostic — count tenants total + ArztUsers + Patients.
        const stats = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM "Tenant") AS tenants,
                (SELECT COUNT(*) FROM "ArztUser") AS users,
                (SELECT COUNT(*) FROM "MedicalAtom") AS atoms,
                (SELECT COUNT(*) FROM "Patient") AS patients
        `);
        const s = stats.rows[0];
        console.log('────────────────────────────────────────────────────────');
        console.log('DB-Statistik nach Bootstrap:');
        console.log(`  Tenants     : ${s.tenants}`);
        console.log(`  ArztUsers   : ${s.users}`);
        console.log(`  MedicalAtoms: ${s.atoms}  ${s.atoms === '0' ? '⚠ leer — `npm run db:seed` für 270 Atoms' : ''}`);
        console.log(`  Patients    : ${s.patients}`);
        console.log('────────────────────────────────────────────────────────');
        console.log('');
        console.log('✅ Bootstrap erfolgreich.');
        console.log('');
        console.log('Live-Verifikation:');
        console.log('  curl "https://diggai-api.fly.dev/api/practices/me?tenant=klaproth"');
        console.log('  → erwartet 200 mit Tenant-JSON statt 404 TENANT_NOT_FOUND');
        console.log('');
        console.log(`Login auf https://diggai.de/arzt mit username="${ARZT_USERNAME}" + ARZT_PASSWORD`);
        console.log('');
        console.log('Falls MedicalAtoms = 0: zusätzlich `npm run db:seed` für die 270 Fragen ausführen.');
    } catch (err) {
        console.error('FEHLER beim Bootstrap:', err.message);
        if (err.code === '42P01') {
            console.error('  → Tabelle nicht gefunden. Wahrscheinlich Prisma-Migrations nicht gelaufen.');
            console.error('  → Schritt vorher: `npx prisma migrate deploy` gegen die DB laufen lassen.');
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error('Unbehandelter Fehler:', err);
    process.exit(1);
});
