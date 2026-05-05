/**
 * @module RoutingEngine
 * @description Eingangs-Routing — strukturiert die vom Patienten erfassten
 * Anliegen-Stichworte und markiert priorisierte Anmeldungen für das Praxispersonal.
 *
 * **REGULATORISCHE EINORDNUNG (verbindlich):**
 * Diese Komponente ist die Nachfolgerin der bisherigen `TriageEngine`. Sie wurde
 * bewusst umbenannt und so umgebaut, dass DiggAi die Hersteller-Position „Kein
 * Medizinprodukt nach MDR Art. 2(1)" einhalten kann (siehe `docs/INTENDED_USE.md`,
 * `docs/REGULATORY_POSITION.md`, `docs/REGULATORY_STRATEGY.md`).
 *
 * Der entscheidende Unterschied zur alten TriageEngine: Jedes RoutingResult
 * trägt zwei voneinander getrennte Texte:
 *
 *   1. `patientMessage`: ausschließlich workflow-orientierte Aufforderungen
 *      ohne medizinischen Begriff. Wird im Patient-facing UI (AnmeldeHinweisOverlay)
 *      gerendert. CI-Gate: `RoutingEngine.regulatory.test.ts` verbietet
 *      Diagnose-Wörter in diesem Feld.
 *
 *   2. `staffMessage`: fachliche Strukturierung der Patient-Eingaben für
 *      das medizinische Personal. Praxis-interne Fachkommunikation. Diese
 *      Information ist KEINE eigene medizinische Aussage der Software an den
 *      Patienten, sondern eine Sortier-/Hinweis-Kommunikation zwischen
 *      Fachpersonen innerhalb der Arztpraxis (siehe REGULATORY_POSITION.md §5.3).
 *
 * **NIEMALS** das `staffMessage`-Feld in einem Patient-facing Kontext rendern.
 *
 * @architecture
 * - Wird nach JEDER Antwortübermittlung aufgerufen: `POST /api/answers`
 * - PRIORITY-Events → Socket.IO `routing:hint` an alle ARZT/MFA-Clients (<2s)
 * - Ergebnisse werden als `RoutingEvent`-Datenbankeinträge persistiert
 * - Frontend Patient: `src/components/AnmeldeHinweisOverlay.tsx` (rendert NUR patientMessage)
 * - Frontend Personal: `src/components/dashboards/RoutingHintPanel.tsx` (rendert staffMessage)
 *
 * @medical-safety ⚠️  ÄNDERUNGEN ERFORDERN KLINISCHEN SIGN-OFF
 * 1. Schriftliche Änderungsanforderung mit medizinischer Begründung
 * 2. Sign-off Dr. Klapproth (Arztpraxis) — PFLICHT für alle Regel-Typen
 * 3. Sign-off Dr. Al-Shdaifat (DiggAI Medical Advisor) — PFLICHT für PRIORITY
 * 4. Update docs/ROUTING_RULES.md + e2e/regulatory/no-diagnosis-to-patient.spec.ts
 * 5. Eintrag in docs/CHANGE_LOG_REGULATORY.md
 *
 * @migration
 * Die bestehende `TriageEngine` bleibt vorerst exportiert (deprecated) für
 * Backwards-Compatibility laufender Sessions. Neue Code-Pfade müssen
 * RoutingEngine verwenden. Der Plan zur vollständigen Ablösung ist in
 * docs/REGULATORY_STRATEGY.md §11.2 spezifiziert.
 */

export type RoutingLevel = 'INFO' | 'PRIORITY';

export interface RoutingResult {
    /** Stabile Identifikation der ausgelösten Routing-Regel (für DB & Logs) */
    ruleId: string;
    /** Neue Skala: PRIORITY = vorrangige Sichtung durch Personal; INFO = Hinweis ohne Vorrang */
    level: RoutingLevel;
    /** Auslösendes Frage-Atom */
    atomId: string;
    /** Welche Werte den Hinweis ausgelöst haben (für Audit-Trail) */
    triggerValues: unknown;
    /**
     * AUSSCHLIESSLICH workflow-orientierter Text für den Patienten — kein
     * medizinischer Begriff, kein Verdacht, keine Diagnose. CI-Gate prüft
     * dieses Feld gegen die Verbots-Wortliste.
     */
    patientMessage: string;
    /**
     * Strukturierte Anliegen-Information für das Praxispersonal. Darf
     * fachliche Begriffe enthalten — Empfänger ist medizinisches Personal.
     * NIEMALS in Patient-facing UIs rendern.
     */
    staffMessage: string;
    /**
     * Empfohlene organisatorische Aktion. Das Personal entscheidet — die
     * Software gibt nur einen Hinweis.
     */
    workflowAction: 'inform_staff_now' | 'priority_queue' | 'mark_for_review' | 'continue';
}

