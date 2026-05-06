/**
 * Feature-Flags für DiggAi
 *
 * Zentrale Stelle für regulatorisch relevante Toggles. Diese Flags sind
 * Teil der Class-I-Verteidigungs-Strategie:
 *
 * Wenn DECISION_SUPPORT_ENABLED=false (Default in Capture-Build), darf das
 * Backend KEINE klinische Entscheidungs-Unterstützung leisten — kein Triage,
 * kein KI-Summary, kein Therapie-Vorschlag, keine Red-Flag-Erkennung.
 *
 * Im Class-IIa Suite-Build wird das Flag auf true gesetzt; das ist erlaubt,
 * weil Suite über die volle Konformitätsbewertung nach MDR Anhang IX läuft.
 *
 * Anker: DiggAi-Restrukturierungs-Plan v1.0, §6.2 (Stufe 2 — Datenerfassung
 * vs. Information für medizinische Entscheidungen).
 */

const truthy = (v: string | undefined): boolean =>
    v === '1' || v === 'true' || v === 'TRUE' || v === 'yes';

/**
 * DECISION_SUPPORT_ENABLED steuert ALLE Code-Pfade, die klinische Bewertung
 * leisten. In Klasse-I-Capture-Builds MUSS dieser Flag false sein.
 *
 * Default: false (sicherer Default für Class-I-Schutz)
 *
 * Setzen in Suite-Builds:
 *   - Fly-Secret: flyctl secrets set --app diggai-suite-api DECISION_SUPPORT_ENABLED=1
 *   - Lokal:      set DECISION_SUPPORT_ENABLED=1 && npm run dev:server
 */
export const DECISION_SUPPORT_ENABLED: boolean = truthy(process.env.DECISION_SUPPORT_ENABLED);

/**
 * Hilfs-Funktion für Routes/Services: wirft, wenn versucht wird,
 * decision-support-Funktionen aufzurufen ohne dass das Flag gesetzt ist.
 *
 * Verwendung in Class-IIa-Modulen:
 *
 *   import { requireDecisionSupport } from '../config/featureFlags';
 *   export async function evaluateAlertRules(...) {
 *     requireDecisionSupport('alert-engine.evaluateAlertRules');
 *     // ... eigentliche Logik
 *   }
 */
export function requireDecisionSupport(feature: string): void {
    if (!DECISION_SUPPORT_ENABLED) {
        throw new Error(
            `Feature "${feature}" ist nicht verfügbar. ` +
            `DECISION_SUPPORT_ENABLED=true erforderlich. ` +
            `Dieses Feature ist Teil der Klasse-IIa-Suite und nicht in Klasse-I-Capture aktiviert.`
        );
    }
}

/**
 * Programmatische Abfrage für Routen, die je nach Flag entweder die volle
 * Bewertung machen oder den Endpoint mit 404/410 ablehnen sollen.
 */
export function isDecisionSupportEnabled(): boolean {
    return DECISION_SUPPORT_ENABLED;
}

/**
 * Audit-Helper: protokolliert die aktuelle Flag-Konfiguration beim Server-Start.
 * Wird in server/index.ts aufgerufen.
 */
export function logFeatureFlags(logger: { info: (msg: string) => void } = console): void {
    logger.info(
        '[FeatureFlags] DECISION_SUPPORT_ENABLED=' + DECISION_SUPPORT_ENABLED +
        ' (Default false; nur in Klasse-IIa-Suite auf true setzen)'
    );
}
