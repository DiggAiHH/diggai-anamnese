/**
 * DiggAI Anamnese — Comprehensive Seed Script
 * Erstellt 50+ realistische Patienten mit vollständigen medizinischen Daten
 * 
 * Nutzung: npm run db:seed:full
 * Oder:    npx tsx prisma/seed-comprehensive.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Hilfsfunktionen ────────────────────────────────────────

function hashEmail(email: string): string {
    const salt = 'diggai-anamnese-salt-2026';
    return crypto.createHash('sha256').update(email + salt).digest('hex');
}

function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function uuid(): string {
    return crypto.randomUUID();
}

// ─── Staff Users ────────────────────────────────────────────

const STAFF_USERS = [
    { username: 'admin', displayName: 'Dr. Klaproth', role: 'ARZT' },
    { username: 'mfa', displayName: 'Sandra Meier', role: 'MFA' },
    { username: 'admin2', displayName: 'System Administrator', role: 'ADMIN' },
    { username: 'arzt2', displayName: 'Dr. Fischer', role: 'ARZT' },
    { username: 'mfa2', displayName: 'Anna Weber', role: 'MFA' },
];

// ─── Patienten-Profile ──────────────────────────────────────

interface PatientProfile {
    name: string;
    email: string;
    age: number;
    gender: 'M' | 'W' | 'D';
    insurance: string;
    service: string;
    status: string;
    isNewPatient: boolean;
    condition?: string;
    triage?: { level: string; rule: string; message: string };
    accident?: { bgName: string; date: string; location: string; description: string; firstResponder?: string };
    medications?: { name: string; dosage: string; frequency: string }[];
    surgeries?: { name: string; date: string; complications?: string }[];
    chatMessages?: { sender: string; text: string }[];
}

const PATIENTS: PatientProfile[] = [
    // ─── CRITICAL Red Flags (4) ─────────────────────────────
    {
        name: 'Thomas Müller', email: 'thomas.mueller@test.de', age: 58, gender: 'M',
        insurance: 'GKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: false,
        condition: 'Brustschmerzen >20min, Ausstrahlung linker Arm',
        triage: { level: 'CRITICAL', rule: 'ACS', message: 'SOFORT: Brustschmerzen >20 Min mit Ausstrahlung — V.a. ACS. EKG + Troponin + Notarzt!' },
        medications: [
            { name: 'Metoprolol', dosage: '47.5mg', frequency: '1-0-0' },
            { name: 'ASS', dosage: '100mg', frequency: '1-0-0' },
            { name: 'Ramipril', dosage: '5mg', frequency: '1-0-0' },
        ],
        chatMessages: [
            { sender: 'PATIENT', text: 'Ich habe seit heute morgen starke Brustschmerzen, die in den linken Arm ausstrahlen.' },
            { sender: 'ARZT', text: 'Herr Müller, bitte kommen Sie SOFORT in die Praxis oder rufen Sie den Rettungsdienst (112)!' },
            { sender: 'PATIENT', text: 'Ich bin schon unterwegs.' },
        ],
    },
    {
        name: 'Helga Braun', email: 'helga.braun@test.de', age: 81, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: false,
        condition: 'Plötzliche Bewusstlosigkeit beim Aufstehen',
        triage: { level: 'CRITICAL', rule: 'Synkope', message: 'WARNUNG: Synkope bei 81-jähriger Patientin — kardiale Ursache ausschließen!' },
        medications: [
            { name: 'Marcumar', dosage: '3mg', frequency: '1-0-0' },
            { name: 'Digitoxin', dosage: '0.07mg', frequency: '1-0-0' },
        ],
        surgeries: [{ name: 'Hüft-TEP rechts', date: '2019', complications: 'keine' }],
        chatMessages: [
            { sender: 'PATIENT', text: 'Ich bin heute beim Aufstehen ohnmächtig geworden.' },
            { sender: 'ARZT', text: 'Frau Braun, das ist sehr ernst. Bitte lassen Sie sich sofort bringen oder rufen Sie 112.' },
        ],
    },
    {
        name: 'Stefan Kruger', email: 'stefan.kruger@test.de', age: 42, gender: 'M',
        insurance: 'PKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: true,
        condition: 'Stärkster Kopfschmerz des Lebens, plötzlich aufgetreten',
        triage: { level: 'CRITICAL', rule: 'SAH', message: 'SOFORT: Vernichtungskopfschmerz — V.a. Subarachnoidalblutung. CT + Neurologie!' },
    },
    {
        name: 'Lisa Weber', email: 'lisa.weber@test.de', age: 35, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: false,
        condition: 'Suizidgedanken, Hoffnungslosigkeit seit 2 Wochen',
        triage: { level: 'CRITICAL', rule: 'Suizid', message: 'SOFORT: Akute Suizidalität — Patient NICHT alleine lassen! Psychiatrische Notaufnahme!' },
        medications: [{ name: 'Sertralin', dosage: '100mg', frequency: '1-0-0' }],
    },

    // ─── WARNING Red Flags (6) ──────────────────────────────
    {
        name: 'Karl-Heinz Wagner', email: 'karl.wagner@test.de', age: 74, gender: 'M',
        insurance: 'GKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: false,
        condition: 'Diabetischer Fuß, offene Wunde seit 3 Wochen',
        triage: { level: 'WARNING', rule: 'DiabeticFoot', message: 'WARNUNG: Diabetischer Fuß mit offener Wunde — Wundversorgung + Gefäßstatus!' },
        medications: [
            { name: 'Metformin', dosage: '1000mg', frequency: '1-0-1' },
            { name: 'Insulin Lantus', dosage: '22IE', frequency: '0-0-1' },
        ],
    },
    {
        name: 'Monika Schuster', email: 'monika.schuster@test.de', age: 66, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Blutungsrisiko unter Marcumar + Ibuprofen',
        triage: { level: 'WARNING', rule: 'BleedingRisk', message: 'WARNUNG: Erhöhtes Blutungsrisiko — Blutverdünner + NSAR Kombination!' },
        medications: [
            { name: 'Marcumar', dosage: '3mg', frequency: '1-0-0' },
            { name: 'Ibuprofen', dosage: '600mg', frequency: '1-1-1' },
        ],
    },
    {
        name: 'Fritz Becker', email: 'fritz.becker@test.de', age: 70, gender: 'M',
        insurance: 'PKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: true,
        condition: 'Ungewollter Gewichtsverlust 8kg in 3 Monaten',
        triage: { level: 'WARNING', rule: 'WeightLoss', message: 'WARNUNG: Signifikanter Gewichtsverlust — Tumorsuche empfohlen!' },
    },
    {
        name: 'Renate Koch', email: 'renate.koch@test.de', age: 55, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Nachtschweiß + Fieber + Lymphknotenschwellung',
        triage: { level: 'WARNING', rule: 'BSymptoms', message: 'WARNUNG: B-Symptomatik — hämatologische Abklärung empfohlen!' },
        surgeries: [{ name: 'Appendektomie', date: '1995' }],
    },
    {
        name: 'Jürgen Hoffmann', email: 'juergen.hoffmann@test.de', age: 62, gender: 'M',
        insurance: 'GKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: false,
        condition: 'Blut im Stuhl seit 2 Wochen',
        triage: { level: 'WARNING', rule: 'GIBleeding', message: 'WARNUNG: Rektale Blutung — Koloskopie empfohlen!' },
    },
    {
        name: 'Ingrid Schulz', email: 'ingrid.schulz@test.de', age: 48, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: true,
        condition: 'Einseitige Schwellung + Rötung Wade',
        triage: { level: 'WARNING', rule: 'DVT', message: 'WARNUNG: V.a. tiefe Beinvenenthrombose — D-Dimer + Duplex-Sono!' },
    },

    // ─── BG-Unfälle (5) ────────────────────────────────────
    {
        name: 'Ahmed Hassan', email: 'ahmed.hassan@test.de', age: 34, gender: 'M',
        insurance: 'BG', service: 'UNFALLMELDUNG', status: 'COMPLETED', isNewPatient: true,
        condition: 'Sturz von Gerüst (3m) auf Baustelle',
        accident: {
            bgName: 'BG BAU', date: '2026-03-01', location: 'Baustelle Hamburg-Altona',
            description: 'Sturz von Gerüst aus ca. 3m Höhe auf Betonboden. Prellung linke Schulter + HWS-Distorsion.',
            firstResponder: 'Vorarbeiter Hans Meier',
        },
    },
    {
        name: 'Marco Rossi', email: 'marco.rossi@test.de', age: 28, gender: 'M',
        insurance: 'BG', service: 'UNFALLMELDUNG', status: 'ACTIVE', isNewPatient: true,
        condition: 'Schnittwunde Kreissäge linke Hand',
        accident: {
            bgName: 'BG Holz und Metall', date: '2026-03-03', location: 'Tischlerei Schmidt, Wandsbek',
            description: 'Schnittverletzung Zeigefinger + Mittelfinger linke Hand an Kreissäge. Tiefe Wunde, Sehne intakt.',
        },
    },
    {
        name: 'Piotr Kowalczyk', email: 'piotr.kowalczyk@test.de', age: 45, gender: 'M',
        insurance: 'BG', service: 'UNFALLMELDUNG', status: 'COMPLETED', isNewPatient: false,
        condition: 'Wegeunfall: Fahrradsturz auf dem Arbeitsweg',
        accident: {
            bgName: 'VBG', date: '2026-02-28', location: 'Kreuzung Grindelallee/Schlüterstr.',
            description: 'Sturz vom Fahrrad wegen Glatteis. Radiusfraktur rechts + Schürfwunden.',
            firstResponder: 'Passantin (RTW gerufen)',
        },
        surgeries: [{ name: 'Osteosynthese Radius rechts', date: 'März 2026' }],
    },
    {
        name: 'Ewa Nowak', email: 'ewa.nowak@test.de', age: 31, gender: 'W',
        insurance: 'BG', service: 'UNFALLMELDUNG', status: 'ACTIVE', isNewPatient: true,
        condition: 'Chemische Verätzung Unterarm in Reinigungsfirma',
        accident: {
            bgName: 'BG Verkehr', date: '2026-03-02', location: 'Hotel Atlantic, Küche',
            description: 'Kontakt mit unverdünntem Industriereiniger am rechten Unterarm. Verätzung Grad II.',
        },
    },
    {
        name: 'Ivan Petrov', email: 'ivan.petrov@test.de', age: 52, gender: 'M',
        insurance: 'BG', service: 'UNFALLMELDUNG', status: 'COMPLETED', isNewPatient: false,
        condition: 'Bandscheibenvorfall bei schwerem Heben im Lager',
        accident: {
            bgName: 'BG Transport', date: '2026-02-25', location: 'Logistikzentrum Billbrook',
            description: 'Akuter Bandscheibenvorfall L4/L5 beim Heben einer 40kg Palette. Ausstrahlung rechtes Bein.',
        },
    },

    // ─── Routine Anamnese (15) ──────────────────────────────
    {
        name: 'Maria Schmidt', email: 'maria.schmidt@test.de', age: 72, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Diabetes Typ 2 + Hypertonie — Routinekontrolle',
        medications: [
            { name: 'Metformin', dosage: '1000mg', frequency: '1-0-1' },
            { name: 'Ramipril', dosage: '5mg', frequency: '1-0-0' },
            { name: 'Amlodipin', dosage: '5mg', frequency: '1-0-0' },
            { name: 'Simvastatin', dosage: '20mg', frequency: '0-0-1' },
        ],
        surgeries: [
            { name: 'Cholezystektomie', date: '2010', complications: 'keine' },
        ],
        chatMessages: [
            { sender: 'PATIENT', text: 'Guten Tag, ich bin wegen meiner Blutzuckerwerte hier.' },
            { sender: 'ARZT', text: 'Willkommen Frau Schmidt! Wir schauen uns die Werte gleich an.' },
        ],
    },
    {
        name: 'Olga Petrova', email: 'olga.petrova@test.de', age: 32, gender: 'W',
        insurance: 'PKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: true,
        condition: 'Schwangerschaft 28. SSW — Erstvorstellung',
        medications: [
            { name: 'Folsäure', dosage: '0.4mg', frequency: '1-0-0' },
            { name: 'Eisen', dosage: '100mg', frequency: '1-0-0' },
        ],
        chatMessages: [
            { sender: 'PATIENT', text: 'Guten Tag, ich bin in der 28. SSW und möchte mich als neue Patientin vorstellen.' },
            { sender: 'ARZT', text: 'Willkommen Frau Petrova! Bitte bringen Sie Ihren Mutterpass mit.' },
            { sender: 'PATIENT', text: 'Ja, natürlich, ich bringe alles mit.' },
        ],
    },
    {
        name: 'Hans Meier', email: 'hans.meier@test.de', age: 67, gender: 'M',
        insurance: 'Selbstzahler', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Knieschmerzen rechts seit 6 Monaten',
        surgeries: [
            { name: 'Knie-Arthroskopie rechts', date: '2020' },
            { name: 'Appendektomie', date: '1985' },
        ],
        medications: [{ name: 'Ibuprofen', dosage: '400mg', frequency: 'bei Bedarf' }],
        chatMessages: [
            { sender: 'PATIENT', text: 'Mein rechtes Knie tut seit Monaten weh, besonders beim Treppensteigen.' },
            { sender: 'ARZT', text: 'Herr Meier, wir sollten ein aktuelles Röntgen machen. Bitte vereinbaren Sie einen Termin.' },
        ],
    },
    {
        name: 'Yuki Tanaka', email: 'yuki.tanaka@test.de', age: 29, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: true,
        condition: 'Migräne-Abklärung',
        medications: [{ name: 'Sumatriptan', dosage: '50mg', frequency: 'bei Bedarf' }],
    },
    {
        name: 'Ali Özdemir', email: 'ali.oezdemir@test.de', age: 55, gender: 'M',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'COPD Stadium II — Kontrolluntersuchung',
        medications: [
            { name: 'Salbutamol DA', dosage: '100µg', frequency: 'bei Bedarf' },
            { name: 'Tiotropium', dosage: '18µg', frequency: '1-0-0' },
        ],
        chatMessages: [
            { sender: 'PATIENT', text: 'Guten Tag, ich brauche eine Kontrolle für meine COPD.' },
            { sender: 'ARZT', text: 'Herr Özdemir, bitte bringen Sie Ihren Inhalator zur Kontrolle mit.' },
            { sender: 'PATIENT', text: 'Alles klar, mache ich.' },
        ],
    },
    {
        name: 'Sophie Klein', email: 'sophie.klein@test.de', age: 24, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: true,
        condition: 'Hautausschlag + Juckreiz seit 1 Woche',
        chatMessages: [
            { sender: 'PATIENT', text: 'Hallo, ich habe seit einer Woche einen starken Hautausschlag am Arm.' },
            { sender: 'ARZT', text: 'Können Sie ein Foto davon schicken? Haben Sie neue Waschmittel oder Cremes benutzt?' },
            { sender: 'PATIENT', text: 'Ja, ich habe neue Handcreme verwendet. Foto schicke ich gleich.' },
        ],
    },
    {
        name: 'Klaus Richter', email: 'klaus.richter@test.de', age: 78, gender: 'M',
        insurance: 'PKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Vorhofflimmern — Medikamenten-Check',
        medications: [
            { name: 'Eliquis', dosage: '5mg', frequency: '1-0-1' },
            { name: 'Bisoprolol', dosage: '5mg', frequency: '1-0-0' },
            { name: 'Digitoxin', dosage: '0.07mg', frequency: '1-0-0' },
        ],
        chatMessages: [
            { sender: 'PATIENT', text: 'Ich habe das Gefühl, mein Herz schlägt unregelmäßig.' },
            { sender: 'ARZT', text: 'Herr Richter, bitte kommen Sie zur EKG-Kontrolle. Ihre Eliquis-Dosis überprüfen wir auch.' },
        ],
    },
    {
        name: 'Fatima Al-Rashid', email: 'fatima.alrashid@test.de', age: 41, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Schilddrüsenüberfunktion — Verlaufskontrolle',
        medications: [{ name: 'Thiamazol', dosage: '10mg', frequency: '1-0-0' }],
        chatMessages: [
            { sender: 'PATIENT', text: 'Meine Schilddrüsenwerte waren beim letzten Mal auffällig. Sind die neuen Werte schon da?' },
            { sender: 'ARZT', text: 'Ja, Frau Al-Rashid, Ihre Werte haben sich gut entwickelt. Wir besprechen das beim nächsten Termin.' },
        ],
    },
    {
        name: 'Michael Bauer', email: 'michael.bauer@test.de', age: 39, gender: 'M',
        insurance: 'GKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: true,
        condition: 'Rückenschmerzen LWS — akut seit gestern',
        chatMessages: [
            { sender: 'PATIENT', text: 'Ich habe seit gestern akute Rückenschmerzen und kann kaum aufstehen.' },
            { sender: 'ARZT', text: 'Herr Bauer, können Sie sich noch bewegen? Haben Sie Taubheitsgefühle in den Beinen?' },
            { sender: 'PATIENT', text: 'Nein, keine Taubheit, aber die Schmerzen sind sehr stark.' },
            { sender: 'ARZT', text: 'Gut, dann nehmen Sie erstmal Ibuprofen 600mg und kommen Sie morgen früh zur Untersuchung.' },
        ],
    },
    {
        name: 'Elena Sokolova', email: 'elena.sokolova@test.de', age: 50, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Rheumatoide Arthritis — Therapieadjustierung',
        medications: [
            { name: 'Methotrexat', dosage: '15mg', frequency: '1x/Woche' },
            { name: 'Folsäure', dosage: '5mg', frequency: '1x/Woche (Tag nach MTX)' },
            { name: 'Prednisolon', dosage: '5mg', frequency: '1-0-0' },
        ],
    },
    {
        name: 'David Nguyen', email: 'david.nguyen@test.de', age: 33, gender: 'M',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: true,
        condition: 'Impfberatung vor Fernreise (Thailand)',
    },
    {
        name: 'Claudia Maier', email: 'claudia.maier@test.de', age: 63, gender: 'W',
        insurance: 'GKV', service: 'ANAMNESE', status: 'ACTIVE', isNewPatient: false,
        condition: 'Osteoporose — DXA-Kontrolle',
        medications: [
            { name: 'Vitamin D3', dosage: '1000IE', frequency: '1-0-0' },
            { name: 'Calcium', dosage: '500mg', frequency: '1-0-1' },
            { name: 'Alendronat', dosage: '70mg', frequency: '1x/Woche' },
        ],
    },
    {
        name: 'Luca Bianchi', email: 'luca.bianchi@test.de', age: 19, gender: 'M',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: true,
        condition: 'Sporttauglichkeitsuntersuchung',
    },
    {
        name: 'Petra Zimmermann', email: 'petra.zimmermann@test.de', age: 47, gender: 'W',
        insurance: 'PKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Hashimoto-Thyreoiditis — Kontrolle',
        medications: [{ name: 'L-Thyroxin', dosage: '75µg', frequency: '1-0-0' }],
    },
    {
        name: 'Robert Schwarz', email: 'robert.schwarz@test.de', age: 85, gender: 'M',
        insurance: 'GKV', service: 'ANAMNESE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Geriatrisches Assessment — Demenzscreening',
        medications: [
            { name: 'Donepezil', dosage: '10mg', frequency: '0-0-1' },
            { name: 'Pantoprazol', dosage: '20mg', frequency: '1-0-0' },
            { name: 'Torasemid', dosage: '10mg', frequency: '1-0-0' },
        ],
        surgeries: [
            { name: 'CABG (Bypass-OP)', date: '2008', complications: 'Vorhofflimmern postoperativ' },
            { name: 'Kataraktoperation bds.', date: '2018' },
        ],
    },

    // ─── Rezept-Anforderungen (5) ───────────────────────────
    {
        name: 'Sabine Hartmann', email: 'sabine.hartmann@test.de', age: 44, gender: 'W',
        insurance: 'GKV', service: 'REZEPT', status: 'COMPLETED', isNewPatient: false,
        condition: 'Folgerezept Schilddrüse',
        medications: [{ name: 'L-Thyroxin', dosage: '100µg', frequency: '1-0-0' }],
        chatMessages: [
            { sender: 'PATIENT', text: 'Ich brauche ein neues Rezept für mein L-Thyroxin.' },
            { sender: 'ARZT', text: 'Frau Hartmann, das Rezept liegt zur Abholung bereit.' },
            { sender: 'PATIENT', text: 'Vielen Dank!' },
        ],
    },
    {
        name: 'Werner Krause', email: 'werner.krause@test.de', age: 61, gender: 'M',
        insurance: 'GKV', service: 'REZEPT', status: 'COMPLETED', isNewPatient: false,
        condition: 'Folgerezept Blutdruck',
        medications: [
            { name: 'Candesartan', dosage: '16mg', frequency: '1-0-0' },
            { name: 'HCT', dosage: '12.5mg', frequency: '1-0-0' },
        ],
    },
    {
        name: 'Aynur Yilmaz', email: 'aynur.yilmaz@test.de', age: 37, gender: 'W',
        insurance: 'GKV', service: 'REZEPT', status: 'ACTIVE', isNewPatient: false,
        condition: 'Folgerezept Antibabypille',
    },
    {
        name: 'Dieter Lehmann', email: 'dieter.lehmann@test.de', age: 73, gender: 'M',
        insurance: 'GKV', service: 'REZEPT', status: 'COMPLETED', isNewPatient: false,
        condition: 'Folgerezept Diabetes + Blutdruck',
        medications: [
            { name: 'Metformin', dosage: '850mg', frequency: '1-0-1' },
            { name: 'Glimepirid', dosage: '2mg', frequency: '1-0-0' },
            { name: 'Ramipril', dosage: '10mg', frequency: '1-0-0' },
        ],
    },
    {
        name: 'Carla Martinez', email: 'carla.martinez@test.de', age: 52, gender: 'W',
        insurance: 'PKV', service: 'REZEPT', status: 'ACTIVE', isNewPatient: true,
        condition: 'Erstrezept Schmerztherapie (chronischer Rücken)',
    },

    // ─── AU / Krankschreibung (4) ───────────────────────────
    {
        name: 'Jan Kowalski', email: 'jan.kowalski@test.de', age: 38, gender: 'M',
        insurance: 'GKV', service: 'AU', status: 'COMPLETED', isNewPatient: false,
        condition: 'Grippaler Infekt — AU 5 Tage',
        chatMessages: [
            { sender: 'PATIENT', text: 'Ich bin seit drei Tagen erkältet mit Fieber. Kann ich eine Krankschreibung bekommen?' },
            { sender: 'ARZT', text: 'Herr Kowalski, kommen Sie bitte für eine kurze Untersuchung vorbei.' },
        ],
    },
    {
        name: 'Nina Bergmann', email: 'nina.bergmann@test.de', age: 27, gender: 'W',
        insurance: 'GKV', service: 'AU', status: 'COMPLETED', isNewPatient: false,
        condition: 'Magen-Darm-Infekt — AU 3 Tage',
    },
    {
        name: 'Tobias Schäfer', email: 'tobias.schaefer@test.de', age: 45, gender: 'M',
        insurance: 'GKV', service: 'AU', status: 'ACTIVE', isNewPatient: false,
        condition: 'Bandscheibenvorfall akut — AU Verlängerung',
        chatMessages: [
            { sender: 'PATIENT', text: 'Meine AU läuft morgen aus, ich habe aber immer noch starke Schmerzen.' },
            { sender: 'ARZT', text: 'Herr Schäfer, kommen Sie morgen früh zur Verlängerung. Bringen Sie die MRT-Bilder mit.' },
            { sender: 'PATIENT', text: 'Alles klar, bis morgen.' },
        ],
    },
    {
        name: 'Lena Wolf', email: 'lena.wolf@test.de', age: 32, gender: 'W',
        insurance: 'GKV', service: 'AU', status: 'COMPLETED', isNewPatient: true,
        condition: 'Burnout / Erschöpfungsdepression — AU 2 Wochen',
    },

    // ─── Überweisungen (3) ──────────────────────────────────
    {
        name: 'Emma Fischer', email: 'emma.fischer@test.de', age: 19, gender: 'W',
        insurance: 'GKV', service: 'UEBERWEISUNG', status: 'COMPLETED', isNewPatient: false,
        condition: 'Überweisung Orthopädie (Skoliose)',
    },
    {
        name: 'Heinrich Vogel', email: 'heinrich.vogel@test.de', age: 68, gender: 'M',
        insurance: 'GKV', service: 'UEBERWEISUNG', status: 'ACTIVE', isNewPatient: false,
        condition: 'Überweisung Kardiologie (Belastungsdyspnoe)',
        chatMessages: [
            { sender: 'PATIENT', text: 'Ich bekomme beim Treppensteigen schlecht Luft.' },
            { sender: 'ARZT', text: 'Herr Vogel, wir überweisen Sie zum Kardiologen. Die Überweisung ist fertig.' },
        ],
    },
    {
        name: 'Susanne Keller', email: 'susanne.keller@test.de', age: 54, gender: 'W',
        insurance: 'PKV', service: 'UEBERWEISUNG', status: 'COMPLETED', isNewPatient: false,
        condition: 'Überweisung Gastroenterologie (Reflux)',
    },

    // ─── Sonstige Services (6) ──────────────────────────────
    {
        name: 'Bernd Neumann', email: 'bernd.neumann@test.de', age: 59, gender: 'M',
        insurance: 'GKV', service: 'TELEFONANFRAGE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Frage zu Laborergebnissen',
        chatMessages: [
            { sender: 'PATIENT', text: 'Guten Tag, sind meine Blutwerte schon da?' },
            { sender: 'ARZT', text: 'Herr Neumann, ja. Alles unauffällig. Die Zusammenfassung schicke ich Ihnen per Post.' },
            { sender: 'PATIENT', text: 'Sehr gut, das beruhigt mich. Danke!' },
        ],
    },
    {
        name: 'Christine Lang', email: 'christine.lang@test.de', age: 41, gender: 'W',
        insurance: 'GKV', service: 'TERMINABSAGE', status: 'COMPLETED', isNewPatient: false,
        condition: 'Termin am 05.03. absagen — geschäftlich verhindert',
    },
    {
        name: 'Markus Horn', email: 'markus.horn@test.de', age: 36, gender: 'M',
        insurance: 'GKV', service: 'DATEIEN', status: 'COMPLETED', isNewPatient: false,
        condition: 'MRT-Befund hochladen (Knie rechts)',
    },
    {
        name: 'Anna Krämer', email: 'anna.kraemer@test.de', age: 28, gender: 'W',
        insurance: 'GKV', service: 'BEFUND_ANFORDERUNG', status: 'ACTIVE', isNewPatient: false,
        condition: 'Blutbild-Ergebnisse anfordern',
        chatMessages: [
            { sender: 'PATIENT', text: 'Hallo, ich wollte meine Blutbild-Ergebnisse von letzter Woche anfragen.' },
            { sender: 'ARZT', text: 'Frau Krämer, die Ergebnisse sind noch beim Labor. Wir informieren Sie sobald sie da sind.' },
        ],
    },
    {
        name: 'Wolfgang Stein', email: 'wolfgang.stein@test.de', age: 71, gender: 'M',
        insurance: 'GKV', service: 'NACHRICHT', status: 'COMPLETED', isNewPatient: false,
        condition: 'Frage zur Medikamenten-Umstellung',
        chatMessages: [
            { sender: 'PATIENT', text: 'Guten Tag, darf ich mein Ramipril jetzt morgens oder abends nehmen?' },
            { sender: 'ARZT', text: 'Herr Stein, bitte nehmen Sie Ramipril morgens ein. Blutdruckkontrolle in 2 Wochen.' },
            { sender: 'PATIENT', text: 'Vielen Dank, Herr Doktor!' },
        ],
    },
    {
        name: 'Jasmin Habibi', email: 'jasmin.habibi@test.de', age: 25, gender: 'W',
        insurance: 'GKV', service: 'NACHRICHT', status: 'ACTIVE', isNewPatient: true,
        condition: 'Frage zu Impfungen für Neugeborenes',
        chatMessages: [
            { sender: 'PATIENT', text: 'Hallo, wann sollte mein Baby die erste Impfung bekommen?' },
            { sender: 'ARZT', text: 'Die erste Impfung (6-fach + Pneumokokken) empfehlen wir ab der 8. Lebenswoche.' },
            { sender: 'PATIENT', text: 'Danke! Soll ich gleich einen Termin machen?' },
            { sender: 'ARZT', text: 'Ja, bitte rufen Sie bei der MFA an oder buchen Sie online.' },
        ],
    },
];

// ─── Fragen-Antworten für verschiedene Services ─────────────

function generateAnswersForSession(profile: PatientProfile): { atomId: string; value: string }[] {
    const answers: { atomId: string; value: string }[] = [];
    const birthYear = new Date().getFullYear() - profile.age;
    const birthDate = `${birthYear}-06-15`;

    // Basis-Daten (alle Services)
    answers.push(
        { atomId: '0000', value: JSON.stringify({ type: 'radio', data: profile.isNewPatient ? 'ja' : 'nein' }) },
        { atomId: '0010', value: JSON.stringify({ type: 'radio', data: profile.gender === 'M' ? 'maennlich' : profile.gender === 'W' ? 'weiblich' : 'divers' }) },
        { atomId: '0020', value: JSON.stringify({ type: 'date', data: birthDate }) },
    );

    // Versicherung
    const insuranceMap: Record<string, string> = { 'GKV': 'gkv', 'PKV': 'pkv', 'BG': 'bg', 'Selbstzahler': 'selbstzahler' };
    answers.push(
        { atomId: '0100', value: JSON.stringify({ type: 'radio', data: insuranceMap[profile.insurance] || 'gkv' }) },
    );

    // Service-spezifische Antworten
    if (profile.service === 'ANAMNESE') {
        // Beschwerden
        if (profile.condition) {
            answers.push({
                atomId: '1000',
                value: JSON.stringify({ type: 'textarea', data: profile.condition }),
            });
        }
        // Rauchen
        answers.push({ atomId: '1200', value: JSON.stringify({ type: 'radio', data: profile.age > 60 ? 'ja' : 'nein' }) });
        // Allergien
        answers.push({ atomId: '1500', value: JSON.stringify({ type: 'radio', data: Math.random() > 0.7 ? 'ja' : 'nein' }) });
        // Vorerkrankungen
        answers.push({ atomId: '1600', value: JSON.stringify({ type: 'radio', data: profile.medications?.length ? 'ja' : 'nein' }) });
    }

    if (profile.service === 'REZEPT') {
        answers.push({
            atomId: 'RES-100',
            value: JSON.stringify({ type: 'textarea', data: profile.condition || 'Folgerezept' }),
        });
    }

    if (profile.service === 'AU') {
        answers.push({
            atomId: 'AU-100',
            value: JSON.stringify({ type: 'textarea', data: profile.condition || 'Krankschreibung' }),
        });
    }

    if (profile.service === 'UNFALLMELDUNG' && profile.accident) {
        answers.push(
            { atomId: 'BG-100', value: JSON.stringify({ type: 'text', data: profile.accident.bgName }) },
            { atomId: 'BG-200', value: JSON.stringify({ type: 'date', data: profile.accident.date }) },
            { atomId: 'BG-300', value: JSON.stringify({ type: 'text', data: profile.accident.location }) },
            { atomId: 'BG-400', value: JSON.stringify({ type: 'textarea', data: profile.accident.description }) },
        );
    }

    return answers;
}

// ─── Audit Log Events ───────────────────────────────────────

const AUDIT_ACTIONS = [
    'CREATE_SESSION', 'ANSWER_QUESTION', 'VIEW_SESSION', 'EXPORT_CSV',
    'EXPORT_PDF', 'LOGIN', 'LOGOUT', 'TRIAGE_ALERT', 'ACKNOWLEDGE_TRIAGE',
    'ASSIGN_DOCTOR', 'STATUS_CHANGE', 'UPLOAD_FILE', 'JOIN_QUEUE',
];

// ─── Main Seed Function ─────────────────────────────────────

async function main() {
    console.log('🗄️  Starting comprehensive seed...\n');

    // 1. Seed Staff Users
    console.log('👥 Creating staff users...');
    const password = process.env.ARZT_PASSWORD || 'praxis2026';
    const passwordHash = await bcrypt.hash(password, 12);
    const pinHash = await bcrypt.hash('1234', 12);

    // Ensure default tenant
    const tenant = await prisma.tenant.upsert({
        where: { subdomain: 'default' },
        update: {
            bsnr: '999999999',
            name: 'Praxis Dr. Klaproth',
            settings: {
                features: {
                    showWaitingRoom: false,
                },
            },
        },
        create: {
            subdomain: 'default',
            name: 'Praxis Dr. Klaproth',
            bsnr: '999999999',
            settings: {
                features: {
                    showWaitingRoom: false,
                },
            },
        },
    });

    const staffUsers: Record<string, string> = {};
    for (const user of STAFF_USERS) {
        const created = await prisma.arztUser.upsert({
            where: { tenantId_username: { tenantId: tenant.id, username: user.username } },
            update: { displayName: user.displayName, role: user.role, pinHash, isActive: true },
            create: {
                tenantId: tenant.id,
                username: user.username,
                passwordHash,
                pinHash,
                displayName: user.displayName,
                role: user.role,
                isActive: true,
            },
        });
        staffUsers[user.role] = created.id;
        console.log(`  ✅ ${user.displayName} (${user.role})`);
    }

    // 2. Seed Patients + Sessions + Answers + Triage + Accidents + Chat + Meds + Surgeries
    console.log(`\n🏥 Creating ${PATIENTS.length} patients with full data...`);

    let sessionCount = 0;
    let answerCount = 0;
    let triageCount = 0;
    let chatCount = 0;
    let medCount = 0;
    let surgeryCount = 0;
    let accidentCount = 0;

    for (const profile of PATIENTS) {
        // Create Patient
        const patient = await prisma.patient.create({
            data: {
                tenantId: tenant.id,
                hashedEmail: hashEmail(profile.email),
            },
        });

        // Create Session
        const sessionId = uuid();
        const createdAt = randomDate(new Date('2026-02-01'), new Date('2026-03-04'));
        const completedAt = profile.status === 'COMPLETED'
            ? new Date(createdAt.getTime() + (5 + Math.random() * 15) * 60000) // 5-20 min
            : null;

        const session = await prisma.patientSession.create({
            data: {
                id: sessionId,
                tenantId: tenant.id,
                patientId: patient.id,
                isNewPatient: profile.isNewPatient,
                gender: profile.gender,
                birthDate: new Date(new Date().getFullYear() - profile.age, 5, 15),
                encryptedName: profile.name, // Simplified for seed — in production this is AES-256-GCM encrypted
                status: profile.status,
                selectedService: profile.service,
                insuranceType: profile.insurance,
                createdAt,
                completedAt,
                assignedArztId: profile.status === 'COMPLETED' ? staffUsers['ARZT'] : undefined,
            },
        });
        sessionCount++;

        // Create Answers
        const answers = generateAnswersForSession(profile);
        for (const answer of answers) {
            await prisma.answer.create({
                data: {
                    sessionId: session.id,
                    atomId: answer.atomId,
                    value: answer.value,
                    timeSpentMs: Math.floor(3000 + Math.random() * 15000),
                    answeredAt: new Date(createdAt.getTime() + Math.random() * 10 * 60000),
                },
            });
            answerCount++;
        }

        // Create Triage Events
        if (profile.triage) {
            await prisma.triageEvent.create({
                data: {
                    sessionId: session.id,
                    level: profile.triage.level,
                    atomId: '1000',
                    triggerValues: JSON.stringify({ condition: profile.condition }),
                    message: profile.triage.message,
                    createdAt: new Date(createdAt.getTime() + 5 * 60000),
                    acknowledgedBy: profile.status === 'COMPLETED' ? staffUsers['ARZT'] : null,
                    acknowledgedAt: profile.status === 'COMPLETED' ? completedAt : null,
                },
            });
            triageCount++;
        }

        // Create Accident Details
        if (profile.accident) {
            await prisma.accidentDetails.create({
                data: {
                    sessionId: session.id,
                    bgName: profile.accident.bgName,
                    accidentDate: new Date(profile.accident.date),
                    accidentLocation: profile.accident.location,
                    description: profile.accident.description,
                    firstResponder: profile.accident.firstResponder || null,
                    reportedToEmployer: true,
                },
            });
            accidentCount++;
        }

        // Create Chat Messages
        if (profile.chatMessages) {
            for (let i = 0; i < profile.chatMessages.length; i++) {
                const msg = profile.chatMessages[i];
                await prisma.chatMessage.create({
                    data: {
                        sessionId: session.id,
                        senderType: msg.sender,
                        senderId: msg.sender !== 'PATIENT' ? staffUsers['ARZT'] : null,
                        text: msg.text,
                        fromName: msg.sender === 'PATIENT' ? profile.name : 'Dr. Klaproth',
                        timestamp: new Date(createdAt.getTime() + (i + 1) * 2 * 60000),
                    },
                });
                chatCount++;
            }
        }

        // Create Medications
        if (profile.medications) {
            for (const med of profile.medications) {
                await prisma.patientMedication.create({
                    data: {
                        patientId: patient.id,
                        name: med.name,
                        dosage: med.dosage,
                        frequency: med.frequency,
                    },
                });
                medCount++;
            }
        }

        // Create Surgeries
        if (profile.surgeries) {
            for (const surg of profile.surgeries) {
                await prisma.patientSurgery.create({
                    data: {
                        patientId: patient.id,
                        surgeryName: surg.name,
                        date: surg.date,
                        complications: surg.complications || null,
                    },
                });
                surgeryCount++;
            }
        }

        // Status indicator
        const statusIcon = profile.triage?.level === 'CRITICAL' ? '🔴' :
                           profile.triage?.level === 'WARNING' ? '🟡' :
                           profile.status === 'ACTIVE' ? '🟢' : '✅';
        console.log(`  ${statusIcon} ${profile.name} (${profile.service}, ${profile.insurance}, ${profile.status})`);
    }

    // 3. Seed Audit Log Entries
    console.log('\n📋 Creating audit log entries...');
    const auditEntries: any[] = [];
    for (let i = 0; i < 120; i++) {
        auditEntries.push({
            userId: randomItem(Object.values(staffUsers)),
            action: randomItem(AUDIT_ACTIONS),
            resource: `sessions/${uuid().substring(0, 8)}`,
            ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            userAgent: randomItem([
                'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Mozilla/5.0 (Linux; Android 14)',
            ]),
            createdAt: randomDate(new Date('2026-02-01'), new Date('2026-03-04')),
        });
    }
    await prisma.auditLog.createMany({ data: auditEntries });
    console.log(`  ✅ ${auditEntries.length} audit log entries`);

    // 4. Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 Seed Summary:');
    console.log('═'.repeat(50));
    console.log(`  👥 Staff Users:     ${STAFF_USERS.length}`);
    console.log(`  🏥 Patients:        ${PATIENTS.length}`);
    console.log(`  📋 Sessions:        ${sessionCount}`);
    console.log(`  ✍️  Answers:         ${answerCount}`);
    console.log(`  🚨 Triage Events:   ${triageCount}`);
    console.log(`  🚑 BG Accidents:    ${accidentCount}`);
    console.log(`  💬 Chat Messages:   ${chatCount}`);
    console.log(`  💊 Medications:     ${medCount}`);
    console.log(`  🔪 Surgeries:       ${surgeryCount}`);
    console.log(`  📋 Audit Entries:   ${auditEntries.length}`);
    console.log('═'.repeat(50));
    console.log('✅ Comprehensive seed completed!\n');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Seed error:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
