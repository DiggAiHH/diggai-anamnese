// @ts-nocheck
/**
 * seed-demo.ts — DiggAI Demo-Daten für den Humano/Ärzte-Pitch
 *
 * Erstellt realistische Musterdaten für 3 Praxen auf verschiedenen Plan-Stufen.
 * Demo-Tenants: Passwort aller Demo-Accounts: DiggAI2024!
 * Localhost-Default-Tenant: admin=praxis2026, arzt=arzt1234, mfa=mfa1234
 *
 * Ausführen: npx tsx prisma/seed-demo.ts
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
const LOCAL_ADMIN_PW = process.env.ARZT_PASSWORD || 'praxis2026';
const LOCAL_ARZT_PW = process.env.DEMO_ARZT_PASSWORD || 'arzt1234';
const LOCAL_MFA_PW = process.env.DEMO_MFA_PASSWORD || 'mfa1234';

// ─────────────────────────────────────────────────────────────────
// TENANT 1 — Hausarztpraxis Muster (STARTER)
// ─────────────────────────────────────────────────────────────────
const TENANT_HAUSARZT = {
  subdomain: 'demo-hausarzt',
  name: 'Hausarztpraxis Dr. Musterarzt',
  legalName: 'Dr. med. Klaus Musterarzt, Facharzt für Allgemeinmedizin',
  plan: 'STARTER' as const,
  status: 'ACTIVE' as const,
  visibility: 'DEMO' as const,
  primaryColor: '#2563eb',
  welcomeMessage: 'Willkommen in unserer Hausarztpraxis! Bitte füllen Sie den digitalen Fragebogen aus.',
  maxUsers: 5,
  maxPatientsPerMonth: 500,
  storageLimitMB: 1024,
  dsgvoAgreementSigned: true,
  dsgvoAgreementSignedAt: new Date('2024-01-15'),
  dataRegion: 'de',
};

// ─────────────────────────────────────────────────────────────────
// TENANT 2 — Kardiologische Fachpraxis (PROFESSIONAL)
// ─────────────────────────────────────────────────────────────────
const TENANT_KARDIO = {
  subdomain: 'demo-kardio',
  name: 'Kardiologische Praxis am Stadtpark',
  legalName: 'Prof. Dr. med. Herzmann & Partner GbR',
  plan: 'PROFESSIONAL' as const,
  status: 'ACTIVE' as const,
  visibility: 'DEMO' as const,
  primaryColor: '#dc2626',
  welcomeMessage: 'Herzlich willkommen in unserer kardiologischen Spezialpraxis. Ihre Herzgesundheit liegt uns am Herzen.',
  maxUsers: 15,
  maxPatientsPerMonth: 2000,
  storageLimitMB: 10240,
  dsgvoAgreementSigned: true,
  dsgvoAgreementSignedAt: new Date('2024-02-01'),
  dataRegion: 'de',
};

// ─────────────────────────────────────────────────────────────────
// TENANT 3 — MVZ DiggAI Digital Health Center (ENTERPRISE)
// ─────────────────────────────────────────────────────────────────
const TENANT_MVZ = {
  subdomain: 'demo-mvz',
  name: 'MVZ DiggAI Digital Health Center',
  legalName: 'DiggAI Medizinisches Versorgungszentrum GmbH',
  plan: 'ENTERPRISE' as const,
  status: 'ACTIVE' as const,
  visibility: 'DEMO' as const,
  primaryColor: '#7c3aed',
  welcomeMessage: 'Willkommen im MVZ DiggAI – KI-gestützte Medizin der Zukunft. Heute verfügbar.',
  maxUsers: 100,
  maxPatientsPerMonth: 10000,
  storageLimitMB: 102400,
  dsgvoAgreementSigned: true,
  dsgvoAgreementSignedAt: new Date('2024-03-01'),
  dataRegion: 'de',
};

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 DiggAI Demo-Seed startet...\n');

  const pwHash = await bcrypt.hash(DEMO_PW, 12);
  const localAdminHash = await bcrypt.hash(LOCAL_ADMIN_PW, 12);
  const localArztHash = await bcrypt.hash(LOCAL_ARZT_PW, 12);
  const localMfaHash = await bcrypt.hash(LOCAL_MFA_PW, 12);
  const pinHash = await bcrypt.hash('1234', 10);

  // ── Tenants ──────────────────────────────────────────────────
  console.log('📋 Erstelle Demo-Praxen...');

  await prisma.tenant.deleteMany({ where: { subdomain: { in: ['demo-hausarzt', 'demo-kardio', 'demo-mvz'] } } });

  const tDefault = await prisma.tenant.upsert({
    where: { subdomain: 'default' },
    update: {
      name: 'DiggAI Demo-Praxis (Localhost)',
      legalName: 'DiggAI Demo GmbH',
      visibility: 'PUBLIC',
      primaryColor: '#2563eb',
      welcomeMessage: 'Willkommen in der DiggAI Demo-Praxis! Dies ist die lokale Entwicklungsumgebung.',
      dsgvoAgreementSigned: true,
      dataRegion: 'de',
    },
    create: {
      subdomain: 'default',
      name: 'DiggAI Demo-Praxis (Localhost)',
      legalName: 'DiggAI Demo GmbH',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      primaryColor: '#2563eb',
      welcomeMessage: 'Willkommen in der DiggAI Demo-Praxis! Dies ist die lokale Entwicklungsumgebung.',
      maxUsers: 50,
      maxPatientsPerMonth: 5000,
      storageLimitMB: 10240,
      dsgvoAgreementSigned: true,
      dsgvoAgreementSignedAt: new Date(),
      dataRegion: 'de',
    },
  });

  const t1 = await prisma.tenant.create({ data: TENANT_HAUSARZT });
  const t2 = await prisma.tenant.create({ data: TENANT_KARDIO });
  const t3 = await prisma.tenant.create({ data: TENANT_MVZ });

  console.log(`  ✅ ${tDefault.name} [DEFAULT/LOCALHOST]`);
  console.log(`  ✅ ${t1.name} [STARTER]`);
  console.log(`  ✅ ${t2.name} [PROFESSIONAL]`);
  console.log(`  ✅ ${t3.name} [ENTERPRISE]`);

  // ── Subscriptions ─────────────────────────────────────────────
  await prisma.subscription.createMany({
    data: [
      { praxisId: t1.id, tier: 'STARTER', status: 'TRIAL', aiQuotaUsed: 23, aiQuotaTotal: 100, endsAt: new Date('2026-06-30') },
      { praxisId: t2.id, tier: 'PROFESSIONAL', status: 'ACTIVE', aiQuotaUsed: 847, aiQuotaTotal: 5000, endsAt: new Date('2027-02-01') },
      { praxisId: t3.id, tier: 'ENTERPRISE', status: 'ACTIVE', aiQuotaUsed: 12450, aiQuotaTotal: 999999, endsAt: new Date('2028-01-01') },
    ],
  });

  // ── Themes ───────────────────────────────────────────────────
  await prisma.tenantTheme.createMany({
    data: [
      {
        tenantId: t1.id,
        config: JSON.stringify({ primaryColor: '#2563eb', fontFamily: 'Inter', borderRadius: 'md', logoPosition: 'center' }),
        defaultMode: 'light', respectSystemPreference: true, allowPatientThemeSelection: false,
      },
      {
        tenantId: t2.id,
        config: JSON.stringify({ primaryColor: '#dc2626', fontFamily: 'Roboto', borderRadius: 'sm', logoPosition: 'left' }),
        defaultMode: 'light', respectSystemPreference: false, allowPatientThemeSelection: false,
      },
      {
        tenantId: t3.id,
        config: JSON.stringify({ primaryColor: '#7c3aed', fontFamily: 'Sora', borderRadius: 'xl', logoPosition: 'center', gradientEnabled: true }),
        defaultMode: 'system', respectSystemPreference: true, allowPatientThemeSelection: true,
      },
    ],
  });

  // ── ArztUsers ─────────────────────────────────────────────────
  console.log('\n👨‍⚕️ Erstelle Arzt-Accounts...');

  const [ad_admin, ad_arzt, ad_mfa] = await Promise.all([
    prisma.arztUser.create({ data: { tenantId: tDefault.id, username: 'admin', passwordHash: localAdminHash, pinHash, displayName: 'System Administrator', role: 'ADMIN', loginCount: 42, lastLoginAt: new Date() } }),
    prisma.arztUser.create({ data: { tenantId: tDefault.id, username: 'arzt', passwordHash: localArztHash, displayName: 'Dr. Demo (Localhost)', role: 'ARZT', loginCount: 15 } }),
    prisma.arztUser.create({ data: { tenantId: tDefault.id, username: 'mfa', passwordHash: localMfaHash, displayName: 'MFA Demo (Localhost)', role: 'MFA', loginCount: 30 } }),
  ]);

  // Tenant 1: Hausarzt
  const [a1_admin, a1_arzt, a1_mfa] = await Promise.all([
    prisma.arztUser.create({ data: { tenantId: t1.id, username: 'admin', passwordHash: pwHash, pinHash, displayName: 'Dr. Klaus Musterarzt', role: 'ADMIN', loginCount: 142, lastLoginAt: new Date() } }),
    prisma.arztUser.create({ data: { tenantId: t1.id, username: 'arzt', passwordHash: pwHash, displayName: 'Dr. Klaus Musterarzt', role: 'ARZT', loginCount: 89 } }),
    prisma.arztUser.create({ data: { tenantId: t1.id, username: 'mfa', passwordHash: pwHash, displayName: 'Sabine Müller (MFA)', role: 'MFA', loginCount: 234 } }),
  ]);

  // Tenant 2: Kardiologie
  const [a2_admin, a2_arzt1, a2_arzt2, a2_mfa] = await Promise.all([
    prisma.arztUser.create({ data: { tenantId: t2.id, username: 'admin', passwordHash: pwHash, pinHash, displayName: 'Prof. Dr. Hans Herzmann', role: 'ADMIN', loginCount: 512 } }),
    prisma.arztUser.create({ data: { tenantId: t2.id, username: 'herzmann', passwordHash: pwHash, displayName: 'Prof. Dr. Hans Herzmann', role: 'ARZT', loginCount: 387 } }),
    prisma.arztUser.create({ data: { tenantId: t2.id, username: 'dr-vogel', passwordHash: pwHash, displayName: 'Dr. med. Lisa Vogel', role: 'ARZT', loginCount: 201 } }),
    prisma.arztUser.create({ data: { tenantId: t2.id, username: 'mfa', passwordHash: pwHash, displayName: 'Team Rezeption', role: 'MFA', loginCount: 1024 } }),
  ]);

  // Tenant 3: MVZ
  const [a3_admin, a3_arzt1, a3_arzt2, a3_arzt3, a3_mfa1, a3_mfa2] = await Promise.all([
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'admin', passwordHash: pwHash, pinHash, displayName: 'Dr. Sarah Schneider (CMO)', role: 'ADMIN', loginCount: 892 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'dr-schneider', passwordHash: pwHash, displayName: 'Dr. Sarah Schneider', role: 'ARZT', loginCount: 445 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'dr-rahman', passwordHash: pwHash, displayName: 'Dr. Ahmad Rahman', role: 'ARZT', loginCount: 302 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'dr-chen', passwordHash: pwHash, displayName: 'Dr. Mei Chen', role: 'ARZT', loginCount: 178 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'mfa1', passwordHash: pwHash, displayName: 'Anna Kowalski (MFA)', role: 'MFA', loginCount: 1567 } }),
    prisma.arztUser.create({ data: { tenantId: t3.id, username: 'mfa2', passwordHash: pwHash, displayName: 'Omar Hassan (MFA)', role: 'MFA', loginCount: 983 } }),
  ]);

  console.log(`  ✅ Default: ${[ad_admin, ad_arzt, ad_mfa].length} Accounts`);
  console.log(`  ✅ Tenant 1: ${[a1_admin, a1_arzt, a1_mfa].length} Accounts`);
  console.log(`  ✅ Tenant 2: ${[a2_admin, a2_arzt1, a2_arzt2, a2_mfa].length} Accounts`);
  console.log(`  ✅ Tenant 3: ${[a3_admin, a3_arzt1, a3_arzt2, a3_arzt3, a3_mfa1, a3_mfa2].length} Accounts`);

  // ── Patients ──────────────────────────────────────────────────
  console.log('\n🧑‍🤝‍🧑 Erstelle Demo-Patienten...');

  const PATIENTS_T1 = [
    { email: 'max.schmidt@demo.de', name: 'Schmidt, Max', num: 'P-10001', birth: new Date('1965-03-14'), gender: 'M' },
    { email: 'anna.bauer@demo.de', name: 'Bauer, Anna', num: 'P-10002', birth: new Date('1978-07-22'), gender: 'W' },
    { email: 'thomas.weber@demo.de', name: 'Weber, Thomas', num: 'P-10003', birth: new Date('1945-11-05'), gender: 'M' },
    { email: 'maria.mueller@demo.de', name: 'Müller, Maria', num: 'P-10004', birth: new Date('1989-02-18'), gender: 'W' },
    { email: 'franz.hoffmann@demo.de', name: 'Hoffmann, Franz', num: 'P-10005', birth: new Date('1952-09-30'), gender: 'M' },
    { email: 'petra.klein@demo.de', name: 'Klein, Petra', num: 'P-10006', birth: new Date('1983-05-12'), gender: 'W' },
    { email: 'hans.fischer@demo.de', name: 'Fischer, Hans', num: 'P-10007', birth: new Date('1938-12-24'), gender: 'M' },
  ];

  const PATIENTS_T2 = [
    { email: 'walter.richter@demo.de', name: 'Richter, Walter', num: 'P-20001', birth: new Date('1951-06-08'), gender: 'M' },
    { email: 'ingrid.wolf@demo.de', name: 'Wolf, Ingrid', num: 'P-20002', birth: new Date('1963-10-19'), gender: 'W' },
    { email: 'dietmar.schroeder@demo.de', name: 'Schröder, Dietmar', num: 'P-20003', birth: new Date('1948-04-02'), gender: 'M' },
    { email: 'renate.neumann@demo.de', name: 'Neumann, Renate', num: 'P-20004', birth: new Date('1955-08-27'), gender: 'W' },
    { email: 'gerhard.braun@demo.de', name: 'Braun, Gerhard', num: 'P-20005', birth: new Date('1957-01-15'), gender: 'M' },
  ];

  const PATIENTS_T3 = [
    { email: 'stefan.jung@demo.de', name: 'Jung, Stefan', num: 'P-30001', birth: new Date('1990-04-17'), gender: 'M' },
    { email: 'fatima.al-rashid@demo.de', name: 'Al-Rashid, Fatima', num: 'P-30002', birth: new Date('1986-09-03'), gender: 'W' },
    { email: 'ivan.petrov@demo.de', name: 'Petrov, Ivan', num: 'P-30003', birth: new Date('1975-12-11'), gender: 'M' },
    { email: 'nguyen.thi.lan@demo.de', name: 'Nguyen, Thi Lan', num: 'P-30004', birth: new Date('1993-07-28'), gender: 'W' },
    { email: 'carlos.garcia@demo.de', name: 'García, Carlos', num: 'P-30005', birth: new Date('1968-03-22'), gender: 'M' },
    { email: 'elena.kovacs@demo.de', name: 'Kovács, Elena', num: 'P-30006', birth: new Date('1981-11-09'), gender: 'W' },
    { email: 'james.okonkwo@demo.de', name: 'Okonkwo, James', num: 'P-30007', birth: new Date('1979-05-14'), gender: 'M' },
    { email: 'yuki.tanaka@demo.de', name: 'Tanaka, Yuki', num: 'P-30008', birth: new Date('1995-08-06'), gender: 'W' },
  ];

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

  console.log(`  ✅ ${pts1.length + pts2.length + pts3.length} Patienten erstellt`);

  // ── PatientSessions ───────────────────────────────────────────
  console.log('\n📋 Erstelle Patientensessionen mit Anamnese-Daten...');

  // Tenant 1 Sessions
  const s1_1 = await prisma.patientSession.create({
    data: {
      tenantId: t1.id, patientId: pts1[0].id, isNewPatient: false,
      gender: 'M', birthDate: pts1[0].birthDate, encryptedName: 'DEMO:Schmidt, Max',
      status: 'COMPLETED', selectedService: 'TERMIN',
      insuranceType: 'GKV', assignedArztId: a1_arzt.id,
      pvsExported: true, pvsExportedAt: new Date(),
      aiSummary: 'Patient Max Schmidt (58 J., m) stellt sich mit Rückenschmerzen vor. Seit 3 Wochen LWS-Schmerzen, ausstrahlend in das linke Bein (Ischialgie V.a.). Bekannte arterielle Hypertonie, Diabetes Typ 2. Medikamente: Metformin 1000mg, Ramipril 5mg, ASS 100mg. Empfehlung: MRT LWS, Physiotherapie, Schmerztherapie. Kein Red Flag-Kriterium.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  const s1_2 = await prisma.patientSession.create({
    data: {
      tenantId: t1.id, patientId: pts1[1].id, isNewPatient: false,
      gender: 'W', birthDate: pts1[1].birthDate, encryptedName: 'DEMO:Bauer, Anna',
      status: 'COMPLETED', selectedService: 'REZEPT',
      insuranceType: 'GKV', assignedArztId: a1_arzt.id,
      aiSummary: 'Patientin Anna Bauer (45 J., w) beantragt Rezept-Verlängerung für Levothyroxin 75μg (Schilddrüsenunterfunktion seit 8 Jahren). Werte zuletzt im April 2024 gut eingestellt. Keine aktuellen Beschwerden.',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  const s1_3 = await prisma.patientSession.create({
    data: {
      tenantId: t1.id, patientId: pts1[2].id, isNewPatient: false,
      gender: 'M', birthDate: pts1[2].birthDate, encryptedName: 'DEMO:Weber, Thomas',
      status: 'SUBMITTED', selectedService: 'TERMIN',
      insuranceType: 'PKV', assignedArztId: a1_arzt.id,
      aiSummary: 'Patient Thomas Weber (78 J., m) berichtet über zunehmende Atemnot seit 2 Wochen, auch in Ruhe. Bekannte KHK mit Stent (2019), Herzinsuffizienz NYHA II. ⚠️ RED FLAG: Atemnot in Ruhe + Herzinsuffizienz → Notfallvorstellung empfohlen.',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  // Tenant 2 Sessions (Kardiologie)
  const s2_1 = await prisma.patientSession.create({
    data: {
      tenantId: t2.id, patientId: pts2[0].id, isNewPatient: false,
      gender: 'M', birthDate: pts2[0].birthDate, encryptedName: 'DEMO:Richter, Walter',
      status: 'COMPLETED', selectedService: 'TERMIN',
      insuranceType: 'GKV', assignedArztId: a2_arzt1.id,
      aiSummary: 'Patient Walter Richter (72 J., m): Brustschmerzen bei Belastung seit 3 Tagen. Ausstrahlung in linken Arm. Bekannte KHK (Stent LAD 2022), Bluthochdruck, Hypercholesterinämie. Medikamente: Bisoprolol 5mg, Atorvastatin 40mg, ASS 100mg, Pantoprazol 40mg. ⚠️ KRITISCH: Angina-Pectoris-Symptomatik bei KHK-Vorgeschichte. Dringliche kardiologische Untersuchung erforderlich.',
      pvsExported: true,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  const s2_2 = await prisma.patientSession.create({
    data: {
      tenantId: t2.id, patientId: pts2[1].id, isNewPatient: true,
      gender: 'W', birthDate: pts2[1].birthDate, encryptedName: 'DEMO:Wolf, Ingrid',
      status: 'COMPLETED', selectedService: 'TERMIN',
      insuranceType: 'PKV', assignedArztId: a2_arzt2.id,
      aiSummary: 'Neupatientin Ingrid Wolf (60 J., w): Erstvorstellung wegen Herzrhythmusstörungen. Palpitationen seit 6 Monaten, unregelmäßiger Puls. EKG ausstehend. Keine bekannten Herzerkrankungen. Keine Dauermedikation. Empfehlung: Langzeit-EKG, Echokardiographie, Labor (TSH, Elektrolyte).',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  const s2_3 = await prisma.patientSession.create({
    data: {
      tenantId: t2.id, patientId: pts2[2].id, isNewPatient: false,
      gender: 'M', birthDate: pts2[2].birthDate, encryptedName: 'DEMO:Schröder, Dietmar',
      status: 'ACTIVE', selectedService: 'TERMIN',
      insuranceType: 'GKV', assignedArztId: a2_arzt1.id,
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  // Tenant 3 Sessions (MVZ - Showcase aller Features)
  const s3_sessions = await Promise.all([
    prisma.patientSession.create({
      data: {
        tenantId: t3.id, patientId: pts3[0].id, isNewPatient: false,
        gender: 'M', birthDate: pts3[0].birthDate, encryptedName: 'DEMO:Jung, Stefan',
        status: 'COMPLETED', selectedService: 'TERMIN',
        insuranceType: 'GKV', assignedArztId: a3_arzt1.id,
        aiSummary: 'Stefan Jung (34 J., m): Erschöpfung, Konzentrationsprobleme seit 2 Monaten. Gewichtszunahme 8 kg in 6 Monaten. Verdacht: Schilddrüsenunterfunktion (TSH erhöht?), Burnout. Empfehlung: TSH, fT3, fT4, BB, Ferritin. Psychologische Mitbetreuung erwägen.',
        pvsExported: true,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    }),
    prisma.patientSession.create({
      data: {
        tenantId: t3.id, patientId: pts3[1].id, isNewPatient: true,
        gender: 'W', birthDate: pts3[1].birthDate, encryptedName: 'DEMO:Al-Rashid, Fatima',
        status: 'COMPLETED', selectedService: 'TERMIN',
        insuranceType: 'GKV', assignedArztId: a3_arzt2.id,
        aiSummary: 'Neupatientin Fatima Al-Rashid (37 J., w, arabischsprachig): Bauchschmerzen seit 1 Woche, Übelkeit, kein Erbrechen. Zuletzt Ramadan (Fasten). Verdacht: Gastritis oder funktionelle Dyspepsie. Empfehlung: H. pylori-Test, ggf. Gastroskopie. Fragebogen auf Arabisch ausgefüllt – Sprachbarriere überwunden durch DiggAI-Multilingual.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    }),
    prisma.patientSession.create({
      data: {
        tenantId: t3.id, patientId: pts3[2].id, isNewPatient: false,
        gender: 'M', birthDate: pts3[2].birthDate, encryptedName: 'DEMO:Petrov, Ivan',
        status: 'COMPLETED', selectedService: 'AU',
        insuranceType: 'GKV', assignedArztId: a3_arzt3.id,
        aiSummary: 'Ivan Petrov (48 J., m, russischsprachig): AU-Verlängerung wegen grippaler Infekt. Fieber 38,4°C, Husten, Gliederschmerzen seit 5 Tagen. Fragebogen auf Russisch ausgefüllt. Empfehlung: AU verlängern 3 Tage, bei Verschlechterung Wiedervorstellung.',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    }),
    prisma.patientSession.create({
      data: {
        tenantId: t3.id, patientId: pts3[4].id, isNewPatient: false,
        gender: 'M', birthDate: pts3[4].birthDate, encryptedName: 'DEMO:García, Carlos',
        status: 'COMPLETED', selectedService: 'UEBERWEISUNG',
        insuranceType: 'GKV', assignedArztId: a3_arzt1.id,
        aiSummary: 'Carlos García (55 J., m, spanischsprachig): Überweisung zur Orthopädie wegen Knieschmerzen rechts. Gonarthrose V.a. Fragebogen auf Spanisch. Empfehlung: Röntgen Knie bds., Orthopädie-Überweisung.',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    }),
    prisma.patientSession.create({
      data: {
        tenantId: t3.id, patientId: pts3[6].id, isNewPatient: true,
        gender: 'M', birthDate: pts3[6].birthDate, encryptedName: 'DEMO:Okonkwo, James',
        status: 'ACTIVE', selectedService: 'TERMIN',
        insuranceType: 'SZ', assignedArztId: a3_arzt2.id,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        updatedAt: new Date(),
      },
    }),
  ]);

  console.log(`  ✅ ${2 + 3 + s3_sessions.length} Sessionen erstellt`);

  // ── Triage Events (Red Flags) ─────────────────────────────────
  console.log('\n🚨 Erstelle klinische Alarme (Triage)...');

  await prisma.triageEvent.createMany({
    data: [
      {
        sessionId: s1_3.id, atomId: 'ATM-ATEMDOT',
        level: 'CRITICAL',
        triggerValues: JSON.stringify({ symptom: 'Atemnot in Ruhe', duration: 'seit 2 Wochen' }),
        message: 'NOTFALL-WARNUNG: Atemnot in Ruhe bei bekannter Herzinsuffizienz. Sofortige kardiologische Vorstellung oder Notaufnahme notwendig.',
        acknowledgedBy: a1_arzt.id,
        acknowledgedAt: new Date(),
      },
      {
        sessionId: s2_1.id, atomId: 'ATM-BRUSTSCHMERZ',
        level: 'CRITICAL',
        triggerValues: JSON.stringify({ symptom: 'Brustschmerz mit Ausstrahlung', vorerkrankung: 'KHK + Stent' }),
        message: 'KRITISCH: Klassische Angina-Pectoris-Symptomatik bei gesicherter KHK. ACS nicht auszuschließen. Dringendes EKG + Troponin erforderlich.',
        acknowledgedBy: a2_arzt1.id,
        acknowledgedAt: new Date(),
      },
      {
        sessionId: s3_sessions[0].id, atomId: 'ATM-GEWICHT',
        level: 'WARNING',
        triggerValues: JSON.stringify({ gewichtszunahme: '8 kg in 6 Monaten', symptome: 'Erschöpfung + Konzentrationsprobleme' }),
        message: 'HINWEIS: Ungewollte Gewichtszunahme + Erschöpfung. Schilddrüsenfunktion und Diabetes abklären.',
      },
    ],
  });

  // ── Therapy Plans ─────────────────────────────────────────────
  console.log('\n💊 Erstelle Therapiepläne...');

  await prisma.therapyPlan.createMany({
    data: [
      {
        sessionId: s1_1.id, tenantId: t1.id, patientId: pts1[0].id,
        planText: `THERAPIEPLAN — Max Schmidt (P-10001)

DIAGNOSEN:
• M54.4 – Lumboischialgie links
• I10 – Arterielle Hypertonie (bekannt, gut eingestellt)
• E11.9 – Diabetes mellitus Typ 2 (bekannt)

MASSNAHMEN:
1. MRT Lendenwirbelsäule ohne KM → Radiologie Stadtmitte
2. Physiotherapie LWS: 10 Einheiten à 45 Min (Verordnung ausgestellt)
3. Schmerztherapie: Ibuprofen 400mg 3×1 (max. 5 Tage), bei Bedarf Metamizol
4. Arbeitsunfähigkeitsbescheinigung: 7 Tage
5. Wiedervorstellung in 2 Wochen mit MRT-Befund

KI-HINWEIS: Kauda-Equina-Syndrom durch klinische Untersuchung ausgeschlossen.`,
        estimatedDuration: '4 Wochen',
        priority: 'MEDIUM',
        status: 'ACTIVE',
        createdById: a1_arzt.id,
      },
      {
        sessionId: s2_1.id, tenantId: t2.id, patientId: pts2[0].id,
        planText: `KARDIOLOGISCHER THERAPIEPLAN — Walter Richter (P-20001)

DIAGNOSEN (KI-Vorschlag, Bestätigung durch Arzt erforderlich):
• I25.1 – KHK mit Stent (LAD 2022) → bekannt
• I20.0 – V.a. instabile Angina pectoris

SOFORTMASSNAHMEN:
1. 12-Kanal-EKG → SOFORT
2. Troponin I/T + CK-MB → SOFORT
3. BNP/NT-proBNP → SOFORT

WEITERES PROZEDERE:
4. Ergometrie oder Myokardszintigraphie nach ACS-Ausschluss
5. Echokardiographie (LV-Funktion?)
6. Optimierung: Statin hochdosieren (Atorvastatin 80mg), ACE-Hemmer ergänzen?
7. Herzkatheterlabor-Vorstellung bei Ischämienachweis

MEDIKATION ÜBERPRÜFEN:
• Bisoprolol 5mg → ggf. erhöhen
• ASS 100mg + Clopidogrel? → Duale Thrombozytenaggregationshemmung?`,
        estimatedDuration: '6 Wochen',
        priority: 'HIGH',
        status: 'ACTIVE',
        createdById: a2_arzt1.id,
      },
      {
        sessionId: s3_sessions[0].id, tenantId: t3.id, patientId: pts3[0].id,
        planText: `MVZ DIGITAL HEALTH — THERAPIEPLAN — Stefan Jung (P-30001)

KI-GENERIERTER PLAN (Revision durch Dr. Schneider):

VERDACHTSDIAGNOSEN:
• E03.9 – V.a. Hypothyreose
• Z73.0 – Burnout-Syndrom (ICD-10: V.a.)

DIAGNOSTIK:
1. Labor: TSH, fT3, fT4, BB, Diff-BB, CRP, BSG, Ferritin, Vit D, Vit B12, HbA1c
2. Schlafapnoe-Screening (Epworth-Schläfrigkeitsskala → positiv?)
3. PHQ-9 Depressions-Screening → Digital über PWA-App ausgefüllt: 14/27 (moderate Depression)

THERAPIE:
4. Wenn Hypothyreose bestätigt: Levothyroxin einschleichen
5. Psychosomatische Mitbetreuung → Überweisung Dr. Koller (Psychiatrie)
6. Schlaf-Hygiene-Schulung + Stressmanagement → DiggAI PWA-Tagebuch aktiviert
7. Sport-Rezept: Ausdauer 150 Min/Woche

PWA-FEATURES AKTIV:
• Tagebuch-Tracking: Stimmung, Schlaf, Energie
• Medikamenten-Erinnerung eingerichtet
• Telemedizin-Folge-Termin in 3 Wochen`,
        estimatedDuration: '12 Wochen',
        priority: 'MEDIUM',
        status: 'ACTIVE',
        createdById: a3_arzt1.id,
      },
    ],
  });

  // ── Clinical Alerts ───────────────────────────────────────────
  await prisma.clinicalAlert.createMany({
    data: [
      {
        sessionId: s1_3.id, patientId: pts1[2].id, tenantId: t1.id,
        type: 'EMERGENCY', severity: 'CRITICAL',
        description: 'Atemnot in Ruhe bei bekannter Herzinsuffizienz und KHK-Stent. Sofortige kardiologische Evaluation erforderlich.',
        resolved: false,
      },
      {
        sessionId: s2_1.id, patientId: pts2[0].id, tenantId: t2.id,
        type: 'CARDIAC', severity: 'CRITICAL',
        description: 'ACS nicht ausgeschlossen. KHK-Patient mit neuen Brustschmerzen und Ausstrahlung in linken Arm.',
        resolved: false,
      },
      {
        sessionId: s2_1.id, patientId: pts2[0].id, tenantId: t2.id,
        type: 'MEDICATION', severity: 'WARNING',
        description: 'Mögliche Interaktion: ASS + Xarelto nicht dokumentiert. Bitte Medikamentenliste vervollständigen.',
        resolved: true,
      },
    ],
  });

  console.log('  ✅ Therapiepläne und klinische Alarme erstellt');

  // ── Appointments ──────────────────────────────────────────────
  console.log('\n📅 Erstelle Termine...');

  const baseDate = new Date();
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.appointment.createMany({
    data: [
      // Tenant 1
      {
        tenantId: t1.id, patientId: pts1[0].id, arztId: a1_arzt.id,
        scheduledAt: new Date(tomorrow.setHours(9, 0, 0, 0)),
        duration: 20, type: 'ERSTGESPRAECH', status: 'SCHEDULED',
        notes: 'MRT-Befund besprechen, Physiotherapie-Verordnung',
      },
      {
        tenantId: t1.id, patientId: pts1[3].id, arztId: a1_arzt.id,
        scheduledAt: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),
        duration: 15, type: 'KONTROLLTERMIN', status: 'SCHEDULED',
        notes: 'Blutdruck-Kontrolle, HbA1c-Ergebnis',
      },
      {
        tenantId: t1.id, patientId: pts1[4].id, arztId: a1_arzt.id,
        scheduledAt: new Date(new Date(tomorrow).setHours(11, 30, 0, 0)),
        duration: 30, type: 'HAUSBESUCH', status: 'SCHEDULED',
        notes: 'Patient ist gehbehindert',
      },
      // Tenant 2
      {
        tenantId: t2.id, patientId: pts2[0].id, arztId: a2_arzt1.id,
        scheduledAt: new Date(new Date(baseDate).setHours(14, 0, 0, 0)),
        duration: 45, type: 'DRINGEND', status: 'SCHEDULED',
        notes: '⚠️ DRINGEND: V.a. instabile Angina. EKG + Troponin sofort.',
      },
      {
        tenantId: t2.id, patientId: pts2[1].id, arztId: a2_arzt2.id,
        scheduledAt: new Date(new Date(tomorrow).setHours(9, 30, 0, 0)),
        duration: 30, type: 'ERSTGESPRAECH', status: 'SCHEDULED',
        notes: 'Langzeit-EKG Auswertung, Erstvorstellung',
      },
      // Tenant 3
      {
        tenantId: t3.id, patientId: pts3[0].id, arztId: a3_arzt1.id,
        scheduledAt: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),
        duration: 20, type: 'TELEMEDIZIN', status: 'SCHEDULED',
        notes: 'Video-Folge-Termin: Laborergebnisse besprechen. DiggAI Telemedizin-Link wurde gesendet.',
      },
      {
        tenantId: t3.id, patientId: pts3[1].id, arztId: a3_arzt2.id,
        scheduledAt: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
        duration: 20, type: 'KONTROLLTERMIN', status: 'SCHEDULED',
        notes: 'H. pylori-Ergebnis. Arabisch-sprachige Patientin (Sprachmittler vorhanden).',
      },
    ],
  });

  console.log('  ✅ Termine erstellt');

  // ── WaitingContent ────────────────────────────────────────────
  console.log('\n📺 Erstelle Wartezimmer-Inhalte...');

  await prisma.waitingContent.createMany({
    data: [
      // Tenant 3 – Enterprise showcase
      {
        tenantId: t3.id,
        title: 'Herzgesundheit: 5 Fakten die Sie kennen sollten',
        body: 'Wussten Sie, dass regelmäßige Bewegung das Herzinfarkt-Risiko um bis zu 35% senkt? Sprechen Sie uns auf unser Herzcheck-Angebot an.',
        type: 'INFO',
        category: 'PRAEVENTION',
        language: 'de',
        isActive: true, isPriority: false,
        displayDuration: 15,
        priority: 2,
        views: 1247, likes: 89,
      },
      {
        tenantId: t3.id,
        title: 'Ihr digitaler Gesundheitsbegleiter',
        body: 'Mit der DiggAI Patienten-App behalten Sie Ihre Medikamente, Termine und Befunde immer im Blick. Fragen Sie unsere MFA nach der App-Aktivierung.',
        type: 'WERBUNG',
        category: 'DIGITAL',
        language: 'de',
        isActive: true, isPriority: true,
        displayDuration: 20,
        priority: 1,
        views: 3892, likes: 312,
      },
      {
        tenantId: t3.id,
        title: 'مرحباً بكم في مركزنا الطبي',
        body: 'نوفر خدماتنا الطبية بالعربية. يمكنكم ملء الاستمارة الطبية باللغة العربية.',
        type: 'INFO',
        category: 'MEHRSPRACHIG',
        language: 'ar',
        isActive: true, isPriority: false,
        displayDuration: 12,
        priority: 3,
        views: 543, likes: 67,
      },
      {
        tenantId: t3.id,
        title: 'Добро пожаловать в наш медицинский центр',
        body: 'Мы предоставляем услуги на русском языке. Анкета доступна на русском.',
        type: 'INFO',
        category: 'MEHRSPRACHIG',
        language: 'ru',
        isActive: true, isPriority: false,
        displayDuration: 12,
        priority: 4,
        views: 289, likes: 34,
      },
      {
        tenantId: t3.id,
        title: 'Datenschutz & Ihre Rechte (DSGVO)',
        body: 'Ihre Daten sind bei uns mit AES-256-Verschlüsselung geschützt. Alle 7 DSGVO-Grundsätze werden eingehalten. Mehr Infos: datenschutz.diggai.de',
        type: 'RECHTLICH',
        category: 'DSGVO',
        language: 'de',
        isActive: true, isPriority: false,
        displayDuration: 18,
        priority: 5,
        views: 2156, likes: 178,
      },
      // Tenant 1 Hausarzt
      {
        tenantId: t1.id,
        title: 'Grippeschutzimpfung 2024/25 – jetzt verfügbar',
        body: 'Schützen Sie sich und Ihre Familie! Die Grippeschutzimpfung ist ab sofort verfügbar. Sprechen Sie uns an.',
        type: 'INFO',
        category: 'IMPFUNG',
        language: 'de',
        isActive: true, isPriority: true,
        displayDuration: 15,
        priority: 1,
        views: 892, likes: 124,
      },
      // Tenant 2 Kardio
      {
        tenantId: t2.id,
        title: 'Herzcheck 2024 – Kennen Sie Ihre Werte?',
        body: 'Blutdruck, Cholesterin, EKG – unser Herzcheck-Paket gibt Ihnen Sicherheit. Jetzt anfragen.',
        type: 'INFO',
        category: 'PRAEVENTION',
        language: 'de',
        isActive: true, isPriority: true,
        displayDuration: 20,
        priority: 1,
        views: 1423, likes: 287,
      },
    ],
  });

  // ── PatientAccounts (PWA) ─────────────────────────────────────
  console.log('\n📱 Erstelle PWA-Patienten-Accounts...');

  await prisma.patientAccount.createMany({
    data: [
      {
        patientId: pts3[0].id,
        pin: await bcrypt.hash('9876', 10),
        registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isActive: true,
        locale: 'de',
      },
      {
        patientId: pts3[1].id,
        pin: await bcrypt.hash('5544', 10),
        registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isActive: true,
        locale: 'ar',
      },
      {
        patientId: pts3[2].id,
        pin: await bcrypt.hash('1122', 10),
        registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        isActive: true,
        locale: 'ru',
      },
    ],
  });

  // ── ROI Snapshots ─────────────────────────────────────────────
  console.log('\n📊 Erstelle ROI-Analytics...');

  await prisma.rOISnapshot.createMany({
    data: [
      {
        tenantId: t1.id,
        sessionsTotal: 1247, sessionsThisMonth: 89,
        avgTimePerSession: 4.2,
        redFlagsTotal: 12, redFlagsAcknowledged: 12,
        pvsExportTotal: 1189, pvsExportRate: 95.3,
        aiSummariesGenerated: 1105, aiAcceptanceRate: 91.2,
        patientSatisfactionScore: 4.6,
        timeSavedHours: 312.5,
        costSavedEur: 9375.0,
        snapshotDate: new Date(),
      },
      {
        tenantId: t2.id,
        sessionsTotal: 8934, sessionsThisMonth: 743,
        avgTimePerSession: 3.8,
        redFlagsTotal: 89, redFlagsAcknowledged: 87,
        pvsExportTotal: 8712, pvsExportRate: 97.5,
        aiSummariesGenerated: 8823, aiAcceptanceRate: 94.7,
        patientSatisfactionScore: 4.8,
        timeSavedHours: 2678.2,
        costSavedEur: 80346.0,
        snapshotDate: new Date(),
      },
      {
        tenantId: t3.id,
        sessionsTotal: 52841, sessionsThisMonth: 4102,
        avgTimePerSession: 3.2,
        redFlagsTotal: 412, redFlagsAcknowledged: 408,
        pvsExportTotal: 51234, pvsExportRate: 96.9,
        aiSummariesGenerated: 52100, aiAcceptanceRate: 96.1,
        patientSatisfactionScore: 4.9,
        timeSavedHours: 16909.1,
        costSavedEur: 507272.0,
        snapshotDate: new Date(),
      },
    ],
  });

  // ── Diary Entries (PWA Showcase) ──────────────────────────────
  console.log('\n📓 Erstelle Tagebuch-Einträge (PWA)...');

  await prisma.diaryEntry.createMany({
    data: [
      {
        patientId: pts3[0].id, tenantId: t3.id,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        mood: 5, sleepHours: 6.5, energyLevel: 4,
        notes: 'Heute etwas besser. Habe die Medikamente rechtzeitig genommen. Kopfschmerzen am Nachmittag.',
        symptoms: JSON.stringify(['Kopfschmerzen', 'Müdigkeit']),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: pts3[0].id, tenantId: t3.id,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        mood: 3, sleepHours: 5.0, energyLevel: 2,
        notes: 'Sehr schlecht geschlafen. Gedanken kreisen. Arzttermin morgen.',
        symptoms: JSON.stringify(['Schlafstörungen', 'Konzentrationsprobleme', 'Erschöpfung']),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        patientId: pts3[0].id, tenantId: t3.id,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        mood: 4, sleepHours: 7.0, energyLevel: 5,
        notes: 'Heute Sport gemacht (30 Min Spazieren). Fühlt sich gut an.',
        symptoms: JSON.stringify([]),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // ── Audit Log Entries ─────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { tenantId: t3.id, userId: a3_arzt1.id, action: 'VIEW_SESSION', resource: `sessions/${s3_sessions[0].id}`, ipAddress: '10.0.0.1' },
      { tenantId: t3.id, userId: a3_arzt1.id, action: 'CREATE_THERAPY_PLAN', resource: `therapy/plan`, ipAddress: '10.0.0.1' },
      { tenantId: t2.id, userId: a2_arzt1.id, action: 'ACKNOWLEDGE_RED_FLAG', resource: `triage/event`, ipAddress: '10.0.0.2' },
      { tenantId: t1.id, userId: a1_arzt.id, action: 'EXPORT_PVS', resource: `sessions/${s1_1.id}`, ipAddress: '10.0.0.3' },
    ],
  });

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅ DiggAI Demo-Seed erfolgreich abgeschlossen!');
  console.log('═'.repeat(60));
  console.log(`
📊 ERSTELLT:
  • 3 Demo-Praxen (STARTER / PROFESSIONAL / ENTERPRISE)
  • ${[a1_admin, a1_arzt, a1_mfa, a2_admin, a2_arzt1, a2_arzt2, a2_mfa, a3_admin, a3_arzt1, a3_arzt2, a3_arzt3, a3_mfa1, a3_mfa2].length} Arzt-Accounts
  • ${pts1.length + pts2.length + pts3.length} Demo-Patienten (6 Sprachen)
  • ${2 + 3 + s3_sessions.length} Patientensessionen mit KI-Zusammenfassungen
  • 3 Therapiepläne (KI-generiert)
  • 3 Klinische Alarme (davon 2 KRITISCH)
  • 3 Triage-Events (Red Flags)
  • 7 Wartezimmer-Inhalte (DE/AR/RU)
  • 3 PWA-Patienten-Accounts (DE/AR/RU)
  • 3 Tagebuch-Einträge (PWA-Showcase)
  • ROI-Analytics für alle 3 Praxen

🔑 DEMO-ZUGANGSDATEN:
  Demo-Tenants Passwort: ${DEMO_PW}
  PIN:                    1234

  Localhost (Default):    default
    Admin:   admin / ${LOCAL_ADMIN_PW}
    Arzt:    arzt  / ${LOCAL_ARZT_PW}
    MFA:     mfa   / ${LOCAL_MFA_PW}

  Praxis 1 (Hausarzt):   https://demo-hausarzt.diggai.de
    Admin:   admin / ${DEMO_PW}
    Arzt:    arzt  / ${DEMO_PW}
    MFA:     mfa   / ${DEMO_PW}

  Praxis 2 (Kardiologie): https://demo-kardio.diggai.de
    Admin:   admin     / ${DEMO_PW}
    Arzt 1:  herzmann  / ${DEMO_PW}
    Arzt 2:  dr-vogel  / ${DEMO_PW}

  Praxis 3 (MVZ):         https://demo-mvz.diggai.de
    Admin:   admin        / ${DEMO_PW}
    Arzt:    dr-schneider / ${DEMO_PW}

🌍 SPRACH-SHOWCASE:
  Fatima Al-Rashid → Arabisch
  Ivan Petrov      → Russisch
  Carlos García    → Spanisch
  (Zeigt: DiggAI überwindet Sprachbarrieren in der Praxis)

💰 ROI ENTERPRISE (Praxis 3):
  • 52.841 Sessionen verarbeitet
  • 16.909 Stunden Arztzeit gespart
  • 507.272 € Kosteneinsparung (hochgerechnet)
  • 96,1% KI-Akzeptanzrate
`);
}

main()
  .catch((e: Error) => {
    console.error('❌ Demo-Seed fehlgeschlagen:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
