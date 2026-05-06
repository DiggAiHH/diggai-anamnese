/**
 * @file prisma/bootstrap-prod.ts
 * @description Einmal-Aktion: legt in einer Production-Neon-DB den Klaproth-Tenant
 * (subdomain='klaproth') + ARZT-User an. Repariert das "TENANT_NOT_FOUND auf
 * jedem API-Call"-Problem (Lauf 23 Reality-Check, 2026-05-06).
 *
 * Hintergrund: Live-Smoke gegen `https://diggai-api.fly.dev/api/sessions?tenant=klaproth`
 * → 404 TENANT_NOT_FOUND. Auch ?tenant=default → 404. Production-Neon-DB hat
 * keinen Tenant. Backend-Fallback auf 'default' nur in NODE_ENV=development aktiv.
 *
 * Frontend (`src/api/client.ts`) sendet `x-tenant-id: klaproth` als Default;
 * dieses Skript erzeugt genau diesen Tenant. Live-Frontend funktioniert sofort
 * nach Skript-Lauf — KEIN Netlify-Redeploy nötig.
 *
 * Nutzung:
 *   PATH A (lokal):
 *     cd D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master
 *     # Neon-Connection-String aus Neon-Console (Settings → Connection Details)
 *     $env:DATABASE_URL="postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require"
 *     $env:ARZT_PASSWORD="dein-sicheres-passwort-min-8"
 *     npx tsx prisma/bootstrap-prod.ts
 *
 *   PATH B (auf dem Fly-Container):
 *     flyctl ssh console -a diggai-api
 *     # im Container — DATABASE_URL ist schon gesetzt:
 *     export ARZT_PASSWORD="dein-sicheres-passwort"
 *     cd /app
 *     npx tsx prisma/bootstrap-prod.ts
 *
 * Idempotent: bei wiederholtem Lauf werden existierende Tenants/User
 * upgedated, nicht doppelt erstellt.
 */

// Node 24 + ESM + Prisma 6: named-export interop is fragile, default-import is portabel.
import pkg from '@prisma/client';
import bcrypt from 'bcryptjs';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const TENANT_SUBDOMAIN = 'klaproth';
const TENANT_NAME = 'Praxis Dr. Klaproth';
const TENANT_LEGAL_NAME = 'Dr. med. Martin Klapproth';
const TENANT_BSNR = '999999999';
const ARZT_USERNAME = 'admin';
const ARZT_DISPLAY_NAME = 'Dr. med. H. Klaproth';

