/**
 * seed-testdata.ts — DiggAI Testdaten-Generator v1.0
 *
 * Erstellt vollständige, 100 % fiktive Testdaten für alle Rollen & Szenarien:
 *   • 3 benannte  + 30 nummerierte ADMIN-Accounts  (admin.super, admin.readonly, admin.billing, admin01–admin30)
 *   • 2 benannte  + 30 nummerierte ARZT-Accounts   (dr.klaproth, dr.notfall, arzt01–arzt30)
 *   • 1 benannte  + 30 nummerierte MFA-Accounts    (mfa.lead, mfa01–mfa30)
 *   • 30 fiktive Patienten P-20001–P-20030
 *     – 8 ACTIVE im Warteraum (Queue)
 *     – 8 COMPLETED (abgeschlossen)
 *     – 7 SUBMITTED (eingereicht)
 *     – 4 CRITICAL Triage (ACS / Suizidalität / Schlaganfall / SAH)
 *     – 3 WARNING Triage  (Blutdruckkrise / Synkope / Diabetischer Fuß)
 *
 * ⚠️  AUSSCHLIESSLICH für Entwicklung / Staging!
 *     NIEMALS echte PHI-Daten in diese Umgebung laden!
 *
 * Ausführen:
 *   npx tsx prisma/seed-testdata.ts
 *   npm run db:seed:test
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { fakerDE as faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });
dotenv.config();

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HASH_SALT = 'diggai-testdata-seed-salt-2026';
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const hashEmail = (email: string) => sha256(email + HASH_SALT);
/** Placeholder "encryption" for seed — base64 only, not AES. */
const encryptName = (name: string) => Buffer.from(name).toString('base64');
const pick = <T>(arr: T[]): T => arr[faker.number.int({ min: 0, max: arr.length - 1 })];

// ─── Test Credentials (DEVELOPMENT ONLY) ─────────────────────────────────────

const PASSWORDS = {
    ADMIN: 'Admin@2026!',
    ARZT: 'Arzt@2026!',
    MFA: 'Mfa@2026!',
} as const;

const PIN = '1234';

// ─── Tenant ───────────────────────────────────────────────────────────────────

const TENANT_SUBDOMAIN = 'testdata';

// ─── Services (must match frontend selectedService values) ────────────────────

const SERVICES = [
    'Termin / Anamnese',
    'Medikamente / Rezepte',
    'AU (Krankschreibung)',
    'Überweisung',
    'Dateien / Befunde',
    'Telefonanfrage',
    'Nachricht schreiben',
] as const;

// ─── Named Staff (special scenario accounts) ─────────────────────────────────

interface StaffSeed {
    username: string;
    displayName: string;
    role: 'ADMIN' | 'ARZT' | 'MFA';
    note: string;
}

const NAMED_STAFF: StaffSeed[] = [
    { username: 'admin.super',    displayName: 'Super Admin',               role: 'ADMIN', note: 'Vollzugriff — alle Admin-Features & Benutzerverwaltung' },
    { username: 'admin.readonly', displayName: 'Read-Only Admin',           role: 'ADMIN', note: 'Nur-Lese-Szenario' },
    { username: 'admin.billing',  displayName: 'Abrechnungs-Admin',         role: 'ADMIN', note: 'Abrechnung & Reports' },
    { username: 'dr.klaproth',    displayName: 'Dr. med. H. Klaproth',      role: 'ARZT',  note: 'Leitender Arzt — viele Patienten zugewiesen' },
    { username: 'dr.notfall',     displayName: 'Dr. med. U. Bergmann',      role: 'ARZT',  note: 'Notfall-Szenarien — CRITICAL/WARNING Triage-Demo' },
    { username: 'mfa.lead',       displayName: 'Sandra Meier (MFA-Lead)',   role: 'MFA',   note: 'Warteraum-Manager — Queue & Chat Demo' },
];

// ─── Doctor title + specialty pool ───────────────────────────────────────────

const TITLES = ['Dr. med.', 'Prof. Dr. med.', 'Dr. med. (univ.)', 'Dr.', 'Dr. med. dent.'];

// ─── Triage Scenarios ─────────────────────────────────────────────────────────

interface TriageScenario {
    level: 'CRITICAL' | 'WARNING';
    atomId: string;
    triggerValues: string;
    message: string;
}

