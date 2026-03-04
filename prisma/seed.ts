import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { seedWaitingContent } from './seed-content';
import { seedPermissions } from './seed-permissions';
dotenv.config({ path: '../server/.env' });
dotenv.config(); // Also check root .env

/**
 * Datenbank-Seed: Befüllt MedicalAtom-Tabelle mit allen Fragen
 * und erstellt einen Standard-Arzt-Account
 */

const prisma = new PrismaClient();

// ─── Konvertierung der bestehenden Fragen ───────────────────

interface LegacyQuestion {
    id: string;
    type: string;
    question: string;
    description?: string;
    section: string;
    order: number;
    placeholder?: string;
    options?: { value: string; label: string; followUpQuestions?: string[] }[];
    validation?: Record<string, unknown>;
    logic?: Record<string, unknown>;
}

function getModule(section: string): number {
    const map: Record<string, number> = {
        'basis': 0,
        'versicherung': 2,
        'adresse': 3,
        'kontakt': 3,
        'beschwerden': 5,
        'koerpermasse': 6,
        'rauchen': 6,
        'impfungen': 6,
        'familie': 6,
        'diabetes': 7,
        'beeintraechtigung': 8,
        'implantate': 8,
        'blutverduenner': 8,
        'allergien': 8,
        'gesundheitsstoerungen': 8,
        'vorerkrankungen': 8,
        'medikamente-freitext': 8,
        'rezepte': 10,
        'dateien': 11,
        'au-anfrage': 12,
        'ueberweisung': 13,
        'absage': 14,
        'telefon': 15,
        'befund-anforderung': 16,
        'nachricht': 17,
        'abschluss': 99,
        'bg-unfall': 20,
        'schwangerschaft': 21,
        'beruf': 22,
    };
    return map[section] ?? 99;
}

function isPIIField(id: string): boolean {
    return ['0001', '0011', '3000', '3001', '3002', '3003', '3004', '9010', '9011'].includes(id);
}

function convertToAtom(q: LegacyQuestion) {
    return {
        id: q.id,
        module: getModule(q.section),
        category: 0,
        questionText: q.question,
        description: q.description || null,
        answerType: q.type,
        section: q.section,
        orderIndex: q.order,
        placeholder: q.placeholder || null,
        options: q.options ? JSON.stringify(q.options) : null,
        validationRules: q.validation ? JSON.stringify(q.validation) : null,
        branchingLogic: q.logic ? JSON.stringify(q.logic) : null,
        isRedFlag: q.logic && 'triage' in q.logic ? true : false,
        isPII: isPIIField(q.id),
        parentAtomId: null,
    };
}

// ─── Alle bestehenden 77+ Fragen ────────────────────────────

