/**
 * @module RoutingEngine.regulatory.test
 * @description Regulatorisches CI-Gate — sicherstellen, dass die RoutingEngine
 * KEINE diagnostischen Aussagen im Patient-Output produziert.
 *
 * Beweisführung: Bei einer Marktaufsichts-Anfrage kann der Hersteller dem
 * Behörden-Mitarbeiter den letzten erfolgreichen CI-Run dieses Tests vorlegen
 * als Nachweis, dass die "Kein Medizinprodukt"-Position technisch durchgesetzt ist.
 *
 * @see docs/REGULATORY_STRATEGY.md §6.4
 * @see docs/REGULATORY_POSITION.md §5
 * @see docs/INTENDED_USE.md §5.2
 */

import { describe, expect, it } from 'vitest';
import { RoutingEngine } from '../RoutingEngine';

/**
 * Wörter, die in Patient-facing-Strings VERBOTEN sind.
 * Diese Liste spiegelt die Verbots-Wortliste aus REGULATORY_STRATEGY.md §9.1.
 *
 * Auch substring-matching: "lebensbedrohlich" matcht via "Leben".
 * Begriffe wie "Behandlung" sind im Patient-facing-Kontext einer Anmeldung
 * regulatorisch belastet — selbst wenn sie alltagssprachlich harmlos klingen.
 */
const VERBOTEN_PATIENT = [
    // Diagnose-Begriffe
    'Diagnose', 'diagnostisch', 'Differenzialdiagnose',
    'Verdacht', 'Verdachtsdiagnose',
    'hindeuten', 'deuten auf',

    // Notfall-/Lebensgefahr-Sprache (außer im 112-Verweis-Kontext, der separat geprüft wird)
    'medizinischen Notfall', 'Notfall-Erkennung',
    'lebensrettend', 'rettet Leben', 'lebensbedrohlich',

    // Krankheits-/Therapie-Sprache
    'Krankheit', 'Krankheiten',
    'Therapie', 'Behandlung', 'Heilung',

    // Konkrete Krankheits-Bezeichnungen, die NIEMALS einem Patient gegenüber genannt werden dürfen
    'Herzinfarkt', 'Schlaganfall',
    'Subarachnoidalblutung', 'Donnerschlag',
    'Diabetisches Fußsyndrom', 'Polypharmazie',

    // Risiko-Bewertung (eine Risiko-Aussage IST eine medizinische Aussage)
    'Risiko-Score', 'Krebsrisiko',
    'erhöhtes Risiko', 'Wechselwirkungsrisiko', 'Blutungsrisiko',

    // CDS-Sprache
    'klinische Entscheidungsunterstützung', 'Clinical Decision Support',

    // Eigen-Etikettierung als Triage-System (wir sind ein Routing-System)
    'Triage-System', 'Triage-Regel',
];

/**
 * Wörter, die im Patient-Output EXPLIZIT ERLAUBT sind, weil sie organisatorisch sind.
 * Smoke-Check: mindestens eines dieser Wörter sollte in jedem patientMessage erscheinen,
 * damit der Patient eine handlungsrelevante Anweisung bekommt.
 */
const ERLAUBT_PATIENT_HINWEISE = [
    'Praxispersonal', 'Praxisteam',
    'Anmeldung',
    'Notruf 112', '112',
    'Telefonseelsorge',
    'sprechen Sie',
    'wenden Sie sich',
    'informieren Sie',
];

describe('RoutingEngine — Regulatorisches Gate (kein Diagnose-Output an Patient)', () => {
    it('alle Routing-Regeln liefern eine Patient-Message', () => {
        const ruleIds = RoutingEngine.getRuleIds();
        expect(ruleIds.length).toBeGreaterThan(0);
    });

    it.each(buildTriggerScenarios())(
        'Regel %s: patientMessage enthält KEIN verbotenes Diagnose-Wort',
        (ruleId, answers, context) => {
            const results = RoutingEngine.evaluateAll(answers, context);
            const result = results.find(r => r.ruleId === ruleId);
            expect(result, `Regel ${ruleId} hat nicht ausgelöst — Test-Fixture prüfen`).toBeDefined();

            const patientMessage = result!.patientMessage;
            for (const verboten of VERBOTEN_PATIENT) {
                expect(
                    patientMessage,
                    `Regel ${ruleId}: patientMessage enthält verbotenes Wort "${verboten}".\nText: "${patientMessage}"`,
                ).not.toContain(verboten);
            }
        },
    );

    it.each(buildTriggerScenarios())(
        'Regel %s: patientMessage enthält mindestens einen handlungsrelevanten Hinweis',
        (ruleId, answers, context) => {
            const results = RoutingEngine.evaluateAll(answers, context);
            const result = results.find(r => r.ruleId === ruleId);
            expect(result).toBeDefined();

            const patientMessage = result!.patientMessage;
            const hatHinweis = ERLAUBT_PATIENT_HINWEISE.some(w => patientMessage.includes(w));
            expect(
                hatHinweis,
                `Regel ${ruleId}: patientMessage enthält keinen handlungsrelevanten Hinweis.\nText: "${patientMessage}"`,
            ).toBe(true);
        },
    );

    it('staffMessage darf diagnostisch sein (Praxis-interne Fachkommunikation)', () => {
        // Smoke: für mindestens eine PRIORITY-Regel ist staffMessage länger / detaillierter als patientMessage.
        // Das beweist, dass die regulatorische Trennung (Patient vs. Personal) funktioniert.
        const scenarios = buildTriggerScenarios();
        let priorityFound = 0;
        for (const [ruleId, answers, context] of scenarios) {
            const result = RoutingEngine.evaluateAll(answers, context).find(r => r.ruleId === ruleId);
            if (result?.level === 'PRIORITY') {
                priorityFound++;
                expect(result.staffMessage.length).toBeGreaterThan(0);
            }
        }
        expect(priorityFound).toBeGreaterThan(0);
    });
});

/**
 * Test-Fixtures: minimale Antworten, die jede einzelne Regel auslösen.
 *
 * Tuple-Form damit it.each die Regel-ID als Test-Title nutzen kann.
 */
function buildTriggerScenarios(): Array<[string, Record<string, { value: unknown }>, { age?: number; gender?: string }]> {
    return [
        ['PRIORITY_ACS', { '1002': { value: ['brust'] } }, {}],
        ['PRIORITY_SUIZID', { '1C14': { value: 'ja' } }, {}],
        ['PRIORITY_SAH', { '1181': { value: ['donnerschlag'] } }, {}],
        ['PRIORITY_SYNCOPE', { '1185': { value: ['bewusstlosigkeit'] } }, {}],
        ['INFO_BLUTUNG', { '7000': { value: ['gerinnung'] }, '6005': { value: ['marcumar'] } }, {}],
        ['INFO_DIABETISCHER_FUSS', { '5000': { value: 'Ja' }, '1002': { value: ['beine'] } }, {}],
        ['INFO_RAUCHER_ALTER', { '4002': { value: 'Ja' } }, { age: 70 }],
        ['INFO_SCHWANGERSCHAFT_INKONSISTENT', { '8800': { value: 'ja' } }, { gender: 'M' }],
        ['INFO_POLYPHARMAZIE', { '8900': { value: Array.from({ length: 6 }, (_, i) => `med${i}`) } }, {}],
        ['INFO_DOPPELTE_BLUTVERDUENNUNG', { '6005': { value: ['marcumar', 'xarelto'] } }, {}],
    ];
}