const CRITICAL_SCENARIOS: TriageScenario[] = [
    {
        level: 'CRITICAL',
        atomId: '1002',
        triggerValues: JSON.stringify(['brust', 'atemnot']),
        message: 'SOFORT: Brustschmerzen + Atemnot — V.a. ACS. EKG + Troponin + Notarzt erforderlich!',
    },
    {
        level: 'CRITICAL',
        atomId: '7010',
        triggerValues: JSON.stringify(['suizid_gedanken']),
        message: 'ACHTUNG: Suizidgedanken geäußert — sofortiger Arzt-Kontakt & psychiatrische Krisenintervention!',
    },
    {
        level: 'CRITICAL',
        atomId: '1002',
        triggerValues: JSON.stringify(['laehmung']),
        message: 'SOFORT: Lähmungserscheinungen + Sprachstörung — V.a. Schlaganfall. Notruf 112 sofort!',
    },
    {
        level: 'CRITICAL',
        atomId: '1002',
        triggerValues: JSON.stringify(['kopf']),
        message: 'SOFORT: Vernichtungskopfschmerz — V.a. Subarachnoidalblutung (SAH). Sofort CT + Neurochirurgie!',
    },
];

const WARNING_SCENARIOS: TriageScenario[] = [
    {
        level: 'WARNING',
        atomId: '4120',
        triggerValues: JSON.stringify(['hochdruck']),
        message: 'WARNUNG: Blutdruckkrise (>180/110 mmHg gemeldet) — engmaschige Überwachung, ggf. i.v.-Therapie.',
    },
    {
        level: 'WARNING',
        atomId: '1002',
        triggerValues: JSON.stringify(['schwindel', 'synkope']),
        message: 'WARNUNG: Synkope / Schwindel mit Sturz gemeldet — kardiologische Abklärung empfohlen.',
    },
    {
        level: 'WARNING',
        atomId: '5003',
        triggerValues: JSON.stringify(['fusssyndrom']),
        message: 'WARNUNG: Diabetisches Fußsyndrom — Wundversorgung und Diabetologen-Konsil erforderlich.',
    },
];

// ─── Sample chat messages ─────────────────────────────────────────────────────

const CHAT_PAIRS: [string, string][] = [
    ['Guten Tag, ich habe seit heute früh starke Bauchschmerzen und mir ist übel.', 'Bitte beschreiben Sie die Schmerzen: Wo genau, wie stark (1–10) und seit wann?'],
    ['Ich brauche ein neues Rezept für mein Metformin 1000 mg.', 'Können Sie uns Ihre aktuelle Dosierung und den ausstellenden Arzt mitteilen?'],
    ['Mein Kind hat seit zwei Tagen Fieber über 39 °C. Wann kann ich einen Termin bekommen?', 'Für Kinder mit Fieber haben wir täglich Akuttermine. Wie alt ist Ihr Kind?'],
    ['Ich benötige eine Krankmeldung — ich habe seit Montag Erkältungssymptome.', 'Seit wann haben Sie die Symptome und haben Sie Fieber gemessen?'],
    ['Können Sie mir sagen, ob meine Blutwerte vom letzten Mal in Ordnung waren?', 'Die Ergebnisse sind größtenteils unauffällig. Der Arzt bespricht diese gerne beim nächsten Termin.'],
    ['Ich habe starken Schwindel und mein Blutdruck ist zu Hause sehr hoch — 195/112.', 'Bitte kommen Sie SOFORT in die Praxis oder rufen Sie uns an: 040-123456.'],
    ['Ich möchte eine Überweisung zum Kardiologen beantragen.', 'Für eine Überweisung benötigen wir Ihre aktuellen Beschwerden. Bitte kurz beschreiben.'],
    ['Gibt es noch freie Termine für nächste Woche?', 'Ja, wir haben noch Termine am Dienstag 9:30 Uhr und Donnerstag 14:15 Uhr. Passt einer davon?'],
    ['Ich habe gestern meine Medikamente vergessen — ist das schlimm?', 'Das kommt auf das Medikament an. Welches Präparat nehmen Sie und in welcher Dosierung?'],
    ['Mein Rezept für Ramipril ist abgelaufen. Kann ich es telefonisch erneuern?', 'Ja, bei bekannten Bestandspatienten ist das möglich. Wir rufen Sie heute Nachmittag zurück.'],
];

