/**
 * @file QuestionFlowEngine.multiselect.test.ts
 * @description Multiselect-Tests für die QuestionFlowEngine
 *
 * Testet Multiselect-Parallelität:
 * - Mehrere Optionen mit followUpQuestions
 * - Zusammenführen aller Follow-ups
 * - Sortierung nach orderIndex
 * - Duplikat-Entfernung
 * - Leere Selektion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionFlowEngine, MedicalAtomData, SessionContext, AnswerData } from './QuestionFlowEngine';

// ─── Mock-Daten für Multiselect-Tests ─────────────────────────────────────

const defaultContext: SessionContext = {
  selectedService: 'Termin / Anamnese',
  isNewPatient: true,
  gender: 'M',
  age: 30
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('QuestionFlowEngine - Multiselect', () => {
  describe('Einzelne Selektionen', () => {
    it('sollte einzelne Option mit followUpQuestions zurückgeben', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-single',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-1', answerType: 'text', section: 'multiselect', orderIndex: 2 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-single', value: ['opt1'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-single', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['followup-1']);
    });

    it('sollte leeres Array für Option ohne followUpQuestions', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-no-followup',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1' }
          ],
          section: 'multiselect',
          orderIndex: 1
        }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-no-followup', value: ['opt1'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-no-followup', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte leeres Array für leere Selektion zurückgeben', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-empty',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-empty', value: [] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-empty', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });
  });

  describe('Mehrere Optionen - Zusammenführen', () => {
    it('sollte followUpQuestions von zwei Optionen zusammenführen', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-two',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-a'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['followup-b'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-a', answerType: 'text', section: 'multiselect', orderIndex: 2 },
        { id: 'followup-b', answerType: 'text', section: 'multiselect', orderIndex: 3 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-two', value: ['opt1', 'opt2'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-two', answer, defaultContext, allAnswers);
      
      expect(result).toContain('followup-a');
      expect(result).toContain('followup-b');
      expect(result).toHaveLength(2);
    });

    it('sollte followUpQuestions von drei Optionen zusammenführen', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-three',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['followup-2'] },
            { value: 'opt3', label: 'Option 3', followUpQuestions: ['followup-3'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-1', answerType: 'text', section: 'multiselect', orderIndex: 2 },
        { id: 'followup-2', answerType: 'text', section: 'multiselect', orderIndex: 3 },
        { id: 'followup-3', answerType: 'text', section: 'multiselect', orderIndex: 4 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-three', value: ['opt1', 'opt2', 'opt3'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-three', answer, defaultContext, allAnswers);
      
      expect(result).toContain('followup-1');
      expect(result).toContain('followup-2');
      expect(result).toContain('followup-3');
      expect(result).toHaveLength(3);
    });

    it('sollte nur followUpQuestions von selektierten Optionen zurückgeben', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-partial',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['followup-2'] },
            { value: 'opt3', label: 'Option 3', followUpQuestions: ['followup-3'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-1', answerType: 'text', section: 'multiselect', orderIndex: 2 },
        { id: 'followup-2', answerType: 'text', section: 'multiselect', orderIndex: 3 },
        { id: 'followup-3', answerType: 'text', section: 'multiselect', orderIndex: 4 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      // Nur opt1 und opt3 selektiert
      const answer: AnswerData = { atomId: 'multi-partial', value: ['opt1', 'opt3'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-partial', answer, defaultContext, allAnswers);
      
      expect(result).toContain('followup-1');
      expect(result).not.toContain('followup-2');
      expect(result).toContain('followup-3');
      expect(result).toHaveLength(2);
    });

    it('sollte Option ohne followUpQuestions überspringen', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-mixed',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] },
            { value: 'opt2', label: 'Option 2' }, // Keine followUpQuestions
            { value: 'opt3', label: 'Option 3', followUpQuestions: ['followup-3'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-1', answerType: 'text', section: 'multiselect', orderIndex: 2 },
        { id: 'followup-3', answerType: 'text', section: 'multiselect', orderIndex: 3 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-mixed', value: ['opt1', 'opt2', 'opt3'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-mixed', answer, defaultContext, allAnswers);
      
      expect(result).toContain('followup-1');
      expect(result).toContain('followup-3');
      expect(result).toHaveLength(2);
    });
  });

  describe('Sortierung nach orderIndex', () => {
    it('sollte nach aufsteigendem orderIndex sortieren', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-sort',
          answerType: 'multiselect',
          options: [
            { value: 'high', label: 'High', followUpQuestions: ['followup-high'] },
            { value: 'low', label: 'Low', followUpQuestions: ['followup-low'] },
            { value: 'mid', label: 'Mid', followUpQuestions: ['followup-mid'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-low', answerType: 'text', section: 'multiselect', orderIndex: 10 },
        { id: 'followup-mid', answerType: 'text', section: 'multiselect', orderIndex: 50 },
        { id: 'followup-high', answerType: 'text', section: 'multiselect', orderIndex: 100 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-sort', value: ['high', 'low', 'mid'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-sort', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['followup-low', 'followup-mid', 'followup-high']);
    });

    it('sollte bei gleichem orderIndex beide behalten', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-same-order',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['followup-2'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-1', answerType: 'text', section: 'multiselect', orderIndex: 5 },
        { id: 'followup-2', answerType: 'text', section: 'multiselect', orderIndex: 5 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-same-order', value: ['opt1', 'opt2'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-same-order', answer, defaultContext, allAnswers);
      
      expect(result).toHaveLength(2);
      expect(result).toContain('followup-1');
      expect(result).toContain('followup-2');
    });

    it('sollte mit fehlendem orderIndex (undefined) umgehen können', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-undefined-order',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['followup-2'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-1', answerType: 'text', section: 'multiselect', orderIndex: 0 },
        { id: 'followup-2', answerType: 'text', section: 'multiselect', orderIndex: 0 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-undefined-order', value: ['opt1', 'opt2'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-undefined-order', answer, defaultContext, allAnswers);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('Duplikat-Entfernung', () => {
    it('sollte Duplikate aus mehreren Optionen mit gleichem Follow-up entfernen', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-duplicate',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['common-followup'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['common-followup'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'common-followup', answerType: 'text', section: 'multiselect', orderIndex: 2 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-duplicate', value: ['opt1', 'opt2'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-duplicate', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['common-followup']);
    });

    it('sollte Duplikate aus drei Optionen mit teilweise gleichen Follow-ups entfernen', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-partial-duplicate',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-a', 'followup-common'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['followup-common'] },
            { value: 'opt3', label: 'Option 3', followUpQuestions: ['followup-b', 'followup-common'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'followup-a', answerType: 'text', section: 'multiselect', orderIndex: 2 },
        { id: 'followup-b', answerType: 'text', section: 'multiselect', orderIndex: 3 },
        { id: 'followup-common', answerType: 'text', section: 'multiselect', orderIndex: 4 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-partial-duplicate', value: ['opt1', 'opt2', 'opt3'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-partial-duplicate', answer, defaultContext, allAnswers);
      
      expect(result).toContain('followup-a');
      expect(result).toContain('followup-b');
      expect(result).toContain('followup-common');
      expect(result).toHaveLength(3);
    });

    it('sollte Duplikate bei mehreren Array-Follow-ups korrekt behandeln', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-array-dup',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['a', 'b', 'c'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['b', 'c', 'd'] },
            { value: 'opt3', label: 'Option 3', followUpQuestions: ['c', 'd', 'e'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        },
        { id: 'a', answerType: 'text', section: 'multiselect', orderIndex: 1 },
        { id: 'b', answerType: 'text', section: 'multiselect', orderIndex: 2 },
        { id: 'c', answerType: 'text', section: 'multiselect', orderIndex: 3 },
        { id: 'd', answerType: 'text', section: 'multiselect', orderIndex: 4 },
        { id: 'e', answerType: 'text', section: 'multiselect', orderIndex: 5 }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-array-dup', value: ['opt1', 'opt2', 'opt3'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-array-dup', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit undefined options umgehen können', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-no-options',
          answerType: 'multiselect',
          section: 'multiselect',
          orderIndex: 1
        }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-no-options', value: ['opt1'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-no-options', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte mit leerem options Array umgehen können', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-empty-options',
          answerType: 'multiselect',
          options: [],
          section: 'multiselect',
          orderIndex: 1
        }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-empty-options', value: ['opt1'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-empty-options', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte mit nicht-existentem Follow-up Atom umgehen können', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-missing-followup',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['nonexistent'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-missing-followup', value: ['opt1'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-missing-followup', answer, defaultContext, allAnswers);
      
      // Sollte den ID trotzdem zurückgeben (wird später validiert)
      expect(result).toEqual(['nonexistent']);
    });

    it('sollte mit undefined answer.value umgehen können', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-undefined-value',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        }
      ];
      const engine = new QuestionFlowEngine(atoms);
      const answer: AnswerData = { atomId: 'multi-undefined-value', value: undefined };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-undefined-value', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte mit nicht-Array answer.value umgehen können (Fallback)', () => {
      const atoms: MedicalAtomData[] = [
        {
          id: 'multi-string-value',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['followup-1'] }
          ],
          section: 'multiselect',
          orderIndex: 1
        }
      ];
      const engine = new QuestionFlowEngine(atoms);
      // Falsches Format für multiselect
      const answer: AnswerData = { atomId: 'multi-string-value', value: 'opt1' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-string-value', answer, defaultContext, allAnswers);
      
      // Da value kein Array ist, wird es nicht als multiselect behandelt
      expect(result).toEqual([]);
    });
  });
});
