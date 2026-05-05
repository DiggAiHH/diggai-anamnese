/**
 * @module TriageEngine
 * @deprecated Verwende stattdessen `server/engine/RoutingEngine.ts`.
 *
 * **REGULATORISCHER HINWEIS (Pflicht-Lektüre vor Änderungen):**
 * Diese Datei produziert Patient-facing-Texte mit diagnostischen Aussagen
 * („Ihre Symptome könnten auf einen medizinischen Notfall hindeuten" etc.) und
 * würde DiggAi unter MDR Annex VIII Rule 11 als Klasse IIa/IIb-Medizinprodukt
 * qualifizieren. Die Hersteller-Position ist „Kein Medizinprodukt" (siehe
 * `docs/INTENDED_USE.md`, `docs/REGULATORY_POSITION.md`).
 *
 * Die `RoutingEngine` ist die regulatorisch konforme Nachfolgerin: Sie trennt
 * `patientMessage` (workflow-only, kein Diagnose-Wort) von `staffMessage`
 * (fachlich, nur fürs Personal). Code-Pfade, die heute noch die TriageEngine
 * nutzen, sind in `docs/REGULATORY_STRATEGY.md` §11.2 als Migrations-Ziel
 * gelistet. Bitte beim nächsten Anfassen der jeweiligen Aufrufstelle direkt
 * auf RoutingEngine umstellen, nicht TriageEngine erweitern.
 *
 * @description (historisch) Klinische Red-Flag-Erkennung — Real-time Triage-Auswertung.
 *
 * @architecture
 * - Wird nach JEDER Antwortübermittlung aufgerufen: `POST /api/answers`
 * - CRITICAL-Events → Socket.IO `triage:alert` an alle ARZT/MFA-Clients (<2s)
 * - Ergebnisse werden als `TriageEvent`-Datenbankeinträge persistiert
 * - Frontend: `src/components/RedFlagOverlay.tsx` für CRITICAL-UI
 *
 * @medical-safety ⚠️  ÄNDERUNGEN ERFORDERN KLINISCHEN SIGN-OFF
 * 1. Schriftliche Änderungsanforderung mit medizinischer Begründung
 * 2. Sign-off Dr. Klapproth (Arztpraxis) — PFLICHT für alle Regel-Typen
 * 3. Sign-off Dr. Al-Shdaifat (DiggAI Medical Advisor) — PFLICHT für CRITICAL
 * 4. Update docs/TRIAGE_RULES.md + e2e/questionnaire-flow.spec.ts
 * 5. Eintrag in docs/CHANGE_LOG_REGULATORY.md (regulatorisch relevant)
 *
 * @see docs/TRIAGE_RULES.md — vollständige Regelreferenz mit klinischer Begründung
 * @see docs/REGULATORY_STRATEGY.md — Migrationsplan TriageEngine → RoutingEngine
 */

export interface TriageResult {
    level: 'WARNING' | 'CRITICAL';
    atomId: string;        // Auslösende Frage
    triggerValues: any;     // Welche Werte den Alert ausgelöst haben
    message: string;
}

interface AnswerMap {
    [atomId: string]: {
        value: any;
        data?: any;
    };
}

// ─── Triage-Regelkatalog ────────────────────────────────────

interface TriageRule {
    id: string;
    level: 'WARNING' | 'CRITICAL';
    description: string;
    evaluate: (answers: AnswerMap, context: SessionContext) => TriageResult | null;
}

interface SessionContext {
    gender?: string;
    age?: number;
    isNewPatient?: boolean;
}

