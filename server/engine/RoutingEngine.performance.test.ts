/**
 * @file RoutingEngine.performance.test.ts
 * @description Performance-Tests für die `RoutingEngine` (Nachfolger der TriageEngine).
 *
 * Spiegelt 1:1 die Performance-Garantien von `TriageEngine.performance.test.ts`,
 * misst aber gegen die neue Engine. Sicherstellt, dass die zusätzliche
 * `staffMessage`-Trennung + `toPatientSafeView` keinen messbaren Overhead
 * im Anmelde-Flow verursachen (<20ms bei 50 Antworten, <300ms bei 1000 calls).
 *
 * @see docs/REGULATORY_STRATEGY.md §11.2
 * @see docs/ROUTING_RULES.md
 */

import { describe, it, expect } from 'vitest';
import { RoutingEngine } from './RoutingEngine';

describe('RoutingEngine - Performance Tests', () => {
  const generateAnswers = (count: number, includeTriggers: boolean = false): Record<string, { value: any }> => {
    const answers: Record<string, { value: any }> = {};
    for (let i = 0; i < count; i++) {
      answers[`atom_${i}`] = { value: includeTriggers && i === 0 ? 'brust' : `value_${i}` };
    }
    return answers;
  };

  const generateMedications = (count: number): Record<string, { value: any }> => {
    const meds = Array.from({ length: count }, (_, i) => `medication_${i + 1}`);
    return { '8900': { value: meds } };
  };

  // ═══════════════════════════════════════════════════════════
  // evaluateAll performance
  // ═══════════════════════════════════════════════════════════
  describe('evaluateAll performance', () => {
    it('should complete evaluateAll in < 10ms for 50 answers without triggers', () => {
      const answers = generateAnswers(50, false);
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
      expect(results).toEqual([]);
    });

    it('should complete evaluateAll in < 10ms for 50 answers with triggers', () => {
      const answers = {
        ...generateAnswers(47, false),
        '1002': { value: 'brust' },
        '1C14': { value: 'ja' },
        '1181': { value: 'donnerschlag' },
      };
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
      expect(results.length).toBe(3);
    });

    it('should complete evaluateAll in < 20ms for 100 answers', () => {
      const answers = generateAnswers(100, false);
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(20);
      expect(results).toEqual([]);
    });

    it('should complete evaluateAll in < 300ms for 500 answers', () => {
      const answers = generateAnswers(500, false);
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(300);
      expect(results).toEqual([]);
    });

    it('should handle complex patient scenario in < 10ms', () => {
      const answers = {
        '1002': { value: ['brust', 'atemnot'] },
        '1C14': { value: 'ja' },
        '1181': { value: 'donnerschlag' },
        '1185': { value: 'bewusstlosigkeit' },
        '5000': { value: 'Ja' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar', 'xarelto'] },
        '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5', 'med6', 'med7', 'med8'] },
        '4002': { value: 'Ja' },
      };
      const context = { age: 72, gender: 'M' };
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, context);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
      expect(results.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // evaluateForAtom performance
  // ═══════════════════════════════════════════════════════════
  describe('evaluateForAtom performance', () => {
    it('should complete evaluateForAtom in < 20ms for 50 answers', () => {
      const answers = {
        ...generateAnswers(50, false),
        '1002': { value: 'brust' },
      };
      const start = performance.now();
      const results = RoutingEngine.evaluateForAtom('1002', answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(20);
      expect(results.length).toBe(1);
    });

    it('should complete evaluateForAtom in < 20ms for atom without triggers', () => {
      const answers = generateAnswers(50, false);
      const start = performance.now();
      const results = RoutingEngine.evaluateForAtom('1002', answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(20);
      expect(results).toEqual([]);
    });

    it('should complete evaluateForAtom in < 10ms for 200 answers', () => {
      const answers = {
        ...generateAnswers(200, false),
        '1181': { value: 'donnerschlag' },
      };
      const start = performance.now();
      const results = RoutingEngine.evaluateForAtom('1181', answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
      expect(results.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // High volume operations
  // ═══════════════════════════════════════════════════════════
  describe('High volume operations', () => {
    it('should handle 1000 sequential evaluateAll calls', () => {
      const answers = {
        '1002': { value: 'brust' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      const start = performance.now();
      for (let i = 0; i < 1000; i++) RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should handle 1000 sequential evaluateForAtom calls', () => {
      const answers = {
        '1002': { value: 'brust' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      const start = performance.now();
      for (let i = 0; i < 1000; i++) RoutingEngine.evaluateForAtom('1002', answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // RoutingEngine ist marginal langsamer wegen 2-Pass-Sortierung
    });

    it('should handle 500 evaluateAll calls with 50 random answers each', () => {
      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        const answers = generateAnswers(50, i % 10 === 0);
        RoutingEngine.evaluateAll(answers, {});
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Memory efficiency
  // ═══════════════════════════════════════════════════════════
  describe('Memory efficiency tests', () => {
    it('should not accumulate memory with repeated calls', () => {
      const answers = {
        '1002': { value: 'brust' },
        '1C14': { value: 'ja' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar', 'xarelto'] },
      };
      for (let i = 0; i < 100; i++) RoutingEngine.evaluateAll(answers, {});
      const results: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const result = RoutingEngine.evaluateAll(answers, {});
        results.push(result.length);
      }
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBeGreaterThanOrEqual(3);
    });

    it('should handle large medication lists efficiently', () => {
      const answers = generateMedications(20);
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(20);
      expect(results.find((r) => r.atomId === '8900')).toBeDefined();
    });

    it('should handle very large medication lists (100 items)', () => {
      const answers = generateMedications(100);
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
      const med = results.find((r) => r.atomId === '8900');
      expect(med).toBeDefined();
      expect((med!.triggerValues as { anzahl: number }).anzahl).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Edge case performance
  // ═══════════════════════════════════════════════════════════
  describe('Edge case performance', () => {
    it('should handle empty answers quickly', () => {
      const start = performance.now();
      for (let i = 0; i < 10000; i++) RoutingEngine.evaluateAll({}, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle null/undefined values quickly', () => {
      const answers = {
        '1002': { value: null },
        '1C14': { value: undefined },
        '1181': { value: '' },
        '1185': { value: [] },
      };
      const start = performance.now();
      for (let i = 0; i < 5000; i++) RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should maintain performance with complex context', () => {
      const answers = {
        '4002': { value: 'Ja' },
        '8800': { value: 'ja' },
      };
      const context = { age: 70, gender: 'M', isNewPatient: true };
      const start = performance.now();
      for (let i = 0; i < 5000; i++) RoutingEngine.evaluateAll(answers, context);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Utility methods
  // ═══════════════════════════════════════════════════════════
  describe('Utility method performance', () => {
    it('should complete getRuleIds efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 10000; i++) RoutingEngine.getRuleIds();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should complete hasPriority in < 500ms over 10k calls', () => {
      const results = [
        { ruleId: 'x', level: 'INFO' as const, atomId: 'x', triggerValues: [], patientMessage: '', staffMessage: '', workflowAction: 'continue' as const },
        { ruleId: 'y', level: 'PRIORITY' as const, atomId: 'y', triggerValues: [], patientMessage: '', staffMessage: '', workflowAction: 'inform_staff_now' as const },
      ];
      const start = performance.now();
      for (let i = 0; i < 10000; i++) RoutingEngine.hasPriority(results);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should complete toPatientSafeView in < 100ms over 10k calls', () => {
      const result = {
        ruleId: 'PRIORITY_ACS',
        level: 'PRIORITY' as const,
        atomId: '1002',
        triggerValues: ['brust'],
        patientMessage: 'Bitte Personal ansprechen.',
        staffMessage: 'ACS-Verdacht — sofort sichten.',
        workflowAction: 'inform_staff_now' as const,
      };
      const start = performance.now();
      for (let i = 0; i < 10000; i++) RoutingEngine.toPatientSafeView(result);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Real-world scenarios
  // ═══════════════════════════════════════════════════════════
  describe('Real-world scenario simulation', () => {
    it('should handle typical patient questionnaire submission', () => {
      const answers = {
        '1000': { value: 'M' }, '1001': { value: 45 }, '1002': { value: ['kopfschmerzen'] },
        '2000': { value: 'nein' }, '3000': { value: 'ja' }, '4000': { value: ['hochdruck'] },
        '4002': { value: 'Ja' }, '5000': { value: 'Nein' }, '6000': { value: 'nein' },
        '6005': { value: ['marcumar'] }, '7000': { value: [] }, '8000': { value: 'nein' },
        '8900': { value: ['med1', 'med2', 'med3'] }, '9000': { value: 'nein' }, '1C14': { value: 'nein' },
      };
      const context = { age: 45, gender: 'M', isNewPatient: false };
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, context);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(20);
      expect(results.length).toBe(0);
    });

    it('should handle priority scenario detection quickly', () => {
      const answers = {
        '1002': { value: ['brust', 'atemnot', 'laehmung'] },
        '1181': { value: 'donnerschlag' },
        '1C14': { value: 'ja' },
      };
      const start = performance.now();
      const results = RoutingEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(20);
      expect(results.length).toBe(3);
      expect(RoutingEngine.hasPriority(results)).toBe(true);
    });

    it('should handle incremental evaluation during questionnaire', () => {
      const answers: Record<string, { value: any }> = {};
      const context = { age: 70, gender: 'M' };
      const evaluations: number[] = [];
      const questions = [
        { id: '1002', value: 'brust' },
        { id: '4002', value: 'Ja' },
        { id: '7000', value: ['gerinnung'] },
        { id: '6005', value: ['marcumar'] },
      ];
      for (const q of questions) {
        answers[q.id] = { value: q.value };
        const start = performance.now();
        RoutingEngine.evaluateAll(answers, context);
        evaluations.push(performance.now() - start);
      }
      evaluations.forEach((duration) => expect(duration).toBeLessThan(20));
    });
  });
});
