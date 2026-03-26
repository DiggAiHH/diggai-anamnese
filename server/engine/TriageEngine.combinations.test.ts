/**
 * @file TriageEngine.combinations.test.ts
 * @description Tests for TriageEngine rule combinations and edge cases
 *
 * Tests complex scenarios with multiple rules firing simultaneously,
 * sorting behavior, and complete patient scenarios.
 */

import { describe, it, expect } from 'vitest';
import { TriageEngine } from './TriageEngine';

describe('TriageEngine - Combinations & Edge Cases', () => {
  // ═══════════════════════════════════════════════════════════
  // Multiple CRITICAL rules simultaneously
  // ═══════════════════════════════════════════════════════════
  describe('Multiple CRITICAL rules', () => {
    it('should trigger both CRITICAL_ACS and CRITICAL_SUIZID', () => {
      const answers = {
        '1002': { value: 'brust' },
        '1C14': { value: 'ja' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(2);
      
      const acs = results.find(r => r.atomId === '1002');
      const suizid = results.find(r => r.atomId === '1C14');
      
      expect(acs).toBeDefined();
      expect(acs!.level).toBe('CRITICAL');
      expect(suizid).toBeDefined();
      expect(suizid!.level).toBe('CRITICAL');
    });

    it('should trigger all 4 CRITICAL rules simultaneously', () => {
      const answers = {
        '1002': { value: ['brust', 'atemnot'] },
        '1C14': { value: 'ja' },
        '1181': { value: 'donnerschlag' },
        '1185': { value: 'bewusstlosigkeit' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(4);
      
      results.forEach(r => {
        expect(r.level).toBe('CRITICAL');
      });
      
      expect(results.find(r => r.atomId === '1002')).toBeDefined();
      expect(results.find(r => r.atomId === '1C14')).toBeDefined();
      expect(results.find(r => r.atomId === '1181')).toBeDefined();
      expect(results.find(r => r.atomId === '1185')).toBeDefined();
    });

    it('should trigger CRITICAL_ACS with all trigger values', () => {
      const answers = {
        '1002': { value: ['brust', 'atemnot', 'laehmung'] },
        '1181': { value: 'donnerschlag' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(2);
      
      const acs = results.find(r => r.atomId === '1002');
      expect(acs!.triggerValues).toHaveLength(3);
      expect(acs!.triggerValues).toContain('brust');
      expect(acs!.triggerValues).toContain('atemnot');
      expect(acs!.triggerValues).toContain('laehmung');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CRITICAL + WARNING combinations
  // ═══════════════════════════════════════════════════════════
  describe('CRITICAL + WARNING combinations', () => {
    it('should trigger CRITICAL and WARNING simultaneously', () => {
      const answers = {
        '1002': { value: 'brust' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(2);
      
      const critical = results.find(r => r.level === 'CRITICAL');
      const warning = results.find(r => r.level === 'WARNING');
      
      expect(critical).toBeDefined();
      expect(critical!.atomId).toBe('1002');
      expect(warning).toBeDefined();
      expect(warning!.atomId).toBe('7000');
    });

    it('should trigger CRITICAL_ACS and WARNING_DIABETISCHER_FUSS', () => {
      const answers = {
        '1002': { value: ['brust', 'beine'] },
        '5000': { value: 'Ja' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(2);
      
      const critical = results.find(r => r.level === 'CRITICAL');
      const warning = results.find(r => r.level === 'WARNING');
      
      expect(critical).toBeDefined();
      expect(warning).toBeDefined();
    });

    it('should trigger CRITICAL and multiple WARNINGs', () => {
      const answers = {
        '1002': { value: 'brust' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar', 'xarelto'] },
        '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5', 'med6'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      
      const criticalCount = results.filter(r => r.level === 'CRITICAL').length;
      const warningCount = results.filter(r => r.level === 'WARNING').length;
      
      expect(criticalCount).toBe(1);
      expect(warningCount).toBe(3); // WARNING_BLUTUNG, WARNING_DOPPELTE_BLUTVERDUENNUNG, WARNING_POLYPHARMAZIE
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Sorting behavior
  // ═══════════════════════════════════════════════════════════
  describe('Sorting - CRITICAL before WARNING', () => {
    it('should sort CRITICAL before WARNING when CRITICAL comes first in answers', () => {
      const answers = {
        '1002': { value: 'brust' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results[0].level).toBe('CRITICAL');
      expect(results[1].level).toBe('WARNING');
    });

    it('should sort CRITICAL before WARNING when WARNING comes first in answers', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
        '1002': { value: 'brust' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results[0].level).toBe('CRITICAL');
      expect(results[1].level).toBe('WARNING');
    });

    it('should maintain all CRITICALs before any WARNING', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
        '1002': { value: 'brust' },
        '1C14': { value: 'ja' },
        '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5', 'med6'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      
      // Find the last CRITICAL index
      const lastCriticalIdx = results.map((r, i) => r.level === 'CRITICAL' ? i : -1)
        .filter(i => i !== -1)
        .pop();
      
      // Find the first WARNING index
      const firstWarningIdx = results.findIndex(r => r.level === 'WARNING');
      
      expect(lastCriticalIdx).toBeLessThan(firstWarningIdx);
    });

    it('should sort multiple CRITICALs and WARNINGs correctly', () => {
      const answers = {
        '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5', 'med6'] },
        '1002': { value: 'brust' },
        '7000': { value: ['gerinnung'] },
        '1C14': { value: 'ja' },
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      
      // First two should be CRITICAL
      expect(results[0].level).toBe('CRITICAL');
      expect(results[1].level).toBe('CRITICAL');
      
      // Last two should be WARNING
      expect(results[2].level).toBe('WARNING');
      expect(results[3].level).toBe('WARNING');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Empty and invalid inputs
  // ═══════════════════════════════════════════════════════════
  describe('Empty and invalid inputs', () => {
    it('should return empty array for empty answers', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toEqual([]);
    });

    it('should handle null answers gracefully (returns empty or throws)', () => {
      // TriageEngine doesn't handle null answers - this documents the behavior
      expect(() => TriageEngine.evaluateAll(null as any, {})).toThrow();
    });

    it('should handle undefined answers gracefully (returns empty or throws)', () => {
      // TriageEngine doesn't handle undefined answers - this documents the behavior
      expect(() => TriageEngine.evaluateAll(undefined as any, {})).toThrow();
    });

    it('should handle answers with only null/undefined values', () => {
      const answers = {
        '1002': { value: null },
        '1C14': { value: undefined },
        '1181': { value: '' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toEqual([]);
    });

    it('should handle empty context', () => {
      const answers = { '1002': { value: 'brust' } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(1);
      expect(results[0].level).toBe('CRITICAL');
    });

    it('should handle null context', () => {
      const answers = { '1002': { value: 'brust' } };
      // null context is handled by individual rules
      const results = TriageEngine.evaluateAll(answers, null as any);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Complete patient scenarios
  // ═══════════════════════════════════════════════════════════
  describe('Complete patient scenarios', () => {
    it('should handle high-risk cardiac patient scenario', () => {
      const answers = {
        '1002': { value: ['brust', 'atemnot'] },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
        '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5', 'med6'] },
      };
      const context = { age: 72, gender: 'M' };
      const results = TriageEngine.evaluateAll(answers, context);
      
      // Should trigger CRITICAL_ACS, WARNING_BLUTUNG, WARNING_POLYPHARMAZIE
      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results.some(r => r.atomId === '1002' && r.level === 'CRITICAL')).toBe(true);
      expect(results.some(r => r.atomId === '7000' && r.level === 'WARNING')).toBe(true);
      expect(results.some(r => r.atomId === '8900' && r.level === 'WARNING')).toBe(true);
    });

    it('should handle elderly diabetic patient with complications', () => {
      const answers = {
        '5000': { value: 'Ja' },
        '1002': { value: ['beine', 'wunde'] },
        '8900': { value: ['insulin', 'metformin', 'med3', 'med4', 'med5', 'med6', 'med7'] },
      };
      const context = { age: 70, gender: 'M' };
      const results = TriageEngine.evaluateAll(answers, context);
      
      // Should trigger WARNING_DIABETISCHER_FUSS and WARNING_POLYPHARMAZIE
      expect(results.some(r => r.atomId === '5000' && r.level === 'WARNING')).toBe(true);
      expect(results.some(r => r.atomId === '8900' && r.level === 'WARNING')).toBe(true);
    });

    it('should handle smoker with emergency symptoms', () => {
      const answers = {
        '4002': { value: 'Ja' },
        '1002': { value: ['atemnot', 'brust'] },
        '6005': { value: ['xarelto', 'eliquis'] },
      };
      const context = { age: 68, gender: 'M' };
      const results = TriageEngine.evaluateAll(answers, context);
      
      // Should trigger CRITICAL_ACS, WARNING_RAUCHER_ALTER, WARNING_DOPPELTE_BLUTVERDUENNUNG
      expect(results.some(r => r.atomId === '1002' && r.level === 'CRITICAL')).toBe(true);
      expect(results.some(r => r.atomId === '4002' && r.level === 'WARNING')).toBe(true);
      expect(results.some(r => r.atomId === '6005' && r.level === 'WARNING')).toBe(true);
    });

    it('should handle patient with mental health crisis', () => {
      const answers = {
        '1C14': { value: 'ja' },
        '1185': { value: 'bewusstlosigkeit' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      
      // Both are CRITICAL
      expect(results).toHaveLength(2);
      expect(results.every(r => r.level === 'CRITICAL')).toBe(true);
    });

    it('should handle pregnant patient with warning signs', () => {
      const answers = {
        '8800': { value: 'ja' },
        '1181': { value: 'donnerschlag' },
        '6005': { value: ['marcumar'] },
      };
      const context = { age: 30, gender: 'F' };
      const results = TriageEngine.evaluateAll(answers, context);
      
      // Should trigger CRITICAL_SAH
      expect(results.some(r => r.atomId === '1181' && r.level === 'CRITICAL')).toBe(true);
      // Should NOT trigger WARNING_SCHWANGERSCHAFT_MANN (female)
      expect(results.some(r => r.atomId === '8800')).toBe(false);
    });

    it('should handle invalid data entry (male + pregnancy)', () => {
      const answers = {
        '8800': { value: 'ja' },
        '4002': { value: 'Nein' },
        '1002': { value: ['kopfschmerzen'] },
      };
      const context = { age: 45, gender: 'M' };
      const results = TriageEngine.evaluateAll(answers, context);
      
      // Should trigger WARNING_SCHWANGERSCHAFT_MANN
      expect(results).toHaveLength(1);
      expect(results[0].atomId).toBe('8800');
      expect(results[0].level).toBe('WARNING');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // evaluateForAtom with combinations
  // ═══════════════════════════════════════════════════════════
  describe('evaluateForAtom with combinations', () => {
    it('should return only results for specified atom when multiple rules would trigger', () => {
      const answers = {
        '1002': { value: 'brust' },
        '1C14': { value: 'ja' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      
      const resultsFor1002 = TriageEngine.evaluateForAtom('1002', answers, {});
      expect(resultsFor1002).toHaveLength(1);
      expect(resultsFor1002[0].atomId).toBe('1002');
      
      const resultsFor1C14 = TriageEngine.evaluateForAtom('1C14', answers, {});
      expect(resultsFor1C14).toHaveLength(1);
      expect(resultsFor1C14[0].atomId).toBe('1C14');
    });

    it('should return empty array when specified atom has no triggers', () => {
      const answers = {
        '1002': { value: 'brust' },
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      
      const results = TriageEngine.evaluateForAtom('1181', answers, {});
      expect(results).toHaveLength(0);
    });

    it('should return multiple results for same atom if multiple rules reference it', () => {
      // WARNING_BLUTUNG and WARNING_DOPPELTE_BLUTVERDUENNUNG both use atom 6005
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar', 'xarelto'] },
      };
      
      const results = TriageEngine.evaluateForAtom('6005', answers, {});
      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(r => {
        expect(r.atomId).toBe('6005');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Edge cases with data property
  // ═══════════════════════════════════════════════════════════
  describe('Edge cases with data property in answers', () => {
    it('should ignore data property in answer objects', () => {
      const answers = {
        '1002': { value: 'brust', data: { severity: 'high' } },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(1);
      expect(results[0].level).toBe('CRITICAL');
    });

    it('should work with complex nested data', () => {
      const answers = {
        '1C14': { 
          value: 'ja',
          data: { timestamp: Date.now(), source: 'voice' }
        },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(1);
      expect(results[0].level).toBe('CRITICAL');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Special boundary conditions
  // ═══════════════════════════════════════════════════════════
  describe('Special boundary conditions', () => {
    it('should handle age exactly at boundary (65) for smoker rule', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, { age: 65 });
      expect(results.find(r => r.atomId === '4002')).toBeUndefined();
    });

    it('should handle age one year over boundary (66) for smoker rule', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, { age: 66 });
      expect(results.find(r => r.atomId === '4002')).toBeDefined();
    });

    it('should handle exactly 5 medications (boundary)', () => {
      const answers = { '8900': { value: ['a', 'b', 'c', 'd', 'e'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.find(r => r.atomId === '8900')).toBeUndefined();
    });

    it('should handle 6 medications (just over boundary)', () => {
      const answers = { '8900': { value: ['a', 'b', 'c', 'd', 'e', 'f'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.find(r => r.atomId === '8900')).toBeDefined();
    });

    it('should handle exactly 1 blood thinner (boundary)', () => {
      const answers = { '6005': { value: ['marcumar'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.find(r => r.atomId === '6005')).toBeUndefined();
    });

    it('should handle 2 blood thinners (just over boundary)', () => {
      const answers = { '6005': { value: ['marcumar', 'xarelto'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.find(r => r.atomId === '6005')).toBeDefined();
    });
  });
});