const TRIAGE_RULES: TriageRule[] = [
    // ═══════════════════════════════════════════
    // CRITICAL – Stoppt Fragebogen, Alert an Arzt
    // ═══════════════════════════════════════════

    {
        id: 'CRITICAL_ACS',
        level: 'CRITICAL',
        description: 'Akutes Koronarsyndrom / Notfall-Verdacht',
        evaluate: (answers) => {
            const answer = answers['1002'];
            if (!answer) return null;

            const values = Array.isArray(answer.value) ? answer.value : [answer.value];
            const triggers = values.filter((v: string) => ['brust', 'atemnot', 'laehmung'].includes(v));

            if (triggers.length > 0) {
                return {
                    level: 'CRITICAL',
                    atomId: '1002',
                    triggerValues: triggers,
                    message: 'ACHTUNG: Ihre Symptome (Brustschmerzen/Atemnot/Lähmung) könnten auf einen medizinischen Notfall hindeuten. Bitte wählen Sie umgehend den Notruf 112 oder wenden Sie sich sofort an das Praxispersonal!'
                };
            }
            return null;
        }
    },

    {
        id: 'CRITICAL_SUIZID',
        level: 'CRITICAL',
        description: 'Suizidalitäts-Screening',
        evaluate: (answers) => {
            const answer = answers['1C14'];
            if (!answer) return null;
            if (answer.value === 'ja' || answer.value === true) {
                return {
                    level: 'CRITICAL',
                    atomId: '1C14',
                    triggerValues: answer.value,
                    message: 'WICHTIG: Sie haben angegeben, Gedanken an Selbstverletzung zu haben. Bitte sprechen Sie sofort mit unserem medizinischen Personal oder rufen Sie die Telefonseelsorge an: 0800 111 0 111 (kostenfrei, 24/7)'
                };
            }
            return null;
        }
    },

    {
        id: 'CRITICAL_SAH',
        level: 'CRITICAL',
        description: 'Subarachnoidalblutung (Donnerschlags-Kopfschmerz)',
        evaluate: (answers) => {
            const answer = answers['1181'];
            if (!answer) return null;
            const values = Array.isArray(answer.value) ? answer.value : [answer.value];
            if (values.includes('donnerschlag')) {
                return {
                    level: 'CRITICAL',
                    atomId: '1181',
                    triggerValues: ['donnerschlag'],
                    message: 'ACHTUNG: Ein plötzlich einsetzender, stärkster Kopfschmerz ("Donnerschlagkopfschmerz") kann auf eine Subarachnoidalblutung hindeuten. Bitte sofort Notruf 112!'
                };
            }
            return null;
        }
    },

    {
        id: 'CRITICAL_SYNCOPE',
        level: 'CRITICAL',
        description: 'Bewusstseinsverlust / Synkope',
        evaluate: (answers) => {
            const answer = answers['1185'];
            if (!answer) return null;
            const values = Array.isArray(answer.value) ? answer.value : [answer.value];
            if (values.includes('bewusstlosigkeit') || values.includes('bewusstseinsverlust')) {
                return {
                    level: 'CRITICAL',
                    atomId: '1185',
                    triggerValues: values,
                    message: 'ACHTUNG: Ein Bewusstseinsverlust erfordert sofortige medizinische Abklärung. Informieren Sie bitte umgehend das Praxispersonal!'
                };
            }
            return null;
        }
    },

    // ═══════════════════════════════════════════
    // WARNING – Gelbe Markierung, Patient kann fortfahren
    // ═══════════════════════════════════════════

    {
        id: 'WARNING_BLUTUNG',
        level: 'WARNING',
        description: 'Erhöhtes Blutungsrisiko (Gerinnungsstörung + Blutverdünner)',
        evaluate: (answers) => {
            const gerinnung = answers['7000'];
            const blutverd = answers['6005'];
            if (!gerinnung || !blutverd) return null;

            const gerinnungValues = Array.isArray(gerinnung.value) ? gerinnung.value : [gerinnung.value];
            const blutverdValues = Array.isArray(blutverd.value) ? blutverd.value : [blutverd.value];

            const hatGerinnung = gerinnungValues.includes('gerinnung');
            const hatMarcumar = blutverdValues.some((v: string) => ['marcumar', 'xarelto', 'eliquis', 'pradaxa', 'lixiana'].includes(v));

            if (hatGerinnung && hatMarcumar) {
                return {
                    level: 'WARNING',
                    atomId: '7000',
                    triggerValues: { gerinnung: gerinnungValues, blutverdünner: blutverdValues },
                    message: 'Hinweis: Sie haben eine Gerinnungsstörung und nehmen blutverdünnende Medikamente. Dies ergibt ein erhöhtes Blutungsrisiko. Ihr Arzt wird darauf besonders achten.'
                };
            }
            return null;
        }
    },

    {
        id: 'WARNING_DIABETISCHER_FUSS',
        level: 'WARNING',
        description: 'Diabetischer Fuß-Verdacht',
        evaluate: (answers) => {
            const diabetes = answers['5000'];
            const beschwerden = answers['1002'];
            if (!diabetes || !beschwerden) return null;

            if (diabetes.value === 'Ja') {
                const bValues = Array.isArray(beschwerden.value) ? beschwerden.value : [beschwerden.value];
                if (bValues.includes('beine') || bValues.includes('wunde')) {
                    return {
                        level: 'WARNING',
                        atomId: '5000',
                        triggerValues: { diabetes: true, beschwerden: bValues },
                        message: 'Hinweis: Bei Diabetes und Bein-/Fußbeschwerden besteht Verdacht auf ein Diabetisches Fußsyndrom. Bitte melden Sie dies dem Arzt.'
                    };
                }
            }
            return null;
        }
    },

    {
        id: 'WARNING_RAUCHER_ALTER',
        level: 'WARNING',
        description: 'Erhöhtes Krebsrisiko bei älteren Rauchern',
        evaluate: (answers, context) => {
            const rauchen = answers['4002'];
            if (!rauchen || !context.age) return null;

            if (rauchen.value === 'Ja' && context.age > 65) {
                return {
                    level: 'WARNING',
                    atomId: '4002',
                    triggerValues: { rauchen: true, alter: context.age },
                    message: 'Hinweis: Langjähriges Rauchen im fortgeschrittenen Alter erhöht das Risiko für Lungen- und Herz-Kreislauf-Erkrankungen. Vorsorgeuntersuchungen empfohlen.'
                };
            }
            return null;
        }
    },

    {
        id: 'WARNING_SCHWANGERSCHAFT_MANN',
        level: 'WARNING',
        description: 'Ungültige Kombination: Männlich + Schwangerschaft',
        evaluate: (answers, context) => {
            const schwanger = answers['8800'];
            if (!schwanger || context.gender !== 'M') return null;

            if (schwanger.value === 'ja') {
                return {
                    level: 'WARNING',
                    atomId: '8800',
                    triggerValues: { gender: 'M', schwangerschaft: true },
                    message: 'Inkonsistente Angabe: Geschlecht männlich und Schwangerschaft angegeben. Bitte überprüfen Sie Ihre Angaben.'
                };
            }
            return null;
        }
    },

    {
        id: 'WARNING_POLYPHARMAZIE',
        level: 'WARNING',
        description: 'Polypharmazie-Warnung (> 5 Medikamente)',
        evaluate: (answers) => {
            const medikamente = answers['8900'];
            if (!medikamente) return null;

            // Strukturierte Medikamentenliste
            if (Array.isArray(medikamente.value) && medikamente.value.length > 5) {
                return {
                    level: 'WARNING',
                    atomId: '8900',
                    triggerValues: { anzahl: medikamente.value.length },
                    message: `Hinweis: Sie nehmen ${medikamente.value.length} Medikamente ein. Bei mehr als 5 Medikamenten besteht ein erhöhtes Wechselwirkungsrisiko. Bitte besprechen Sie dies mit Ihrem Arzt.`
                };
            }
            return null;
        }
    },

    {
        id: 'WARNING_DOPPELTE_BLUTVERDUENNUNG',
        level: 'WARNING',
        description: 'Doppelte Blutverdünnung (> 1 Präparat)',
        evaluate: (answers) => {
            const blutverd = answers['6005'];
            if (!blutverd) return null;

            const values = Array.isArray(blutverd.value) ? blutverd.value : [blutverd.value];
            if (values.length > 1) {
                return {
                    level: 'WARNING',
                    atomId: '6005',
                    triggerValues: values,
                    message: 'Achtung: Sie nehmen mehr als ein blutverdünnendes Medikament ein. Dies kann das Blutungsrisiko erheblich steigern.'
                };
            }
            return null;
        }
    },
];

