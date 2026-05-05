/**
 * @file RoutingEngine.priority.test.ts
 * @description Strukturtests für die PRIORITY-Routing-Regeln (Nachfolger der
 * `TriageEngine.critical.test.ts`-Coverage). Konzentriert sich auf Edge-Cases
 * und API-Verträge, die `RoutingEngine.regulatory.test.ts` (Verbots-Wortliste)
 * nicht abdeckt — z. B. Verhalten bei null/undefined/leerem Array/nicht beantworteter Frage.
 *
 * @see docs/ROUTING_RULES.md
 */

import { describe, it, expect } from 'vitest';
import { RoutingEngine } from './RoutingEngine';

describe('RoutingEngine - PRIORITY Rules (Strukturtests)', () => {
  // ═══════════════════════════════════════════════════════════
  // PRIORITY_ACS — Beschwerden 1002 (brust/atemnot/laehmung)
  // ═══════════════════════════════════════════════════════════
  describe('PRIORITY_ACS - Symptom-Cluster Brust/Atemnot/Lähmung', () => {
    it.each(['brust', 'atemnot', 'laehmung'])(
      'löst PRIORITY aus bei einzelnem Wert "%s"',
      (value) => {
        const results = RoutingEngine.evaluateAll({ '1002': { value } }, {});
        const acs = results.find((r) => r.ruleId === 'PRIORITY_ACS');
        expect(acs).toBeDefined();
        expect(acs!.level).toBe('PRIORITY');
        expect(acs!.triggerValues).toContain(value);
        expect(acs!.workflowAction).toBe('inform_staff_now');
      },
    );

    it('löst aus bei allen drei Symptomen als Array', () => {
      const results = RoutingEngine.evaluateAll(
        { '1002': { value: ['brust', 'atemnot', 'laehmung'] } },
        {},
      );
      const acs = results.find((r) => r.ruleId === 'PRIORITY_ACS');
      expect(acs).toBeDefined();
      expect((acs!.triggerValues as string[]).length).toBe(3);
    });

    it('löst aus, wenn Trigger mit nicht-triggernden Werten gemischt sind', () => {
      const results = RoutingEngine.evaluateAll(
        { '1002': { value: ['kopfschmerzen', 'brust', 'müdigkeit'] } },
        {},
      );
      const acs = results.find((r) => r.ruleId === 'PRIORITY_ACS');
      expect(acs).toBeDefined();
      expect(acs!.triggerValues).toContain('brust');
      expect(acs!.triggerValues).not.toContain('kopfschmerzen');
    });

    it('löst NICHT aus bei harmlosen Symptomen', () => {
      const results = RoutingEngine.evaluateAll(
        { '1002': { value: ['kopfschmerzen', 'müdigkeit', 'schwindel'] } },
        {},
      );
      expect(results.find((r) => r.ruleId === 'PRIORITY_ACS')).toBeUndefined();
    });

    it.each<[string, unknown]>([
      ['leerer Array', []],
      ['leerer String', ''],
      ['null', null],
      ['undefined', undefined],
    ])('löst NICHT aus bei %s', (_label, value) => {
      const results = RoutingEngine.evaluateAll({ '1002': { value } } as any, {});
      expect(results.find((r) => r.ruleId === 'PRIORITY_ACS')).toBeUndefined();
    });

    it('löst NICHT aus, wenn Frage nicht beantwortet', () => {
      const results = RoutingEngine.evaluateAll({}, {});
      expect(results.find((r) => r.ruleId === 'PRIORITY_ACS')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PRIORITY_SUIZID — Frage 1C14
  // ═══════════════════════════════════════════════════════════
  describe('PRIORITY_SUIZID - Suizidalitäts-Screening', () => {
    it.each([['ja', 'String'], [true, 'Boolean']] as const)(
      'löst aus bei %s (%s)',
      (value) => {
        const results = RoutingEngine.evaluateAll({ '1C14': { value } } as any, {});
        const r = results.find((r) => r.ruleId === 'PRIORITY_SUIZID');
        expect(r).toBeDefined();
        expect(r!.level).toBe('PRIORITY');
        expect(r!.workflowAction).toBe('inform_staff_now');
      },
    );

    it.each(['nein', false, null, undefined, ''])(
      'löst NICHT aus bei %p',
      (value) => {
        const results = RoutingEngine.evaluateAll({ '1C14': { value } } as any, {});
        expect(results.find((r) => r.ruleId === 'PRIORITY_SUIZID')).toBeUndefined();
      },
    );
  });

  // ═══════════════════════════════════════════════════════════
  // PRIORITY_SAH — Donnerschlags-Kopfschmerz
  // ═══════════════════════════════════════════════════════════
  describe('PRIORITY_SAH - Donnerschlags-Kopfschmerz', () => {
    it('löst aus bei Wert "donnerschlag"', () => {
      const results = RoutingEngine.evaluateAll(
        { '1181': { value: 'donnerschlag' } },
        {},
      );
      const r = results.find((r) => r.ruleId === 'PRIORITY_SAH');
      expect(r).toBeDefined();
      expect(r!.level).toBe('PRIORITY');
    });

    it('löst aus, wenn donnerschlag in Array', () => {
      const results = RoutingEngine.evaluateAll(
        { '1181': { value: ['stumpf', 'donnerschlag'] } },
        {},
      );
      expect(results.find((r) => r.ruleId === 'PRIORITY_SAH')).toBeDefined();
    });

    it('löst NICHT aus bei anderen Kopfschmerz-Charakteristika', () => {
      const results = RoutingEngine.evaluateAll(
        { '1181': { value: ['stumpf', 'pulsierend'] } },
        {},
      );
      expect(results.find((r) => r.ruleId === 'PRIORITY_SAH')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PRIORITY_SYNCOPE — Bewusstseinsverlust
  // ═══════════════════════════════════════════════════════════
  describe('PRIORITY_SYNCOPE - Bewusstseinsverlust', () => {
    it.each(['bewusstlosigkeit', 'bewusstseinsverlust'])(
      'löst aus bei Wert "%s"',
      (value) => {
        const results = RoutingEngine.evaluateAll({ '1185': { value } }, {});
        const r = results.find((r) => r.ruleId === 'PRIORITY_SYNCOPE');
        expect(r).toBeDefined();
        expect(r!.level).toBe('PRIORITY');
      },
    );

    it('löst NICHT aus bei "kein"', () => {
      const results = RoutingEngine.evaluateAll(
        { '1185': { value: 'kein' } },
        {},
      );
      expect(results.find((r) => r.ruleId === 'PRIORITY_SYNCOPE')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Sortierung: PRIORITY zuerst
  // ═══════════════════════════════════════════════════════════
  describe('evaluateAll sortiert PRIORITY vor INFO', () => {
    it('PRIORITY-Ergebnisse stehen vor INFO-Ergebnissen', () => {
      const answers = {
        '1002': { value: 'brust' },          // PRIORITY
        '7000': { value: ['gerinnung'] },    // INFO (zusammen mit 6005)
        '6005': { value: ['marcumar'] },     // INFO
      };
      const results = RoutingEngine.evaluateAll(answers, {});
      expect(results.length).toBeGreaterThanOrEqual(2);
      const firstPriorityIdx = results.findIndex((r) => r.level === 'PRIORITY');
      const firstInfoIdx = results.findIndex((r) => r.level === 'INFO');
      expect(firstPriorityIdx).toBeLessThan(firstInfoIdx);
    });

    it('hasPriority erkennt PRIORITY in gemischter Liste', () => {
      const answers = {
        '1002': { value: 'brust' },
        '4002': { value: 'Ja' },
      };
      const results = RoutingEngine.evaluateAll(answers, { age: 70 });
      expect(RoutingEngine.hasPriority(results)).toBe(true);
    });

    it('hasPriority retourniert false ohne PRIORITY', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = RoutingEngine.evaluateAll(answers, { age: 70 });
      expect(RoutingEngine.hasPriority(results)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // toPatientSafeView — technische Garantie
  // ═══════════════════════════════════════════════════════════
  describe('toPatientSafeView — Leak-Garantie', () => {
    it('exportiert NUR patient-sichere Felder', () => {
      const results = RoutingEngine.evaluateAll(
        { '1002': { value: 'brust' } },
        {},
      );
      expect(results.length).toBeGreaterThan(0);
      const safe = RoutingEngine.toPatientSafeView(results[0]);

      // Erlaubte Felder
      expect(safe).toHaveProperty('ruleId');
      expect(safe).toHaveProperty('level');
      expect(safe).toHaveProperty('patientMessage');
      expect(safe).toHaveProperty('workflowAction');

      // Verbotene Felder dürfen nicht im Output landen
      expect(safe).not.toHaveProperty('staffMessage');
      expect(safe).not.toHaveProperty('triggerValues');
      expect(safe).not.toHaveProperty('atomId');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // evaluateForAtom filtert korrekt
  // ═══════════════════════════════════════════════════════════
  describe('evaluateForAtom — atomId-Filter', () => {
    it('filtert nur Regeln, die das angefragte Atom als atomId tragen', () => {
      const answers = {
        '1002': { value: 'brust' },          // PRIORITY_ACS, atomId='1002'
        '1181': { value: 'donnerschlag' },   // PRIORITY_SAH, atomId='1181'
      };
      const acsOnly = RoutingEngine.evaluateForAtom('1002', answers, {});
      expect(acsOnly.length).toBe(1);
      expect(acsOnly[0].ruleId).toBe('PRIORITY_ACS');

      const sahOnly = RoutingEngine.evaluateForAtom('1181', answers, {});
      expect(sahOnly.length).toBe(1);
      expect(sahOnly[0].ruleId).toBe('PRIORITY_SAH');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getRuleIds — alle Regeln registriert
  // ═══════════════════════════════════════════════════════════
  describe('getRuleIds', () => {
    it('liefert die erwarteten 4 PRIORITY + 6 INFO Regeln', () => {
      const ids = RoutingEngine.getRuleIds();
      expect(ids).toContain('PRIORITY_ACS');
      expect(ids).toContain('PRIORITY_SUIZID');
      expect(ids).toContain('PRIORITY_SAH');
      expect(ids).toContain('PRIORITY_SYNCOPE');
      expect(ids).toContain('INFO_BLUTUNG');
      expect(ids).toContain('INFO_DIABETISCHER_FUSS');
      expect(ids).toContain('INFO_RAUCHER_ALTER');
      expect(ids).toContain('INFO_SCHWANGERSCHAFT_INKONSISTENT');
      expect(ids).toContain('INFO_POLYPHARMAZIE');
      expect(ids).toContain('INFO_DOPPELTE_BLUTVERDUENNUNG');
      expect(ids.length).toBe(10);
    });
  });
});