const LEGACY_QUESTIONS: LegacyQuestion[] = [
    // IDENTIFIKATION
    {
        id: '0000', type: 'radio', question: 'Sind Sie bereits als Patient in unserer Praxis bekannt?', section: 'basis', order: 1,
        options: [{ value: 'ja', label: 'Ja, ich bin bereits Patient' }, { value: 'nein', label: 'Nein, ich bin zum ersten Mal hier' }],
        validation: { required: true }, logic: { next: ['0001'] }
    },
    {
        id: '0001', type: 'text', question: 'Geben Sie hier Ihren Nachnamen ein', section: 'basis', order: 2,
        validation: { required: true, minLength: 2, pattern: '^[a-zA-ZäöüÄÖÜß\\s-]+$' }, logic: { next: ['0011'] }
    },
    {
        id: '0011', type: 'text', question: 'Geben Sie hier Ihren Vornamen ein', section: 'basis', order: 3,
        validation: { required: true, minLength: 2, pattern: '^[a-zA-ZäöüÄÖÜß\\s-]+$' }, logic: { next: ['0002'] }
    },
    {
        id: '0002', type: 'select', question: 'Geschlecht', section: 'basis', order: 4,
        options: [{ value: 'M', label: 'männlich' }, { value: 'W', label: 'weiblich' }, { value: 'D', label: 'divers/weiß nicht' }],
        validation: { required: true }, logic: { next: ['0003'] }
    },
    {
        id: '0003', type: 'date', question: 'Geben Sie hier Ihr Geburtsdatum ein', section: 'basis', order: 5,
        validation: { required: true, ageOver: 3 },
        logic: {
            next: ['2000'],
            conditional: [
                {
                    when: '0000', equals: 'ja', then: [
                        { context: 'selectedService', equals: 'Medikamente / Rezepte', then: 'RES-100' },
                        { context: 'selectedService', equals: 'Dateien / Befunde', then: 'DAT-100' },
                        { context: 'selectedService', equals: 'AU (Krankschreibung)', then: 'AU-100' },
                        { context: 'selectedService', equals: 'Überweisung', then: 'UEB-100' },
                        { context: 'selectedService', equals: 'Terminabsage', then: 'ABS-100' },
                        { context: 'selectedService', equals: 'Telefonanfrage', then: 'TEL-100' },
                        { context: 'selectedService', equals: 'Dokumente anfordern', then: 'BEF-100' },
                        { context: 'selectedService', equals: 'Nachricht schreiben', then: 'MS-100' },
                        { context: 'selectedService', equals: 'Termin / Anamnese', then: '1000' },
                    ]
                },
                { when: '0000', equals: 'nein', then: ['2000'] }
            ]
        }
    },

    // ENROLLMENT
    {
        id: '2000', type: 'radio', question: 'Versicherungsstatus?', section: 'versicherung', order: 6,
        options: [{ value: 'PKV', label: 'Privatversichert' }, { value: 'GKV', label: 'Gesetzlich versichert' }, { value: 'Selbstzahler', label: 'Selbstzahler' }],
        validation: { required: true }, logic: { next: ['3000'] }
    },
    {
        id: '3000', type: 'number', question: 'Wie lautet Ihre PLZ?', section: 'adresse', order: 12,
        validation: { required: true, min: 10000, max: 99999 }, logic: { next: ['3001'] }
    },
    {
        id: '3001', type: 'text', question: 'Wohnort', section: 'adresse', order: 13,
        validation: { required: true }, logic: { next: ['3002'] }
    },
    {
        id: '3002', type: 'text', question: 'Wohnanschrift', section: 'adresse', order: 14,
        validation: { required: true }, logic: { next: ['3003'] }
    },
    {
        id: '3003', type: 'email', question: 'E-Mail für Ihre Terminbestätigung', section: 'kontakt', order: 15,
        validation: { required: true }, logic: { next: ['3004'] }
    },
    {
        id: '3004', type: 'tel', question: 'Mobilrufnummer für Rückfragen', section: 'kontakt', order: 16,
        placeholder: 'z.B. 0171 12345678', logic: { next: ['3005'] }
    },
    {
        id: '3005', type: 'radio', question: 'Weiter zum gewählten Anliegen?', section: 'kontakt', order: 17,
        options: [{ value: 'weiter', label: 'Ja, weiter' }],
        logic: {
            conditional: [
                { context: 'selectedService', equals: 'Medikamente / Rezepte', then: 'RES-100' },
                { context: 'selectedService', equals: 'Dateien / Befunde', then: 'DAT-100' },
                { context: 'selectedService', equals: 'AU (Krankschreibung)', then: 'AU-100' },
                { context: 'selectedService', equals: 'Überweisung', then: 'UEB-100' },
                { context: 'selectedService', equals: 'Terminabsage', then: 'ABS-100' },
                { context: 'selectedService', equals: 'Telefonanfrage', then: 'TEL-100' },
                { context: 'selectedService', equals: 'Dokumente anfordern', then: 'BEF-100' },
                { context: 'selectedService', equals: 'Nachricht schreiben', then: 'MS-100' },
                { context: 'selectedService', equals: 'Termin / Anamnese', then: '1000' },
            ]
        }
    },

    // BESCHWERDEN (ANAMNESE)
    {
        id: '1000', type: 'radio', question: 'Haben Sie aktuell Beschwerden?', section: 'beschwerden', order: 18,
        options: [{ value: 'Ja', label: 'Ja', followUpQuestions: ['1001'] }, { value: 'Nein', label: 'Nein', followUpQuestions: ['4000'] }],
        validation: { required: true }
    },
    {
        id: '1001', type: 'select', question: 'Wie lange bestehen Ihre Beschwerden?', section: 'beschwerden', order: 19,
        options: [
            { value: 'wenige_tage', label: 'wenige Tage' }, { value: 'weniger_1w', label: 'weniger als 1 Woche' },
            { value: 'wenige_wochen', label: 'wenige Wochen' }, { value: 'wenige_monate', label: 'wenige Monate' },
            { value: 'laenger_6m', label: 'länger als ein halbes Jahr' }, { value: 'jahre', label: 'seit Jahren' },
            { value: 'weiss_nicht', label: 'weiß nicht' }
        ], validation: { required: true }, logic: { next: ['1002'] }
    },
    {
        id: '1002', type: 'multiselect', question: 'Wo haben Sie Beschwerden?', section: 'beschwerden', order: 20,
        options: [
            { value: 'kopf', label: 'Kopf' }, { value: 'hals', label: 'Hals / Rachen' },
            { value: 'brust', label: 'Brustschmerzen / Herzensenge (Notfall!)' },
            { value: 'atemnot', label: 'Atemnot / Kurzatmigkeit (Notfall!)' },
            { value: 'laehmung', label: 'Lähmungserscheinungen / Sprachstörung (Notfall!)' },
            { value: 'bauch', label: 'Bauchschmerzen' }, { value: 'ruecken', label: 'Rückenschmerzen' },
            { value: 'beine', label: 'Beinschmerzen / Schwellung' }, { value: 'augen', label: 'Augenbeschwerden' },
            { value: 'sonstiges', label: 'Sonstiges' }
        ], validation: { required: true },
        logic: {
            next: ['1003'], triage: {
                when: ['brust', 'atemnot', 'laehmung'], level: 'CRITICAL',
                message: 'ACHTUNG: Notfall-Verdacht! Bitte Notruf 112!'
            }
        }
    },
    {
        id: '1003', type: 'textarea', question: 'Beschreiben Sie Ihre Beschwerden bitte kurz', section: 'beschwerden', order: 21,
        placeholder: 'Haben Sie akute Schmerzen in der Brust oder Atemnot? Bitte informieren Sie uns sofort!',
        validation: { required: true }, logic: { next: ['4000'] }
    },

    // KÖRPERMASSE / RAUCHEN
    {
        id: '4000', type: 'number', question: 'Wie groß sind Sie?', section: 'koerpermasse', order: 25,
        placeholder: 'cm', validation: { required: true, min: 70, max: 250 }, logic: { next: ['4001'] }
    },
    {
        id: '4001', type: 'number', question: 'Wie schwer sind Sie (in kg)?', section: 'koerpermasse', order: 26,
        placeholder: 'kg', validation: { required: true, min: 20, max: 300 }, logic: { next: ['4002'] }
    },
    {
        id: '4002', type: 'radio', question: 'Haben Sie jemals geraucht?', section: 'rauchen', order: 27,
        options: [{ value: 'Ja', label: 'Ja', followUpQuestions: ['4003'] }, { value: 'Nein', label: 'Nein', followUpQuestions: ['4100'] }],
        validation: { required: true }
    },
    { id: '4003', type: 'number', question: 'Durchschnittlich wie viele Zigaretten pro Tag?', section: 'rauchen', order: 28, validation: { required: true, min: 1, max: 100 }, logic: { next: ['4004'] } },
    { id: '4004', type: 'number', question: 'Wie viele Jahre haben Sie geraucht?', section: 'rauchen', order: 29, validation: { required: true, min: 1, max: 100 }, logic: { next: ['4005'] } },
    {
        id: '4005', type: 'radio', question: 'Rauchen Sie immer noch?', section: 'rauchen', order: 30,
        options: [{ value: 'Ja', label: 'Ja', followUpQuestions: ['4100'] }, { value: 'Nein', label: 'Nein', followUpQuestions: ['4006'] }]
    },
    { id: '4006', type: 'number', question: 'Wann (Jahr) haben Sie aufgehört?', section: 'rauchen', order: 31, validation: { required: true, min: 1900, max: 2026 }, logic: { next: ['4100'] } },

    // IMPFUNGEN
    {
        id: '4100', type: 'multiselect', question: 'Haben Sie folgende Impfungen erhalten?', section: 'impfungen', order: 32,
        options: [
            { value: 'covid', label: 'COVID-19' }, { value: 'diphterie', label: 'Diphterie' }, { value: 'fsme', label: 'FSME' },
            { value: 'hepatitis_b', label: 'Hepatitis B' }, { value: 'influenza', label: 'Influenza (Grippe)' },
            { value: 'mmr', label: 'Masern, Mumps, Röteln (MMR)' }, { value: 'pneumokokken', label: 'Pneumokokken' },
            { value: 'tetanus', label: 'Tetanus' },
            { value: 'freitext', label: 'Weitere Impfungen (Freitext)', followUpQuestions: ['4100-FT'] }
        ], logic: { next: ['4110'] }
    },
    { id: '4100-FT', type: 'textarea', question: 'Welche weiteren Impfungen haben Sie erhalten?', section: 'impfungen', order: 33, logic: { next: ['4110'] } },

    // FAMILIE
    {
        id: '4110', type: 'multiselect', question: 'Gibt es in Ihrer Familie folgende Erkrankungen?', section: 'familie', order: 34,
        options: [
            { value: 'herzinfarkt', label: 'Herzinfarkt/Schlaganfall' }, { value: 'bluthochdruck', label: 'Bluthochdruck' },
            { value: 'diabetes', label: 'Diabetes' }, { value: 'krebs', label: 'Krebserkrankungen' },
            { value: 'demenz', label: 'Demenz/Alzheimer' }, { value: 'keine', label: 'keine' },
            { value: 'freitext', label: 'Andere relevante Erkrankungen (Freitext)', followUpQuestions: ['4110-FT'] }
        ], logic: { next: ['4120'] }
    },
    { id: '4110-FT', type: 'textarea', question: 'Welche anderen relevanten Erkrankungen gibt es in Ihrer Familie?', section: 'familie', order: 35, logic: { next: ['4120'] } },

    // DIABETES
    {
        id: '5000', type: 'radio', question: 'Leiden Sie an Diabetes?', section: 'diabetes', order: 40,
        options: [{ value: 'Ja', label: 'Ja', followUpQuestions: ['5001'] }, { value: 'Nein', label: 'Nein', followUpQuestions: ['6000'] }],
        validation: { required: true }
    },
    {
        id: '5001', type: 'select', question: 'Welcher Typ?', section: 'diabetes', order: 41,
        options: [{ value: 'typ1', label: 'Diabetes Typ 1' }, { value: 'typ2', label: 'Diabetes Typ 2' }, { value: 'typ3', label: 'Diabetes Typ 3' }],
        logic: { next: ['5002'] }
    },
    {
        id: '5002', type: 'multiselect', question: 'Wie wird Ihr Diabetes behandelt?', section: 'diabetes', order: 42,
        options: [
            { value: 'diaet', label: 'Diät' }, { value: 'metformin', label: 'Metformin' },
            { value: 'insulin', label: 'Insulin' }, { value: 'jardiance', label: 'Jardiance' },
            { value: 'freitext', label: 'Sonstige (Freitext)', followUpQuestions: ['5002-FT'] }
        ], logic: { next: ['5003'] }
    },
    { id: '5002-FT', type: 'text', question: 'Welche sonstige Diabetes-Behandlung erhalten Sie?', section: 'diabetes', order: 43, logic: { next: ['5003'] } },
    {
        id: '5003', type: 'multiselect', question: 'Haben Sie eine der folgenden Komplikationen?', section: 'diabetes', order: 44,
        options: [
            { value: 'fusssyndrom', label: 'Diabetisches Fußsyndrom' }, { value: 'retinopathie', label: 'Retinopathie' },
            { value: 'neuropathie', label: 'Neuropathie' }, { value: 'nephropathie', label: 'Nephropathie' }
        ], logic: { next: ['6000'] }
    },

    // BEEINTRÄCHTIGUNGEN / IMPLANTATE / ALLERGIEN
    {
        id: '6000', type: 'radio', question: 'Haben Sie körperliche Beeinträchtigungen mit Relevanz?', section: 'beeintraechtigung', order: 45,
        options: [{ value: 'Ja', label: 'Ja', followUpQuestions: ['6001'] }, { value: 'Nein', label: 'Nein', followUpQuestions: ['6002'] }],
        validation: { required: true }
    },
    {
        id: '6001', type: 'multiselect', question: 'Welche Beeinträchtigungen?', section: 'beeintraechtigung', order: 46,
        options: [
            { value: 'rollator', label: 'Am Rollator mobil' }, { value: 'rollstuhl', label: 'Auf Rollstuhl angewiesen' },
            { value: 'gehbehinderung', label: 'Gehbehinderung' }, { value: 'schwerhoerig', label: 'Schwerhörigkeit' },
            { value: 'freitext', label: 'Andere (Freitext)', followUpQuestions: ['6001-FT'] }
        ], logic: { next: ['6002'] }
    },
    { id: '6001-FT', type: 'textarea', question: 'Beschreiben Sie Ihre Beeinträchtigungen bitte kurz', section: 'beeintraechtigung', order: 47, logic: { next: ['6002'] } },
    {
        id: '6002', type: 'radio', question: 'Tragen Sie Implantate?', section: 'implantate', order: 48,
        options: [{ value: 'Ja', label: 'Ja', followUpQuestions: ['6003'] }, { value: 'Nein', label: 'Nein', followUpQuestions: ['6004'] }]
    },
    {
        id: '6003', type: 'multiselect', question: 'Welche Implantate?', section: 'implantate', order: 49,
        options: [
            { value: 'schrittmacher', label: 'Herzschrittmacher' }, { value: 'defibrillator', label: 'Defibrillator' },
            { value: 'gelenk', label: 'Gelenkendoprothese' }, { value: 'herzklappe', label: 'Künstliche Herzklappe' },
            { value: 'freitext', label: 'Andere Implantate (Freitext)', followUpQuestions: ['6003-FT'] }
        ], logic: { next: ['6004'] }
    },
    { id: '6003-FT', type: 'text', question: 'Welche anderen Implantate tragen Sie?', section: 'implantate', order: 50, logic: { next: ['6004'] } },
    {
        id: '6004', type: 'radio', question: 'Erhalten Sie blutverdünnende Medikamente?', section: 'blutverduenner', order: 51,
        options: [{ value: 'Ja', label: 'Ja', followUpQuestions: ['6005'] }, { value: 'Nein', label: 'Nein', followUpQuestions: ['6006'] }]
    },
    {
        id: '6005', type: 'multiselect', question: 'Welche Blutverdünner erhalten Sie?', section: 'blutverduenner', order: 52,
        options: [
            { value: 'ass', label: 'ASS' }, { value: 'clopidogrel', label: 'Clopidogrel' },
            { value: 'eliquis', label: 'Eliquis' }, { value: 'marcumar', label: 'Marcumar' },
            { value: 'xarelto', label: 'Xarelto' }, { value: 'pradaxa', label: 'Pradaxa' }
        ], logic: { next: ['6006'] }
    },
    {
        id: '6006', type: 'radio', question: 'Leiden Sie unter Allergien?', section: 'allergien', order: 53,
        options: [{ value: 'Ja', label: 'Ja', followUpQuestions: ['6007'] }, { value: 'Nein', label: 'Nein', followUpQuestions: ['7000'] }]
    },
    {
        id: '6007', type: 'multiselect', question: 'Ich leide unter folgenden Allergien/Intoleranzen:', section: 'allergien', order: 54,
        options: [
            { value: 'antibiotika', label: 'Antibiotika' }, { value: 'latex', label: 'Latex' },
            { value: 'schmerzmedikamente', label: 'Schmerzmedikamente' }, { value: 'gluten', label: 'Glutenunverträglichkeit' },
            { value: 'lactose', label: 'Lactoseintoleranz' },
            { value: 'freitext', label: 'Andere Allergien (Freitext)', followUpQuestions: ['6007-FT'] }
        ], logic: { next: ['7000'] }
    },
    { id: '6007-FT', type: 'textarea', question: 'Welche anderen Allergien oder Intoleranzen haben Sie?', section: 'allergien', order: 55, logic: { next: ['7000'] } },

    // GESUNDHEITSSTÖRUNGEN
    {
        id: '7000', type: 'multiselect', question: 'Haben Sie eine der folgenden Gesundheitsstörungen?', section: 'gesundheitsstoerungen', order: 56,
        options: [
            { value: 'bluthochdruck', label: 'Bluthochdruck' },
            { value: 'gerinnung', label: 'Blutung/Gerinnungsstörung', followUpQuestions: ['7001'] },
            { value: 'lunge', label: 'Chronische Lungenerkrankung', followUpQuestions: ['7002'] },
            { value: 'depression', label: 'Depression/Gemütsstörung' },
            { value: 'herz', label: 'Herzschwäche/Herzrhythmusstörung' },
            { value: 'nieren', label: 'Nierenfunktionsstörung' },
            { value: 'schilddruese', label: 'Schilddrüsenerkrankung' },
            { value: 'freitext', label: 'Weitere Diagnosen (Freitext)', followUpQuestions: ['7000-FT'] }
        ], logic: { next: ['8000'] }
    },
    { id: '7000-FT', type: 'textarea', question: 'Welche weiteren Diagnosen?', section: 'gesundheitsstoerungen', order: 57, logic: { next: ['8000'] } },
    {
        id: '7001', type: 'multiselect', question: 'Welche Gerinnungsstörung haben Sie?', section: 'gesundheitsstoerungen', order: 58,
        options: [
            { value: 'vws', label: 'Von-Willebrand-Syndrom' }, { value: 'haemophilie', label: 'Hämophilie' },
            { value: 'freitext', label: 'Andere (Freitext)', followUpQuestions: ['7001-FT'] }
        ], logic: { next: ['8000'] }
    },
    { id: '7001-FT', type: 'text', question: 'Welche andere Gerinnungsstörung?', section: 'gesundheitsstoerungen', order: 59, logic: { next: ['8000'] } },
    {
        id: '7002', type: 'multiselect', question: 'Welche Lungenerkrankung?', section: 'gesundheitsstoerungen', order: 60,
        options: [
            { value: 'asthma', label: 'Asthma bronchiale' }, { value: 'copd', label: 'COPD' },
            { value: 'freitext', label: 'Andere (Freitext)', followUpQuestions: ['7002-FT'] }
        ], logic: { next: ['8000'] }
    },
    { id: '7002-FT', type: 'text', question: 'Welche andere Lungenerkrankung?', section: 'gesundheitsstoerungen', order: 61, logic: { next: ['8000'] } },

    // VORERKRANKUNGEN / MEDIKAMENTE
    {
        id: '8000', type: 'multiselect', question: 'Hatten Sie jemals eine der folgenden Ereignisse?', section: 'vorerkrankungen', order: 62,
        options: [
            { value: 'herzinfarkt', label: 'Herzinfarkt' }, { value: 'schlaganfall', label: 'Schlaganfall' },
            { value: 'thrombose', label: 'Thrombose' }, { value: 'lungenembolie', label: 'Lungenembolie' },
            { value: 'krebs', label: 'Krebs' },
            { value: 'freitext', label: 'Weitere Angaben (Freitext)', followUpQuestions: ['8000-FT'] }
        ], logic: { next: ['8800'] }
    },
    { id: '8000-FT', type: 'textarea', question: 'Weitere Details zu Ihren Vorerkrankungen', section: 'vorerkrankungen', order: 63, logic: { next: ['8800'] } },
    {
        id: '8800', type: 'radio', question: 'Könnten Sie schwanger sein?', section: 'schwangerschaft', order: 64,
        options: [{ value: 'ja', label: 'Ja, möglicherweise' }, { value: 'nein', label: 'Nein' }, { value: 'weiss_nicht', label: 'Weiß nicht' }],
        logic: { 
            showIf: [
                { key: 'gender', operator: 'contextEquals', value: 'W' },
                { key: 'age', operator: 'contextLessThan', value: 50 }
            ],
            next: ['8900'] 
        }
    },
    {
        id: '8900', type: 'textarea', question: 'Welche Medikamente erhalten Sie aktuell?', section: 'medikamente-freitext', order: 65,
        placeholder: 'z.B. Ramipril 5mg', logic: { next: ['9100'] }
    },

    // SERVICES
    { id: 'RES-100', type: 'text', question: 'Name der Medikation / Wirkstoff', section: 'rezepte', order: 100, placeholder: 'z.B. Ramipril 5mg', validation: { required: true }, logic: { next: ['RES-101'] } },
    { id: 'RES-101', type: 'text', question: 'Dosierung und Packungsgröße', section: 'rezepte', order: 101, placeholder: 'z.B. 1-0-0, 100 Stück', logic: { next: ['RES-102'] } },
    {
        id: 'RES-102', type: 'select', question: 'Wie möchten Sie das Rezept erhalten?', section: 'rezepte', order: 102,
        options: [{ value: 'eRezept', label: 'Als eRezept' }, { value: 'abholung', label: 'Abholung in der Praxis' }, { value: 'post', label: 'Per Post' }],
        logic: { next: ['RES-103'] }
    },
    { id: 'RES-103', type: 'textarea', question: 'Zusätzliche Anmerkungen zum Rezept', section: 'rezepte', order: 103, logic: { next: ['9100'] } },

    { id: 'DAT-100', type: 'select', question: 'Was für Dokumente möchten Sie uns übermitteln?', section: 'dateien', order: 110, options: [{ value: 'befund', label: 'Externer Befund' }, { value: 'labor', label: 'Laborwerte' }, { value: 'sonstiges', label: 'Sonstige' }], logic: { next: ['DAT-101'] } },
    { id: 'DAT-101', type: 'textarea', question: 'Beschreibung / Kontext der Dokumente', section: 'dateien', order: 111, logic: { next: ['DAT-102'] } },
    { id: 'DAT-102', type: 'radio', question: 'Sicherer Datentransfer', section: 'dateien', order: 112, description: 'Verschlüsselter Upload – Platzhalter', options: [{ value: 'bestaetigt', label: 'Verstanden, weiter' }], logic: { next: ['9100'] } },

    { id: 'AU-100', type: 'date', question: 'Seit wann bestehen die Beschwerden?', section: 'au-anfrage', order: 120, validation: { required: true }, logic: { next: ['AU-101'] } },
    { id: 'AU-101', type: 'textarea', question: 'Welche Symptome haben Sie?', section: 'au-anfrage', order: 121, validation: { required: true }, logic: { next: ['AU-102'] } },
    { id: 'AU-102', type: 'radio', question: 'Waren Sie wegen dieser Beschwerden bereits beim Arzt?', section: 'au-anfrage', order: 122, options: [{ value: 'Ja', label: 'Ja' }, { value: 'Nein', label: 'Nein' }], logic: { next: ['9100'] } },

    { id: 'UEB-100', type: 'text', question: 'Für welche Fachrichtung benötigen Sie die Überweisung?', section: 'ueberweisung', order: 130, placeholder: 'z.B. Kardiologie', validation: { required: true }, logic: { next: ['UEB-101'] } },
    { id: 'UEB-101', type: 'textarea', question: 'Grund der Überweisung', section: 'ueberweisung', order: 131, validation: { required: true }, logic: { next: ['9100'] } },

    { id: 'ABS-100', type: 'date', question: 'Datum des Termins, den Sie absagen möchten:', section: 'absage', order: 140, validation: { required: true }, logic: { next: ['ABS-101'] } },
    { id: 'ABS-101', type: 'textarea', question: 'Grund der Absage (optional)', section: 'absage', order: 141, logic: { next: ['9100'] } },

    { id: 'TEL-100', type: 'text', question: 'Wann sind Sie am besten erreichbar?', section: 'telefon', order: 150, placeholder: 'z.B. Vormittags 10-12 Uhr', logic: { next: ['TEL-101'] } },
    { id: 'TEL-101', type: 'textarea', question: 'Kurzes Anliegen für den Rückruf', section: 'telefon', order: 151, logic: { next: ['9100'] } },

    { id: 'BEF-100', type: 'multiselect', question: 'Welche Unterlagen benötigen Sie von uns?', section: 'befund-anforderung', order: 160, options: [{ value: 'arztbrief', label: 'Arztbrief' }, { value: 'labor', label: 'Laborwerte' }, { value: 'impfpass', label: 'Kopie Impfpass' }, { value: 'sonstiges', label: 'Sonstiges' }], logic: { next: ['BEF-101'] } },
    { id: 'BEF-101', type: 'text', question: 'Zeitraum oder spezieller Anlass', section: 'befund-anforderung', order: 161, logic: { next: ['9100'] } },

    { id: 'MS-100', type: 'text', question: 'Betreff Ihrer Nachricht', section: 'nachricht', order: 170, validation: { required: true }, logic: { next: ['MS-101'] } },
    { id: 'MS-101', type: 'textarea', question: 'Ihre Mitteilung an uns', section: 'nachricht', order: 171, validation: { required: true }, logic: { next: ['9100'] } },

    // ABSCHLUSS
    {
        id: '9100', type: 'radio', question: 'Möchten Sie sich über unsere zusätzlichen Privatleistungen (IGeL) informieren?', section: 'abschluss', order: 179,
        options: [{ value: 'ja', label: 'Ja, gerne' }, { value: 'nein', label: 'Nein, direkt zum Abschluss' }],
        logic: { conditional: [{ equals: 'ja', then: '9999' }, { equals: 'nein', then: '9010' }] }
    },
    {
        id: '9999', type: 'radio', question: 'Zusatzleistungen', section: 'abschluss', order: 179.5,
        logic: { next: ['9010'] }
    },
    {
        id: '9010', type: 'email', question: 'Bestätigen Sie hier Ihre E-Mail Adresse', section: 'abschluss', order: 180,
        validation: { required: true }, logic: { next: ['9011'], showIf: [{ questionId: '0000', operator: 'equals', value: 'ja' }] }
    },
    {
        id: '9011', type: 'tel', question: 'Mobilrufnummer für Rückfragen (optional)', section: 'abschluss', order: 181,
        logic: { next: ['9000'], showIf: [{ questionId: '0000', operator: 'equals', value: 'ja' }] }
    },
    {
        id: '9000', type: 'radio', question: 'Abschluss der Eingabe', section: 'abschluss', order: 190,
        description: 'Bitte überprüfen Sie Ihre Angaben in der Zusammenfassung.',
        options: [{ value: 'absenden', label: 'Angaben bestätigen und absenden' }], validation: { required: true }
    },

    // NEUE FRAGEN
    { id: '2080', type: 'text', question: 'Welchen Beruf üben Sie aus?', section: 'bg-unfall', order: 200, validation: { required: true }, logic: { next: ['2081'] } },
    { id: '2081', type: 'text', question: 'Name des Arbeitgebers', section: 'bg-unfall', order: 201, validation: { required: true }, logic: { next: ['2082'] } },
    { id: '2082', type: 'text', question: 'Adresse des Arbeitgebers', section: 'bg-unfall', order: 202, logic: { next: ['2083'] } },
    {
        id: '2083', type: 'select', question: 'Zuständige Berufsgenossenschaft', section: 'bg-unfall', order: 203,
        options: [
            { value: 'bg_bau', label: 'BG BAU – Berufsgenossenschaft der Bauwirtschaft' },
            { value: 'bg_etem', label: 'BG ETEM – Energie Textil Elektro Medienerzeugnisse' },
            { value: 'bg_holz', label: 'BGHM – Holz und Metall' },
            { value: 'bg_nahrung', label: 'BGN – Nahrungsmittel und Gastgewerbe' },
            { value: 'bg_handel', label: 'BGHW – Handel und Warenlogistik' },
            { value: 'bg_transport', label: 'BG Verkehr – Transport und Verkehrswirtschaft' },
            { value: 'bg_gesundheit', label: 'BGW – Gesundheitsdienst und Wohlfahrtspflege' },
            { value: 'bg_verwaltung', label: 'VBG – Verwaltungs-Berufsgenossenschaft' },
            { value: 'bg_rci', label: 'BG RCI – Rohstoffe und chemische Industrie' },
            { value: 'unbekannt', label: 'Unbekannt / Andere' }
        ], validation: { required: true }, logic: { next: ['2084'] }
    },
    { id: '2084', type: 'date', question: 'Unfalltag', section: 'bg-unfall', order: 204, validation: { required: true }, logic: { next: ['2085'] } },
    { id: '2085', type: 'time', question: 'Unfallzeit (ungefähr)', section: 'bg-unfall', order: 205, logic: { next: ['2086'] } },
    {
        id: '2086', type: 'radio', question: 'Art des Unfalls', section: 'bg-unfall', order: 206,
        options: [{ value: 'arbeitsunfall', label: 'Arbeitsunfall' }, { value: 'wegeunfall', label: 'Wegeunfall' }, { value: 'schulunfall', label: 'Schulunfall' }, { value: 'sonstiges', label: 'Sonstiges' }],
        logic: { next: ['2087'] }
    },
    { id: '2087', type: 'text', question: 'Unfallort', section: 'bg-unfall', order: 207, validation: { required: true }, logic: { next: ['2088'] } },
    { id: '2088', type: 'textarea', question: 'Unfallhergang (Beschreibung)', section: 'bg-unfall', order: 208, validation: { required: true }, logic: { next: ['2089'] } },
    { id: '2089', type: 'textarea', question: 'Art der Verletzung', section: 'bg-unfall', order: 209, validation: { required: true }, logic: { next: ['2090'] } },
    { id: '2090', type: 'text', question: 'Name des Ersthelfers (falls vorhanden)', section: 'bg-unfall', order: 210, logic: { next: ['2091'] } },
    { id: '2091', type: 'radio', question: 'Erstversorgung erfolgt?', section: 'bg-unfall', order: 211, options: [{ value: 'ja', label: 'Ja' }, { value: 'nein', label: 'Nein' }], logic: { next: ['9100'] } },

    { id: '4120', type: 'text', question: 'Welchen Beruf üben Sie aus?', section: 'beruf', order: 36, logic: { next: ['4121'] } },
    { id: '4121', type: 'radio', question: 'Fühlen Sie sich in Ihrem Beruf stark belastet?', section: 'beruf', order: 37, options: [{ value: 'ja', label: 'Ja' }, { value: 'nein', label: 'Nein' }, { value: 'teilweise', label: 'Teilweise' }], logic: { next: ['4122'] } },
    { id: '4122', type: 'select', question: 'Wie schätzen Sie Ihre Schlafqualität ein?', section: 'beruf', order: 38, options: [{ value: 'gut', label: 'Gut' }, { value: 'maessig', label: 'Mäßig' }, { value: 'schlecht', label: 'Schlecht' }, { value: 'sehr_schlecht', label: 'Sehr schlecht' }], logic: { next: ['4130'] } },
    { id: '4130', type: 'radio', question: 'Trinken Sie regelmäßig Alkohol?', section: 'beruf', order: 39, options: [{ value: 'nie', label: 'Nie' }, { value: 'gelegentlich', label: 'Gelegentlich' }, { value: 'regelmaessig', label: 'Regelmäßig' }, { value: 'taeglich', label: 'Täglich' }], logic: { next: ['4131'] } },
    { id: '4131', type: 'radio', question: 'Nehmen Sie Drogen oder andere Substanzen?', section: 'beruf', order: 40, options: [{ value: 'ja', label: 'Ja' }, { value: 'nein', label: 'Nein' }], logic: { next: ['5000'] } },
];

