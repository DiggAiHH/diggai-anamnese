/**
 * @file TriageEngine.critical.test.ts
 * @description Comprehensive tests for CRITICAL Triage Rules
 *
 * CRITICAL rules stop the questionnaire and trigger immediate alerts to medical staff.
 * These tests ensure all critical patient conditions are properly detected.
 */

import { describe, it, expect } from 'vitest';
import { TriageEngine } from './TriageEngine';

describe('TriageEngine - CRITICAL Rules', () => {
  // ═══════════════════════════════════════════════════════════
  // CRITICAL_ACS - Acute Coronary Syndrome (Brustschmerzen, Atemnot, Lähmung)
  // ═══════════════════════════════════════════════════════════
  describe('CRITICAL_ACS - Akutes Koronarsyndrom', () => {
    it('should trigger on chest pain (brust) as single value', () => {
      const answers = { '1002': { value: 'brust' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeDefined();
      expect(acs!.triggerValues).toContain('brust');
      expect(acs!.message).toContain('Brustschmerzen');
    });

    it('should trigger on breathing difficulty (atemnot) as single value', () => {
      const answers = { '1002': { value: 'atemnot' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeDefined();
      expect(acs!.triggerValues).toContain('atemnot');
    });

    it('should trigger on paralysis (laehmung) as single value', () => {
      const answers = { '1002': { value: 'laehmung' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeDefined();
      expect(acs!.triggerValues).toContain('laehmung');
    });

    it('should trigger on all three symptoms in array', () => {
      const answers = { '1002': { value: ['brust', 'atemnot', 'laehmung'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeDefined();
      expect(acs!.triggerValues).toHaveLength(3);
      expect(acs!.triggerValues).toContain('brust');
      expect(acs!.triggerValues).toContain('atemnot');
      expect(acs!.triggerValues).toContain('laehmung');
    });

    it('should trigger when trigger is mixed with non-trigger values', () => {
      const answers = { '1002': { value: ['kopfschmerzen', 'brust', 'müdigkeit'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeDefined();
      expect(acs!.triggerValues).toContain('brust');
      expect(acs!.triggerValues).not.toContain('kopfschmerzen');
      expect(acs!.triggerValues).not.toContain('müdigkeit');
    });

    it('should NOT trigger on harmless symptoms only', () => {
      const answers = { '1002': { value: ['kopfschmerzen', 'müdigkeit', 'schwindel'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeUndefined();
    });

    it('should NOT trigger on empty array', () => {
      const answers = { '1002': { value: [] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeUndefined();
    });

    it('should NOT trigger on empty string', () => {
      const answers = { '1002': { value: '' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeUndefined();
    });

    it('should NOT trigger when answer is null', () => {
      const answers = { '1002': { value: null } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeUndefined();
    });

    it('should NOT trigger when answer is undefined', () => {
      const answers = { '1002': { value: undefined } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeUndefined();
    });

    it('should NOT trigger when question not answered', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeUndefined();
    });

    it('should trigger on two symptoms combined', () => {
      const answers = { '1002': { value: ['brust', 'atemnot'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const acs = results.find(r => r.atomId === '1002' && r.level === 'CRITICAL');
      expect(acs).toBeDefined();
      expect(acs!.triggerValues).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CRITICAL_SUIZID - Suizidalität Screening
  // ═══════════════════════════════════════════════════════════
  describe('CRITICAL_SUIZID - Suizidalitäts-Screening', () => {
    it('should trigger on "ja" string value', () => {
      const answers = { '1C14': { value: 'ja' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeDefined();
      expect(suizid!.level).toBe('CRITICAL');
      expect(suizid!.triggerValues).toBe('ja');
      expect(suizid!.message).toContain('Selbstverletzung');
      expect(suizid!.message).toContain('Telefonseelsorge');
    });

    it('should trigger on boolean true', () => {
      const answers = { '1C14': { value: true } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeDefined();
      expect(suizid!.level).toBe('CRITICAL');
      expect(suizid!.triggerValues).toBe(true);
    });

    it('should NOT trigger on "nein" string value', () => {
      const answers = { '1C14': { value: 'nein' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeUndefined();
    });

    it('should NOT trigger on boolean false', () => {
      const answers = { '1C14': { value: false } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeUndefined();
    });

    it('should NOT trigger on "vielleicht" string value', () => {
      const answers = { '1C14': { value: 'vielleicht' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeUndefined();
    });

    it('should NOT trigger on empty string', () => {
      const answers = { '1C14': { value: '' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeUndefined();
    });

    it('should NOT trigger when answer is null', () => {
      const answers = { '1C14': { value: null } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeUndefined();
    });

    it('should NOT trigger when answer is undefined', () => {
      const answers = { '1C14': { value: undefined } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeUndefined();
    });

    it('should NOT trigger when question not answered', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      expect(suizid).toBeUndefined();
    });

    it('should NOT trigger on array values (invalid input)', () => {
      const answers = { '1C14': { value: ['ja'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const suizid = results.find(r => r.atomId === '1C14');
      // Array 'ja' is not equal to 'ja' string, so should not trigger
      expect(suizid).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CRITICAL_SAH - Subarachnoidalblutung (Donnerschlag-Kopfschmerz)
  // ═══════════════════════════════════════════════════════════
  describe('CRITICAL_SAH - Subarachnoidalblutung', () => {
    it('should trigger on donnerschlag as single value', () => {
      const answers = { '1181': { value: 'donnerschlag' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeDefined();
      expect(sah!.level).toBe('CRITICAL');
      expect(sah!.triggerValues).toContain('donnerschlag');
      expect(sah!.message).toContain('Subarachnoidalblutung');
      expect(sah!.message).toContain('Notruf 112');
    });

    it('should trigger on donnerschlag in array', () => {
      const answers = { '1181': { value: ['donnerschlag', 'kopfschmerzen'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeDefined();
      expect(sah!.level).toBe('CRITICAL');
    });

    it('should NOT trigger on regular headache', () => {
      const answers = { '1181': { value: ['kopfschmerzen', 'migräne'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeUndefined();
    });

    it('should NOT trigger on empty array', () => {
      const answers = { '1181': { value: [] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeUndefined();
    });

    it('should NOT trigger on empty string', () => {
      const answers = { '1181': { value: '' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeUndefined();
    });

    it('should NOT trigger when answer is null', () => {
      const answers = { '1181': { value: null } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeUndefined();
    });

    it('should NOT trigger when answer is undefined', () => {
      const answers = { '1181': { value: undefined } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeUndefined();
    });

    it('should NOT trigger when question not answered', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeUndefined();
    });

    it('should NOT trigger on similar but different values', () => {
      const answers = { '1181': { value: ['donnerschlagartig', 'donner', 'gewitter'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const sah = results.find(r => r.atomId === '1181');
      expect(sah).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CRITICAL_SYNCOPE - Bewusstseinsverlust / Synkope
  // ═══════════════════════════════════════════════════════════
  describe('CRITICAL_SYNCOPE - Bewusstseinsverlust', () => {
    it('should trigger on bewusstlosigkeit as single value', () => {
      const answers = { '1185': { value: 'bewusstlosigkeit' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeDefined();
      expect(syncope!.level).toBe('CRITICAL');
      expect(syncope!.triggerValues).toContain('bewusstlosigkeit');
      expect(syncope!.message).toContain('Bewusstseinsverlust');
    });

    it('should trigger on bewusstseinsverlust as single value', () => {
      const answers = { '1185': { value: 'bewusstseinsverlust' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeDefined();
      expect(syncope!.level).toBe('CRITICAL');
      expect(syncope!.triggerValues).toContain('bewusstseinsverlust');
    });

    it('should trigger on both bewusstlosigkeit and bewusstseinsverlust in array', () => {
      const answers = { '1185': { value: ['bewusstlosigkeit', 'bewusstseinsverlust'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeDefined();
      expect(syncope!.triggerValues).toContain('bewusstlosigkeit');
      expect(syncope!.triggerValues).toContain('bewusstseinsverlust');
    });

    it('should trigger when mixed with other symptoms', () => {
      const answers = { '1185': { value: ['schwindel', 'bewusstlosigkeit', 'müdigkeit'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeDefined();
      expect(syncope!.triggerValues).toContain('bewusstlosigkeit');
    });

    it('should NOT trigger on schwindel only', () => {
      const answers = { '1185': { value: ['schwindel', 'müdigkeit'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeUndefined();
    });

    it('should NOT trigger on empty array', () => {
      const answers = { '1185': { value: [] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeUndefined();
    });

    it('should NOT trigger on empty string', () => {
      const answers = { '1185': { value: '' } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeUndefined();
    });

    it('should NOT trigger when answer is null', () => {
      const answers = { '1185': { value: null } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeUndefined();
    });

    it('should NOT trigger when answer is undefined', () => {
      const answers = { '1185': { value: undefined } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeUndefined();
    });

    it('should NOT trigger when question not answered', () => {
      const answers = {};
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeUndefined();
    });

    it('should NOT trigger on similar but different values', () => {
      const answers = { '1185': { value: ['bewusst', 'los', 'ohnmächtig'] } };
      const results = TriageEngine.evaluateAll(answers, {});
      const syncope = results.find(r => r.atomId === '1185');
      expect(syncope).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // General CRITICAL rule validation
  // ═══════════════════════════════════════════════════════════
  describe('General CRITICAL Rules Validation', () => {
    it('should have at least 4 CRITICAL rules registered', () => {
      const ids = TriageEngine.getRuleIds();
      const criticalIds = ids.filter(id => id.startsWith('CRITICAL_'));
      expect(criticalIds.length).toBeGreaterThanOrEqual(4);
      expect(criticalIds).toContain('CRITICAL_ACS');
      expect(criticalIds).toContain('CRITICAL_SUIZID');
      expect(criticalIds).toContain('CRITICAL_SAH');
      expect(criticalIds).toContain('CRITICAL_SYNCOPE');
    });

    it('should include CRITICAL in message for all critical alerts', () => {
      const answers = {
        '1002': { value: 'brust' },
        '1C14': { value: 'ja' },
      };
      const results = TriageEngine.evaluateAll(answers, {});
      expect(results).toHaveLength(2);
      results.forEach(r => {
        expect(r.level).toBe('CRITICAL');
        expect(r.message.toLowerCase()).toMatch(/(achtung|wichtig)/);
      });
    });

    it('should return correct structure for all critical results', () => {
      const answers = { '1002': { value: 'brust' } };
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
