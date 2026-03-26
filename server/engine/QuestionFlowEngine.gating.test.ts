/**
 * @file QuestionFlowEngine.gating.test.ts
 * @description Gating-Tests für die QuestionFlowEngine
 *
 * Testet Gender/Alter-Gating:
 * - showIf Bedingungen (equals, notEquals, contains, greaterThan, lessThan)
 * - Schwangerschafts-Frage (8800) nur für W 15-50
 * - isActive Flag
 * - Kombinierte Bedingungen
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionFlowEngine, MedicalAtomData, SessionContext, AnswerData } from './QuestionFlowEngine';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('QuestionFlowEngine - Gating', () => {
  let engine: QuestionFlowEngine;
  let defaultContext: SessionContext;

  beforeEach(() => {
    defaultContext = {
      selectedService: 'Termin / Anamnese',
      isNewPatient: true,
      gender: 'M',
      age: 30
    };
  });

  // === showIf - equals ======================================================

  describe('showIf - equals Operator', () => {
    it('sollte Atom anzeigen wenn equals-Bedingung erfüllt ist', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-equals',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'equals', value: 'yes' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 'yes' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-equals', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte Atom verbergen wenn equals-Bedingung nicht erfüllt ist', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-equals-false',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'equals', value: 'yes' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 'no' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-equals-false', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte Atom verbergen wenn Referenz-Antwort fehlt', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-equals-missing',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'equals', value: 'yes' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('gated-equals-missing', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte mit number-Werten im equals arbeiten', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-equals-number',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'equals', value: 42 }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 42 }]
      ]);
      
      const result = engine.shouldShowAtom('gated-equals-number', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });
  });

  // === showIf - notEquals ===================================================

  describe('showIf - notEquals Operator', () => {
    it('sollte Atom anzeigen wenn notEquals-Bedingung erfüllt ist', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-notequals',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'notEquals', value: 'no' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 'yes' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-notequals', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte Atom verbergen wenn notEquals-Bedingung nicht erfüllt ist', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-notequals-false',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'notEquals', value: 'no' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 'no' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-notequals-false', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });
  });

  // === showIf - contains ====================================================

  describe('showIf - contains Operator', () => {
    it('sollte Atom anzeigen wenn Array den Wert enthält', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-contains',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'contains', value: 'b' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: ['a', 'b', 'c'] }]
      ]);
      
      const result = engine.shouldShowAtom('gated-contains', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte Atom verbergen wenn Array den Wert nicht enthält', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-contains-false',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'contains', value: 'd' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: ['a', 'b', 'c'] }]
      ]);
      
      const result = engine.shouldShowAtom('gated-contains-false', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte contains auf String anwenden', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-contains-string',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'contains', value: 'test' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 'this is a test string' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-contains-string', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte false zurückgeben wenn String den Wert nicht enthält', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-contains-string-false',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'contains', value: 'xyz' }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 'this is a test string' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-contains-string-false', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });
  });

  // === showIf - greaterThan =================================================

  describe('showIf - greaterThan Operator', () => {
    it('sollte Atom anzeigen wenn Wert größer als Threshold', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-gt',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'greaterThan', value: 18 }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 25 }]
      ]);
      
      const result = engine.shouldShowAtom('gated-gt', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte Atom verbergen wenn Wert kleiner als Threshold', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-gt-false',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'greaterThan', value: 18 }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 15 }]
      ]);
      
      const result = engine.shouldShowAtom('gated-gt-false', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte Atom verbergen wenn Wert gleich Threshold (nicht größer)', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-gt-equal',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'greaterThan', value: 18 }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 18 }]
      ]);
      
      const result = engine.shouldShowAtom('gated-gt-equal', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte mit String-Number Konvertierung arbeiten', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-gt-string',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'greaterThan', value: 10 }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: '20' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-gt-string', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });
  });

  // === showIf - lessThan ====================================================

  describe('showIf - lessThan Operator', () => {
    it('sollte Atom anzeigen wenn Wert kleiner als Threshold', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-lt',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'lessThan', value: 65 }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 30 }]
      ]);
      
      const result = engine.shouldShowAtom('gated-lt', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte Atom verbergen wenn Wert größer als Threshold', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-lt-false',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'lessThan', value: 65 }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 70 }]
      ]);
      
      const result = engine.shouldShowAtom('gated-lt-false', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte Atom verbergen wenn Wert gleich Threshold (nicht kleiner)', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-lt-equal',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [{ questionId: 'trigger', operator: 'lessThan', value: 65 }]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger', { atomId: 'trigger', value: 65 }]
      ]);
      
      const result = engine.shouldShowAtom('gated-lt-equal', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });
  });

  // === Kombinierte Bedingungen ==============================================

  describe('Kombinierte showIf Bedingungen', () => {
    it('sollte Atom anzeigen wenn alle Bedingungen erfüllt sind (AND-Logik)', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-combined',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [
              { questionId: 'trigger1', operator: 'equals', value: 'yes' },
              { questionId: 'trigger2', operator: 'equals', value: 'confirmed' }
            ]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger1', { atomId: 'trigger1', value: 'yes' }],
        ['trigger2', { atomId: 'trigger2', value: 'confirmed' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-combined', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte Atom verbergen wenn eine Bedingung nicht erfüllt ist', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-combined-partial',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [
              { questionId: 'trigger1', operator: 'equals', value: 'yes' },
              { questionId: 'trigger2', operator: 'equals', value: 'confirmed' }
            ]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['trigger1', { atomId: 'trigger1', value: 'yes' }],
        ['trigger2', { atomId: 'trigger2', value: 'rejected' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-combined-partial', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte mit drei Bedingungen arbeiten', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'gated-triple',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          branchingLogic: {
            showIf: [
              { questionId: 'a', operator: 'equals', value: '1' },
              { questionId: 'b', operator: 'equals', value: '2' },
              { questionId: 'c', operator: 'equals', value: '3' }
            ]
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>([
        ['a', { atomId: 'a', value: '1' }],
        ['b', { atomId: 'b', value: '2' }],
        ['c', { atomId: 'c', value: '3' }]
      ]);
      
      const result = engine.shouldShowAtom('gated-triple', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });
  });

  // === Schwangerschaftsfrage (8800) =========================================

  describe('Schwangerschaftsfrage (8800)', () => {
    it('sollte für weibliche Patientin (W) im Alter 15-50 anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: 'W', age: 25 };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(true);
    });

    it('sollte für weibliche Patientin (W) genau 15 Jahre alt anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: 'W', age: 15 };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(true);
    });

    it('sollte für weibliche Patientin (W) genau 50 Jahre alt anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: 'W', age: 50 };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(true);
    });

    it('sollte für männliche Patienten (M) nicht anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: 'M', age: 30 };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(false);
    });

    it('sollte für diverse Patienten (D) nicht anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: 'D', age: 30 };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(false);
    });

    it('sollte für weibliche Patientin unter 15 nicht anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: 'W', age: 14 };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(false);
    });

    it('sollte für weibliche Patientin über 50 nicht anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: 'W', age: 51 };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(false);
    });

    it('sollte bei fehlendem Alter (undefined) nicht anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: 'W', age: undefined };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(false);
    });

    it('sollte bei fehlendem Gender (undefined) nicht anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const context: SessionContext = { ...defaultContext, gender: undefined, age: 25 };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('8800', allAnswers, context);
      
      expect(result).toBe(false);
    });
  });

  // === isActive Flag ========================================================

  describe('isActive Flag', () => {
    it('sollte Atom mit isActive=true anzeigen', () => {
      const atoms: MedicalAtomData[] = [
        { id: 'active-atom', answerType: 'text', section: 'gating', orderIndex: 1, isActive: true }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('active-atom', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte Atom mit isActive=false verbergen', () => {
      const atoms: MedicalAtomData[] = [
        { id: 'inactive-atom', answerType: 'text', section: 'gating', orderIndex: 1, isActive: false }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('inactive-atom', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte Atom ohne isActive-Flag anzeigen (Default true)', () => {
      const atoms: MedicalAtomData[] = [
        { id: 'default-atom', answerType: 'text', section: 'gating', orderIndex: 1 }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('default-atom', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte isActive über showIf priorisieren', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'inactive-over-showif',
          answerType: 'text',
          section: 'gating',
          orderIndex: 1,
          isActive: false,
          branchingLogic: {
            showIf: [] // Leere showIf = sollte normalerweise anzeigen
          }
        }
      ];
      engine = new QuestionFlowEngine(atoms);
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('inactive-over-showif', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });
  });
});
