/**
 * @file TriageEngine.warning.test.ts
 * @description Comprehensive tests for WARNING Triage Rules
 *
 * WARNING rules show yellow alerts but allow the patient to continue.
 * These tests ensure all warning conditions are properly detected.
 */

import { describe, it, expect } from 'vitest';
import { TriageEngine } from './TriageEngine';

describe('TriageEngine - WARNING Rules', () => {
  // ═══════════════════════════════════════════════════════════
  // WARNING_BLUTUNG - Erhöhtes Blutungsrisiko
  // ═══════════════════════════════════════════════════════════
  describe('WARNING_BLUTUNG - Blutungsrisiko', () => {
    it('should trigger when Gerinnungsstörung AND Marcumar', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeDefined();
      expect(blutung!.level).toBe('WARNING');
      expect(blutung!.triggerValues).toHaveProperty('gerinnung');
      expect(blutung!.triggerValues).toHaveProperty('blutverdünner');
    });

    it('should trigger when Gerinnungsstörung AND Xarelto', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['xarelto'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeDefined();
      expect(blutung!.level).toBe('WARNING');
    });

    it('should trigger when Gerinnungsstörung AND Eliquis', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['eliquis'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeDefined();
      expect(blutung!.level).toBe('WARNING');
    });

    it('should trigger when Gerinnungsstörung AND Pradaxa', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['pradaxa'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeDefined();
      expect(blutung!.level).toBe('WARNING');
    });

    it('should trigger when Gerinnungsstörung AND Lixiana', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['lixiana'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeDefined();
      expect(blutung!.level).toBe('WARNING');
    });

    it('should NOT trigger with only Gerinnungsstörung', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeUndefined();
    });

    it('should NOT trigger with only Blutverdünner', () => {
      const answers = {
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeUndefined();
    });

    it('should NOT trigger with wrong Gerinnung value', () => {
      const answers = {
        '7000': { value: ['thrombose'] },
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeUndefined();
    });

    it('should NOT trigger when both answers are missing', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WARNING_DIABETISCHER_FUSS - Diabetischer Fuß
  // ═══════════════════════════════════════════════════════════
  describe('WARNING_DIABETISCHER_FUSS - Diabetischer Fuß-Verdacht', () => {
    it('should trigger when Diabetes=Ja AND Beinbeschwerden', () => {
      const answers = {
        '5000': { value: 'Ja' },
        '1002': { value: ['beine'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const fuss = results.find(r => r.atomId === '5000');
      expect(fuss).toBeDefined();
      expect(fuss!.level).toBe('WARNING');
      expect(fuss!.message).toContain('Diabetisches Fußsyndrom');
    });

    it('should trigger when Diabetes=Ja AND Wunde', () => {
      const answers = {
        '5000': { value: 'Ja' },
        '1002': { value: ['wunde'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const fuss = results.find(r => r.atomId === '5000');
      expect(fuss).toBeDefined();
      expect(fuss!.level).toBe('WARNING');
    });

    it('should trigger when Diabetes=Ja AND both beine and wunde', () => {
      const answers = {
        '5000': { value: 'Ja' },
        '1002': { value: ['beine', 'wunde', 'schmerzen'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const fuss = results.find(r => r.atomId === '5000');
      expect(fuss).toBeDefined();
      expect(fuss!.level).toBe('WARNING');
    });

    it('should NOT trigger when Diabetes=Nein', () => {
      const answers = {
        '5000': { value: 'Nein' },
        '1002': { value: ['beine'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const fuss = results.find(r => r.atomId === '5000');
      expect(fuss).toBeUndefined();
    });

    it('should NOT trigger when no Beinbeschwerden', () => {
      const answers = {
        '5000': { value: 'Ja' },
        '1002': { value: ['kopfschmerzen', 'fieber'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const fuss = results.find(r => r.atomId === '5000');
      expect(fuss).toBeUndefined();
    });

    it('should NOT trigger when Diabetes answer is missing', () => {
      const answers = {
        '1002': { value: ['beine'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const fuss = results.find(r => r.atomId === '5000');
      expect(fuss).toBeUndefined();
    });

    it('should NOT trigger when Beschwerden answer is missing', () => {
      const answers = {
        '5000': { value: 'Ja' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const fuss = results.find(r => r.atomId === '5000');
      expect(fuss).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WARNING_RAUCHER_ALTER - Raucher über 65
  // ═══════════════════════════════════════════════════════════
  describe('WARNING_RAUCHER_ALTER - Raucher >65', () => {
    it('should trigger for smoker over 65 (age 70)', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, { age: 70 });
      const raucher = results.find(r => r.atomId === '4002');
      expect(raucher).toBeDefined();
      expect(raucher!.level).toBe('WARNING');
      expect(raucher!.triggerValues).toEqual({ rauchen: true, alter: 70 });
      expect(raucher!.message).toContain('Risiko');
    });

    it('should trigger for smoker at age 66', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, { age: 66 });
      const raucher = results.find(r => r.atomId === '4002');
      expect(raucher).toBeDefined();
      expect(raucher!.level).toBe('WARNING');
    });

    it('should NOT trigger for smoker exactly at 65', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, { age: 65 });
      const raucher = results.find(r => r.atomId === '4002');
      expect(raucher).toBeUndefined();
    });

    it('should NOT trigger for smoker under 65', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, { age: 40 });
      const raucher = results.find(r => r.atomId === '4002');
      expect(raucher).toBeUndefined();
    });

    it('should NOT trigger for non-smoker over 65', () => {
      const answers = { '4002': { value: 'Nein' } };
      const results = TriageEngine.evaluateAll(answers, { age: 70 });
      const raucher = results.find(r => r.atomId === '4002');
      expect(raucher).toBeUndefined();
    });

    it('should NOT trigger when age is missing', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const raucher = results.find(r => r.atomId === '4002');
      expect(raucher).toBeUndefined();
    });

    it('should NOT trigger when smoking answer is missing', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, { age: 70 });
      const raucher = results.find(r => r.atomId === '4002');
      expect(raucher).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WARNING_SCHWANGERSCHAFT_MANN - Ungültige Kombination
  // ═══════════════════════════════════════════════════════════
  describe('WARNING_SCHWANGERSCHAFT_MANN - Männlich + Schwangerschaft', () => {
    it('should trigger when male + pregnancy=ja', () => {
      const answers = { '8800': { value: 'ja' } };
      const results = TriageEngine.evaluateAll(answers, { gender: 'M' });
      const warn = results.find(r => r.atomId === '8800');
      expect(warn).toBeDefined();
      expect(warn!.level).toBe('WARNING');
      expect(warn!.triggerValues).toEqual({ gender: 'M', schwangerschaft: true });
      expect(warn!.message).toContain('Inkonsistente Angabe');
    });

    it('should NOT trigger when female + pregnancy=ja', () => {
      const answers = { '8800': { value: 'ja' } };
      const results = TriageEngine.evaluateAll(answers, { gender: 'F' });
      const warn = results.find(r => r.atomId === '8800');
      expect(warn).toBeUndefined();
    });

    it('should NOT trigger when male + pregnancy=nein', () => {
      const answers = { '8800': { value: 'nein' } };
      const results = TriageEngine.evaluateAll(answers, { gender: 'M' });
      const warn = results.find(r => r.atomId === '8800');
      expect(warn).toBeUndefined();
    });

    it('should NOT trigger when gender is missing', () => {
      const answers = { '8800': { value: 'ja' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const warn = results.find(r => r.atomId === '8800');
      expect(warn).toBeUndefined();
    });

    it('should NOT trigger when pregnancy answer is missing', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, { gender: 'M' });
      const warn = results.find(r => r.atomId === '8800');
      expect(warn).toBeUndefined();
    });

    it('should NOT trigger for other gender values', () => {
      const answers = { '8800': { value: 'ja' } };
      const results = TriageEngine.evaluateAll(answers, { gender: 'D' });
      const warn = results.find(r => r.atomId === '8800');
      expect(warn).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WARNING_POLYPHARMAZIE - >5 Medikamente
  // ═══════════════════════════════════════════════════════════
  describe('WARNING_POLYPHARMAZIE - Polypharmazie', () => {
    it('should trigger with 6 medications', () => {
      const answers = { '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5', 'med6'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const poly = results.find(r => r.atomId === '8900');
      expect(poly).toBeDefined();
      expect(poly!.level).toBe('WARNING');
      expect(poly!.triggerValues).toEqual({ anzahl: 6 });
      expect(poly!.message).toContain('6 Medikamente');
    });

    it('should trigger with 10 medications', () => {
      const meds = Array.from({ length: 10 }, (_, i) => `med${i + 1}`);
      const answers = { '8900': { value: meds } };
      const results = TriageEngine.evaluateAll(answers, {});
      const poly = results.find(r => r.atomId === '8900');
      expect(poly).toBeDefined();
      expect(poly!.level).toBe('WARNING');
      expect(poly!.triggerValues).toEqual({ anzahl: 10 });
    });

    it('should NOT trigger with exactly 5 medications', () => {
      const answers = { '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const poly = results.find(r => r.atomId === '8900');
      expect(poly).toBeUndefined();
    });

    it('should NOT trigger with fewer than 5 medications', () => {
      const answers = { '8900': { value: ['med1', 'med2', 'med3'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const poly = results.find(r => r.atomId === '8900');
      expect(poly).toBeUndefined();
    });

    it('should NOT trigger with empty array', () => {
      const answers = { '8900': { value: [] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const poly = results.find(r => r.atomId === '8900');
      expect(poly).toBeUndefined();
    });

    it('should NOT trigger when answer is not an array', () => {
      const answers = { '8900': { value: 'med1' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const poly = results.find(r => r.atomId === '8900');
      expect(poly).toBeUndefined();
    });

    it('should NOT trigger when answer is missing', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      const poly = results.find(r => r.atomId === '8900');
      expect(poly).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WARNING_DOPPELTE_BLUTVERDUENNUNG - >1 Blutverdünner
  // ═══════════════════════════════════════════════════════════
  describe('WARNING_DOPPELTE_BLUTVERDUENNUNG - Doppelte Blutverdünnung', () => {
    it('should trigger with 2 blood thinners', () => {
      const answers = { '6005': { value: ['marcumar', 'xarelto'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const doppel = results.find(r => r.atomId === '6005');
      expect(doppel).toBeDefined();
      expect(doppel!.level).toBe('WARNING');
      expect(doppel!.triggerValues).toHaveLength(2);
      expect(doppel!.message).toContain('mehr als ein blutverdünnendes Medikament');
    });

    it('should trigger with 3 blood thinners', () => {
      const answers = { '6005': { value: ['marcumar', 'xarelto', 'eliquis'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const doppel = results.find(r => r.atomId === '6005');
      expect(doppel).toBeDefined();
      expect(doppel!.level).toBe('WARNING');
      expect(doppel!.triggerValues).toHaveLength(3);
    });

    it('should NOT trigger with single blood thinner', () => {
      const answers = { '6005': { value: ['marcumar'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const doppel = results.find(r => r.atomId === '6005');
      expect(doppel).toBeUndefined();
    });

    it('should NOT trigger with single blood thinner as string', () => {
      const answers = { '6005': { value: 'xarelto' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const doppel = results.find(r => r.atomId === '6005');
      expect(doppel).toBeUndefined();
    });

    it('should NOT trigger with empty array', () => {
      const answers = { '6005': { value: [] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const doppel = results.find(r => r.atomId === '6005');
      expect(doppel).toBeUndefined();
    });

    it('should NOT trigger when answer is missing', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      const doppel = results.find(r => r.atomId === '6005');
      expect(doppel).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // General WARNING rule validation
  // ═══════════════════════════════════════════════════════════
  describe('General WARNING Rules Validation', () => {
    it('should have at least 6 WARNING rules registered', () => {
      const ids = TriageEngine.getRuleIds();
      const warningIds = ids.filter(id => id.startsWith('WARNING_'));
      expect(warningIds.length).toBeGreaterThanOrEqual(6);
      expect(warningIds).toContain('WARNING_BLUTUNG');
      expect(warningIds).toContain('WARNING_DIABETISCHER_FUSS');
      expect(warningIds).toContain('WARNING_RAUCHER_ALTER');
      expect(warningIds).toContain('WARNING_SCHWANGERSCHAFT_MANN');
      expect(warningIds).toContain('WARNING_POLYPHARMAZIE');
      expect(warningIds).toContain('WARNING_DOPPELTE_BLUTVERDUENNUNG');
    });

    it('should return WARNING level for all warning alerts', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.level).toBe('WARNING');
      });
    });

    it('should return correct structure for all warning results', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('level');
      expect(results[0]).toHaveProperty('atomId');
      expect(results[0]).toHaveProperty('triggerValues');
      expect(results[0]).toHaveProperty('message');
      expect(typeof results[0].message).toBe('string');
      expect(results[0].message.length).toBeGreaterThan(0);
    });
  });
});
