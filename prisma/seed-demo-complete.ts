// @ts-nocheck
/**
 * seed-demo-complete.ts — DiggAI Vollständige Demo-Daten (30 Patienten)
 *
 * Deckt ALLE Interaktionsflows ab:
 *   • Neupatienten & Wiederkehrende Patienten
 *   • KRITISCH-Triage (ACS, SAH, Suizidalität, Synkope)
 *   • WARNING-Triage
 *   • Rezeptanforderung, AU-Schein, Überweisung
 *   • BG-Unfall (Arbeitsunfall)
 *   • Telemedizin-Konsultation
 *   • NFC Check-in
 *   • Selbstzahler / keine Krankenversicherung
 *   • PWA Patienten-Portal Login
 *   • Multilingual: ar, tr, pl, ru, es, uk, fa
 *   • Arzt-, MFA-, und Admin-Flows
 *
 * Ausführen: npx tsx prisma/seed-demo-complete.ts
 * Passwort aller Demo-Accounts: DiggAI2024!
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../server/.env' });
dotenv.config();

const prisma = new PrismaClient();

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const DEMO_PW = 'DiggAI2024!';

// ─────────────────────────────────────────────────────────────────
// TENANTS
// ─────────────────────────────────────────────────────────────────
const TENANT_HAUSARZT = {
  subdomain: 'demo-hausarzt',
  name: 'Hausarztpraxis Dr. Musterarzt',
  legalName: 'Dr. med. Klaus Musterarzt, Facharzt für Allgemeinmedizin',
  plan: 'STARTER' as const,
  status: 'ACTIVE' as const,
  primaryColor: '#2563eb',
  welcomeMessage: 'Willkommen in unserer Hausarztpraxis! Bitte füllen Sie den digitalen Fragebogen aus.',
  maxUsers: 5, maxPatientsPerMonth: 500, storageLimitMB: 1024,
  dsgvoAgreementSigned: true, dsgvoAgreementSignedAt: new Date('2024-01-15'), dataRegion: 'de',
};

const TENANT_KARDIO = {
  subdomain: 'demo-kardio',
  name: 'Kardiologische Praxis am Stadtpark',
  legalName: 'Prof. Dr. med. Herzmann & Partner GbR',
  plan: 'PROFESSIONAL' as const,
  status: 'ACTIVE' as const,
  primaryColor: '#dc2626',
  welcomeMessage: 'Herzlich willkommen in unserer kardiologischen Spezialpraxis. Ihre Herzgesundheit liegt uns am Herzen.',
  maxUsers: 15, maxPatientsPerMonth: 2000, storageLimitMB: 10240,
  dsgvoAgreementSigned: true, dsgvoAgreementSignedAt: new Date('2024-02-01'), dataRegion: 'de',
};

const TENANT_MVZ = {
  subdomain: 'demo-mvz',
  name: 'MVZ DiggAI Digital Health Center',
  legalName: 'DiggAI Medizinisches Versorgungszentrum GmbH',
  plan: 'ENTERPRISE' as const,
  status: 'ACTIVE' as const,
  primaryColor: '#7c3aed',
  welcomeMessage: 'Willkommen im MVZ DiggAI – KI-gestützte Medizin der Zukunft. Heute verfügbar.',
  maxUsers: 100, maxPatientsPerMonth: 10000, storageLimitMB: 102400,
  dsgvoAgreementSigned: true, dsgvoAgreementSignedAt: new Date('2024-03-01'), dataRegion: 'de',
};

// ─────────────────────────────────────────────────────────────────
// PATIENT DATA — 30 PATIENTS total (9 + 7 + 14)
// ─────────────────────────────────────────────────────────────────

/** TENANT 1 — Hausarzt (9 Patienten) */
const PATIENTS_T1 = [
  { email: 'max.schmidt@demo.de',     name: 'Schmidt, Max',      num: 'P-10001', birth: new Date('1965-03-14'), gender: 'M', lang: 'de' },
  { email: 'anna.bauer@demo.de',      name: 'Bauer, Anna',       num: 'P-10002', birth: new Date('1978-07-22'), gender: 'W', lang: 'de' },
  { email: 'thomas.weber@demo.de',    name: 'Weber, Thomas',     num: 'P-10003', birth: new Date('1945-11-05'), gender: 'M', lang: 'de' },
  { email: 'maria.mueller@demo.de',   name: 'Müller, Maria',     num: 'P-10004', birth: new Date('1989-02-18'), gender: 'W', lang: 'de' },
  { email: 'franz.hoffmann@demo.de',  name: 'Hoffmann, Franz',   num: 'P-10005', birth: new Date('1952-09-30'), gender: 'M', lang: 'de' },
  { email: 'petra.klein@demo.de',     name: 'Klein, Petra',      num: 'P-10006', birth: new Date('1983-05-12'), gender: 'W', lang: 'de' },
  { email: 'hans.fischer@demo.de',    name: 'Fischer, Hans',     num: 'P-10007', birth: new Date('1938-12-24'), gender: 'M', lang: 'de' },
  // NEU: BG-Unfall (Arbeitsunfall) — Flow: BG-Schein, Unfallversicherung
  { email: 'klaus.berger@demo.de',    name: 'Berger, Klaus',     num: 'P-10008', birth: new Date('1980-06-17'), gender: 'M', lang: 'de' },
  // NEU: Junge Patientin mit AU-Schein und einfacher Erkältung
  { email: 'emma.hartmann@demo.de',   name: 'Hartmann, Emma',    num: 'P-10009', birth: new Date('1995-11-03'), gender: 'W', lang: 'de' },
];

/** TENANT 2 — Kardiologie (7 Patienten) */
const PATIENTS_T2 = [
  { email: 'walter.richter@demo.de',    name: 'Richter, Walter',     num: 'P-20001', birth: new Date('1951-06-08'), gender: 'M', lang: 'de' },
  { email: 'ingrid.wolf@demo.de',       name: 'Wolf, Ingrid',        num: 'P-20002', birth: new Date('1963-10-19'), gender: 'W', lang: 'de' },
  { email: 'dietmar.schroeder@demo.de', name: 'Schröder, Dietmar',   num: 'P-20003', birth: new Date('1948-04-02'), gender: 'M', lang: 'de' },
  { email: 'renate.neumann@demo.de',    name: 'Neumann, Renate',     num: 'P-20004', birth: new Date('1955-08-27'), gender: 'W', lang: 'de' },
  { email: 'gerhard.braun@demo.de',     name: 'Braun, Gerhard',      num: 'P-20005', birth: new Date('1957-01-15'), gender: 'M', lang: 'de' },
  // NEU: KRITISCH — Akutes Koronarsyndrom, Notfall-Walk-in
  { email: 'heinz.zimmermann@demo.de',  name: 'Zimmermann, Heinz',   num: 'P-20006', birth: new Date('1956-04-23'), gender: 'M', lang: 'de' },
  // NEU: Post-TAVI / Herzschrittmacher-Kontrolle
  { email: 'hildegard.kraemer@demo.de', name: 'Krämer, Hildegard',   num: 'P-20007', birth: new Date('1949-08-11'), gender: 'W', lang: 'de' },
];