interface AnswerEntry {
    value: unknown;
    data?: unknown;
}

type AnswerMap = Record<string, AnswerEntry>;

interface SessionContext {
    gender?: string;
    age?: number;
    isNewPatient?: boolean;
}

interface RoutingRule {
    id: string;
    level: RoutingLevel;
    /** Interne Beschreibung — NICHT für Patient-UI verwenden */
    internalDescription: string;
    evaluate: (answers: AnswerMap, context: SessionContext) => RoutingResult | null;
}

// ─── Standard-Patient-Hinweise (zentral, damit i18n nur eine Stelle anfassen muss) ─

const PATIENT_HINT_INFORM_NOW =
    'Bitte wenden Sie sich umgehend an das Praxispersonal an der Anmeldung. ' +
    'Falls niemand erreichbar ist, wählen Sie den europäischen Notruf 112.';

const PATIENT_HINT_INFORM_STAFF =
    'Bitte informieren Sie das Praxispersonal über diesen Vorgang.';

const PATIENT_HINT_SUPPORT_AVAILABLE =
    'Wir möchten sicherstellen, dass Sie die richtige Unterstützung erhalten. ' +
    'Bitte sprechen Sie das Praxispersonal an. ' +
    'Sofort und kostenfrei erreichbar: Telefonseelsorge 0800 111 0 111 (24/7).';

const PATIENT_HINT_REVIEW_INPUTS =
    'Bitte überprüfen Sie Ihre Angaben. Falls Sie Hilfe benötigen, ' +
    'wenden Sie sich an das Praxispersonal an der Anmeldung.';

const PATIENT_HINT_REVIEW_AT_RECEPTION =
    'Bitte besprechen Sie diesen Punkt mit dem Praxispersonal an der Anmeldung.';

// ─── Routing-Regelkatalog ───────────────────────────────────

