/**
 * @module routingHintFromTriage
 * @description Adapter, der das alte `getTriageAlert`-Ergebnis in einen
 * patient-sicheren `AnmeldeHinweis` übersetzt.
 *
 * **Regulatorisch verbindlich (siehe `docs/REGULATORY_POSITION.md` §5.2):**
 * Der diagnostische Text aus `question.logic.triage.message` (z. B. „Ihre Symptome
 * könnten auf einen medizinischen Notfall hindeuten") wird hier **bewusst verworfen**.
 * Stattdessen wird einer der zentralen Workflow-Hinweise ausgewählt — analog zur
 * `RoutingEngine` im Server (`server/engine/RoutingEngine.ts`).
 *
 * Falls ein Frage-Atom später auf eine spezifische Routing-Regel mappt, kann die
 * Logik hier verfeinert werden. Solange ist der Fallback `inform_now` für CRITICAL
 * und `review_at_reception` für WARNING die regulatorisch sicherste Wahl.
 */

import type { TFunction } from 'i18next';
import type { AnmeldeHinweis } from '../components/AnmeldeHinweisOverlay';

interface RawTriageAlert {
    level: 'warning' | 'critical';
    message: string;          // diagnostisch — wird hier NICHT an den Patienten weitergegeben
}

/**
 * Übersetzt das alte Frontend-Triage-Ergebnis in einen patient-sicheren AnmeldeHinweis.
 *
 * @param raw           — Ergebnis von `getTriageAlert` aus `questionLogic.ts`
 * @param atomId        — ID des auslösenden Frage-Atoms (für Audit / data-rule-id)
 * @param t             — i18n `t`-Funktion (für lokalisierte Workflow-Hinweise)
 * @returns AnmeldeHinweis ohne medizinischen Begriff
 */
export function routingHintFromTriage(
    raw: RawTriageAlert,
    atomId: string,
    t: TFunction,
): AnmeldeHinweis {
    if (raw.level === 'critical') {
        return {
            ruleId: `LEGACY_CRITICAL_${atomId}`,
            level: 'PRIORITY',
            patientMessage: t(
                'anmeldeHinweisInformNow',
                'Bitte wenden Sie sich umgehend an das Praxispersonal an der Anmeldung. Falls niemand erreichbar ist, wählen Sie den europäischen Notruf 112.',
            ),
        };
    }
    return {
        ruleId: `LEGACY_WARNING_${atomId}`,
        level: 'INFO',
        patientMessage: t(
            'anmeldeHinweisReviewAtReception',
            'Bitte besprechen Sie diesen Punkt mit dem Praxispersonal an der Anmeldung.',
        ),
    };
}