/** TENANT 3 — MVZ (14 Patienten) */
const PATIENTS_T3 = [
  { email: 'stefan.jung@demo.de',         name: 'Jung, Stefan',          num: 'P-30001', birth: new Date('1990-04-17'), gender: 'M', lang: 'de' },
  { email: 'fatima.al-rashid@demo.de',    name: 'Al-Rashid, Fatima',     num: 'P-30002', birth: new Date('1986-09-03'), gender: 'W', lang: 'ar' },
  { email: 'ivan.petrov@demo.de',         name: 'Petrov, Ivan',          num: 'P-30003', birth: new Date('1975-12-11'), gender: 'M', lang: 'ru' },
  { email: 'nguyen.thi.lan@demo.de',      name: 'Nguyen, Thi Lan',       num: 'P-30004', birth: new Date('1993-07-28'), gender: 'W', lang: 'en' },
  { email: 'carlos.garcia@demo.de',       name: 'García, Carlos',        num: 'P-30005', birth: new Date('1968-03-22'), gender: 'M', lang: 'es' },
  { email: 'elena.kovacs@demo.de',        name: 'Kovács, Elena',         num: 'P-30006', birth: new Date('1981-11-09'), gender: 'W', lang: 'en' },
  { email: 'james.okonkwo@demo.de',       name: 'Okonkwo, James',        num: 'P-30007', birth: new Date('1979-05-14'), gender: 'M', lang: 'en' },
  { email: 'yuki.tanaka@demo.de',         name: 'Tanaka, Yuki',          num: 'P-30008', birth: new Date('1995-08-06'), gender: 'W', lang: 'en' },
  // NEU: Türkisch — Fragebogen auf Türkisch (Sprach-Showcase)
  { email: 'ahmet.yilmaz@demo.de',        name: 'Yilmaz, Ahmet',         num: 'P-30009', birth: new Date('1985-02-14'), gender: 'M', lang: 'tr' },
  // NEU: Polnisch — Fragebogen auf Polnisch
  { email: 'katarzyna.nowak@demo.de',     name: 'Nowak, Katarzyna',      num: 'P-30010', birth: new Date('1971-07-19'), gender: 'W', lang: 'pl' },
  // NEU: KRITISCH — Suizidgefährdung (psychiatrischer Notfall-Flow)
  { email: 'felix.bauer@demo.de',         name: 'Bauer, Felix',          num: 'P-30011', birth: new Date('2000-03-28'), gender: 'M', lang: 'de' },
  // NEU: Telemedizin-Only Patient — nur Video-Konsultation
  { email: 'sabine.werner@demo.de',       name: 'Werner, Sabine',        num: 'P-30012', birth: new Date('1978-10-05'), gender: 'W', lang: 'de' },
  // NEU: NFC Check-in Showcase
  { email: 'lukas.hoffmann@demo.de',      name: 'Hoffmann, Lukas',       num: 'P-30013', birth: new Date('1988-12-22'), gender: 'M', lang: 'de' },
  // NEU: Selbstzahler, keine gesetzliche KV (IGeL/Privatpatient)
  { email: 'zeynep.arslan@demo.de',       name: 'Arslan, Zeynep',        num: 'P-30014', birth: new Date('1994-05-09'), gender: 'W', lang: 'tr' },
];

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 DiggAI Demo-Complete-Seed startet (30 Patienten)...\n');

  const pwHash = await bcrypt.hash(DEMO_PW, 12);
  const pinHash = await bcrypt.hash('1234', 10);

  // ── Clean up demo tenants ─────────────────────────────────────
  console.log('🧹 Bereinige vorhandene Demo-Daten...');
  await prisma.tenant.deleteMany({
    where: { subdomain: { in: ['demo-hausarzt', 'demo-kardio', 'demo-mvz'] } },
  });

  // ── Tenants ───────────────────────────────────────────────────
  console.log('📋 Erstelle Demo-Praxen...');
  const t1 = await prisma.tenant.create({ data: TENANT_HAUSARZT });
  const t2 = await prisma.tenant.create({ data: TENANT_KARDIO });
  const t3 = await prisma.tenant.create({ data: TENANT_MVZ });
  console.log(`  ✅ ${t1.name} [STARTER]`);
  console.log(`  ✅ ${t2.name} [PROFESSIONAL]`);
  console.log(`  ✅ ${t3.name} [ENTERPRISE]`);

  // ── Subscriptions ─────────────────────────────────────────────
  await prisma.subscription.createMany({
    data: [
      { praxisId: t1.id, tier: 'STARTER',       status: 'TRIAL',  aiQuotaUsed: 23,    aiQuotaTotal: 100,    endsAt: new Date('2026-06-30') },
      { praxisId: t2.id, tier: 'PROFESSIONAL',  status: 'ACTIVE', aiQuotaUsed: 847,   aiQuotaTotal: 5000,   endsAt: new Date('2027-02-01') },
      { praxisId: t3.id, tier: 'ENTERPRISE',    status: 'ACTIVE', aiQuotaUsed: 12450, aiQuotaTotal: 999999, endsAt: new Date('2028-01-01') },
    ],
  });

  // ── Themes ────────────────────────────────────────────────────
  await prisma.tenantTheme.createMany({
    data: [
      { tenantId: t1.id, config: JSON.stringify({ primaryColor: '#2563eb', fontFamily: 'Inter',  borderRadius: 'md', logoPosition: 'center' }), defaultMode: 'light',  respectSystemPreference: true,  allowPatientThemeSelection: false },
      { tenantId: t2.id, config: JSON.stringify({ primaryColor: '#dc2626', fontFamily: 'Roboto', borderRadius: 'sm', logoPosition: 'left'   }), defaultMode: 'light',  respectSystemPreference: false, allowPatientThemeSelection: false },
      { tenantId: t3.id, config: JSON.stringify({ primaryColor: '#7c3aed', fontFamily: 'Sora',   borderRadius: 'xl', logoPosition: 'center', gradientEnabled: true }), defaultMode: 'system', respectSystemPreference: true, allowPatientThemeSelection: true },
    ],
  });

  // ── Staff Accounts ────────────────────────────────────────────
  console.log('\n👨‍⚕️ Erstelle Arzt-Accounts...');

  const [a1_admin, a1_arzt, a1_mfa] = await Promise.all([
    prisma.arztUser.create({ data: { tenantId: t1.id, username: 'admin',       passwordHash: pwHash, pinHash, displayName: 'Dr. Klaus Musterarzt',      role: 'ADMIN', loginCount: 142, lastLoginAt: new Date() } }),
    prisma.arztUser.create({ data: { tenantId: t1.id, username: 'arzt',        passwordHash: pwHash,          displayName: 'Dr. Klaus Musterarzt',      role: 'ARZT',  loginCount: 89  } }),
    prisma.arztUser.create({ data: { tenantId: t1.id, username: 'mfa',         passwordHash: pwHash,          displayName: 'Sabine Müller (MFA)',        role: 'MFA',   loginCount: 234 } }),
  ]);

  const [a2_admin, a2_arzt1, a2_arzt2, a2_mfa] = await Promise.all([
    prisma.arztUser.create({ data: { tenantId: t2.id, username: 'admin',       passwordHash: pwHash, pinHash, displayName: 'Prof. Dr. Hans Herzmann',   role: 'ADMIN', loginCount: 512 } }),
    prisma.arztUser.create({ data: { tenantId: t2.id, username: 'herzmann',    passwordHash: pwHash,          displayName: 'Prof. Dr. Hans Herzmann',   role: 'ARZT',  loginCount: 387 } }),
    prisma.arztUser.create({ data: { tenantId: t2.id, username: 'dr-vogel',    passwordHash: pwHash,          displayName: 'Dr. med. Lisa Vogel',       role: 'ARZT',  loginCount: 201 } }),
    prisma.arztUser.create({ data: { tenantId: t2.id, username: 'mfa',         passwordHash: pwHash,          displayName: 'Team Rezeption',            role: 'MFA',   loginCount: 1024 } }),
  ]);

  const [a3_admin, a3_arzt1, a3_arzt2, a3_arzt3, a3_mfa1, a3_mfa2] = await Promise.all([
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'admin',       passwordHash: pwHash, pinHash, displayName: 'Dr. Sarah Schneider (CMO)', role: 'ADMIN', loginCount: 892 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'dr-schneider',passwordHash: pwHash,          displayName: 'Dr. Sarah Schneider',       role: 'ARZT',  loginCount: 445 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'dr-rahman',   passwordHash: pwHash,          displayName: 'Dr. Ahmad Rahman',          role: 'ARZT',  loginCount: 302 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'dr-chen',     passwordHash: pwHash,          displayName: 'Dr. Mei Chen',              role: 'ARZT',  loginCount: 178 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'mfa1',        passwordHash: pwHash,          displayName: 'Anna Kowalski (MFA)',        role: 'MFA',   loginCount: 1567 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'mfa2',        passwordHash: pwHash,          displayName: 'Omar Hassan (MFA)',          role: 'MFA',   loginCount: 983 } }),
  ]);

  console.log(`  ✅ Tenant 1: 3 Accounts | Tenant 2: 4 Accounts | Tenant 3: 6 Accounts`);

  // ── Patients ──────────────────────────────────────────────────
  console.log('\n🧑‍🤝‍🧑 Erstelle 30 Demo-Patienten...');

  const createPatients = async (tenantId: string, list: typeof PATIENTS_T1) =>
    Promise.all(
      list.map(p =>
        prisma.patient.create({
          data: {
            tenantId,
            hashedEmail: sha256(p.email),
            patientNumber: p.num,
            birthDate: p.birth,
            gender: p.gender,
            encryptedName: `DEMO:${p.name}`,
            insuranceNumHash: sha256(`KVNR-${p.num}`),
          },
        })
      )
    );

  const pts1 = await createPatients(t1.id, PATIENTS_T1);
  const pts2 = await createPatients(t2.id, PATIENTS_T2);
  const pts3 = await createPatients(t3.id, PATIENTS_T3);

  console.log(`  ✅ ${pts1.length + pts2.length + pts3.length} Patienten erstellt (T1:${pts1.length} T2:${pts2.length} T3:${pts3.length})`);

  // ═══════════════════════════════════════════════════════════════
  // PATIENT SESSIONS — jede Session repräsentiert einen Flow
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📋 Erstelle Patientensessionen (alle Interaktionsflows)...');

  // ── TENANT 1: Hausarzt Sessions ────────────────────────────────

  // P-10001: Wiederkehrend — LWS/Ischialgie — Routine Arzt-Flow
  const s1_1 = await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[0].id, isNewPatient: false,
    gender: 'M', birthDate: pts1[0].birthDate, encryptedName: 'DEMO:Schmidt, Max',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a1_arzt.id,
    pvsExported: true, pvsExportedAt: new Date(),
    aiSummary: 'Patient Max Schmidt (58 J., m) stellt sich mit Rückenschmerzen vor. Seit 3 Wochen LWS-Schmerzen, ausstrahlend in das linke Bein (Ischialgie V.a.). Bekannte arterielle Hypertonie, Diabetes Typ 2. Medikamente: Metformin 1000mg, Ramipril 5mg, ASS 100mg. Empfehlung: MRT LWS, Physiotherapie, Schmerztherapie. Kein Red Flag-Kriterium.',
    createdAt: new Date(Date.now() - 2 * 3600_000), updatedAt: new Date(),
  }});

  // P-10002: Rezept-Verlängerung — MFA-only Flow (kein Arztkontakt nötig)
  const s1_2 = await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[1].id, isNewPatient: false,
    gender: 'W', birthDate: pts1[1].birthDate, encryptedName: 'DEMO:Bauer, Anna',
    status: 'COMPLETED', selectedService: 'REZEPT', insuranceType: 'GKV', assignedArztId: a1_arzt.id,
    aiSummary: 'Patientin Anna Bauer (45 J., w) beantragt Rezept-Verlängerung für Levothyroxin 75μg (Schilddrüsenunterfunktion seit 8 Jahren). Werte zuletzt April 2024 gut eingestellt. Keine aktuellen Beschwerden.',
    createdAt: new Date(Date.now() - 4 * 3600_000), updatedAt: new Date(),
  }});

  // P-10003: WARNUNG — Atemnot bei Herzinsuffizienz
  const s1_3 = await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[2].id, isNewPatient: false,
    gender: 'M', birthDate: pts1[2].birthDate, encryptedName: 'DEMO:Weber, Thomas',
    status: 'SUBMITTED', selectedService: 'TERMIN', insuranceType: 'PKV', assignedArztId: a1_arzt.id,
    aiSummary: '⚠️ RED FLAG: Patient Thomas Weber (78 J., m) berichtet über zunehmende Atemnot seit 2 Wochen, auch in Ruhe. Bekannte KHK mit Stent (2019), Herzinsuffizienz NYHA II. Sofortige kardiologische Vorstellung oder Notaufnahme notwendig.',
    createdAt: new Date(Date.now() - 30 * 60_000), updatedAt: new Date(),
  }});

  // P-10004: Kontroll-Termin Diabetes / Blutdruck
  const s1_4 = await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[3].id, isNewPatient: false,
    gender: 'W', birthDate: pts1[3].birthDate, encryptedName: 'DEMO:Müller, Maria',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a1_arzt.id,
    pvsExported: true, pvsExportedAt: new Date(Date.now() - 3600_000),
    aiSummary: 'Maria Müller (34 J., w): Diabetes-Verlaufskontrolle. HbA1c 7,2% (Zielbereich). Blutdruck 128/82 (gut eingestellt). Keine neuen Beschwerden. Empfehlung: Therapie beibehalten, Kontrolle in 6 Monaten.',
    createdAt: new Date(Date.now() - 5 * 3600_000), updatedAt: new Date(),
  }});

  // P-10005: Hausbesuch-Anfrage — gehbehinderter Patient (special service flow)
  await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[4].id, isNewPatient: false,
    gender: 'M', birthDate: pts1[4].birthDate, encryptedName: 'DEMO:Hoffmann, Franz',
    status: 'COMPLETED', selectedService: 'HAUSBESUCH', insuranceType: 'GKV', assignedArztId: a1_arzt.id,
    aiSummary: 'Franz Hoffmann (71 J., m): Hausbesuch-Anforderung. Patient ist nach Schlaganfall (2023) in seiner Mobilität eingeschränkt (Rollstuhl). Blutdruck-Kontrolle + Medikamenten-Review. Empfehlung: Hausbesuch morgen 11:30 Uhr.',
    createdAt: new Date(Date.now() - 7 * 3600_000), updatedAt: new Date(),
  }});

  // P-10006: Erstvorstellung — neue Patientin, vollständige Anamnese
  await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[5].id, isNewPatient: true,
    gender: 'W', birthDate: pts1[5].birthDate, encryptedName: 'DEMO:Klein, Petra',
    status: 'ACTIVE', selectedService: 'TERMIN', insuranceType: 'GKV',
    aiSummary: null,
    createdAt: new Date(Date.now() - 10 * 60_000), updatedAt: new Date(),
  }});

  // P-10007: Multimorbider älterer Patient — AU + Rezept + Überweisung
  const s1_7 = await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[6].id, isNewPatient: false,
    gender: 'M', birthDate: pts1[6].birthDate, encryptedName: 'DEMO:Fischer, Hans',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a1_arzt.id,
    pvsExported: true, pvsExportedAt: new Date(Date.now() - 2 * 3600_000),
    aiSummary: 'Hans Fischer (85 J., m): Multimorbider Patient. Herzinsuffizienz NYHA III, COPD GOLD II, Hypertonie, Diabetes Typ 2. Dekompensationszeichen: +3 kg in 1 Woche, Knöchelödeme. Empfehlung: Diuretika anpassen, kardiologisches Konsil anfordern, Pflegedienst-Koordination.',
    createdAt: new Date(Date.now() - 9 * 3600_000), updatedAt: new Date(),
  }});

  // P-10008: BG-UNFALL — Arbeitsunfall (vollständig neuer Flow)
  const s1_8 = await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[7].id, isNewPatient: false,
    gender: 'M', birthDate: pts1[7].birthDate, encryptedName: 'DEMO:Berger, Klaus',
    status: 'COMPLETED', selectedService: 'BG', insuranceType: 'BG', assignedArztId: a1_arzt.id,
    pvsExported: true, pvsExportedAt: new Date(Date.now() - 3600_000),
    aiSummary: 'Klaus Berger (43 J., m): BG-Unfall auf Baustelle. Distorsion rechtes Handgelenk nach Sturz (16.04.2026, 08:30 Uhr). Arbeitgeber: Müller Bau GmbH, BG BAU. Befund: Schwellung, Schmerzen, Bewegungseinschränkung. Röntgen: kein Frakturnachweis. BG-Schein ausgestellt, AU 5 Tage. Wiedervorstellung in 5 Tagen.',
    createdAt: new Date(Date.now() - 1 * 3600_000), updatedAt: new Date(),
  }});

  // P-10009: AU-SCHEIN — einfache Erkältung, schneller Flow via MFA
  const s1_9 = await prisma.patientSession.create({ data: {
    tenantId: t1.id, patientId: pts1[8].id, isNewPatient: false,
    gender: 'W', birthDate: pts1[8].birthDate, encryptedName: 'DEMO:Hartmann, Emma',
    status: 'COMPLETED', selectedService: 'AU', insuranceType: 'GKV', assignedArztId: a1_arzt.id,
    aiSummary: 'Emma Hartmann (28 J., w): AU-Schein grippaler Infekt. Fieber 38,6°C, Halsschmerzen, Schnupfen seit 2 Tagen. Keine Dyspnoe, keine Komplikationszeichen. AU 3 Tage. Empfehlung: viel trinken, Ruhe, Ibuprofen bei Bedarf.',
    createdAt: new Date(Date.now() - 45 * 60_000), updatedAt: new Date(),
  }});

  // ── TENANT 2: Kardiologie Sessions ────────────────────────────

  // P-20001: KRITISCH ACS — Arzt-Alert Flow (bestehend)
  const s2_1 = await prisma.patientSession.create({ data: {
    tenantId: t2.id, patientId: pts2[0].id, isNewPatient: false,
    gender: 'M', birthDate: pts2[0].birthDate, encryptedName: 'DEMO:Richter, Walter',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a2_arzt1.id,
    pvsExported: true,
    aiSummary: '⚠️ KRITISCH: Walter Richter (72 J., m): Brustschmerzen bei Belastung seit 3 Tagen, Ausstrahlung linker Arm. Bekannte KHK (Stent LAD 2022). ACS nicht auszuschließen. EKG + Troponin sofort. Dringendes kardiologisches Konsil.',
    createdAt: new Date(Date.now() - 1 * 3600_000), updatedAt: new Date(),
  }});

  // P-20002: Neupatient Palpitationen — vollständige Erstanamnese
  const s2_2 = await prisma.patientSession.create({ data: {
    tenantId: t2.id, patientId: pts2[1].id, isNewPatient: true,
    gender: 'W', birthDate: pts2[1].birthDate, encryptedName: 'DEMO:Wolf, Ingrid',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'PKV', assignedArztId: a2_arzt2.id,
    aiSummary: 'Neupatientin Ingrid Wolf (60 J., w): Palpitationen seit 6 Monaten, unregelmäßiger Puls. Keine bekannten Herzerkrankungen. Empfehlung: Langzeit-EKG, Echokardiographie, Labor (TSH, Elektrolyte).',
    createdAt: new Date(Date.now() - 3 * 3600_000), updatedAt: new Date(),
  }});

  // P-20003: Kontrolltermin KHK — ACTIVE (läuft gerade)
  const s2_3 = await prisma.patientSession.create({ data: {
    tenantId: t2.id, patientId: pts2[2].id, isNewPatient: false,
    gender: 'M', birthDate: pts2[2].birthDate, encryptedName: 'DEMO:Schröder, Dietmar',
    status: 'ACTIVE', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a2_arzt1.id,
    createdAt: new Date(Date.now() - 15 * 60_000), updatedAt: new Date(),
  }});

  // P-20004: Vorhofflimmern Kontrolle
  await prisma.patientSession.create({ data: {
    tenantId: t2.id, patientId: pts2[3].id, isNewPatient: false,
    gender: 'W', birthDate: pts2[3].birthDate, encryptedName: 'DEMO:Neumann, Renate',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a2_arzt2.id,
    pvsExported: true,
    aiSummary: 'Renate Neumann (68 J., w): Vorhofflimmern Verlaufskontrolle. Antikoagulation mit Xarelto 20mg. INR-Monitoring nicht nötig. Herzfrequenz 72/min (gut eingestellt). TTH-Score 3. Langzeit-EKG unauffällig.',
    createdAt: new Date(Date.now() - 6 * 3600_000), updatedAt: new Date(),
  }});

  // P-20005: Routine nach Bypass-OP
  await prisma.patientSession.create({ data: {
    tenantId: t2.id, patientId: pts2[4].id, isNewPatient: false,
    gender: 'M', birthDate: pts2[4].birthDate, encryptedName: 'DEMO:Braun, Gerhard',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a2_arzt1.id,
    pvsExported: true,
    aiSummary: 'Gerhard Braun (66 J., m): 3-Monats-Kontrolle nach ACVB (Nov. 2025). Wunde gut verheilt. Belastbarkeit verbessert. LDL 58 mg/dl (Ziel erreicht). ASS 100 + Clopidogrel weiterführen.',
    createdAt: new Date(Date.now() - 8 * 3600_000), updatedAt: new Date(),
  }});

  // P-20006: KRITISCH ACS NOTFALL — neuer Patient, Notfall Walk-in
  const s2_6 = await prisma.patientSession.create({ data: {
    tenantId: t2.id, patientId: pts2[5].id, isNewPatient: false,
    gender: 'M', birthDate: pts2[5].birthDate, encryptedName: 'DEMO:Zimmermann, Heinz',
    status: 'SUBMITTED', selectedService: 'NOTFALL', insuranceType: 'GKV', assignedArztId: a2_arzt1.id,
    aiSummary: '🚨 AKUTFALL: Heinz Zimmermann (67 J., m): Seit 45 Min. starke Brustschmerzen (8/10), Schweißausbruch, Übelkeit. Ausstrahlung linker Arm + Kiefer. St.n. Herzinfarkt 2018 (Stent RCX). EKG-Veränderungen ST-Elevation V1-V4. STEMI-Verdacht! Sofortige PCI-Behandlung erforderlich. Notaufnahme informieren!',
    createdAt: new Date(Date.now() - 5 * 60_000), updatedAt: new Date(),
  }});

  // P-20007: Herzschrittmacher-Kontrolle — spezieller Device-Check Flow
  const s2_7 = await prisma.patientSession.create({ data: {
    tenantId: t2.id, patientId: pts2[6].id, isNewPatient: false,
    gender: 'W', birthDate: pts2[6].birthDate, encryptedName: 'DEMO:Krämer, Hildegard',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a2_arzt2.id,
    pvsExported: true,
    aiSummary: 'Hildegard Krämer (74 J., w): Herzschrittmacher-Kontrolluntersuchung (DDD 60-130/min, Implantation 2022). Batterie-Status: 6.2V (ausreichend, ca. 4 Jahre Restlaufzeit). Keine Fehlstimulationen. Keine Rhythmusstörungen im Speicher. Nächste Kontrolle in 12 Monaten.',
    createdAt: new Date(Date.now() - 4 * 3600_000), updatedAt: new Date(),
  }});

  // ── TENANT 3: MVZ Sessions (alle Feature-Flows) ────────────────

  // P-30001: Burnout/Schilddrüse — PWA Tagebuch aktiv
  const s3_1 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[0].id, isNewPatient: false,
    gender: 'M', birthDate: pts3[0].birthDate, encryptedName: 'DEMO:Jung, Stefan',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a3_arzt1.id,
    pvsExported: true,
    aiSummary: 'Stefan Jung (34 J., m): Erschöpfung, Konzentrationsprobleme seit 2 Monaten. Gewichtszunahme 8 kg in 6 Monaten. Verdacht: Schilddrüsenunterfunktion (TSH erhöht?), Burnout. PHQ-9: 14/27 (moderate Depression). PWA-Tagebuch aktiviert.',
    createdAt: new Date(Date.now() - 5 * 3600_000), updatedAt: new Date(),
  }});

  // P-30002: Arabisch — Sprachbarriere überwunden (multilingual showcase)
  const s3_2 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[1].id, isNewPatient: true,
    gender: 'W', birthDate: pts3[1].birthDate, encryptedName: 'DEMO:Al-Rashid, Fatima',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a3_arzt2.id,
    aiSummary: '🌍 Multilingual (AR): Fatima Al-Rashid (37 J., w): Bauchschmerzen + Übelkeit 1 Woche. Ramadan-Fasten. Fragebogen auf Arabisch ausgefüllt – keine Sprachbarriere. V.a. Gastritis. Empfehlung: H. pylori-Test.',
    createdAt: new Date(Date.now() - 2 * 3600_000), updatedAt: new Date(),
  }});

  // P-30003: Russisch — AU-Verlängerung
  const s3_3 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[2].id, isNewPatient: false,
    gender: 'M', birthDate: pts3[2].birthDate, encryptedName: 'DEMO:Petrov, Ivan',
    status: 'COMPLETED', selectedService: 'AU', insuranceType: 'GKV', assignedArztId: a3_arzt3.id,
    aiSummary: '🌍 Multilingual (RU): Ivan Petrov (48 J., m): AU-Verlängerung wegen grippaler Infekt. Fieber 38,4°C, Husten. Fragebogen auf Russisch. AU verlängert 3 Tage.',
    createdAt: new Date(Date.now() - 6 * 3600_000), updatedAt: new Date(),
  }});

  // P-30004: Englisch — Neupatient, vollständige Anamnese
  await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[3].id, isNewPatient: true,
    gender: 'W', birthDate: pts3[3].birthDate, encryptedName: 'DEMO:Nguyen, Thi Lan',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a3_arzt1.id,
    pvsExported: true,
    aiSummary: '🌍 Multilingual (EN): Nguyen Thi Lan (30 J., w): New patient from Vietnam. Questionnaire completed in English. Headache, dizziness since 3 weeks. Possible tension headache / migraine. Recommendation: neurological workup, lifestyle counseling.',
    createdAt: new Date(Date.now() - 3 * 3600_000), updatedAt: new Date(),
  }});

  // P-30005: Spanisch — Überweisung Orthopädie
  const s3_5 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[4].id, isNewPatient: false,
    gender: 'M', birthDate: pts3[4].birthDate, encryptedName: 'DEMO:García, Carlos',
    status: 'COMPLETED', selectedService: 'UEBERWEISUNG', insuranceType: 'GKV', assignedArztId: a3_arzt1.id,
    aiSummary: '🌍 Multilingual (ES): Carlos García (55 J., m): Überweisung Orthopädie wegen Knieschmerzen rechts. Gonarthrose V.a. Fragebogen auf Spanisch.',
    createdAt: new Date(Date.now() - 8 * 3600_000), updatedAt: new Date(),
  }});

  // P-30006: Englisch — Diabetes Management
  await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[5].id, isNewPatient: false,
    gender: 'W', birthDate: pts3[5].birthDate, encryptedName: 'DEMO:Kovács, Elena',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a3_arzt2.id,
    pvsExported: true,
    aiSummary: '🌍 Multilingual (EN): Elena Kovács (42 J., w): Diabetes type 1 management, CGM review. Sensor readings: TIR 68% (target >70%). HbA1c 7.8%. Insulin adjustment recommended.',
    createdAt: new Date(Date.now() - 4 * 3600_000), updatedAt: new Date(),
  }});

  // P-30007: Englisch — ACTIVE (läuft gerade)
  const s3_7 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[6].id, isNewPatient: true,
    gender: 'M', birthDate: pts3[6].birthDate, encryptedName: 'DEMO:Okonkwo, James',
    status: 'ACTIVE', selectedService: 'TERMIN', insuranceType: 'SZ', assignedArztId: a3_arzt2.id,
    createdAt: new Date(Date.now() - 10 * 60_000), updatedAt: new Date(),
  }});

  // P-30008: Englisch — Schwangerschafts-Check
  await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[7].id, isNewPatient: false,
    gender: 'W', birthDate: pts3[7].birthDate, encryptedName: 'DEMO:Tanaka, Yuki',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a3_arzt3.id,
    aiSummary: 'Yuki Tanaka (28 J., w): Schwangerschafts-Vorsorge 20. SSW. Blutdruck 118/72, Gewicht +8 kg (normgerecht). Ultraschall unauffällig, Bewegungen gefühlt. GDM-Screening: negativ.',
    createdAt: new Date(Date.now() - 7 * 3600_000), updatedAt: new Date(),
  }});

  // P-30009: TÜRKISCH — neuer Patient mit Rückenbeschwerden
  const s3_9 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[8].id, isNewPatient: true,
    gender: 'M', birthDate: pts3[8].birthDate, encryptedName: 'DEMO:Yilmaz, Ahmet',
    status: 'COMPLETED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a3_arzt1.id,
    aiSummary: '🌍 Multilingual (TR): Ahmet Yilmaz (38 J., m): Neu-Patient. Fragebogen auf Türkisch ausgefüllt. Rückenschmerzen LWS seit 2 Wochen, Beruf: LKW-Fahrer. V.a. muskuläre Verspannung / Bandscheibenproblematik. Empfehlung: Röntgen LWS, Physiotherapie.',
    createdAt: new Date(Date.now() - 90 * 60_000), updatedAt: new Date(),
  }});

  // P-30010: POLNISCH — Kontrolle Schilddrüse
  const s3_10 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[9].id, isNewPatient: false,
    gender: 'W', birthDate: pts3[9].birthDate, encryptedName: 'DEMO:Nowak, Katarzyna',
    status: 'COMPLETED', selectedService: 'REZEPT', insuranceType: 'GKV', assignedArztId: a3_arzt3.id,
    aiSummary: '🌍 Multilingual (PL): Katarzyna Nowak (52 J., w): Fragebogen auf Polnisch. Rezept-Verlängerung für Euthyrox 100μg. Letzte TSH-Werte unauffällig. Keine neuen Beschwerden.',
    createdAt: new Date(Date.now() - 2.5 * 3600_000), updatedAt: new Date(),
  }});

  // P-30011: KRITISCH SUIZIDALITÄT — psychiatrischer Notfall-Flow
  const s3_11 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[10].id, isNewPatient: false,
    gender: 'M', birthDate: pts3[10].birthDate, encryptedName: 'DEMO:Bauer, Felix',
    status: 'SUBMITTED', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a3_arzt1.id,
    aiSummary: '🚨 KRITISCH PSYCHIATRIE: Felix Bauer (23 J., m): Aktive Suizidgedanken (konkrete Pläne angegeben). PHQ-9: 26/27 (schwere Depression). Keine Schutzfaktoren angegeben. SOFORTIGE psychiatrische Krisenintervention. Krisentelefon 0800 111 0 111 – Patient wird begleitet.',
    createdAt: new Date(Date.now() - 20 * 60_000), updatedAt: new Date(),
  }});

  // P-30012: TELEMEDIZIN — Video-Only Konsultation
  const s3_12 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[11].id, isNewPatient: false,
    gender: 'W', birthDate: pts3[11].birthDate, encryptedName: 'DEMO:Werner, Sabine',
    status: 'COMPLETED', selectedService: 'TELEMEDIZIN', insuranceType: 'PKV', assignedArztId: a3_arzt2.id,
    pvsExported: true,
    aiSummary: '📹 Telemedizin-Session: Dr. Sabine Werner (45 J., w): Video-Konsultation wegen persistierender Kopfschmerzen. Migräne-Prophylaxe mit Topiramat 50mg gut verträglich. Anpassung auf 75mg. Nächste Video-Kontrolle in 6 Wochen. Kein Rezept-Postversand nötig (PKV-Direktabrechnung).',
    createdAt: new Date(Date.now() - 3 * 3600_000), updatedAt: new Date(),
  }});

  // P-30013: NFC CHECK-IN — läuft gerade im Wartezimmer
  const s3_13 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[12].id, isNewPatient: false,
    gender: 'M', birthDate: pts3[12].birthDate, encryptedName: 'DEMO:Hoffmann, Lukas',
    status: 'ACTIVE', selectedService: 'TERMIN', insuranceType: 'GKV', assignedArztId: a3_arzt3.id,
    aiSummary: null, // Noch in der Befragung (NFC-Check-in erfolgt, Fragebogen läuft)
    createdAt: new Date(Date.now() - 5 * 60_000), updatedAt: new Date(),
  }});

  // P-30014: SELBSTZAHLER — IGeL / Private Abrechnung
  const s3_14 = await prisma.patientSession.create({ data: {
    tenantId: t3.id, patientId: pts3[13].id, isNewPatient: true,
    gender: 'W', birthDate: pts3[13].birthDate, encryptedName: 'DEMO:Arslan, Zeynep',
    status: 'COMPLETED', selectedService: 'IGEL', insuranceType: 'SZ', assignedArztId: a3_arzt1.id,
    pvsExported: false,
    aiSummary: '💳 Selbstzahler (IGeL): Zeynep Arslan (29 J., w): keine GKV-Mitgliedschaft. Individuelle Gesundheitsleistung: großes Blutbild-Profil + Vitaminanalyse (Vit D, B12, Ferritin, Folsäure). Privatrechnung 189 €. Befunde per E-Mail / PWA-Portal zugesendet.',
    createdAt: new Date(Date.now() - 2 * 3600_000), updatedAt: new Date(),
  }});

  console.log('  ✅ 30 Patientensessionen erstellt (alle Interaction-Flows abgedeckt)');

  // ═══════════════════════════════════════════════════════════════
  // TRIAGE EVENTS — kritische Alarme
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🚨 Erstelle Triage-Events (klinische Red Flags)...');

  await prisma.triageEvent.createMany({
    data: [
      {
        sessionId: s1_3.id, atomId: 'ATM-ATEMNOT',
        level: 'WARNING',
        triggerValues: JSON.stringify({ symptom: 'Atemnot in Ruhe', dauer: '2 Wochen', diagnose: 'Herzinsuffizienz NYHA II' }),
        message: 'WARNUNG: Atemnot in Ruhe bei bekannter Herzinsuffizienz. Kardiologische Vorstellung heute notwendig.',
        acknowledgedBy: a1_arzt.id, acknowledgedAt: new Date(),
      },
      {
        sessionId: s2_1.id, atomId: 'ATM-BRUSTSCHMERZ',
        level: 'CRITICAL',
        triggerValues: JSON.stringify({ symptom: 'Brustschmerz Ausstrahlung linker Arm', vorerkrankung: 'KHK + Stent LAD 2022' }),
        message: 'KRITISCH: Klassische Angina-Pectoris bei gesicherter KHK. ACS nicht ausschließbar. EKG + Troponin SOFORT.',
        acknowledgedBy: a2_arzt1.id, acknowledgedAt: new Date(),
      },
      {
        sessionId: s2_6.id, atomId: 'ATM-STEMI',
        level: 'CRITICAL',
        triggerValues: JSON.stringify({ symptom: 'Starke Brustschmerzen + Schweißausbruch + Übelkeit', ekg: 'ST-Elevation V1-V4', dauer: '45 Minuten' }),
        message: '🚨 STEMI-VERDACHT: ST-Elevation anterior. PCI-Zentrum sofort benachrichtigen. Keine Verzögerung!',
        acknowledgedBy: null, acknowledgedAt: null,
      },
      {
        sessionId: s3_11.id, atomId: 'ATM-SUIZIDALITAET',
        level: 'CRITICAL',
        triggerValues: JSON.stringify({ phq9: 26, suizidplan: 'konkret', schutzfaktoren: 'keine' }),
        message: '🚨 PSYCHIATRISCHER NOTFALL: Akute Suizidalität mit konkreten Plänen. Sofortige psychiatrische Krisenintervention. Patienten nicht alleine lassen.',
        acknowledgedBy: null, acknowledgedAt: null,
      },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // CLINICAL ALERTS
  // ═══════════════════════════════════════════════════════════════
  await prisma.clinicalAlert.createMany({
    data: [
      { sessionId: s1_3.id, patientId: pts1[2].id, tenantId: t1.id, type: 'CARDIAC', severity: 'WARNING', description: 'Atemnot in Ruhe bei bekannter Herzinsuffizienz. Kardiologische Evaluation heute.', resolved: true },
      { sessionId: s2_1.id, patientId: pts2[0].id, tenantId: t2.id, type: 'CARDIAC', severity: 'CRITICAL', description: 'ACS nicht ausgeschlossen. KHK-Patient neue Brustschmerzen + Ausstrahlung.', resolved: false },
      { sessionId: s2_6.id, patientId: pts2[5].id, tenantId: t2.id, type: 'CARDIAC', severity: 'CRITICAL', description: 'STEMI-Verdacht: ST-Elevation V1-V4. PCI-Zentrum informiert.', resolved: false },
      { sessionId: s3_11.id, patientId: pts3[10].id, tenantId: t3.id, type: 'PSYCHIATRIC', severity: 'CRITICAL', description: 'Akute Suizidalität mit konkretem Plan. Sofortige Krisenintervention.', resolved: false },
      { sessionId: s1_8.id, patientId: pts1[7].id, tenantId: t1.id, type: 'ADMINISTRATIVE', severity: 'INFO', description: 'BG-Unfall: BG-Schein ausgestellt, Arbeitgeber Müller Bau GmbH benachrichtigt.', resolved: true },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // THERAPY PLANS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n💊 Erstelle Therapiepläne...');

  await prisma.therapyPlan.createMany({
    data: [
      {
        sessionId: s1_1.id, tenantId: t1.id, patientId: pts1[0].id,
        planText: `THERAPIEPLAN — Max Schmidt (P-10001)\n\nDIAGNOSEN:\n• M54.4 – Lumboischialgie links\n• I10 – Arterielle Hypertonie\n• E11.9 – Diabetes mellitus Typ 2\n\nMASSNAHMEN:\n1. MRT LWS ohne KM\n2. Physiotherapie LWS: 10 × 45 Min\n3. Ibuprofen 400mg 3×1 (5 Tage)\n4. AU: 7 Tage\n5. WV in 2 Wochen mit MRT-Befund`,
        estimatedDuration: '4 Wochen', priority: 'MEDIUM', status: 'ACTIVE', createdById: a1_arzt.id,
      },
      {
        sessionId: s2_1.id, tenantId: t2.id, patientId: pts2[0].id,
        planText: `KARDIOLOGISCHER THERAPIEPLAN — Walter Richter (P-20001)\n\nSOFORTMASSNAHMEN:\n1. 12-Kanal-EKG SOFORT\n2. Troponin I/T + CK-MB SOFORT\n3. BNP/NT-proBNP SOFORT\n\nFOLGEMASSNAHMEN:\n4. Ergometrie / Myokardszintigraphie\n5. Echokardiographie\n6. Atorvastatin auf 80mg erhöhen\n7. HK-Labor bei Ischämienachweis`,
        estimatedDuration: '6 Wochen', priority: 'HIGH', status: 'ACTIVE', createdById: a2_arzt1.id,
      },
      {
        sessionId: s3_1.id, tenantId: t3.id, patientId: pts3[0].id,
        planText: `MVZ DIGITAL HEALTH — Stefan Jung (P-30001)\n\nVERDACHTSDIAGNOSEN:\n• E03.9 – V.a. Hypothyreose\n• Z73.0 – Burnout-Syndrom\n\nDIAGNOSTIK:\n1. TSH, fT3, fT4, BB, Ferritin, Vit D, Vit B12\n2. Schlafapnoe-Screening\n3. PHQ-9: 14/27 (moderate Depression)\n\nTHERAPIE:\n4. Levothyroxin (wenn bestätigt)\n5. Psychiater-Überweisung\n6. PWA-Tagebuch: Stimmung, Schlaf, Energie`,
        estimatedDuration: '12 Wochen', priority: 'MEDIUM', status: 'ACTIVE', createdById: a3_arzt1.id,
      },
      {
        sessionId: s3_12.id, tenantId: t3.id, patientId: pts3[11].id,
        planText: `TELEMEDIZIN THERAPIEPLAN — Dr. Sabine Werner (P-30012)\n\nDIAGNOSE: G43.1 – Migräne mit Aura\n\nPROPHYLAXE: Topiramat 75mg (erhöht von 50mg)\nAKUTMEDIKATION: Sumatriptan 50mg bei Attacke\n\nFOLGE-VIDEOKONSULTATION: 6 Wochen\nBEFUNDE: digitale Übermittlung via PWA`,
        estimatedDuration: '6 Monate', priority: 'LOW', status: 'ACTIVE', createdById: a3_arzt2.id,
      },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // APPOINTMENTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📅 Erstelle Termine...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const today = new Date();

  await prisma.appointment.createMany({
    data: [
      // Tenant 1 — Hausarzt
      { tenantId: t1.id, patientId: pts1[0].id, arztId: a1_arzt.id, scheduledAt: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),   duration: 20, type: 'ERSTGESPRAECH',   status: 'SCHEDULED', notes: 'MRT-Befund besprechen, Physio-Verordnung' },
      { tenantId: t1.id, patientId: pts1[3].id, arztId: a1_arzt.id, scheduledAt: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),  duration: 15, type: 'KONTROLLTERMIN',  status: 'SCHEDULED', notes: 'HbA1c-Ergebnis, RR-Kontrolle' },
      { tenantId: t1.id, patientId: pts1[4].id, arztId: a1_arzt.id, scheduledAt: new Date(new Date(tomorrow).setHours(11, 30, 0, 0)), duration: 30, type: 'HAUSBESUCH',      status: 'SCHEDULED', notes: 'Patient rollstuhlpflichtig, Hausbesuch' },
      { tenantId: t1.id, patientId: pts1[7].id, arztId: a1_arzt.id, scheduledAt: new Date(new Date(tomorrow).setHours(14, 0, 0, 0)),  duration: 15, type: 'KONTROLLTERMIN',  status: 'SCHEDULED', notes: 'BG-Kontrolle nach Handgelenks-Distorsion' },
      // Tenant 2 — Kardiologie (heute dringend!)
      { tenantId: t2.id, patientId: pts2[0].id, arztId: a2_arzt1.id, scheduledAt: new Date(new Date(today).setHours(14, 0, 0, 0)),    duration: 45, type: 'DRINGEND',        status: 'SCHEDULED', notes: '⚠️ DRINGEND: V.a. instabile Angina. EKG + Troponin.' },
      { tenantId: t2.id, patientId: pts2[5].id, arztId: a2_arzt1.id, scheduledAt: new Date(new Date(today).setHours(13, 30, 0, 0)),   duration: 60, type: 'NOTFALL',         status: 'SCHEDULED', notes: '🚨 NOTFALL: STEMI-Verdacht. PCI-Team alarmiert.' },
      { tenantId: t2.id, patientId: pts2[1].id, arztId: a2_arzt2.id, scheduledAt: new Date(new Date(tomorrow).setHours(9, 30, 0, 0)), duration: 30, type: 'ERSTGESPRAECH',   status: 'SCHEDULED', notes: 'Langzeit-EKG Auswertung' },
      { tenantId: t2.id, patientId: pts2[6].id, arztId: a2_arzt2.id, scheduledAt: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)), duration: 20, type: 'KONTROLLTERMIN',  status: 'SCHEDULED', notes: 'Herzschrittmacher-Jahreskontrolle' },
      // Tenant 3 — MVZ
      { tenantId: t3.id, patientId: pts3[0].id,  arztId: a3_arzt1.id, scheduledAt: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),  duration: 20, type: 'TELEMEDIZIN',  status: 'SCHEDULED', notes: 'Video-Folge: Laborergebnisse. DiggAI-Link gesendet.' },
      { tenantId: t3.id, patientId: pts3[1].id,  arztId: a3_arzt2.id, scheduledAt: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),  duration: 20, type: 'KONTROLLTERMIN', status: 'SCHEDULED', notes: 'H. pylori-Ergebnis. Arabisch-Sprachmittler.' },
      { tenantId: t3.id, patientId: pts3[10].id, arztId: a3_arzt1.id, scheduledAt: new Date(new Date(today).setHours(15, 0, 0, 0)),    duration: 60, type: 'NOTFALL',        status: 'SCHEDULED', notes: '🚨 Psychiatrie-Krisenintervention SOFORT. Notarzt verständigt.' },
      { tenantId: t3.id, patientId: pts3[11].id, arztId: a3_arzt2.id, scheduledAt: new Date(new Date(tomorrow).setHours(14, 30, 0, 0)), duration: 20, type: 'TELEMEDIZIN',  status: 'SCHEDULED', notes: 'Telemedizin: Migräne-Verlauf. Video-Link gesendet.' },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // PWA PATIENT ACCOUNTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📱 Erstelle PWA-Patienten-Accounts...');

  await prisma.patientAccount.createMany({
    data: [
      { patientId: pts3[0].id,  pin: await bcrypt.hash('9876', 10), registeredAt: new Date(Date.now() - 30 * 86400_000), lastLoginAt: new Date(Date.now() - 2 * 3600_000),   isActive: true, locale: 'de' },
      { patientId: pts3[1].id,  pin: await bcrypt.hash('5544', 10), registeredAt: new Date(Date.now() - 7  * 86400_000), lastLoginAt: new Date(Date.now() - 24 * 3600_000),  isActive: true, locale: 'ar' },
      { patientId: pts3[2].id,  pin: await bcrypt.hash('1122', 10), registeredAt: new Date(Date.now() - 14 * 86400_000), lastLoginAt: new Date(Date.now() - 3 * 86400_000),  isActive: true, locale: 'ru' },
      { patientId: pts3[11].id, pin: await bcrypt.hash('3344', 10), registeredAt: new Date(Date.now() - 60 * 86400_000), lastLoginAt: new Date(Date.now() - 30 * 60_000),    isActive: true, locale: 'de' },
      { patientId: pts3[13].id, pin: await bcrypt.hash('7788', 10), registeredAt: new Date(Date.now() - 2  * 86400_000), lastLoginAt: new Date(Date.now() - 3600_000),        isActive: true, locale: 'tr' },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // DIARY ENTRIES (PWA showcase)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📓 Erstelle Tagebuch-Einträge...');

  await prisma.diaryEntry.createMany({
    data: [
      { patientId: pts3[0].id, tenantId: t3.id, date: new Date(Date.now() - 1 * 86400_000), mood: 5, sleepHours: 6.5, energyLevel: 4, notes: 'Heute etwas besser. Medikamente pünktlich genommen.', symptoms: JSON.stringify(['Kopfschmerzen', 'Müdigkeit']), createdAt: new Date(Date.now() - 1 * 86400_000) },
      { patientId: pts3[0].id, tenantId: t3.id, date: new Date(Date.now() - 2 * 86400_000), mood: 3, sleepHours: 5.0, energyLevel: 2, notes: 'Sehr schlecht geschlafen. Gedanken kreisen.', symptoms: JSON.stringify(['Schlafstörungen', 'Erschöpfung']), createdAt: new Date(Date.now() - 2 * 86400_000) },
      { patientId: pts3[0].id, tenantId: t3.id, date: new Date(Date.now() - 3 * 86400_000), mood: 4, sleepHours: 7.0, energyLevel: 5, notes: '30 Min Spazieren. Fühlt sich gut an.', symptoms: JSON.stringify([]), createdAt: new Date(Date.now() - 3 * 86400_000) },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // WAITING ROOM CONTENT
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📺 Erstelle Wartezimmer-Inhalte...');

  await prisma.waitingContent.createMany({
    data: [
      { tenantId: t3.id, title: 'Herzgesundheit: 5 Fakten',             body: 'Regelmäßige Bewegung senkt das Herzinfarkt-Risiko um 35%.', type: 'INFO',     category: 'PRAEVENTION', language: 'de', isActive: true, isPriority: false, displayDuration: 15, priority: 2, views: 1247, likes: 89 },
      { tenantId: t3.id, title: 'Ihr digitaler Gesundheitsbegleiter',   body: 'DiggAI PWA: Medikamente, Termine und Befunde im Blick.', type: 'WERBUNG',   category: 'DIGITAL',     language: 'de', isActive: true, isPriority: true,  displayDuration: 20, priority: 1, views: 3892, likes: 312 },
      { tenantId: t3.id, title: 'مرحباً بكم في مركزنا الطبي',          body: 'نوفر خدماتنا الطبية بالعربية.', type: 'INFO',     category: 'MEHRSPRACHIG', language: 'ar', isActive: true, isPriority: false, displayDuration: 12, priority: 3, views: 543, likes: 67 },
      { tenantId: t3.id, title: 'Добро пожаловать',                     body: 'Мы предоставляем услуги на русском языке.', type: 'INFO',     category: 'MEHRSPRACHIG', language: 'ru', isActive: true, isPriority: false, displayDuration: 12, priority: 4, views: 289, likes: 34 },
      { tenantId: t3.id, title: 'Hoşgeldiniz — Türkçe hizmet',          body: 'Türkçe dil desteği mevcuttur. Anketinizi Türkçe doldurabilirsiniz.', type: 'INFO', category: 'MEHRSPRACHIG', language: 'tr', isActive: true, isPriority: false, displayDuration: 12, priority: 5, views: 187, likes: 29 },
      { tenantId: t3.id, title: 'Witamy — Obsługa w języku polskim',    body: 'Kwestionariusz dostępny w języku polskim.', type: 'INFO', category: 'MEHRSPRACHIG', language: 'pl', isActive: true, isPriority: false, displayDuration: 12, priority: 6, views: 134, likes: 18 },
      { tenantId: t3.id, title: 'Datenschutz & Ihre Rechte (DSGVO)',    body: 'AES-256-Verschlüsselung. Alle 7 DSGVO-Grundsätze eingehalten.', type: 'RECHTLICH', category: 'DSGVO', language: 'de', isActive: true, isPriority: false, displayDuration: 18, priority: 7, views: 2156, likes: 178 },
      { tenantId: t1.id, title: 'Grippeschutzimpfung 2025/26',          body: 'Schützen Sie sich und Ihre Familie!', type: 'INFO', category: 'IMPFUNG', language: 'de', isActive: true, isPriority: true, displayDuration: 15, priority: 1, views: 892, likes: 124 },
      { tenantId: t2.id, title: 'Herzcheck 2025 – Kennen Sie Ihre Werte?', body: 'Blutdruck, Cholesterin, EKG – unser Herzcheck-Paket.', type: 'INFO', category: 'PRAEVENTION', language: 'de', isActive: true, isPriority: true, displayDuration: 20, priority: 1, views: 1423, likes: 287 },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // ROI SNAPSHOTS (Admin Dashboard)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📊 Erstelle ROI-Analytics...');

  await prisma.rOISnapshot.createMany({
    data: [
      { tenantId: t1.id, sessionsTotal: 1247, sessionsThisMonth: 89,   avgTimePerSession: 4.2, redFlagsTotal: 12,  redFlagsAcknowledged: 12,  pvsExportTotal: 1189,  pvsExportRate: 95.3, aiSummariesGenerated: 1105,  aiAcceptanceRate: 91.2, patientSatisfactionScore: 4.6, timeSavedHours: 312.5,   costSavedEur: 9375.0,    snapshotDate: new Date() },
      { tenantId: t2.id, sessionsTotal: 8934, sessionsThisMonth: 743,  avgTimePerSession: 3.8, redFlagsTotal: 89,  redFlagsAcknowledged: 87,  pvsExportTotal: 8712,  pvsExportRate: 97.5, aiSummariesGenerated: 8823,  aiAcceptanceRate: 94.7, patientSatisfactionScore: 4.8, timeSavedHours: 2678.2,  costSavedEur: 80346.0,   snapshotDate: new Date() },
      { tenantId: t3.id, sessionsTotal: 52841, sessionsThisMonth: 4102, avgTimePerSession: 3.2, redFlagsTotal: 412, redFlagsAcknowledged: 408, pvsExportTotal: 51234, pvsExportRate: 96.9, aiSummariesGenerated: 52100, aiAcceptanceRate: 96.1, patientSatisfactionScore: 4.9, timeSavedHours: 16909.1, costSavedEur: 507272.0,  snapshotDate: new Date() },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ═══════════════════════════════════════════════════════════════
  await prisma.auditLog.createMany({
    data: [
      { tenantId: t3.id, userId: a3_arzt1.id, action: 'VIEW_SESSION',         resource: `sessions/${s3_1.id}`,  ipAddress: '10.0.0.1' },
      { tenantId: t3.id, userId: a3_arzt1.id, action: 'CREATE_THERAPY_PLAN',  resource: 'therapy/plan',         ipAddress: '10.0.0.1' },
      { tenantId: t2.id, userId: a2_arzt1.id, action: 'ACKNOWLEDGE_RED_FLAG', resource: 'triage/event',         ipAddress: '10.0.0.2' },
      { tenantId: t1.id, userId: a1_arzt.id,  action: 'EXPORT_PVS',           resource: `sessions/${s1_1.id}`,  ipAddress: '10.0.0.3' },
      { tenantId: t3.id, userId: a3_mfa1.id,  action: 'NFC_CHECKIN',          resource: `sessions/${s3_13.id}`, ipAddress: '10.0.0.4' },
      { tenantId: t2.id, userId: a2_arzt1.id, action: 'CRITICAL_ALERT_ACK',   resource: `sessions/${s2_6.id}`,  ipAddress: '10.0.0.2' },
      { tenantId: t3.id, userId: a3_arzt1.id, action: 'CRITICAL_ALERT_ACK',   resource: `sessions/${s3_11.id}`, ipAddress: '10.0.0.1' },
    ],
  });

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  const totalPts = pts1.length + pts2.length + pts3.length;

  console.log('\n' + '═'.repeat(68));
  console.log('✅ DiggAI Demo-Complete-Seed erfolgreich abgeschlossen!');
  console.log('═'.repeat(68));
  console.log(`
📊 ERSTELLT:
  • 3 Demo-Praxen (STARTER / PROFESSIONAL / ENTERPRISE)
  • 13 Arzt-/MFA-Accounts (3 Tenants)
  • ${totalPts} Patienten (T1: ${pts1.length} | T2: ${pts2.length} | T3: ${pts3.length})
  • 30 Patientensessionen — alle Interaktionsflows abgedeckt
  • 4 Triage-Events (2× KRITISCH KARDIO, 1× KRITISCH PSYCH, 1× WARNING)
  • 5 ClinicalAlerts
  • 4 Therapiepläne (KI-generiert)
  • 12 Termine (inkl. 2× Notfall heute, 2× Telemedizin)
  • 5 PWA-Patienten-Accounts (DE/AR/RU/TR)
  • 3 Tagebuch-Einträge (PWA-Showcase)
  • 9 Wartezimmer-Inhalte (DE/AR/RU/TR/PL)
  • ROI-Analytics für alle 3 Praxen
  • 7 Audit-Log-Einträge

🗺️ INTERAKTIONSFLOWS (vollständig):
  Neupatienten:          P-10006, P-20002, P-30002, P-30007, P-30009, P-30014
  Wiederkehrende Pat.:   P-10001, P-10002, P-10003, P-20001, P-30001, P-30003
  KRITISCH (KARDIO):     P-20006 (STEMI), P-20001 (ACS)
  KRITISCH (PSYCH):      P-30011 (Suizidalität)
  WARNING:               P-10003 (Atemnot/Herzinsuffizienz)
  Rezept-Verlängerung:   P-10002, P-30010
  AU-Schein:             P-10009, P-30003
  Überweisung:           P-30005
  BG-Unfall:             P-10008 ← NEU
  Hausbesuch:            P-10005
  Telemedizin:           P-30012 ← NEU
  NFC Check-in:          P-30013 ← NEU
  Selbstzahler (IGeL):   P-30014 ← NEU
  Herzschrittmacher:     P-20007 ← NEU
  Multilingual (AR):     P-30002
  Multilingual (RU):     P-30003
  Multilingual (ES):     P-30005
  Multilingual (TR):     P-30009, P-30014 ← NEU
  Multilingual (PL):     P-30010 ← NEU
  PWA Portal Login:      P-30001, P-30002, P-30003, P-30012, P-30014
  MFA Queue:             Alle ACTIVE-Sessions (P-10006, P-20003, P-30007, P-30013)
  Admin ROI Dashboard:   ROI-Snapshots aller 3 Praxen

🔑 DEMO-ZUGANGSDATEN (alle Praxen):
  Passwort: ${DEMO_PW}   PIN: 1234

  Praxis 1 (Hausarzt):    demo-hausarzt
    admin / ${DEMO_PW}   |   arzt / ${DEMO_PW}   |   mfa / ${DEMO_PW}

  Praxis 2 (Kardiologie): demo-kardio
    admin / ${DEMO_PW}   |   herzmann / ${DEMO_PW}   |   dr-vogel / ${DEMO_PW}

  Praxis 3 (MVZ):         demo-mvz
    admin / ${DEMO_PW}   |   dr-schneider / ${DEMO_PW}
    dr-rahman / ${DEMO_PW}  |   dr-chen / ${DEMO_PW}
    mfa1 / ${DEMO_PW}       |   mfa2 / ${DEMO_PW}
`);
}

main()
  .catch((e: Error) => {
    console.error('❌ Demo-Complete-Seed fehlgeschlagen:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
