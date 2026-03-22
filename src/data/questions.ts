import type { Question } from '../types/question';
import { newQuestions } from './new-questions.ts';

export const questions: Question[] = [
    // ==================== KAPITEL 1: IDENTIFIKATION & BESUCHSSTATUS ====================
    {
        id: '0000',
        type: 'radio',
        question: 'Sind Sie bereits als Patient in unserer Praxis bekannt?',
        section: 'basis',
        order: 1,
        options: [
            { value: 'ja', label: 'Ja, ich bin bereits Patient' },
            { value: 'nein', label: 'Nein, ich bin zum ersten Mal hier' }
        ],
        validation: { required: true },
        logic: {
            next: ['0001']
        }
    },
    {
        id: '0001',
        type: 'text',
        question: 'Geben Sie hier Ihren Nachnamen ein',
        section: 'basis',
        order: 2,
        validation: {
            required: true,
            minLength: 2,
            pattern: '^[a-zA-ZäöüÄÖÜß\\s-]+$',
            customMessage: 'Der Name darf nur Buchstaben, Leerzeichen und Bindestriche enthalten.'
        },
        logic: { next: ['0011'] }
    },
    {
        id: '0011',
        type: 'text',
        question: 'Geben Sie hier Ihren Vornamen ein',
        section: 'basis',
        order: 3,
        validation: {
            required: true,
            minLength: 2,
            pattern: '^[a-zA-ZäöüÄÖÜß\\s-]+$',
            customMessage: 'Der Name darf nur Buchstaben, Leerzeichen und Bindestriche enthalten.'
        },
        logic: { next: ['0002'] }
    },
    {
        id: '0002',
        type: 'select',
        question: 'Geschlecht',
        section: 'basis',
        order: 4,
        options: [
            { value: 'M', label: 'männlich' },
            { value: 'W', label: 'weiblich' },
            { value: 'D', label: 'divers/weiß nicht' }
        ],
        validation: { required: true },
        logic: { next: ['0003'] }
    },
    {
        id: '0003',
        type: 'date',
        question: 'Geben Sie hier Ihr Geburtsdatum ein',
        section: 'basis',
        order: 5,
        validation: {
            required: true,
            ageOver: 3,
            customMessage: 'Das Alter muss mehr als 3 Jahre betragen.'
        },
        logic: {
            next: ['2000'], // Default to enrollment for new patients
            conditional: [
                {
                    when: '0000', equals: 'ja', then: ['RPT-ID']
                },
                { when: '0000', equals: 'nein', then: ['2000'] }
            ]
        }
    },
    // ─── Returning Patient Fast-Track Identification ─────────
    {
        id: 'RPT-ID',
        type: 'patient-identify',
        question: 'Patienten-Identifikation',
        description: 'Als bestehender Patient benötigen wir nur wenige Daten zur schnellen Identifikation.',
        section: 'basis',
        order: 5.5,
        validation: { required: false },
        logic: {
            showIf: [
                { questionId: '0000', operator: 'equals', value: 'ja' }
            ],
            conditional: [
                { context: 'selectedReason', equals: 'Medikamente / Rezepte', then: 'RES-100' },
                { context: 'selectedReason', equals: 'Dateien / Befunde', then: 'DAT-100' },
                { context: 'selectedReason', equals: 'AU (Krankschreibung)', then: 'AU-100' },
                { context: 'selectedReason', equals: 'Überweisung', then: 'UEB-100' },
                { context: 'selectedReason', equals: 'Terminabsage', then: 'ABS-100' },
                { context: 'selectedReason', equals: 'Telefonanfrage', then: 'TEL-100' },
                { context: 'selectedReason', equals: 'Dokumente anfordern', then: 'BEF-100' },
                { context: 'selectedReason', equals: 'Nachricht schreiben', then: 'MS-100' },
                { context: 'selectedReason', equals: 'Termin / Anamnese', then: 'TERM-100' },
                { context: 'selectedReason', equals: 'Unfallmeldung (BG)', then: '2080' }
            ],
            next: ['0001']
        }
    },
    // Legacy PID field (hidden in new flow, kept for backward compat)
    {
        id: '0004',
        type: 'text',
        question: 'Patienten-ID (PID)',
        description: 'Falls Ihnen Ihre Patienten-ID bekannt ist, können Sie diese hier eingeben.',
        section: 'basis',
        order: 5.6,
        placeholder: 'z.B. 12345',
        validation: { required: false },
        logic: {
            showIf: [
                { questionId: 'RPT-ID', operator: 'equals', value: 'fallback' }
            ],
            next: ['TERM-100']
        }
    },

    // ==================== KAPITEL 2: ENROLLMENT (NEU-PATIENTEN) ====================
    {
        id: '2000',
        type: 'radio',
        question: 'Versicherungsstatus?',
        section: 'versicherung',
        order: 6,
        options: [
            { value: 'PKV', label: 'Privatversichert' },
            { value: 'GKV', label: 'Gesetzlich versichert' },
            { value: 'Selbstzahler', label: 'Selbstzahler' }
        ],
        validation: { required: true },
        logic: { next: ['2001'] }
    },
    {
        id: '2001',
        type: 'text',
        question: 'Versichertennummer (falls zur Hand)',
        description: 'Die Versichertennummer finden Sie auf Ihrer Gesundheitskarte (eGK) oder Versicherungsschein.',
        section: 'versicherung',
        order: 6.5,
        placeholder: 'z.B. A123456789',
        logic: { next: ['3000'] }
    },
    {
        id: '3000',
        type: 'number',
        question: 'Wie lautet Ihre PLZ?',
        section: 'adresse',
        order: 12,
        validation: { required: true, min: 10000, max: 99999 },
        logic: { next: ['3001'] }
    },
    {
        id: '3001',
        type: 'text',
        question: 'Wohnort',
        section: 'adresse',
        order: 13,
        validation: { required: true },
        logic: { next: ['3002'] }
    },
    {
        id: '3002',
        type: 'text',
        question: 'Straße und Hausnummer',
        section: 'adresse',
        order: 14,
        placeholder: 'z.B. Musterstraße 12a',
        validation: { required: true },
        logic: { next: ['3002a'] }
    },
    {
        id: '3002a',
        type: 'text',
        question: 'Adresszusatz / c/o (optional)',
        section: 'adresse',
        order: 14.1,
        placeholder: 'z.B. 3. OG links, c/o Müller',
        logic: { next: ['3003'] }
    },
    {
        id: '3003',
        type: 'email',
        question: 'E-Mail-Adresse (optional)',
        description: 'Falls vorhanden – wird für Terminbestätigungen und Rezeptbenachrichtigungen verwendet. Ohne E-Mail erhalten Sie alles direkt in der Praxis.',
        section: 'kontakt',
        order: 15,
        validation: { required: false, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
        logic: { next: ['3004'] }
    },
    {
        id: '3004',
        type: 'tel',
        question: 'Mobilnummer (optional)',
        description: 'Für dringende Rückfragen der Praxis.',
        section: 'kontakt',
        order: 16,
        placeholder: 'z.B. 0171 12345678',
        validation: { required: false },
        logic: { next: ['3004b'] }
    },
    {
        id: '3004b',
        type: 'tel',
        question: 'Festnetznummer (optional)',
        description: 'Falls Sie auch über Festnetz erreichbar sind.',
        section: 'kontakt',
        order: 16.5,
        placeholder: 'z.B. 030 12345678',
        validation: {
            required: false,
            crossFieldRequired: {
                fields: ['3003', '3004', '3004b'],
                message: 'Bitte mindestens eine Telefonnummer (Mobil/Festnetz) oder eine E-Mail-Adresse angeben.'
            }
        },
        logic: { next: ['3005'] }
    },
    {
        id: '3005',
        type: 'radio',
        question: 'Weiter zum gewählten Anliegen?',
        section: 'kontakt',
        order: 17,
        options: [{ value: 'weiter', label: 'Ja, weiter' }],
        logic: {
            conditional: [
                { context: 'selectedReason', equals: 'Medikamente / Rezepte', then: 'RES-100' },
                { context: 'selectedReason', equals: 'Dateien / Befunde', then: 'DAT-100' },
                { context: 'selectedReason', equals: 'AU (Krankschreibung)', then: 'AU-100' },
                { context: 'selectedReason', equals: 'Überweisung', then: 'UEB-100' },
                { context: 'selectedReason', equals: 'Terminabsage', then: 'ABS-100' },
                { context: 'selectedReason', equals: 'Telefonanfrage', then: 'TEL-100' },
                { context: 'selectedReason', equals: 'Dokumente anfordern', then: 'BEF-100' },
                { context: 'selectedReason', equals: 'Nachricht schreiben', then: 'MS-100' },
                { context: 'selectedReason', equals: 'Termin / Anamnese', then: 'TERM-100' },
                { context: 'selectedReason', equals: 'Unfallmeldung (BG)', then: '2080' }
            ]
        }
    },

    // ==================== KAPITEL 4.5: ARBEITSUNFALL (BG) ====================
    {
        id: '2080',
        type: 'bg-form',
        question: 'Details zum Arbeits-/Wegeunfall (BG)',
        section: 'beschwerden',
        order: 17.5,
        validation: { required: true },
        logic: { next: ['9000'] }
    },

    // ==================== KAPITEL 5: BESCHWERDEN (ANAMNESE) ====================
    {
        id: '1000',
        type: 'radio',
        question: 'Haben Sie aktuell Beschwerden?',
        section: 'beschwerden',
        order: 18,
        options: [
            { value: 'Ja', label: 'Ja' },
            { value: 'Nein', label: 'Nein' }
        ],
        validation: { required: true },
        logic: {
            conditional: [
                { equals: 'Ja', then: '1001' },
                { equals: 'Nein', then: [
                    { when: '0000', equals: 'ja', then: [
                        { when: 'ALT-100', equals: 'ja', then: 'MED-100' },
                        { when: 'ALT-100', equals: 'nein', then: '9500' }
                    ]},
                    { when: '0000', equals: 'nein', then: '4000' }
                ]}
            ]
        }
    },
    {
        id: '1001',
        type: 'select',
        question: 'Wie lange bestehen Ihre Beschwerden?',
        section: 'beschwerden',
        order: 19,
        options: [
            { value: 'wenige_tage', label: 'wenige Tage' },
            { value: 'weniger_1w', label: 'weniger als 1 Woche' },
            { value: 'wenige_wochen', label: 'wenige Wochen' },
            { value: 'wenige_monate', label: 'wenige Monate' },
            { value: 'laenger_6m', label: 'länger als ein halbes Jahr' },
            { value: 'jahre', label: 'seit Jahren' },
            { value: 'weiss_nicht', label: 'weiß nicht' }
        ],
        validation: { required: true },
        logic: { next: ['1004'] }
    },
    {
        id: '1002',
        type: 'multiselect',
        question: 'Wo haben Sie Beschwerden?',
        section: 'beschwerden',
        order: 20,
        options: [
            { value: 'kopf', label: 'Kopf', followUpQuestions: ['1080'] },
            { value: 'hals', label: 'Hals / Rachen', followUpQuestions: ['1B00'] },
            { value: 'brust', label: 'Brustschmerzen / Herzensenge (Notfall!)', followUpQuestions: ['1050'] },
            { value: 'bauch', label: 'Bauch / Bauchschmerzen', followUpQuestions: ['1030'] },
            { value: 'ruecken', label: 'Rücken / Rückenschmerzen', followUpQuestions: ['1070'] },
            { value: 'augen', label: 'Augenbeschwerden', followUpQuestions: ['1A00'] },
            { value: 'atemnot', label: 'Atemnot / Kurzatmigkeit (Notfall!)', followUpQuestions: ['1020'] },
            { value: 'laehmung', label: 'Lähmungserscheinungen / Sprachstörung (Notfall!)', followUpQuestions: ['1185'] },
            { value: 'beine', label: 'Beinschmerzen / Schwellung', followUpQuestions: ['1010'] },
            { value: 'haut', label: 'Haut / Hautveränderungen', followUpQuestions: ['1040'] },
            { value: 'hormonell', label: 'Hormonelle / Stoffwechsel-Beschwerden', followUpQuestions: ['1060'] },
            { value: 'psychisch', label: 'Seelische / psychische Beschwerden', followUpQuestions: ['1C00'] },
            { value: 'urologie', label: 'Urologisch / Gynäkologisch', followUpQuestions: ['1090'] },
            { value: 'sonstiges', label: 'Sonstiges' }
        ],
        validation: { required: true },
        logic: {
            next: ['1003'],
            triage: {
                when: ['brust', 'atemnot', 'laehmung'],
                level: 'critical',
                message: 'ACHTUNG: Ihre Symptome könnten auf einen medizinischen Notfall hindeuten. Bitte wählen Sie umgehend den Notruf 112 oder wenden Sie sich sofort an das Praxispersonal!'
            }
        }
    },
    {
        id: '1003',
        type: 'textarea',
        question: 'Beschreiben Sie Ihre Beschwerden bitte kurz',
        section: 'beschwerden',
        order: 21,
        placeholder: 'Haben Sie akute Schmerzen in der Brust oder Atemnot? Bitte informieren Sie uns sofort!',
        validation: { required: true },
        logic: {
            conditional: [
                { when: '0000', equals: 'ja', then: [
                    { when: 'ALT-100', equals: 'ja', then: 'MED-100' },
                    { when: 'ALT-100', equals: 'nein', then: '9500' }
                ]},
                { when: '0000', equals: 'nein', then: '4000' }
            ]
        }
    },

    // ==================== KAPITEL 6: KLINISCHE DETAILS ====================
    {
        id: '4000',
        type: 'number',
        question: 'Körpergröße (in cm)',
        description: 'Auch für Kinder – z.B. 52 cm (Neugeborene) bis 250 cm.',
        section: 'koerpermasse',
        order: 25,
        placeholder: 'z.B. 175',
        validation: {
            required: true,
            min: 50,
            max: 250,
            ageConditionalMin: { ageThreshold: 6, minIfBelow: 30, minIfAbove: 50 }
        },
        logic: { next: ['4001'] }
    },
    {
        id: '4001',
        type: 'number',
        question: 'Körpergewicht (in kg)',
        description: 'Auch für Kinder – z.B. 3 kg (Neugeborene) bis 300 kg.',
        section: 'koerpermasse',
        order: 26,
        placeholder: 'z.B. 75',
        validation: {
            required: true,
            min: 5,
            max: 300,
            ageConditionalMin: { ageThreshold: 6, minIfBelow: 2, minIfAbove: 5 }
        },
        logic: { next: ['4002'] }
    },
    {
        id: '4002',
        type: 'radio',
        question: 'Haben Sie jemals geraucht?',
        section: 'rauchen',
        order: 27,
        options: [
            { value: 'Ja', label: 'Ja', followUpQuestions: ['4003', '4004', '4005'] },
            { value: 'Nein', label: 'Nein', followUpQuestions: ['4100'] }
        ],
        validation: { required: true }
    },
    {
        id: '4003',
        type: 'number',
        question: 'Durchschnittlich wie viele Zigaretten pro Tag?',
        section: 'rauchen',
        order: 28,
        validation: { required: true, min: 1, max: 100 },
        logic: { next: ['4004'] }
    },
    {
        id: '4004',
        type: 'number',
        question: 'Wie viele Jahre haben Sie geraucht?',
        section: 'rauchen',
        order: 29,
        validation: { required: true, min: 1, max: 100 },
        logic: { next: ['4005'] }
    },
    {
        id: '4005',
        type: 'radio',
        question: 'Rauchen Sie immer noch?',
        section: 'rauchen',
        order: 30,
        options: [
            { value: 'Ja', label: 'Ja', followUpQuestions: ['4100'] },
            { value: 'Nein', label: 'Nein', followUpQuestions: ['4006'] }
        ]
    },
    {
        id: '4006',
        type: 'number',
        question: 'Wann (Jahr) haben Sie aufgehört?',
        section: 'rauchen',
        order: 31,
        validation: { required: true, min: 1900, max: 2025 },
        logic: { next: ['4100'] }
    },
    {
        id: '4100',
        type: 'multiselect',
        question: 'Haben Sie folgende Impfungen erhalten?',
        section: 'impfungen',
        order: 32,
        options: [
            { value: 'covid', label: 'COVID-19' },
            { value: 'diphterie', label: 'Diphterie' },
            { value: 'fsme', label: 'FSME' },
            { value: 'hepatitis_b', label: 'Hepatitis B' },
            { value: 'herpes_zoster', label: 'Herpes Zoster (Gürtelrose)' },
            { value: 'influenza', label: 'Influenza (Grippe)' },
            { value: 'mmr', label: 'Masern, Mumps, Röteln (MMR)' },
            { value: 'pneumokokken', label: 'Pneumokokken' },
            { value: 'rsv', label: 'RSV' },
            { value: 'tetanus', label: 'Tetanus' },
            { value: 'freitext', label: 'Weitere Impfungen (Freitext)', followUpQuestions: ['4100-FT'] }
        ],
        logic: { next: ['4110'] }
    },
    {
        id: '4100-FT',
        type: 'textarea',
        question: 'Welche weiteren Impfungen haben Sie erhalten?',
        section: 'impfungen',
        order: 33,
        logic: { next: ['4110'] }
    },
    {
        id: '4110',
        type: 'multiselect',
        question: 'Gibt es in Ihrer Familie folgende Erkrankungen?',
        section: 'familie',
        order: 34,
        options: [
            { value: 'herzinfarkt', label: 'Herzinfarkt/Schlaganfall' },
            { value: 'bluthochdruck', label: 'Bluthochdruck' },
            { value: 'diabetes', label: 'Diabetes' },
            { value: 'krebs', label: 'Krebserkrankungen' },
            { value: 'demenz', label: 'Demenz/Alzheimer' },
            { value: 'keine', label: 'keine' },
            { value: 'freitext', label: 'Andere relevante Erkrankungen (Freitext)', followUpQuestions: ['4110-FT'] }
        ],
        logic: { next: ['5000'] }
    },
    {
        id: '4110-FT',
        type: 'textarea',
        question: 'Welche anderen relevanten Erkrankungen gibt es in Ihrer Familie?',
        section: 'familie',
        order: 35,
        logic: { next: ['5000'] }
    },
    {
        id: '5000',
        type: 'radio',
        question: 'Leiden Sie an Diabetes?',
        section: 'diabetes',
        order: 40,
        options: [
            { value: 'Ja', label: 'Ja', followUpQuestions: ['5001', '5002', '5003'] },
            { value: 'Nein', label: 'Nein', followUpQuestions: ['6000'] }
        ],
        validation: { required: true }
    },
    {
        id: '5001',
        type: 'select',
        question: 'Welcher Typ?',
        section: 'diabetes',
        order: 41,
        options: [
            { value: 'typ1', label: 'Diabetes Typ 1' },
            { value: 'typ2', label: 'Diabetes Typ 2' },
            { value: 'typ3', label: 'Diabetes Typ 3' },
            { value: 'praediabetes', label: 'Prädiabetes' },
            { value: 'gestationsdiabetes', label: 'Gestationsdiabetes (Schwangerschaftsdiabetes)' },
            { value: 'unklar', label: 'Unklar / in Abklärung' }
        ],
        logic: { next: ['5002'] }
    },
    {
        id: '5002',
        type: 'multiselect',
        question: 'Wie wird Ihr Diabetes behandelt?',
        section: 'diabetes',
        order: 42,
        options: [
            { value: 'keine', label: 'Keine medikamentöse Therapie' },
            { value: 'diaet', label: 'Diät' },
            { value: 'forxiga', label: 'Forxiga' },
            { value: 'glimepirid', label: 'Glimepirid' },
            { value: 'insulin', label: 'Insulin', followUpQuestions: ['5004'] },
            { value: 'januvia', label: 'Januvia' },
            { value: 'jardiance', label: 'Jardiance' },
            { value: 'metformin', label: 'Metformin' },
            { value: 'freitext', label: 'Sonstige (Freitext)', followUpQuestions: ['5002-FT'] }
        ],
        logic: { next: ['5003'] }
    },
    {
        id: '5004',
        type: 'multiselect',
        question: 'Welche Art von Insulin verwenden Sie?',
        section: 'diabetes',
        order: 42.3,
        options: [
            { value: 'basalinsulin', label: 'Basalinsulin (Langzeitinsulin)' },
            { value: 'mischinsulin', label: 'Mischinsulin' },
            { value: 'bolusinsulin', label: 'Bolusinsulin (Mahlzeiteninsulin)' },
            { value: 'insulinpumpe', label: 'Insulinpumpe (CSII)' },
            { value: 'sensor', label: 'Sensorunterstützte Therapie (CGM/FGM)' },
            { value: 'insulin_tablette', label: 'Insulin + Tabletten-Kombination' }
        ],
        logic: { next: ['5003'] }
    },
    {
        id: '5002-FT',
        type: 'text',
        question: 'Welche sonstige Diabetes-Behandlung erhalten Sie?',
        section: 'diabetes',
        order: 42.5,
        logic: { next: ['5003'] }
    },
    {
        id: '5003',
        type: 'multiselect',
        question: 'Haben Sie eine der folgenden Komplikationen?',
        section: 'diabetes',
        order: 43,
        options: [
            { value: 'fusssyndrom', label: 'Diabetisches Fußsyndrom' },
            { value: 'retinopathie', label: 'Retinopathie' },
            { value: 'neuropathie', label: 'Neuropathie' },
            { value: 'nephropathie', label: 'Nephropathie' }
        ],
        logic: { next: ['6000'] }
    },
    {
        id: '6000',
        type: 'radio',
        question: 'Haben Sie körperliche Beeinträchtigungen mit Relevanz?',
        section: 'beeintraechtigung',
        order: 44,
        options: [
            { value: 'Ja', label: 'Ja', followUpQuestions: ['6001'] },
            { value: 'Nein', label: 'Nein', followUpQuestions: ['6002'] }
        ],
        validation: { required: true }
    },
    {
        id: '6001',
        type: 'multiselect',
        question: 'Welche Beeinträchtigungen?',
        section: 'beeintraechtigung',
        order: 45,
        options: [
            { value: 'darmausgang', label: 'Künstlicher Darmausgang' },
            { value: 'rollator', label: 'Am Rollator mobil' },
            { value: 'rollstuhl', label: 'Auf Rollstuhl angewiesen' },
            { value: 'gehbehinderung', label: 'Gehbehinderung' },
            { value: 'amputiert_o', label: 'Oberschenkel-Amputiert' },
            { value: 'amputiert_u', label: 'Unterschenkel-Amputiert' },
            { value: 'kleidung', label: 'Hilfe beim An- und Auskleiden benötigt' },
            { value: 'laehmung', label: '(Teil)Lähmung an den Extremitäten' },
            { value: 'schwerhoerig', label: 'Schwerhörigkeit/Ertaubung' },
            { value: 'sehverlust', label: 'Sehkraftverlust' },
            { value: 'urininkontinenz', label: 'Urininkontinenz' },
            { value: 'stuhlinkontinenz', label: 'Stuhlinkontinenz' },
            { value: 'mobilitaet_detail', label: 'Mobilität genauer angeben', followUpQuestions: ['MOB-100'] },
            { value: 'kognition', label: 'Kognitive Einschränkungen', followUpQuestions: ['KOG-100'] },
            { value: 'freitext', label: 'Andere Beeinträchtigungen (Freitext)', followUpQuestions: ['6001-FT'] }
        ],
        logic: { next: ['GDB-100'] }
    },
    {
        id: '6001-FT',
        type: 'textarea',
        question: 'Beschreiben Sie Ihre Beeinträchtigungen bitte kurz',
        section: 'beeintraechtigung',
        order: 45.5,
        logic: { next: ['GDB-100'] }
    },
    {
        id: '6002',
        type: 'radio',
        question: 'Tragen Sie Implantate?',
        section: 'implantate',
        order: 46,
        options: [
            { value: 'Ja', label: 'Ja', followUpQuestions: ['6003'] },
            { value: 'Nein', label: 'Nein', followUpQuestions: ['6004'] }
        ],
        logic: { next: ['6004'] }
    },
    {
        id: '6003',
        type: 'multiselect',
        question: 'Welche Implantate?',
        section: 'implantate',
        order: 47,
        options: [
            { value: 'blasensphinkter', label: 'Blasensphinkter' },
            { value: 'cochlea', label: 'Cochleaimplantat' },
            { value: 'defibrillator', label: 'Defibrillator' },
            { value: 'gelenk', label: 'Gelenkendoprothese' },
            { value: 'schrittmacher', label: 'Herzschrittmacher' },
            { value: 'herzklappe', label: 'Künstliche Herzklappe' },
            { value: 'freitext', label: 'Andere Implantate (Freitext)', followUpQuestions: ['6003-FT'] }
        ],
        logic: { next: ['6004'] }
    },
    {
        id: '6003-FT',
        type: 'text',
        question: 'Welche anderen Implantate tragen Sie?',
        section: 'implantate',
        order: 47.5,
        logic: { next: ['6004'] }
    },
    {
        id: '6004',
        type: 'radio',
        question: 'Erhalten Sie blutverdünnende Medikamente?',
        section: 'blutverduenner',
        order: 48,
        options: [
            { value: 'Ja', label: 'Ja', followUpQuestions: ['6005'] },
            { value: 'Nein', label: 'Nein', followUpQuestions: ['6006'] }
        ]
    },
    {
        id: '6005',
        type: 'multiselect',
        question: 'Welche Blutverdünner erhalten Sie?',
        section: 'blutverduenner',
        order: 49,
        options: [
            { value: 'ass', label: 'ASS' },
            { value: 'brilique', label: 'Brilique' },
            { value: 'clopidogrel', label: 'Clopidogrel' },
            { value: 'efient', label: 'Efient' },
            { value: 'eliquis', label: 'Eliquis' },
            { value: 'lixiana', label: 'Lixiana' },
            { value: 'marcumar', label: 'Marcumar' },
            { value: 'pradaxa', label: 'Pradaxa' },
            { value: 'xarelto', label: 'Xarelto' }
        ],
        logic: { next: ['6006'] }
    },
    {
        id: '6006',
        type: 'radio',
        question: 'Leiden Sie unter Allergien?',
        section: 'allergien',
        order: 50,
        options: [
            { value: 'Ja', label: 'Ja', followUpQuestions: ['6007'] },
            { value: 'Nein', label: 'Nein', followUpQuestions: ['7000'] }
        ]
    },
    {
        id: '6007',
        type: 'multiselect',
        question: 'Ich leide unter folgenden Allergien/Intoleranzen:',
        section: 'allergien',
        order: 51,
        options: [
            { value: 'antibiotika', label: 'Antibiotika' },
            { value: 'latex', label: 'Latex' },
            { value: 'roentgen', label: 'Röntgenkontrastmittel' },
            { value: 'schmerzmedikamente', label: 'Schmerzmedikamente' },
            { value: 'pollen', label: 'Pollen' },
            { value: 'milben', label: 'Hausstaubmilben' },
            { value: 'tierhaare', label: 'Tierhaare' },
            { value: 'nuesse', label: 'Nüsse' },
            { value: 'obst', label: 'Obst' },
            { value: 'gluten', label: 'Glutenunverträglichkeit' },
            { value: 'lactose', label: 'Lactoseintoleranz' },
            { value: 'milcheiweiss', label: 'Milcheiweiß' },
            { value: 'freitext', label: 'Andere Allergien (Freitext)', followUpQuestions: ['6007-FT'] }
        ],
        logic: { next: ['7000'] }
    },
    {
        id: '6007-FT',
        type: 'textarea',
        question: 'Welche anderen Allergien oder Intoleranzen haben Sie?',
        section: 'allergien',
        order: 51.5,
        logic: { next: ['7000'] }
    },
    {
        id: '7000',
        type: 'multiselect',
        question: 'Haben Sie eine der folgenden Gesundheitsstörungen?',
        section: 'gesundheitsstoerungen',
        order: 52,
        options: [
            { value: 'bluthochdruck', label: 'Bluthochdruck' },
            { value: 'gerinnung', label: 'Blutung/Gerinnungsstörung', followUpQuestions: ['7001'] },
            { value: 'lunge', label: 'Chronische Lungenerkrankung (Asthma/COPD)', followUpQuestions: ['7002'] },
            { value: 'nieren_dialyse', label: 'Nierenfunktionsstörung/Dialyseabhängigkeit', followUpQuestions: ['7003', '7008'] },
            { value: 'depression', label: 'Depression/Gemütsstörung', followUpQuestions: ['7004'] },
            { value: 'herz', label: 'Herzinsuffizienz/Arrhythmie', followUpQuestions: ['7005'] },
            { value: 'magen_darm', label: 'Leber/Magen-Darm-Erkrankungen', followUpQuestions: ['7006'] },
            { value: 'nerven', label: 'Erkrankung des Nervensystems', followUpQuestions: ['7009'] },
            { value: 'rheuma', label: 'Rheuma', followUpQuestions: ['7010'] },
            { value: 'schilddruese', label: 'Schilddrüsenerkrankung', followUpQuestions: ['7011'] }
        ],
        logic: { next: ['8000'] }
    },
    {
        id: '7001',
        type: 'multiselect',
        question: 'Welche Gerinnungsstörung haben Sie?',
        section: 'gesundheitsstoerungen',
        order: 53,
        options: [
            { value: 'vws', label: 'Von-Willebrand-Syndrom' },
            { value: 'faktor_v', label: 'Faktor-V-Leiden' },
            { value: 'haemophilie', label: 'Hämophilie' },
            { value: 'antiphospholipid', label: 'Antiphospholipid-Syndrom' },
            { value: 'at3_mangel', label: 'AT-III-Mangel' },
            { value: 'hit', label: 'HIT (Heparin-induzierte Thrombozytopenie)' },
            { value: 'hyperhomocysteinaemie', label: 'Hyperhomocysteinämie' },
            { value: 'protein_cs_mangel', label: 'Protein-C/S-Mangel' },
            { value: 'freitext', label: 'Andere (Freitext)', followUpQuestions: ['7001-FT'] }
        ],
        logic: { next: ['8000'] }
    },
    {
        id: '7001-FT',
        type: 'text',
        question: 'Welche andere Gerinnungsstörung haben Sie?',
        section: 'gesundheitsstoerungen',
        order: 53.5,
        logic: { next: ['8000'] }
    },
    {
        id: '7002',
        type: 'multiselect',
        question: 'Welche Lungenerkrankung haben Sie?',
        section: 'gesundheitsstoerungen',
        order: 54,
        options: [
            { value: 'asthma', label: 'Asthma bronchiale' },
            { value: 'copd', label: 'COPD' },
            { value: 'emphysem', label: 'Lungenemphysem' },
            { value: 'bronchiektasen', label: 'Bronchiektasen' },
            { value: 'chron_bronchitis', label: 'Chronische Bronchitis' },
            { value: 'ipf', label: 'Idiopathische Lungenfibrose (IPF)' },
            { value: 'pneumokoniose', label: 'Pneumokoniosen (Staublunge)' },
            { value: 'sarkoidose', label: 'Sarkoidose' },
            { value: 'freitext', label: 'Andere (Freitext)', followUpQuestions: ['7002-FT'] }
        ],
        logic: { next: ['8000'] }
    },
    {
        id: '7002-FT',
        type: 'text',
        question: 'Welche andere Lungenerkrankung haben Sie?',
        section: 'gesundheitsstoerungen',
        order: 54.5,
        logic: { next: ['8000'] }
    },
    {
        id: '8000',
        type: 'multiselect',
        question: 'Hatten Sie jemals eine der folgenden Ereignisse?',
        section: 'vorerkrankungen',
        order: 55,
        options: [
            { value: 'aneurysma', label: 'Aneurysma', followUpQuestions: ['8001'] },
            { value: 'durchblutung', label: 'Arterielle Durchblutungsstörung', followUpQuestions: ['8003'] },
            { value: 'herzinfarkt', label: 'Herzinfarkt', followUpQuestions: ['HI-WANN-100'] },
            { value: 'herz_op', label: 'Herz-OP / Stent / Bypass', followUpQuestions: ['HERZOP-100'] },
            { value: 'schlaganfall', label: 'Schlaganfall', followUpQuestions: ['STROKE-100'] },
            { value: 'thrombose', label: 'Thrombose', followUpQuestions: ['8005'] },
            { value: 'lungenembolie', label: 'Lungenembolie', followUpQuestions: ['LE-WANN-100'] },
            { value: 'infektionserkrankung', label: 'Infektionskrankheit', followUpQuestions: ['INFEKT-100'] },
            { value: 'transplantation', label: 'Organtransplantation', followUpQuestions: ['TRANS-100'] },
            { value: 'krebs', label: 'Krebs', followUpQuestions: ['8010'] },
            { value: 'freitext', label: 'Weitere Angaben (Freitext)', followUpQuestions: ['8000-FT'] }
        ],
        logic: { next: ['1500'] }
    },
    {
        id: '8000-FT',
        type: 'textarea',
        question: 'Geben Sie hier weitere Details zu Ihren Vorerkrankungen ein',
        section: 'vorerkrankungen',
        order: 55.5,
        logic: { next: ['1500'] }
    },
    {
        id: '8800',
        type: 'radio',
        question: 'Könnten Sie schwanger sein?',
        description: 'Diese Information ist medizinisch relevant für die weitere Behandlung.',
        section: 'schwangerschaft',
        order: 56,
        options: [
            { value: 'ja', label: 'Ja, möglicherweise' },
            { value: 'nein', label: 'Nein' },
            { value: 'weiss_nicht', label: 'Weiß nicht' }
        ],
        logic: {
            next: ['8900'],
            showIf: [
                { operator: 'contextEquals', key: 'gender', value: 'W' },
                { operator: 'contextGreaterThan', key: 'age', value: 14 },
                { operator: 'contextLessThan', key: 'age', value: 51 }
            ]
        }
    },
    {
        id: '8900',
        type: 'textarea',
        question: 'Welche Medikamente erhalten Sie aktuell?',
        section: 'medikamente-freitext',
        order: 57,
        placeholder: 'Geben Sie hier Ihre Medikamente ein (z.B. Ramipril 5mg)',
        logic: { next: ['8950'] }
    },
    {
        id: '8950',
        type: 'radio',
        question: 'Wurden Sie in der Vergangenheit bereits operiert?',
        section: 'vorerkrankungen',
        order: 58,
        options: [
            { value: 'ja', label: 'Ja' },
            { value: 'nein', label: 'Nein' }
        ],
        logic: {
            conditional: [
                { equals: 'ja', then: '8951' },
                { equals: 'nein', then: '9100' }
            ]
        }
    },
    {
        id: '8951',
        type: 'surgery-form',
        question: 'Ihre Operations-Historie',
        section: 'vorerkrankungen',
        order: 59,
        logic: { next: ['9100'] }
    },

    // ==================== SERVICE: REZEPTE (RES) ====================
    {
        id: 'RES-100',
        type: 'text',
        question: 'Name der Medikation / Wirkstoff',
        section: 'rezepte',
        order: 100,
        placeholder: 'z.B. Ramipril 5mg',
        validation: { required: true },
        logic: {
            next: ['RES-101'],
            showIf: [{ questionId: '0000', operator: 'equals', value: 'ja' }]
        }
    },
    {
        id: 'RES-101',
        type: 'text',
        question: 'Dosierung und Packungsgröße',
        section: 'rezepte',
        order: 101,
        placeholder: 'z.B. 1-0-0, 100 Stück',
        logic: { next: ['RES-102'] }
    },
    {
        id: 'RES-102',
        type: 'select',
        question: 'Wie möchten Sie das Rezept erhalten?',
        section: 'rezepte',
        order: 102,
        options: [
            { value: 'eRezept', label: 'Als eRezept (KVK muss im Quartal eingelesen sein)' },
            { value: 'abholung', label: 'Abholung in der Praxis' },
            { value: 'post', label: 'Per Post (Portogebühr fällt an)' }
        ],
        logic: { next: ['RES-103'] }
    },
    {
        id: 'RES-103',
        type: 'textarea',
        question: 'Zusätzliche Anmerkungen zum Rezept',
        section: 'rezepte',
        order: 103,
        logic: { next: ['9100'] }
    },

    // ==================== SERVICE: DATEIEN / BEFUNDE (DAT) ====================
    {
        id: 'DAT-100',
        type: 'select',
        question: 'Was für Dokumente möchten Sie uns übermitteln?',
        section: 'dateien',
        order: 110,
        options: [
            { value: 'befund', label: 'Externer Befund / Arztbrief' },
            { value: 'labor', label: 'Laborwerte' },
            { value: 'sonstiges', label: 'Sonstige Dokumente' }
        ],
        logic: { next: ['DAT-101'] }
    },
    {
        id: 'DAT-101',
        type: 'textarea',
        question: 'Beschreibung / Kontext der Dokumente',
        section: 'dateien',
        order: 111,
        placeholder: 'Welcher Arzt? Welches Datum? Welches Anliegen?',
        logic: { next: ['DAT-102'] }
    },
    {
        id: 'DAT-102',
        type: 'file',
        question: 'Dokument hochladen',
        description: 'Die Daten werden sicher und verschlüsselt an unsere Praxis übertragen. (Erlaubte Formate: PDF, JPG, PNG - Max. 10MB)',
        section: 'dateien',
        order: 112,
        logic: { next: ['9100'] }
    },

    // ==================== SERVICE: AU / KRANKMELDUNG (AU) ====================
    {
        id: 'AU-100',
        type: 'date',
        question: 'Seit wann bestehen die Beschwerden?',
        section: 'au-anfrage',
        order: 120,
        validation: { required: true },
        logic: {
            next: ['AU-101'],
            showIf: [{ questionId: '0000', operator: 'equals', value: 'ja' }]
        }
    },
    {
        id: 'AU-101',
        type: 'textarea',
        question: 'Welche Symptome haben Sie?',
        section: 'au-anfrage',
        order: 121,
        validation: { required: true },
        logic: { next: ['AU-102'] }
    },
    {
        id: 'AU-102',
        type: 'radio',
        question: 'Waren Sie wegen dieser Beschwerden bereits beim Arzt?',
        section: 'au-anfrage',
        order: 122,
        options: [
            { value: 'Ja', label: 'Ja' },
            { value: 'Nein', label: 'Nein' }
        ],
        logic: { next: ['AU-103'] }
    },
    {
        id: 'AU-103',
        type: 'tel',
        question: '📱 Unter welcher Nummer sind Sie erreichbar? (Pflicht)',
        description: 'Für eine AU-Bescheinigung benötigen wir zwingend eine Rückrufnummer.',
        section: 'au-anfrage',
        order: 123,
        placeholder: 'z.B. 0171 12345678',
        validation: { required: true },
        logic: { next: ['9100'] }
    },

    // ==================== SERVICE: ÜBERWEISUNG (UEB) ====================
    {
        id: 'UEB-100',
        type: 'text',
        question: 'Für welche Fachrichtung benötigen Sie die Überweisung?',
        section: 'ueberweisung',
        order: 130,
        placeholder: 'z.B. Kardiologie, Orthopädie',
        validation: { required: true },
        logic: {
            next: ['UEB-101'],
            showIf: [{ questionId: '0000', operator: 'equals', value: 'ja' }]
        }
    },
    {
        id: 'UEB-101',
        type: 'textarea',
        question: 'Grund der Überweisung / Diagnose',
        section: 'ueberweisung',
        order: 131,
        validation: { required: true },
        logic: { next: ['9100'] }
    },

    // ==================== SERVICE: TERMINABSAGE (ABS) ====================
    {
        id: 'ABS-100',
        type: 'date',
        question: 'Datum des Termins, den Sie absagen möchten:',
        section: 'absage',
        order: 140,
        validation: { required: true },
        logic: { next: ['ABS-101'] }
    },
    {
        id: 'ABS-101',
        type: 'textarea',
        question: 'Grund der Absage (optional)',
        section: 'absage',
        order: 141,
        logic: { next: ['ABS-102'] }
    },

    // ==================== SERVICE: TELEFON / RÜCKRUF (TEL) ====================
    {
        id: 'TEL-100',
        type: 'text',
        question: 'Wann sind Sie am besten erreichbar?',
        section: 'telefon',
        order: 150,
        placeholder: 'z.B. Vormittags zwischen 10-12 Uhr',
        logic: { next: ['TEL-100b'] }
    },
    {
        id: 'TEL-100b',
        type: 'tel',
        question: 'Rufnummer (Mobil/Festnetz)',
        description: 'Unter welcher Nummer können wir Sie zurückrufen?',
        section: 'telefon',
        order: 150.5,
        placeholder: 'z.B. 0171 12345678 / 030 12345678',
        validation: { required: true },
        logic: { next: ['TEL-101'] }
    },
    {
        id: 'TEL-101',
        type: 'textarea',
        question: 'Kurzes Anliegen für den Rückruf',
        section: 'telefon',
        order: 151,
        logic: { next: ['9100'] }
    },

    // ==================== SERVICE: BEFUNDANFORDERUNG (BEF) ====================
    {
        id: 'BEF-100',
        type: 'multiselect',
        question: 'Welche Unterlagen benötigen Sie von uns?',
        section: 'befund-anforderung',
        order: 160,
        options: [
            { value: 'arztbrief', label: 'Arztbrief / Befundbericht' },
            { value: 'labor', label: 'Laborwerte' },
            { value: 'impfpass', label: 'Kopie Impfpass' },
            { value: 'sonstiges', label: 'Sonstiges' }
        ],
        logic: {
            next: ['BEF-101'],
            showIf: [{ questionId: '0000', operator: 'equals', value: 'ja' }]
        }
    },
    {
        id: 'BEF-101',
        type: 'text',
        question: 'Zeitraum oder spezieller Anlass',
        section: 'befund-anforderung',
        order: 161,
        placeholder: 'z.B. Untersuchung vom Januar 2024',
        logic: { next: ['9100'] }
    },

    // ==================== SERVICE: NACHRICHT (MS) ====================
    {
        id: 'MS-100',
        type: 'text',
        question: 'Betreff Ihrer Nachricht',
        section: 'nachricht',
        order: 170,
        validation: { required: true },
        logic: { next: ['MS-101'] }
    },
    {
        id: 'MS-101',
        type: 'textarea',
        question: 'Ihre Mitteilung an uns',
        section: 'nachricht',
        order: 171,
        validation: { required: true },
        logic: { next: ['9100'] }
    },

    // ==================== ABSCHLUSS ====================
    {
        id: '9010',
        type: 'email',
        question: 'Bestätigen Sie hier Ihre E-Mail Adresse',
        section: 'abschluss',
        order: 180,
        validation: { required: true, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
        logic: {
            next: ['9011'],
            showIf: [{ questionId: '0000', operator: 'equals', value: 'ja' }]
        }
    },
    {
        id: '9011',
        type: 'tel',
        question: 'Mobilrufnummer für Rückfragen (optional)',
        section: 'abschluss',
        order: 181,
        placeholder: 'z.B. 0171 12345678',
        logic: {
            next: ['9500'],
            showIf: [{ questionId: '0000', operator: 'equals', value: 'ja' }]
        }
    },
    {
        id: '9000',
        type: 'radio',
        question: 'Abschluss der Eingabe',
        description: 'Bitte überprüfen Sie Ihre Angaben in der Zusammenfassung oben.',
        section: 'abschluss',
        order: 190,
        options: [
            { value: 'absenden', label: 'Angaben bestätigen und absenden' }
        ],
        validation: { required: true }
    },

    // ==================== SERVICE: UNFALLMELDUNG (BG) ====================
    { id: 'BG-BERUF-100', type: 'text', question: 'Welchen Beruf üben Sie aus?', section: 'bg-unfall', order: 200, validation: { required: true }, logic: { next: ['2081'] } },
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
            { value: 'svlfg', label: 'SVLFG – Sozialversicherung für Landwirtschaft, Forsten und Gartenbau' },
            { value: 'uvb', label: 'UVB – Unfallversicherung Bund und Bahn' },
            { value: 'unfallkassen', label: 'Unfallkassen der Länder' },
            { value: 'guvv', label: 'Gemeindeunfallversicherungsverbände / Kommunale Unfallkassen' },
            { value: 'fuk', label: 'Feuerwehr-Unfallkasse' },
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

    // ==================== ZUSÄTZLICHE PUNKTE ====================
    { id: '4120', type: 'select', question: 'Welchen Beruf üben Sie aus?', section: 'beruf', order: 36, options: [{ value: 'vollzeit', label: 'Vollzeit berufstätig' }, { value: 'teilzeit', label: 'Teilzeit berufstätig' }, { value: 'rentner', label: 'Rentner/Pensionär' }, { value: 'arbeitslos', label: 'Arbeitslos/Arbeitssuchend' }, { value: 'ausbildung', label: 'In Ausbildung/Studium' }, { value: 'hausfrau', label: 'Hausfrau/Hausmann' }, { value: 'elternzeit', label: 'Elternzeit' }], logic: { next: ['4121'] } },
    { id: '4121', type: 'radio', question: 'Fühlen Sie sich in Ihrem Beruf stark belastet?', section: 'beruf', order: 37, options: [{ value: 'ja', label: 'Ja' }, { value: 'nein', label: 'Nein' }, { value: 'teilweise', label: 'Teilweise' }], logic: { next: ['4122'] } },
    { id: '4122', type: 'select', question: 'Wie schätzen Sie Ihre Schlafqualität ein?', section: 'beruf', order: 38, options: [{ value: 'gut', label: 'Gut' }, { value: 'maessig', label: 'Mäßig' }, { value: 'schlecht', label: 'Schlecht' }, { value: 'sehr_schlecht', label: 'Sehr schlecht' }], logic: { next: ['BEWEG-100'] } },
    { id: '4130', type: 'select', question: 'Wie häufig trinken Sie Alkohol?', section: 'beruf', order: 39, options: [{ value: 'nie', label: 'Nie' }, { value: 'selten', label: 'Selten (< 1×/Monat)' }, { value: 'gelegentlich', label: 'Gelegentlich (1-4×/Monat)' }, { value: 'regelmaessig', label: 'Regelmäßig (2-4×/Woche)' }, { value: 'taeglich', label: 'Täglich' }], logic: { next: ['4131'] } },
    { id: '4131', type: 'select', question: 'Nehmen Sie Drogen oder andere Substanzen?', section: 'beruf', order: 40, options: [{ value: 'nein', label: 'Nein' }, { value: 'gelegentlich', label: 'Gelegentlich' }, { value: 'regelmaessig', label: 'Regelmäßig' }, { value: 'frueher', label: 'Früher, aktuell nicht' }], logic: { next: ['5000'] } },

    {
        id: '9100',
        type: 'radio',
        question: 'Möchten Sie sich über unsere zusätzlichen Privatleistungen (IGeL) informieren?',
        section: 'abschluss',
        order: 191,
        options: [
            { value: 'ja', label: 'Ja, gerne' },
            { value: 'nein', label: 'Nein, direkt zum Abschluss' }
        ],
        logic: {
            conditional: [
                { equals: 'ja', then: '9999' },
                { equals: 'nein', then: '9010' }
            ]
        }
    },
    {
        id: '9999',
        type: 'radio',
        question: 'Zusatzleistungen',
        section: 'abschluss',
        order: 192,
        logic: { next: ['9010'] }
    },
    ...newQuestions
];