const ROUTING_RULES: RoutingRule[] = [
    // ═══════════════════════════════════════════
    // PRIORITY – Personal sichtet vorrangig
    // ═══════════════════════════════════════════

    {
        id: 'PRIORITY_ACS',
        level: 'PRIORITY',
        internalDescription: 'Symptom-Cluster akute Brustschmerz/Atemnot/Lähmung — vorrangige Personal-Sichtung empfohlen',
        evaluate: (answers) => {
            const answer = answers['1002'];
            if (!answer) return null;
            const values = Array.isArray(answer.value) ? answer.value : [answer.value];
            const triggers = values.filter((v): v is string => typeof v === 'string' && ['brust', 'atemnot', 'laehmung'].includes(v));
            if (triggers.length === 0) return null;
            return {
                ruleId: 'PRIORITY_ACS',
                level: 'PRIORITY',
                atomId: '1002',
                triggerValues: triggers,
                patientMessage: PATIENT_HINT_INFORM_NOW,
                staffMessage: `Patient meldet Symptome aus Cluster ACS-Verdacht (${triggers.join(', ')}). Sofortige ärztliche Sichtung empfohlen.`,
                workflowAction: 'inform_staff_now',
            };
        },
    },

    {
        id: 'PRIORITY_SUIZID',
        level: 'PRIORITY',
        internalDescription: 'Suizidalitäts-Screening positiv — sofortige Personal-Ansprache + niederschwellige Hilfsverweisung',
        evaluate: (answers) => {
            const answer = answers['1C14'];
            if (!answer) return null;
            if (answer.value !== 'ja' && answer.value !== true) return null;
            return {
                ruleId: 'PRIORITY_SUIZID',
                level: 'PRIORITY',
                atomId: '1C14',
                triggerValues: answer.value,
                patientMessage: PATIENT_HINT_SUPPORT_AVAILABLE,
                staffMessage: 'Patient bejaht Frage 1C14 (Suizidalitäts-Screening). Sofortige persönliche Ansprache durch Praxispersonal empfohlen; psychotherapeutische Mitbeurteilung erwägen.',
                workflowAction: 'inform_staff_now',
            };
        },
    },

    {
        id: 'PRIORITY_SAH',
        level: 'PRIORITY',
        internalDescription: 'SAH-Verdacht (Donnerschlags-Kopfschmerz) — vorrangige Sichtung',
        evaluate: (answers) => {
            const answer = answers['1181'];
            if (!answer) return null;
            const values = Array.isArray(answer.value) ? answer.value : [answer.value];
            if (!values.includes('donnerschlag')) return null;
            return {
                ruleId: 'PRIORITY_SAH',
                level: 'PRIORITY',
                atomId: '1181',
                triggerValues: ['donnerschlag'],
                patientMessage: PATIENT_HINT_INFORM_NOW,
                staffMessage: 'Patient beschreibt plötzlich einsetzenden, stärksten Kopfschmerz (Donnerschlag-Charakteristik). Subarachnoidalblutung differentialdiagnostisch erwägen, vorrangige ärztliche Beurteilung empfohlen.',
                workflowAction: 'inform_staff_now',
            };
        },
    },

    {
        id: 'PRIORITY_SYNCOPE',
        level: 'PRIORITY',
        internalDescription: 'Bewusstseinsverlust/Synkope — vorrangige Sichtung',
        evaluate: (answers) => {
            const answer = answers['1185'];
            if (!answer) return null;
            const values = Array.isArray(answer.value) ? answer.value : [answer.value];
            if (!values.includes('bewusstlosigkeit') && !values.includes('bewusstseinsverlust')) return null;
            return {
                ruleId: 'PRIORITY_SYNCOPE',
                level: 'PRIORITY',
                atomId: '1185',
                triggerValues: values,
                patientMessage: PATIENT_HINT_INFORM_STAFF,
                staffMessage: 'Patient gibt zwischenzeitlichen Bewusstseinsverlust an. Synkopen-Abklärung empfohlen, vorrangige ärztliche Sichtung.',
                workflowAction: 'inform_staff_now',
            };
        },
    },

    // ═══════════════════════════════════════════
    // INFO – Hinweis fürs Personal, Patient kann fortfahren
    // ═══════════════════════════════════════════

    {
        id: 'INFO_BLUTUNG',
        level: 'INFO',
        internalDescription: 'Gerinnungsstörung + orales Antikoagulans — fachlicher Hinweis ans Personal',
        evaluate: (answers) => {
            const gerinnung = answers['7000'];
            const blutverd = answers['6005'];
            if (!gerinnung || !blutverd) return null;
            const gerinnungValues = Array.isArray(gerinnung.value) ? gerinnung.value : [gerinnung.value];
            const blutverdValues = Array.isArray(blutverd.value) ? blutverd.value : [blutverd.value];
            const hatGerinnung = gerinnungValues.includes('gerinnung');
            const hatAntikoagulanz = blutverdValues.some((v) => typeof v === 'string' && ['marcumar', 'xarelto', 'eliquis', 'pradaxa', 'lixiana'].includes(v));
            if (!hatGerinnung || !hatAntikoagulanz) return null;
            return {
                ruleId: 'INFO_BLUTUNG',
                level: 'INFO',
                atomId: '7000',
                triggerValues: { gerinnung: gerinnungValues, antikoagulans: blutverdValues },
                patientMessage: PATIENT_HINT_REVIEW_AT_RECEPTION,
                staffMessage: `Patient gibt Gerinnungsstörung an und nimmt orale Antikoagulanzien (${blutverdValues.join(', ')}). Erhöhtes Blutungsrisiko bei invasiven Maßnahmen — bitte berücksichtigen.`,
                workflowAction: 'mark_for_review',
            };
        },
    },

    {
        id: 'INFO_DIABETISCHER_FUSS',
        level: 'INFO',
        internalDescription: 'Diabetes + Bein-/Wundbeschwerden — Hinweis ans Personal',
        evaluate: (answers) => {
            const diabetes = answers['5000'];
            const beschwerden = answers['1002'];
            if (!diabetes || !beschwerden) return null;
            if (diabetes.value !== 'Ja') return null;
            const bValues = Array.isArray(beschwerden.value) ? beschwerden.value : [beschwerden.value];
            if (!bValues.includes('beine') && !bValues.includes('wunde')) return null;
            return {
                ruleId: 'INFO_DIABETISCHER_FUSS',
                level: 'INFO',
                atomId: '5000',
                triggerValues: { diabetes: true, beschwerden: bValues },
                patientMessage: PATIENT_HINT_REVIEW_AT_RECEPTION,
                staffMessage: 'Patient mit Diabetes mellitus berichtet Bein-/Wundbeschwerden. Diabetisches Fußsyndrom differentialdiagnostisch erwägen.',
                workflowAction: 'mark_for_review',
            };
        },
    },

    {
        id: 'INFO_RAUCHER_ALTER',
        level: 'INFO',
        internalDescription: 'Aktiver Raucher >65 — fachlicher Hinweis ans Personal (Vorsorge)',
        evaluate: (answers, context) => {
            const rauchen = answers['4002'];
            if (!rauchen || !context.age) return null;
            if (rauchen.value !== 'Ja' || context.age <= 65) return null;
            return {
                ruleId: 'INFO_RAUCHER_ALTER',
                level: 'INFO',
                atomId: '4002',
                triggerValues: { rauchen: true, alter: context.age },
                patientMessage: PATIENT_HINT_REVIEW_AT_RECEPTION,
                staffMessage: `Aktiver Raucher, Alter ${context.age}. Vorsorge-Empfehlungen (Lungenfunktion, Herz-Kreislauf-Screening) ggf. ansprechen.`,
                workflowAction: 'mark_for_review',
            };
        },
    },

    {
        id: 'INFO_SCHWANGERSCHAFT_INKONSISTENT',
        level: 'INFO',
        internalDescription: 'Inkonsistente Angabe Geschlecht=M + Schwangerschaft=ja — Eingaben prüfen',
        evaluate: (answers, context) => {
            const schwanger = answers['8800'];
            if (!schwanger || context.gender !== 'M') return null;
            if (schwanger.value !== 'ja') return null;
            return {
                ruleId: 'INFO_SCHWANGERSCHAFT_INKONSISTENT',
                level: 'INFO',
                atomId: '8800',
                triggerValues: { gender: 'M', schwangerschaft: true },
                patientMessage: PATIENT_HINT_REVIEW_INPUTS,
                staffMessage: 'Inkonsistente Angabe in den erfassten Stammdaten: Geschlecht männlich + Schwangerschaft bejaht. Patient bitten, Angaben zu prüfen.',
                workflowAction: 'mark_for_review',
            };
        },
    },

    {
        id: 'INFO_POLYPHARMAZIE',
        level: 'INFO',
        internalDescription: 'Polypharmazie >5 Wirkstoffe — fachlicher Hinweis ans Personal',
        evaluate: (answers) => {
            const medikamente = answers['8900'];
            if (!medikamente) return null;
            if (!Array.isArray(medikamente.value) || medikamente.value.length <= 5) return null;
            return {
                ruleId: 'INFO_POLYPHARMAZIE',
                level: 'INFO',
                atomId: '8900',
                triggerValues: { anzahl: medikamente.value.length },
                patientMessage: PATIENT_HINT_REVIEW_AT_RECEPTION,
                staffMessage: `Patient nimmt ${medikamente.value.length} Wirkstoffe ein. Polypharmazie-Check (Wechselwirkungen, Adhärenz) empfohlen.`,
                workflowAction: 'mark_for_review',
            };
        },
    },

    {
        id: 'INFO_DOPPELTE_BLUTVERDUENNUNG',
        level: 'INFO',
        internalDescription: 'Mehrfache Antikoagulation — fachlicher Hinweis ans Personal',
        evaluate: (answers) => {
            const blutverd = answers['6005'];
            if (!blutverd) return null;
            const values = Array.isArray(blutverd.value) ? blutverd.value : [blutverd.value];
            if (values.length <= 1) return null;
            return {
                ruleId: 'INFO_DOPPELTE_BLUTVERDUENNUNG',
                level: 'INFO',
                atomId: '6005',
                triggerValues: values,
                patientMessage: PATIENT_HINT_REVIEW_AT_RECEPTION,
                staffMessage: `Patient nimmt mehr als ein Antikoagulans gleichzeitig (${values.join(', ')}). Indikation und Blutungsrisiko überprüfen.`,
                workflowAction: 'mark_for_review',
            };
        },
    },
];