function maskUrl(url: string | undefined): string {
    if (!url) return '(unset)';
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    const arztPassword = process.env.ARZT_PASSWORD;

    if (!databaseUrl) {
        console.error('FEHLER: DATABASE_URL ist nicht gesetzt.');
        console.error('  Lokal:  $env:DATABASE_URL="postgresql://...neon.tech/..."');
        console.error('  Fly:    flyctl ssh console -a diggai-api  (DATABASE_URL ist im Container schon gesetzt)');
        process.exit(1);
    }
    if (!arztPassword || arztPassword.length < 8) {
        console.error('FEHLER: ARZT_PASSWORD muss gesetzt sein (mind. 8 Zeichen).');
        console.error('  $env:ARZT_PASSWORD="ein-sicheres-passwort"');
        process.exit(1);
    }

    console.log('────────────────────────────────────────────────────────');
    console.log('DiggAi Bootstrap-Production — Tenant + Arzt-Account');
    console.log('  DATABASE_URL : ' + maskUrl(databaseUrl));
    console.log('  Subdomain    : ' + TENANT_SUBDOMAIN);
    console.log('  Praxis-Name  : ' + TENANT_NAME);
    console.log('  BSNR         : ' + TENANT_BSNR);
    console.log('  Arzt-User    : ' + ARZT_USERNAME);
    console.log('────────────────────────────────────────────────────────');

    // Step 1: Legacy 'default' tenant umbenennen, falls vorhanden + 'klaproth' fehlt
    const legacyDefault = await prisma.tenant.findFirst({ where: { subdomain: 'default' } });
    const klaprothExists = await prisma.tenant.findFirst({ where: { subdomain: TENANT_SUBDOMAIN } });

    let tenant;
    if (legacyDefault && !klaprothExists) {
        console.log(`→ Legacy-Tenant subdomain='default' gefunden (id=${legacyDefault.id}). Benenne um zu '${TENANT_SUBDOMAIN}'.`);
        tenant = await prisma.tenant.update({
            where: { id: legacyDefault.id },
            data: {
                subdomain: TENANT_SUBDOMAIN,
                name: TENANT_NAME,
                status: 'ACTIVE',
                bsnr: TENANT_BSNR,
            },
        });
        console.log('  ✓ Umbenannt');
    } else if (klaprothExists) {
        console.log(`✓ Tenant '${TENANT_SUBDOMAIN}' existiert bereits (id=${klaprothExists.id}, status=${klaprothExists.status})`);
        // Immer Status + visibility sicherstellen (Production-Filter braucht visibility='PUBLIC')
        tenant = await prisma.tenant.update({
            where: { id: klaprothExists.id },
            data: { status: 'ACTIVE', visibility: 'PUBLIC', bsnr: TENANT_BSNR },
        });
        console.log(`  → status=ACTIVE, visibility=PUBLIC, bsnr=${TENANT_BSNR} sichergestellt`);
    } else {
        console.log(`→ Kein Tenant gefunden. Erstelle '${TENANT_SUBDOMAIN}'…`);
        tenant = await prisma.tenant.create({
            data: {
                subdomain: TENANT_SUBDOMAIN,
                name: TENANT_NAME,
                legalName: TENANT_LEGAL_NAME,
                bsnr: TENANT_BSNR,
                plan: 'ENTERPRISE',
                status: 'ACTIVE',
                visibility: 'PUBLIC',
                primaryColor: '#3b82f6',
                welcomeMessage: 'Willkommen in unserer Praxis',
                dsgvoAgreementSigned: true,
                dsgvoAgreementSignedAt: new Date(),
                maxUsers: 50,
                maxPatientsPerMonth: 10000,
                settings: {
                    features: {
                        nfc: true,
                        telemedicine: true,
                        pvs: true,
                        gamification: true,
                        showWaitingRoom: false,
                    },
                    defaults: { language: 'de', timezone: 'Europe/Berlin' },
                },
            },
        });
        console.log(`  ✓ Tenant erstellt: id=${tenant.id}`);
    }

    // Step 2: ARZT-User upsert
    const passwordHash = await bcrypt.hash(arztPassword, 10);
    const existingUser = await prisma.arztUser.findFirst({
        where: { username: ARZT_USERNAME, tenantId: tenant.id },
    });
    if (existingUser) {
        await prisma.arztUser.update({
            where: { id: existingUser.id },
            data: { passwordHash, isActive: true },
        });
        console.log(`✓ ARZT-User "${ARZT_USERNAME}" existierte — Passwort aktualisiert + auf isActive=true gesetzt.`);
    } else {
        const newUser = await prisma.arztUser.create({
            data: {
                tenantId: tenant.id,
                username: ARZT_USERNAME,
                displayName: ARZT_DISPLAY_NAME,
                passwordHash,
                role: 'ARZT',
                isActive: true,
            },
        });
        console.log(`✓ ARZT-User erstellt: username=${ARZT_USERNAME} id=${newUser.id}`);
    }

    // Step 3: Diagnose-Statistik
    const [tenantCount, userCount, atomCount, patientCount] = await Promise.all([
        prisma.tenant.count(),
        prisma.arztUser.count(),
        prisma.medicalAtom.count(),
        prisma.patient.count(),
    ]);

    console.log('────────────────────────────────────────────────────────');
    console.log('DB-Statistik nach Bootstrap:');
    console.log(`  Tenants     : ${tenantCount}`);
    console.log(`  ArztUsers   : ${userCount}`);
    console.log(`  MedicalAtoms: ${atomCount}  ${atomCount === 0 ? '⚠ leer — `npm run db:seed` für 270 Atoms' : ''}`);
    console.log(`  Patients    : ${patientCount}`);
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
    if (atomCount === 0) {
        console.log('⚠  MedicalAtoms = 0 → zusätzlich `npm run db:seed` ausführen für die 270 Fragen.');
    }
}

main()
    .catch((err) => {
        console.error('FEHLER beim Bootstrap:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