// ─── Engine API ─────────────────────────────────────────────

export class TriageEngine {
    /**
     * Prüft ALLE Regeln gegen die aktuellen Antworten
     */
    static evaluateAll(answers: AnswerMap, context: SessionContext): TriageResult[] {
        const results: TriageResult[] = [];

        for (const rule of TRIAGE_RULES) {
            const result = rule.evaluate(answers, context);
            if (result) {
                results.push(result);
            }
        }

        // CRITICAL zuerst sortieren
        results.sort((a, b) => {
            if (a.level === 'CRITICAL' && b.level !== 'CRITICAL') return -1;
            if (a.level !== 'CRITICAL' && b.level === 'CRITICAL') return 1;
            return 0;
        });

        return results;
    }

    /**
     * Prüft nur eine einzelne Antwort (inkrementell, für POST /answers)
     */
    static evaluateForAtom(atomId: string, allAnswers: AnswerMap, context: SessionContext): TriageResult[] {
        const results: TriageResult[] = [];

        for (const rule of TRIAGE_RULES) {
            const result = rule.evaluate(allAnswers, context);
            if (result && result.atomId === atomId) {
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Gibt die Regel-ID-Liste zurück (für Tests & Dokumentation)
     */
    static getRuleIds(): string[] {
        return TRIAGE_RULES.map(r => r.id);
    }

    /**
     * Gibt an ob ein Alert CRITICAL ist (für Socket.io Benachrichtigungen)
     */
    static hasCritical(results: TriageResult[]): boolean {
        return results.some(r => r.level === 'CRITICAL');
    }
}
