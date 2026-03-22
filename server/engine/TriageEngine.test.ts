import { describe, it, expect } from 'vitest';
import { TriageEngine } from './TriageEngine';

describe('TriageEngine', () => {
  describe('getRuleIds', () => {
    it('should return all registered rule IDs', () => {
      const ids = TriageEngine.getRuleIds();
      expect(ids.length).toBeGreaterThanOrEqual(8);
      expect(ids).toContain('CRITICAL_ACS');
      expect(ids).toContain('CRITICAL_SUIZID');
      expect(ids).toContain('CRITICAL_SAH');
      expect(ids).toContain('CRITICAL_SYNCOPE');
      expect(ids).toContain('WARNING_BLUTUNG');
      expect(ids).toContain('WARNING_POLYPHARMAZIE');
    });
  });

  describe('hasCritical', () => {
    it('should return true when CRITICAL results present', () => {
      const results = [
        { level: 'WARNING' as const, atomId: 'x', triggerValues: [], message: '' },
        { level: 'CRITICAL' as const, atomId: 'y', triggerValues: [], message: '' },
      ];
      expect(TriageEngine.hasCritical(results)).toBe(true);
    });

    it('should return false when no CRITICAL results', () => {
      const results = [
        { level: 'WARNING' as const, atomId: 'x', triggerValues: [], message: '' },
      ];
      expect(TriageEngine.hasCritical(results)).toBe(false);
    });

    it('should return false for empty results', () => {
      expect(TriageEngine.hasCritical([])).toBe(false);
    });
  });

  describe('CRITICAL_ACS — Akutes Koronarsyndrom', () => {
    it('should trigger on chest pain (brust)', () => {
      const answers = { '1002': { value: ['brust'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeDefined();
      expect(acs!.triggerValues).toContain('brust');
    });

    it('should trigger on breathing difficulty (atemnot)', () => {
      const answers = { '1002': { value: 'atemnot' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeDefined();
    });

    it('should NOT trigger on harmless symptoms', () => {
      const answers = { '1002': { value: ['kopfschmerzen', 'müdigkeit'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeUndefined();
    });

    it('should NOT trigger when question not answered', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(0);
    });
  });

  describe('CRITICAL_SUIZID — Suizidalität', () => {
    it('should trigger on "ja"', () => {
      const answers = { '1C14': { value: 'ja' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeDefined();
      expect(suizid!.level).toBe('CRITICAL');
    });

    it('should trigger on boolean true', () => {
      const answers = { '1C14': { value: true } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.find(r => r.atomId === '1C14')).toBeDefined();
    });

    it('should NOT trigger on "nein"', () => {
      const answers = { '1C14': { value: 'nein' } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.find(r => r.atomId === '1C14')).toBeUndefined();
    });
  });

  describe('CRITICAL_SAH — Subarachnoidalblutung', () => {
    it('should trigger on donnerschlag headache', () => {
      const answers = { '1181': { value: ['donnerschlag'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeDefined();
      expect(sah!.level).toBe('CRITICAL');
    });
  });

  describe('CRITICAL_SYNCOPE — Bewusstlosigkeit', () => {
    it('should trigger on bewusstlosigkeit', () => {
      const answers = { '1185': { value: ['bewusstlosigkeit'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeDefined();
      expect(syncope!.level).toBe('CRITICAL');
    });
  });

  describe('WARNING_BLUTUNG — Blutungsrisiko', () => {
    it('should trigger when both Gerinnungsstörung AND Blutverdünner', () => {
      const answers = {
        '7000': { value: ['gerinnung'] },
        '6005': { value: ['marcumar'] },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      const blutung = results.find(r => r.atomId === '7000');
      expect(blutung).toBeDefined();
      expect(blutung!.level).toBe('WARNING');
    });

    it('should NOT trigger with only Gerinnungsstörung', () => {
      const answers = { '7000': { value: ['gerinnung'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.find(r => r.atomId === '7000')).toBeUndefined();
    });
  });

  describe('WARNING_RAUCHER_ALTER — Raucher >65', () => {
    it('should trigger for smoker over 65', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, { age: 70 });
      const raucher = results.find(r => r.atomId === '4002');
      expect(raucher).toBeDefined();
      expect(raucher!.level).toBe('WARNING');
    });

    it('should NOT trigger for smoker under 65', () => {
      const answers = { '4002': { value: 'Ja' } };
      const results = TriageEngine.evaluateAll(answers, { age: 40 });
      expect(results.find(r => r.atomId === '4002')).toBeUndefined();
    });
  });

  describe('WARNING_SCHWANGERSCHAFT_MANN — Gender inconsistency', () => {
    it('should trigger when male + pregnancy', () => {
      const answers = { '8800': { value: 'ja' } };
      const results = TriageEngine.evaluateAll(answers, { gender: 'M' });
      const warn = results.find(r => r.atomId === '8800');
      expect(warn).toBeDefined();
      expect(warn!.level).toBe('WARNING');
    });

    it('should NOT trigger for female + pregnancy', () => {
      const answers = { '8800': { value: 'ja' } };
      const results = TriageEngine.evaluateAll(answers, { gender: 'F' });
      expect(results.find(r => r.atomId === '8800')).toBeUndefined();
    });
  });

  describe('WARNING_POLYPHARMAZIE — >5 medications', () => {
    it('should trigger with >5 medications', () => {
      const answers = { '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5', 'med6'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const poly = results.find(r => r.atomId === '8900');
      expect(poly).toBeDefined();
      expect(poly!.level).toBe('WARNING');
    });

    it('should NOT trigger with exactly 5 medications', () => {
      const answers = { '8900': { value: ['med1', 'med2', 'med3', 'med4', 'med5'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results.find(r => r.atomId === '8900')).toBeUndefined();
    });
  });

  describe('evaluateAll sorting', () => {
    it('should sort CRITICAL before WARNING', () => {
      const answers = {
        '1002': { value: ['brust'] },      // CRITICAL_ACS
        '4002': { value: 'Ja' },            // WARNING_RAUCHER (needs age > 65)
      };
      const results = TriageEngine.evaluateAll(answers, { age: 70 });
      const criticalIdx = results.findIndex(r => r.level === 'CRITICAL');
      const warningIdx = results.findIndex(r => r.level === 'WARNING');
      if (criticalIdx >= 0 && warningIdx >= 0) {
        expect(criticalIdx).toBeLessThan(warningIdx);
      }
    });
  });

  describe('evaluateForAtom', () => {
    it('should only return results for the specified atom', () => {
      const answers = {
        '1002': { value: ['brust'] },        // CRITICAL_ACS
        '1C14': { value: 'ja' },             // CRITICAL_SUIZID
      };
      const results = TriageEngine.evaluateForAtom('1002', answers, {});
      expect(results).toHaveLength(1);
      expect(results[0].atomId).toBe('1002');
    });
  });
});