// ─── Main Seed Function ─────────────────────────────────────

async function main() {
    console.log('🌱 Starte Datenbank-Seed...');

    // 1. Alle bestehenden Atome löschen
    await prisma.medicalAtom.deleteMany();
    console.log('  ✓ Alte Atome gelöscht');

    // 2. Alle Fragen als MedicalAtom einfügen
    for (const q of LEGACY_QUESTIONS) {
        const atom = convertToAtom(q);
        await prisma.medicalAtom.create({ data: atom });
    }
    console.log(`  ✓ ${LEGACY_QUESTIONS.length} MedicalAtoms eingefügt`);

    // 3. Standard-Arzt-Account erstellen
    const arztExists = await prisma.arztUser.findUnique({ where: { username: 'admin' } });
    if (!arztExists) {
        const hash = await bcrypt.hash(process.env.ARZT_PASSWORD || 'CHANGE_ME_IN_ENV', 10);
        await prisma.arztUser.create({
            data: {
                username: 'admin',
                passwordHash: hash,
                displayName: 'Dr. Admin',
            },
        });
        console.log('  ✓ Standard-Arzt "admin" erstellt (Passwort aus ARZT_PASSWORD env)');
    }

    console.log(`\n✅ Seed abgeschlossen: ${LEGACY_QUESTIONS.length} Fragen + 1 Arzt-Account`);

    // Modul 1+2 Seeds
    await seedWaitingContent();
    await seedPermissions();
    console.log('✅ Modul 1+2 Seeds (WaitingContent + Permissions) abgeschlossen');
}

main()
    .catch((e: Error) => {
        console.error('❌ Seed-Fehler:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