// ─── Engine API ────────────────────────────────────────────────

export class RoutingEngine {
    /** Prüft alle Regeln gegen die aktuellen Antworten. */
    static evaluateAll(answers: AnswerMap, context: SessionContext): RoutingResult[] {
        const results: RoutingResult[] = [];
        for (const rule of ROUTING_RULES) {
            const result = rule.evaluate(answers, context);
            if (result) results.push(result);
        }
        results.sort((a, b) => {
            if (a.level === 'PRIORITY' && b.level !== 'PRIORITY') return -1;
            if (a.level !== 'PRIORITY' && b.level === 'PRIORITY') return 1;
            return 0;
        });
        return results;
    }

    /** Prüft inkrementell für ein einzelnes Frage-Atom. */
    static evaluateForAtom(atomId: string, allAnswers: AnswerMap, context: SessionContext): RoutingResult[] {
        return RoutingEngine.evaluateAll(allAnswers, context).filter((r) => r.atomId === atomId);
    }

    /** Liste der Regel-IDs (Tests + Doku). */
    static getRuleIds(): string[] {
        return ROUTING_RULES.map((r) => r.id);
    }

    /** Markiert ob mindestens eine PRIORITY-Regel ausgelöst hat. */
    static hasPriority(results: RoutingResult[]): boolean {
        return results.some((r) => r.level === 'PRIORITY');
    }

    /**
     * Bequemlichkeit für UI: extrahiert nur die patient-sicheren Felder.
     * Garantie: Es ist technisch unmöglich, mit dieser Methode aus Versehen
     * den staffMessage in den Patient-Output zu schreiben.
     */
    static toPatientSafeView(result: RoutingResult): { ruleId: string; level: RoutingLevel; patientMessage: string; workflowAction: RoutingResult['workflowAction'] } {
        return {
            ruleId: result.ruleId,
            level: result.level,
            patientMessage: result.patientMessage,
            workflowAction: result.workflowAction,
        };
    }
}
