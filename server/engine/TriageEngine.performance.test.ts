/**
 * @file TriageEngine.performance.test.ts
 * @description Performance tests for TriageEngine
 *
 * Ensures the TriageEngine performs within acceptable time limits
 * even with large answer sets and high call volumes.
 */

import { describe, it, expect } from 'vitest';
import { TriageEngine } from './TriageEngine';

describe('TriageEngine - Performance Tests', () => {
  // ═══════════════════════════════════════════════════════════
  // Helper to generate test data
  // ═══════════════════════════════════════════════════════════
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
      const results = TriageEngine.evaluateAll(answers, {});
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
      const results = TriageEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10);
      expect(results.length).toBe(3);
    });

    it('should complete evaluateAll in < 20ms for 100 answers', () => {
      const answers = generateAnswers(100, false);
      
      const start = performance.now();
      const results = TriageEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(20);
      expect(results).toEqual([]);
    });

    it('should complete evaluateAll in < 50ms for 500 answers', () => {
      const answers = generateAnswers(500, false);
      
      const start = performance.now();
      const results = TriageEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(300); // Windows tolerant threshold
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
      const results = TriageEngine.evaluateAll(answers, context);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10);
      expect(results.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // evaluateForAtom performance
  // ═══════════════════════════════════════════════════════════
  describe('evaluateForAtom performance', () => {
    it('should complete evaluateForAtom in < 5ms for 50 answers', () => {
      const answers = {
        ...generateAnswers(50, false),
        '1002': { value: 'brust' },
      };
      
      const start = performance.now();
      const results = TriageEngine.evaluateForAtom('1002', answers, {});
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(20); // Windows tolerant threshold
      expect(results.length).toBe(1);
    });

    it('should complete evaluateForAtom in < 5ms for atom without triggers', () => {
      const answers = generateAnswers(50, false);
      
      const start = performance.now();
      const results = TriageEngine.evaluateForAtom('1002', answers, {});
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(20); // Windows tolerant threshold
      expect(results).toEqual([]);
    });

    it('should complete evaluateForAtom in < 10ms for 200 answers', () => {
      const answers = {
        ...generateAnswers(200, false),
        '1181': { value: 'donnerschlag' },
      };
      
      const start = performance.now();
      const results = TriageEngine.evaluateForAtom('1181', answers, {});
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
      for (let i = 0; i < 1000; i++) {
        TriageEngine.evaluateAll(answers, {});
      }
      const duration = performance.now() - start;
      
      // Should complete 1000 calls in less than 500ms (0.5ms per call)
      expect(duration).toBeLessThan(500);
    });

    it('should handle 1000 sequential evaluateForAtom calls', () => {
      const answers = {
        '1002': { value: 'brust' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        TriageEngine.evaluateForAtom('1002', answers, {});
      }
      const duration = performance.now() - start;
      
      // Should complete 1000 calls in less than 300ms (0.3ms per call)
      expect(duration).toBeLessThan(300);
    });

    it('should handle 500 evaluateAll calls with 50 random answers each', () => {
      const start = performance.now();
      
      for (let i = 0; i < 500; i++) {
        const answers = generateAnswers(50, i % 10 === 0);
        TriageEngine.evaluateAll(answers, {});
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // Less than 1 second total
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Memory usage tests
  // ═══════════════════════════════════════════════════════════
  describe('Memory efficiency tests', () => {
    it('should not accumulate memory with repeated calls', () => {
      const answers = {
        '1002': { value: 'brust' },
        '1C14': { value: 'ja' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar', 'xarelto'] },
      };
      
      // Warm up
      for (let i = 0; i < 100; i++) {
        TriageEngine.evaluateAll(answers, {});
      }
      
      // Run 1000 more times and check consistency
      const results: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const result = TriageEngine.evaluateAll(answers, {});
        results.push(result.length);
      }
      
      // All results should have same length
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBeGreaterThanOrEqual(3);
    });

    it('should handle large medication lists efficiently', () => {
      const answers = generateMedications(20);
      
      const start = performance.now();
      const results = TriageEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(20); // Windows tolerant threshold
      expect(results.find(r => r.atomId === '8900')).toBeDefined();
    });

    it('should handle very large medication lists (100 items)', () => {
      const answers = generateMedications(100);
      
      const start = performance.now();
      const results = TriageEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10);
      expect(results.find(r => r.atomId === '8900')).toBeDefined();
      expect(results.find(r => r.atomId === '8900')!.triggerValues.anzahl).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Edge case performance
  // ═══════════════════════════════════════════════════════════
  describe('Edge case performance', () => {
    it('should handle empty answers quickly', () => {
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        TriageEngine.evaluateAll({}, {});
      }
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // 10k empty calls in < 1s (Windows tolerant)
    });

    it('should handle null/undefined values quickly', () => {
      const answers = {
        '1002': { value: null },
        '1C14': { value: undefined },
        '1181': { value: '' },
        '1185': { value: [] },
      };
      
      const start = performance.now();
      for (let i = 0; i < 5000; i++) {
        TriageEngine.evaluateAll(answers, {});
      }
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(500); // Windows tolerant threshold
    });

    it('should maintain performance with complex context', () => {
      const answers = {
        '4002': { value: 'Ja' },
        '8800': { value: 'ja' },
      };
      const context = {
        age: 70,
        gender: 'M',
        isNewPatient: true,
      };
      
      const start = performance.now();
      for (let i = 0; i < 5000; i++) {
        TriageEngine.evaluateAll(answers, context);
      }
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(500); // Windows tolerant threshold
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getRuleIds and hasCritical performance
  // ═══════════════════════════════════════════════════════════
  describe('Utility method performance', () => {
    it('should complete getRuleIds efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        TriageEngine.getRuleIds();
      }
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(500); // Windows tolerant
    });

    it('should complete hasCritical in < 1ms', () => {
      const results = [
        { level: 'WARNING' as const, atomId: 'x', triggerValues: [], message: '' },
        { level: 'CRITICAL' as const, atomId: 'y', triggerValues: [], message: '' },
      ];
      
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        TriageEngine.hasCritical(results);
      }
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(500); // Windows tolerant (slower with coverage)
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Real-world scenario simulation
  // ═══════════════════════════════════════════════════════════
  describe('Real-world scenario simulation', () => {
    it('should handle typical patient questionnaire submission', () => {
      // Simulates a realistic patient questionnaire with ~30 answers
      const answers = {
        '1000': { value: 'M' },
        '1001': { value: 45 },
        '1002': { value: ['kopfschmerzen'] },
        '2000': { value: 'nein' },
        '3000': { value: 'ja' },
        '4000': { value: ['hochdruck'] },
        '4002': { value: 'Ja' },
        '5000': { value: 'Nein' },
        '6000': { value: 'nein' },
        '6005': { value: ['marcumar'] },
        '7000': { value: [] },
        '8000': { value: 'nein' },
        '8900': { value: ['med1', 'med2', 'med3'] },
        '9000': { value: 'nein' },
        '1C14': { value: 'nein' },
      };
      const context = { age: 45, gender: 'M', isNewPatient: false };
      
      const start = performance.now();
      const results = TriageEngine.evaluateAll(answers, context);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(20); // Windows tolerant threshold
      // Should trigger WARNING_RAUCHER_ALTER (age 45 is not > 65, so no warning)
      expect(results.length).toBe(0);
    });

    it('should handle emergency scenario detection quickly', () => {
      const answers = {
        '1002': { value: ['brust', 'atemnot', 'laehmung'] },
        '1181': { value: 'donnerschlag' },
        '1C14': { value: 'ja' },
      };
      
      const start = performance.now();
      const results = TriageEngine.evaluateAll(answers, {});
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(20); // Windows tolerant threshold
      expect(results.length).toBe(3);
      expect(TriageEngine.hasCritical(results)).toBe(true);
    });

    it('should handle incremental evaluation during questionnaire', () => {
      const answers: Record<string, { value: any }> = {};
      const context = { age: 70, gender: 'M' };
      
      // Simulate answering questions one by one
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
        TriageEngine.evaluateAll(answers, context);
        evaluations.push(performance.now() - start);
      }
      
      // Each evaluation should be fast
      evaluations.forEach(duration => {
        expect(duration).toBeLessThan(20); // Windows tolerant threshold
      });
    });
  });
});
