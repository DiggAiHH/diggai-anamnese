/**
 * @module QuestionFlowEngine
 * @description Zentrale Ablaufsteuerung für den Anamnese-Fragebogen
 *
 * Berechnet den nächsten Fragebogen-Schritt basierend auf Patientenantworten,
 * Session-Kontext und konfigurierbaren Routing-Regeln.
 *
 * @architecture Drei-Stufen-Routing (Prioritätsreihenfolge):
 *   1. Option-followUpQuestions — Direkte Folgefragen per Antwort-Option
 *   2. ConditionalRoute — Bedingte Verzweigungen (rekursiv verschachtelbar)
 *   3. logic.next — Statischer Standard-Nächste-Schritt
 *
 * @multiselect Bei Multiselect-Fragen werden followUpQuestions ALLER gewählten
 *   Optionen zusammengeführt und nach orderIndex sortiert (Parallelität).
 *
 * @gating Gender/Alter-Gating ist per showIf-Regeln konfigurierbar.
 *   Hardcoded Ausnahme: `8800` (Schwangerschaft) nur für W, Alter 15–50.
 *
 * @see src/data/questions.ts — Fragen-Katalog mit logic-Definitionen
 * @see docs/QUESTION_CATALOG.md — vollständige ID-Referenz
 */

interface AtomOption {
    value: string;
    label: string;
    followUpQuestions?: string[];
}

interface ConditionalRoute {
    when?: string;
    context?: 'selectedService';
    equals: string | string[] | boolean | number;
    then: string | string[] | ConditionalRoute[];
}

interface ShowIfCondition {
    questionId: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: string | number | boolean | string[];
}

interface AtomLogic {
    next?: string[];
    conditional?: ConditionalRoute[];
    showIf?: ShowIfCondition[];
    aiDynamicPivot?: boolean;
    triage?: {
        when: string | string[];
        level: 'WARNING' | 'CRITICAL';
        message: string;
    };
}

export interface MedicalAtomData {
    id: string;
    answerType: string;
    options?: AtomOption[];
    branchingLogic?: AtomLogic;
    section: string;
    orderIndex: number;
    isPII?: boolean;
    isActive?: boolean;
}

export interface AnswerData {
    atomId: string;
    value: any;
}

export interface SessionContext {
    selectedService: string;
    isNewPatient: boolean;
    gender?: string;
    age?: number;
}

// ─── Engine ─────────────────────────────────────────────────

export class QuestionFlowEngine {
    private atoms: Map<string, MedicalAtomData>;

    constructor(atoms: MedicalAtomData[]) {
        this.atoms = new Map(atoms.map(a => [a.id, a]));
    }

    /**
     * Berechnet die nächsten Fragen basierend auf der aktuellen Antwort
     * Unterstützt Multiselect-Parallelität (alle Branches werden zurückgegeben)
     */
    getNextQuestions(
        currentAtomId: string,
        answer: AnswerData,
        context: SessionContext,
        allAnswers: Map<string, AnswerData>
    ): string[] {
        const atom = this.atoms.get(currentAtomId);
        if (!atom) return [];

        // PRIORITÄT 1: FollowUp über Optionen
        if (atom.options && atom.answerType !== 'multiselect') {
            // Single-Select: Nur die gewählte Option
            const selectedOption = atom.options.find(opt => opt.value === answer.value);
            if (selectedOption?.followUpQuestions) {
                return selectedOption.followUpQuestions;
            }
        }

        // MULTISELECT: Sammle ALLE followUpQuestions aller gewählten Optionen
        if (atom.options && atom.answerType === 'multiselect' && Array.isArray(answer.value)) {
            const allFollowUps: string[] = [];
            for (const selectedValue of answer.value) {
                const option = atom.options.find(opt => opt.value === selectedValue);
                if (option?.followUpQuestions) {
                    for (const fq of option.followUpQuestions) {
                        if (!allFollowUps.includes(fq)) {
                            allFollowUps.push(fq);
                        }
                    }
                }
            }
            if (allFollowUps.length > 0) {
                // Sortiere nach orderIndex für sequentielle Abarbeitung
                allFollowUps.sort((a, b) => {
                    const atomA = this.atoms.get(a);
                    const atomB = this.atoms.get(b);
                    return (atomA?.orderIndex || 0) - (atomB?.orderIndex || 0);
                });
                return allFollowUps;
            }
        }

        // PRIORITÄT 2: Bedingte Verzweigung (rekursiv)
        if (atom.branchingLogic?.conditional) {
            for (const route of atom.branchingLogic.conditional) {
                const result = this.evaluateConditionalRoute(route, answer, context, allAnswers);
                if (result) {
                    return Array.isArray(result) ? result : [result];
                }
            }
        }

        // PRIORITÄT 3: AI Dynamic Triage / Pivot
        if (atom.branchingLogic?.aiDynamicPivot) {
            // Hier würde die Engine einen real-time Call ans LLM absetzen, um den 
            // nächsten sinnvollen medizinischen Schritt zu bestimmen.
            // Für den synchronen Pfad geben wir einen Platzhalter zurück.
            console.log(`[QuestionFlowEngine] AI Dynamic Pivot ausgelöst für Frage ${currentAtomId}`);
            return ['AI_DYNAMIC_FOLLOWUP'];
        }

        // PRIORITÄT 4: Statisches next
        if (atom.branchingLogic?.next) {
            return atom.branchingLogic.next;
        }

        return [];
    }