// ─── Cleanup (idempotent re-run support) ─────────────────────────────────────

async function cleanupTestTenant(): Promise<void> {
    const existing = await prisma.tenant.findUnique({ where: { subdomain: TENANT_SUBDOMAIN } });
    if (!existing) return;

    const tenantId = existing.id;
    console.log('  ↩  Bestehende Testdaten werden bereinigt...');

    // 1. Null out ArztUser FK on sessions to avoid RESTRICT on ArztUser delete
    await prisma.patientSession.updateMany({ where: { tenantId }, data: { assignedArztId: null } });

    // 2. Delete sessions (cascades to: Answer, TriageEvent, ChatMessage, QueueEntry, AccidentDetails)
    await prisma.patientSession.deleteMany({ where: { tenantId } });

    // 3. Delete patients (cascades to: PatientMedication, PatientSurgery, Signature.SetNull)
    await prisma.patient.deleteMany({ where: { tenantId } });

    // 4. Delete staff
    await prisma.arztUser.deleteMany({ where: { tenantId } });

    // 5. Tenant-level cleanup
    await prisma.subscription.deleteMany({ where: { praxisId: tenantId } });
    await prisma.tenantTheme.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });

    console.log('  ✓ Bereinigung abgeschlossen');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log('\n🌱 DiggAI Testdaten-Seed v1.0');
    console.log('═'.repeat(60));

    faker.seed(42); // Reproducible Faker data across runs

    // ── Step 1: Hash passwords (once per role) ────────────────────────────────
    console.log('\n🔐 Generiere Passwort-Hashes...');
    const [adminHash, arztHash, mfaHash, pinHash] = await Promise.all([
        bcrypt.hash(PASSWORDS.ADMIN, 12),
        bcrypt.hash(PASSWORDS.ARZT, 12),
        bcrypt.hash(PASSWORDS.MFA, 12),
        bcrypt.hash(PIN, 10),
    ]);
    console.log('  ✓ 4 Hashes generiert (Admin / Arzt / MFA / PIN)');

    // ── Step 2: Cleanup + create Tenant ──────────────────────────────────────
    console.log('\n🏥 Erstelle Testpraxis-Tenant...');
    await cleanupTestTenant();

    const tenant = await prisma.tenant.create({
        data: {
            subdomain: TENANT_SUBDOMAIN,
            name: 'DiggAI Testpraxis',
            legalName: 'DiggAI Testpraxis GmbH — NUR FÜR ENTWICKLUNG',
            plan: 'ENTERPRISE',
            status: 'ACTIVE',
            visibility: 'INTERNAL',
            primaryColor: '#6366f1',
            welcomeMessage: '⚠️ TESTPRAXIS — Alle Daten sind 100 % fiktiv!',
            maxUsers: 200,
            maxPatientsPerMonth: 99999,
            storageLimitMB: 102400,
            dsgvoAgreementSigned: true,
            dsgvoAgreementSignedAt: new Date('2026-01-01'),
            dataRegion: 'de',
            settings: JSON.stringify({ isTestTenant: true, devNote: 'TESTDATA ONLY – NO REAL PHI' }),
        },
    });
    console.log(`  ✓ Tenant: ${tenant.name} [ENTERPRISE] — subdomain: ${tenant.subdomain}`);

    // ── Step 3: Subscription ──────────────────────────────────────────────────
    await prisma.subscription.create({
        data: {
            praxisId: tenant.id,
            tier: 'ENTERPRISE',
            status: 'ACTIVE',
            aiQuotaUsed: 0,
            aiQuotaTotal: 999999,
            endsAt: new Date('2030-12-31'),
        },
    });

    // ── Step 4: Named primary staff accounts ─────────────────────────────────
    console.log('\n👤 Erstelle benannte Staff-Accounts (6)...');
    const namedUserIds: Record<string, string> = {};

    for (const s of NAMED_STAFF) {
        const pwHash = s.role === 'ADMIN' ? adminHash : s.role === 'ARZT' ? arztHash : mfaHash;
        const user = await prisma.arztUser.create({
            data: {
                tenantId: tenant.id,
                username: s.username,
                passwordHash: pwHash,
                pinHash,
                displayName: s.displayName,
                role: s.role,
                loginCount: faker.number.int({ min: 50, max: 600 }),
                lastLoginAt: new Date(),
                isActive: true,
            },
        });
        namedUserIds[s.username] = user.id;
        console.log(`  ✓ [${s.role}] ${s.username.padEnd(16)} → ${s.displayName}`);
    }

    // ── Step 5: 30 ADMIN accounts ─────────────────────────────────────────────
    console.log('\n👥 Erstelle 30 Admin-Accounts (admin01–admin30)...');
    await prisma.arztUser.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
            tenantId: tenant.id,
            username: `admin${String(i + 1).padStart(2, '0')}`,
            passwordHash: adminHash,
            pinHash,
            displayName: `${faker.person.lastName()}, ${faker.person.firstName()} (Admin)`,
            role: 'ADMIN',
            loginCount: faker.number.int({ min: 0, max: 80 }),
            isActive: true,
        })),
    });
    console.log('  ✓ admin01–admin30 erstellt');

    // ── Step 6: 30 ARZT accounts (need individual IDs for patient assignment) ─
    console.log('\n👨‍⚕️ Erstelle 30 Arzt-Accounts (arzt01–arzt30)...');
    const arztIds: string[] = [namedUserIds['dr.klaproth'], namedUserIds['dr.notfall']];

    for (let i = 1; i <= 30; i++) {
        const title = pick(TITLES);
        const sex: 'male' | 'female' = faker.datatype.boolean() ? 'male' : 'female';
        const user = await prisma.arztUser.create({
            data: {
                tenantId: tenant.id,
                username: `arzt${String(i).padStart(2, '0')}`,
                passwordHash: arztHash,
                pinHash,
                displayName: `${title} ${faker.person.firstName(sex)} ${faker.person.lastName()}`,
                role: 'ARZT',
                loginCount: faker.number.int({ min: 10, max: 350 }),
                lastLoginAt: faker.date.recent({ days: 14 }),
                isActive: true,
            },
        });
        arztIds.push(user.id);
    }
    console.log('  ✓ arzt01–arzt30 erstellt');

    // ── Step 7: 30 MFA accounts ───────────────────────────────────────────────
    console.log('\n💊 Erstelle 30 MFA-Accounts (mfa01–mfa30)...');
    await prisma.arztUser.createMany({
        data: Array.from({ length: 30 }, (_, i) => {
            const sex: 'male' | 'female' = faker.datatype.boolean({ probability: 0.75 }) ? 'female' : 'male';
            return {
                tenantId: tenant.id,
                username: `mfa${String(i + 1).padStart(2, '0')}`,
                passwordHash: mfaHash,
                pinHash,
                displayName: `${faker.person.firstName(sex)} ${faker.person.lastName()} (MFA)`,
                role: 'MFA',
                loginCount: faker.number.int({ min: 20, max: 500 }),
                isActive: true,
            };
        }),
    });
    console.log('  ✓ mfa01–mfa30 erstellt');

    // ── Step 8: 30 Patients + Sessions ────────────────────────────────────────
    console.log('\n🏥 Erstelle 30 Patienten mit Sessions...');

    /**
     * Slot distribution (total = 30):
     *   8  ACTIVE  (regular waiting room)
     *   8  COMPLETED
     *   7  SUBMITTED
     *   4  ACTIVE + CRITICAL triage
     *   3  ACTIVE + WARNING  triage
     */
    type SlotType = 'ACTIVE' | 'COMPLETED' | 'SUBMITTED' | 'CRITICAL' | 'WARNING';
    const SLOT_DISTRIBUTION: SlotType[] = [
        'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',        // 8
        'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', // 8
        'SUBMITTED', 'SUBMITTED', 'SUBMITTED', 'SUBMITTED', 'SUBMITTED', 'SUBMITTED', 'SUBMITTED', // 7
        'CRITICAL', 'CRITICAL', 'CRITICAL', 'CRITICAL',                                            // 4
        'WARNING', 'WARNING', 'WARNING',                                                            // 3
    ];

    const INSURANCE_POOL = ['GKV', 'GKV', 'GKV', 'PKV', 'PKV', 'Selbstzahler'] as const;
    const GENDER_POOL = ['M', 'M', 'W', 'W', 'W', 'D'] as const;

    let queuePos = 1;

    for (let i = 0; i < 30; i++) {
        const slot = SLOT_DISTRIBUTION[i];
        const isCritical = slot === 'CRITICAL';
        const isWarning = slot === 'WARNING';
        const sessionStatus = (isCritical || isWarning) ? 'ACTIVE' : slot;

        const gender = GENDER_POOL[i % GENDER_POOL.length];
        const sex: 'male' | 'female' = gender === 'M' ? 'male' : 'female';
        const firstName = faker.person.firstName(sex);
        const lastName = faker.person.lastName();
        const fullName = `${firstName} ${lastName}`;
        const email = `testpatient${i + 1}@testpraxis.dev`;
        const birthDate = faker.date.birthdate({ min: 18, max: 82, mode: 'age' });
        const insurance = INSURANCE_POOL[i % INSURANCE_POOL.length];
        const service = SERVICES[i % SERVICES.length];
        const isNewPatient = i < 20;
        const patientNumber = `P-2${String(i + 1).padStart(4, '0')}`;

        // Assign dr.klaproth to first 10, dr.notfall to critical/warning, others spread
        let assignedArztId: string;
        if (isCritical || isWarning) {
            assignedArztId = namedUserIds['dr.notfall'];
        } else if (i < 10) {
            assignedArztId = namedUserIds['dr.klaproth'];
        } else {
            assignedArztId = arztIds[i % arztIds.length];
        }

        // Create Patient record
        const patient = await prisma.patient.create({
            data: {
                tenantId: tenant.id,
                hashedEmail: hashEmail(email),
                patientNumber,
                birthDate,
                gender,
                encryptedName: encryptName(fullName),
                versichertenArt: insurance === 'Selbstzahler' ? 'SZ' : insurance,
            },
        });

        // Create PatientSession
        const session = await prisma.patientSession.create({
            data: {
                tenantId: tenant.id,
                patientId: patient.id,
                isNewPatient,
                gender,
                birthDate,
                encryptedName: encryptName(fullName),
                status: sessionStatus,
                selectedService: service,
                insuranceType: insurance,
                assignedArztId,
                createdAt: faker.date.recent({ days: 7 }),
                completedAt: sessionStatus === 'COMPLETED' ? faker.date.recent({ days: 3 }) : undefined,
            },
        });

        // QueueEntry for ACTIVE sessions (including critical/warning)
        if (sessionStatus === 'ACTIVE') {
            const priority = isCritical ? 'EMERGENCY' : isWarning ? 'URGENT' : 'NORMAL';
            await prisma.queueEntry.create({
                data: {
                    sessionId: session.id,
                    patientName: encryptName(fullName),
                    service,
                    priority,
                    status: 'WAITING',
                    position: queuePos++,
                    joinedAt: faker.date.recent({ days: 0 }),
                    estimatedWaitMin: faker.number.int({ min: 5, max: 45 }),
                    entertainmentMode: 'AUTO',
                    deviceType: pick(['TABLET', 'MOBILE', 'DESKTOP']),
                },
            });
        }

        // TriageEvent for CRITICAL / WARNING
        if (isCritical) {
            const scenario = CRITICAL_SCENARIOS[i % CRITICAL_SCENARIOS.length];
            await prisma.triageEvent.create({
                data: {
                    sessionId: session.id,
                    level: scenario.level,
                    atomId: scenario.atomId,
                    triggerValues: scenario.triggerValues,
                    message: scenario.message,
                },
            });
        } else if (isWarning) {
            const scenario = WARNING_SCENARIOS[i % WARNING_SCENARIOS.length];
            await prisma.triageEvent.create({
                data: {
                    sessionId: session.id,
                    level: scenario.level,
                    atomId: scenario.atomId,
                    triggerValues: scenario.triggerValues,
                    message: scenario.message,
                },
            });
        }

        // Chat messages for first 10 patients
        if (i < 10) {
            const [patientText, mfaText] = CHAT_PAIRS[i % CHAT_PAIRS.length];
            await prisma.chatMessage.createMany({
                data: [
                    {
                        sessionId: session.id,
                        senderType: 'PATIENT',
                        fromName: fullName,
                        text: patientText,
                        timestamp: faker.date.recent({ days: 1 }),
                    },
                    {
                        sessionId: session.id,
                        senderType: 'MFA',
                        senderId: namedUserIds['mfa.lead'],
                        fromName: 'Sandra Meier (MFA-Lead)',
                        text: mfaText,
                        timestamp: faker.date.recent({ days: 1 }),
                    },
                ],
            });
        }

        // Dauermedikation für jeden 5. Patienten
        const MEDS = [
            { name: 'Metoprolol', dosage: '47.5 mg', frequency: '1-0-0' },
            { name: 'Ramipril', dosage: '5 mg', frequency: '1-0-1' },
            { name: 'ASS 100', dosage: '100 mg', frequency: '1-0-0' },
            { name: 'Metformin', dosage: '1000 mg', frequency: '1-0-1' },
            { name: 'Omeprazol', dosage: '20 mg', frequency: '0-1-0' },
            { name: 'Lisinopril', dosage: '10 mg', frequency: '1-0-0' },
        ];
        if (i % 5 === 0) {
            await prisma.patientMedication.create({
                data: {
                    patientId: patient.id,
                    name: MEDS[Math.floor(i / 5) % MEDS.length].name,
                    dosage: MEDS[Math.floor(i / 5) % MEDS.length].dosage,
                    frequency: MEDS[Math.floor(i / 5) % MEDS.length].frequency,
                    isActive: true,
                },
            });
        }

        if ((i + 1) % 10 === 0) {
            console.log(`  ✓ ${i + 1}/30 Patienten erstellt`);
        }
    }

    // ── Step 9: Print credentials table ──────────────────────────────────────
    const bar = '═'.repeat(64);
    console.log(`\n\n${bar}`);
    console.log('   DiggAI TESTDATEN — Zugangsdaten (Stand: April 2026)');
    console.log('   ⚠️  NUR FÜR ENTWICKLUNG — NIEMALS IN PRODUKTION NUTZEN!');
    console.log(bar);

    console.log(`
  🌐  Tenant     : ${TENANT_SUBDOMAIN}
  🔗  Login-URL  : http://localhost:5173  (Endpunkt hängt vom Setup ab)

  ─────────────────────────────────────────────────────────────
  👤  ADMIN-ACCOUNTS  —  Passwort: ${PASSWORDS.ADMIN}
  ─────────────────────────────────────────────────────────────
  admin.super     → Vollzugriff, alle Admin-Features
  admin.readonly  → Nur-Lese-Szenario
  admin.billing   → Abrechnung & Reports
  admin01–admin30 → Bulk-Test-Admins (30 Accounts)

  ─────────────────────────────────────────────────────────────
  👨‍⚕️  ARZT-ACCOUNTS  —  Passwort: ${PASSWORDS.ARZT}
  ─────────────────────────────────────────────────────────────
  dr.klaproth     → Leitender Arzt (Patienten P-20001–P-20010)
  dr.notfall      → Triage-Demo (4× CRITICAL, 3× WARNING)
  arzt01–arzt30   → Bulk-Test-Ärzte (30 Accounts)

  ─────────────────────────────────────────────────────────────
  💊  MFA-ACCOUNTS  —  Passwort: ${PASSWORDS.MFA}
  ─────────────────────────────────────────────────────────────
  mfa.lead        → Warteraum-Manager, Queue & Chat Demo
  mfa01–mfa30     → Bulk-Test-MFAs (30 Accounts)

  ─────────────────────────────────────────────────────────────
  🏥  PATIENTEN  —  P-20001 bis P-20030 (keine Login-Credentials)
  ─────────────────────────────────────────────────────────────
  P-20001–P-20008  8× ACTIVE   Warteraum (Queue-Positionen 1–8)
  P-20009–P-20016  8× COMPLETED  (Abgeschlossene Konsultationen)
  P-20017–P-20023  7× SUBMITTED  (Eingereicht, noch nicht gesehen)
  P-20024–P-20027  4× CRITICAL Triage (ACS / Suizid / Apoplex / SAH)
  P-20028–P-20030  3× WARNING  Triage (Blutdruckkrise / Synkope / DFS)
  Erste 10 Patienten: je 2 Chat-Nachrichten vorhanden
  Patienten P-20001, -20006, -20011, -20016, -20021, -20026: Dauermedikation

  ─────────────────────────────────────────────────────────────
  🔑  PIN für alle Kiosk-/Schnell-Logins: ${PIN}
  ─────────────────────────────────────────────────────────────
`);
    console.log(bar);
    console.log('\n✅ Seed abgeschlossen!\n');
}

main()
    .catch((e: Error) => {
        console.error('\n❌ Seed-Fehler:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