    /**
     * Rekursive Auswertung verschachtelter Routingregeln
     */
    private evaluateConditionalRoute(
        route: ConditionalRoute,
        answer: AnswerData,
        context: SessionContext,
        allAnswers: Map<string, AnswerData>
    ): string | string[] | null {
        let valueToCompare: any = answer.value;

        // Kontext-basierter Vergleich (z.B. selectedService)
        if (route.context === 'selectedService') {
            valueToCompare = context.selectedService;
        } else if (route.when) {
            // Vergleich mit einer anderen Antwort
            valueToCompare = allAnswers.get(route.when)?.value;
        }

        // Match prüfen
        const isMatch = Array.isArray(route.equals)
            ? (Array.isArray(valueToCompare)
                ? (route.equals as string[]).some(v => valueToCompare.includes(v))
                : (route.equals as string[]).includes(valueToCompare as string))
            : valueToCompare === route.equals;

        if (isMatch) {
            if (typeof route.then === 'string') {
                return route.then;
            }

            if (Array.isArray(route.then)) {
                // String-Array = direkte Fragen-IDs
                if (route.then.length > 0 && typeof route.then[0] === 'string') {
                    return route.then as string[];
                }

                // Verschachtelte ConditionalRoute[]
                const nestedRoutes = route.then as ConditionalRoute[];
                for (const nested of nestedRoutes) {
                    const result = this.evaluateConditionalRoute(nested, answer, context, allAnswers);
                    if (result) return result;
                }
            }
        }

        return null;
    }

    /**
     * Prüft ob eine Frage basierend auf showIf-Regeln sichtbar sein soll
     */
    shouldShowAtom(atomId: string, allAnswers: Map<string, AnswerData>, context: SessionContext): boolean {
        const atom = this.atoms.get(atomId);
        if (!atom) return false;

        // isActive check — skip deactivated atoms
        if (atom.isActive === false) return false;

        // showIf-Logik
        if (atom.branchingLogic?.showIf && atom.branchingLogic.showIf.length > 0) {
            return atom.branchingLogic.showIf.every(condition => {
                const answer = allAnswers.get(condition.questionId);
                if (!answer) return false;

                const val = answer.value;
                switch (condition.operator) {
                    case 'equals': return val === condition.value;
                    case 'notEquals': return val !== condition.value;
                    case 'contains':
                        return Array.isArray(val)
                            ? val.includes(condition.value as string)
                            : String(val).includes(condition.value as string);
                    case 'greaterThan': return Number(val) > Number(condition.value);
                    case 'lessThan': return Number(val) < Number(condition.value);
                    default: return false;
                }
            });
        }

        // Gender/Alter-Gating: Schwangerschafts-Check nur für W 15-50
        if (atomId === '8800') {
            return context.gender === 'W' && (context.age ?? 0) >= 15 && (context.age ?? 99) <= 50;
        }

        return true;
    }

    /**
     * Berechnet den kompletten aktiven Pfad von Start bis Ende
     */
    getActivePath(
        allAnswers: Map<string, AnswerData>,
        context: SessionContext
    ): string[] {
        const path: string[] = [];
        let currentId: string | null = '0000';
        const visited = new Set<string>();

        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);

            // Prüfe Sichtbarkeit
            if (this.shouldShowAtom(currentId, allAnswers, context)) {
                path.push(currentId);
            }

            const answer = allAnswers.get(currentId);
            if (!answer) break; // Noch nicht beantwortet = Ende des aktiven Pfads

            const nextIds = this.getNextQuestions(currentId, answer, context, allAnswers);
            if (nextIds.length > 0) {
                currentId = nextIds[0]; // Primärer Pfad
            } else {
                currentId = null;
            }
        }

        return path;
    }

    /**
     * Gibt die Start-Atom-ID für einen Service zurück (bekannte Patienten)
     */
    static getServiceStartAtom(service: string): string {
        const serviceMap: Record<string, string> = {
            'Termin / Anamnese': 'TERM-100',
            'Medikamente / Rezepte': 'RES-100',
            'AU (Krankschreibung)': 'AU-100',
            'Dateien / Befunde': 'DAT-100',
            'Überweisung': 'UEB-100',
            'Terminabsage': 'ABS-100',
            'Telefonanfrage': 'TEL-100',
            'Dokumente anfordern': 'BEF-100',
            'Nachricht schreiben': 'MS-100',
            'BG Unfall': 'BG-100',
            'Handbuch': 'HB-100',
            'DSGVO Spiel': 'GAME-100',
            'Anmeldung': 'ANM-100',
        };
        return serviceMap[service] || '1000';
    }
}
