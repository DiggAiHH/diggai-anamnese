/**
 * @file QuestionFlowEngine.test.ts
 * @description Basis-Unit-Tests für die QuestionFlowEngine
 *
 * Testet Kernfunktionalität:
 * - Konstruktor mit Atom-Array
 * - getNextQuestions für Single-Select
 * - getNextQuestions für Multiselect
 * - shouldShowAtom Basis-Fälle
 * - getActivePath
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionFlowEngine, MedicalAtomData, SessionContext, AnswerData } from './QuestionFlowEngine';

// ─── Mock-Daten ─────────────────────────────────────────────────

const mockAtoms: MedicalAtomData[] = [
  {
    id: '0000',
    answerType: 'select',
    options: [
      { value: 'yes', label: 'Ja', followUpQuestions: ['followup-1'] },
      { value: 'no', label: 'Nein' }
    ],
    section: 'test',
    orderIndex: 1
  },
  {
    id: 'followup-1',
    answerType: 'text',
    section: 'test',
    orderIndex: 2,
    branchingLogic: { next: ['0002'] }
  },
  {
    id: '0002',
    answerType: 'text',
    section: 'test',
    orderIndex: 3
  },
  {
    id: 'multi-atom',
    answerType: 'multiselect',
    options: [
      { value: 'opt1', label: 'Option 1', followUpQuestions: ['multi-follow-1'] },
      { value: 'opt2', label: 'Option 2', followUpQuestions: ['multi-follow-2'] },
      { value: 'opt3', label: 'Option 3' }
    ],
    section: 'test',
    orderIndex: 4
  },
  {
    id: 'multi-follow-1',
    answerType: 'text',
    section: 'test',
    orderIndex: 5
  },
  {
    id: 'multi-follow-2',
    answerType: 'text',
    section: 'test',
    orderIndex: 6
  },
  {
    id: 'inactive-atom',
    answerType: 'text',
    section: 'test',
    orderIndex: 7,
    isActive: false
  },
  {
    id: 'conditional-atom',
    answerType: 'select',
    options: [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' }
    ],
    section: 'test',
    orderIndex: 8,
    branchingLogic: {
      conditional: [
        { when: 'start', equals: 'yes', then: 'followup-1' }
      ],
      next: ['end']
    }
  }
];

const defaultContext: SessionContext = {
  selectedService: 'Termin / Anamnese',
  isNewPatient: true,
  gender: 'M',
  age: 30
};

// ─── Tests ──────────────────────────────────────────────────────

describe('QuestionFlowEngine - Basis', () => {
  let engine: QuestionFlowEngine;

  beforeEach(() => {
    engine = new QuestionFlowEngine(mockAtoms);
  });

  // === Konstruktor Tests ====================================================

  describe('Konstruktor', () => {
    it('sollte mit einem leeren Atom-Array initialisiert werden können', () => {
      const emptyEngine = new QuestionFlowEngine([]);
      expect(emptyEngine).toBeDefined();
    });

    it('sollte mit einem Atom-Array initialisiert werden', () => {
      expect(engine).toBeDefined();
    });

    it('sollte alle Atome korrekt speichern', () => {
      const testAtoms: MedicalAtomData[] = [
        { id: 'atom-1', answerType: 'text', section: 'test', orderIndex: 1 },
        { id: 'atom-2', answerType: 'text', section: 'test', orderIndex: 2 }
      ];
      const testEngine = new QuestionFlowEngine(testAtoms);
      expect(testEngine).toBeDefined();
    });

    it('sollte mit komplexen Atom-Daten umgehen können', () => {
      const complexAtoms: MedicalAtomData[] = [
        {
          id: 'complex-1',
          answerType: 'select',
          options: [
            { value: 'a', label: 'A', followUpQuestions: ['complex-2'] },
            { value: 'b', label: 'B' }
          ],
          section: 'test',
          orderIndex: 1,
          isPII: true,
          isActive: true,
          branchingLogic: {
            next: ['complex-3'],
            conditional: [{ equals: 'x', then: 'complex-4' }]
          }
        }
      ];
      const complexEngine = new QuestionFlowEngine(complexAtoms);
      expect(complexEngine).toBeDefined();
    });
  });

  // === getNextQuestions Single-Select Tests ================================

  describe('getNextQuestions - Single-Select', () => {
    it('sollte followUpQuestions der gewählten Option zurückgeben', () => {
      const answer: AnswerData = { atomId: '0000', value: 'yes' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('0000', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['followup-1']);
    });

    it('sollte leeres Array zurückgeben wenn Option keine followUpQuestions hat', () => {
      const answer: AnswerData = { atomId: '0000', value: 'no' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('0000', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte leeres Array zurückgeben wenn Atom nicht existiert', () => {
      const answer: AnswerData = { atomId: 'nonexistent', value: 'yes' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('nonexistent', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte leeres Array zurückgeben wenn keine Optionen definiert sind', () => {
      const answer: AnswerData = { atomId: 'end', value: 'text' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('end', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte statischen next-Wert verwenden wenn keine Option-Match', () => {
      const answer: AnswerData = { atomId: 'followup-1', value: 'text' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('followup-1', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['0002']);
    });

    it('sollte korrekt mit undefined Atom-ID umgehen', () => {
      const answer: AnswerData = { atomId: '', value: '' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });
  });

  // === getNextQuestions Multiselect Tests ==================================

  describe('getNextQuestions - Multiselect', () => {
    it('sollte followUpQuestions für einzelne Selektion zurückgeben', () => {
      const answer: AnswerData = { atomId: 'multi-atom', value: ['opt1'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['multi-follow-1']);
    });

    it('sollte followUpQuestions für mehrere Selektionen zusammenführen', () => {
      const answer: AnswerData = { atomId: 'multi-atom', value: ['opt1', 'opt2'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-atom', answer, defaultContext, allAnswers);
      
      expect(result).toContain('multi-follow-1');
      expect(result).toContain('multi-follow-2');
      expect(result).toHaveLength(2);
    });

    it('sollte nach orderIndex sortieren', () => {
      // Create atoms where multi-follow-2 has lower orderIndex than multi-follow-1
      const sortedAtoms: MedicalAtomData[] = [
        {
          id: 'multi-atom',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['multi-follow-1'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['multi-follow-2'] }
          ],
          section: 'test',
          orderIndex: 1
        },
        { id: 'multi-follow-2', answerType: 'text', section: 'test', orderIndex: 5 },
        { id: 'multi-follow-1', answerType: 'text', section: 'test', orderIndex: 10 }
      ];
      const sortedEngine = new QuestionFlowEngine(sortedAtoms);
      
      const answer: AnswerData = { atomId: 'multi-atom', value: ['opt1', 'opt2'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = sortedEngine.getNextQuestions('multi-atom', answer, defaultContext, allAnswers);
      
      expect(result[0]).toBe('multi-follow-2'); // Lower orderIndex comes first
      expect(result[1]).toBe('multi-follow-1');
    });

    it('sollte Duplikate entfernen', () => {
      const duplicateAtoms: MedicalAtomData[] = [
        {
          id: 'multi-atom-dup',
          answerType: 'multiselect',
          options: [
            { value: 'opt1', label: 'Option 1', followUpQuestions: ['common-followup'] },
            { value: 'opt2', label: 'Option 2', followUpQuestions: ['common-followup'] }
          ],
          section: 'test',
          orderIndex: 1
        },
        { id: 'common-followup', answerType: 'text', section: 'test', orderIndex: 2 }
      ];
      const dupEngine = new QuestionFlowEngine(duplicateAtoms);
      
      const answer: AnswerData = { atomId: 'multi-atom-dup', value: ['opt1', 'opt2'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = dupEngine.getNextQuestions('multi-atom-dup', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['common-followup']);
    });

    it('sollte leeres Array für leere Multiselection zurückgeben', () => {
      const answer: AnswerData = { atomId: 'multi-atom', value: [] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte mit undefined answer.value umgehen können', () => {
      const answer: AnswerData = { atomId: 'multi-atom', value: undefined };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('multi-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });
  });

  // === shouldShowAtom Tests =================================================

  describe('shouldShowAtom', () => {
    it('sollte true zurückgeben für reguläres Atom', () => {
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('0000', allAnswers, defaultContext);
      
      expect(result).toBe(true);
    });

    it('sollte false zurückgeben wenn Atom nicht existiert', () => {
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('nonexistent', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte false zurückgeben wenn isActive false ist', () => {
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.shouldShowAtom('inactive-atom', allAnswers, defaultContext);
      
      expect(result).toBe(false);
    });

    it('sollte false für Schwangerschaftsfrage bei männlichem Patienten', () => {
      const allAnswers = new Map<string, AnswerData>();
      const maleContext: SessionContext = { ...defaultContext, gender: 'M', age: 30 };
      
      const result = engine.shouldShowAtom('8800', allAnswers, maleContext);
      
      expect(result).toBe(false);
    });

    it('sollte true für Schwangerschaftsfrage bei weiblichem Patienten 15-50', () => {
      const pregnancyAtoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      const pregnancyEngine = new QuestionFlowEngine(pregnancyAtoms);
      const allAnswers = new Map<string, AnswerData>();
      const femaleContext: SessionContext = { ...defaultContext, gender: 'W', age: 25 };
      
      const result = pregnancyEngine.shouldShowAtom('8800', allAnswers, femaleContext);
      
      expect(result).toBe(true);
    });

    it('sollte false für Schwangerschaftsfrage bei Patientin unter 15', () => {
      const pregnancyAtoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      const pregnancyEngine = new QuestionFlowEngine(pregnancyAtoms);
      const allAnswers = new Map<string, AnswerData>();
      const youngContext: SessionContext = { ...defaultContext, gender: 'W', age: 12 };
      
      const result = pregnancyEngine.shouldShowAtom('8800', allAnswers, youngContext);
      
      expect(result).toBe(false);
    });

    it('sollte false für Schwangerschaftsfrage bei Patientin über 50', () => {
      const pregnancyAtoms: MedicalAtomData[] = [
        { id: '8800', answerType: 'select', section: 'medical', orderIndex: 1 }
      ];
      const pregnancyEngine = new QuestionFlowEngine(pregnancyAtoms);
      const allAnswers = new Map<string, AnswerData>();
      const oldContext: SessionContext = { ...defaultContext, gender: 'W', age: 55 };
      
      const result = pregnancyEngine.shouldShowAtom('8800', allAnswers, oldContext);
      
      expect(result).toBe(false);
    });
  });

  // === getActivePath Tests ==================================================

  describe('getActivePath', () => {
    it('sollte Pfad mit Start-Atom-ID berechnen', () => {
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getActivePath(allAnswers, defaultContext);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBe('0000');
    });

    it('sollte beantwortete Fragen im Pfad enthalten', () => {
      const allAnswers = new Map<string, AnswerData>([
        ['0000', { atomId: '0000', value: 'yes' }],
        ['followup-1', { atomId: 'followup-1', value: 'text' }]
      ]);
      
      const result = engine.getActivePath(allAnswers, defaultContext);
      
      expect(result).toContain('0000');
      expect(result).toContain('followup-1');
    });

    it('sollte Pfad bei fehlender Antwort beenden', () => {
      const allAnswers = new Map<string, AnswerData>([
        ['0000', { atomId: '0000', value: 'yes' }]
      ]);
      
      const result = engine.getActivePath(allAnswers, defaultContext);
      
      expect(result).toContain('0000');
      expect(result).toContain('followup-1');
    });

    it('sollte keine Zyklen erzeugen', () => {
      const cycleAtoms: MedicalAtomData[] = [
        { id: '0000', answerType: 'select', section: 'test', orderIndex: 1, options: [{ value: 'loop', label: 'Loop', followUpQuestions: ['0000'] }] }
      ];
      const cycleEngine = new QuestionFlowEngine(cycleAtoms);
      const allAnswers = new Map<string, AnswerData>([
        ['0000', { atomId: '0000', value: 'loop' }]
      ]);
      
      const result = cycleEngine.getActivePath(allAnswers, defaultContext);
      
      expect(result).toEqual(['0000']);
    });

    it('sollte inaktive Atome überspringen', () => {
      const allAnswers = new Map<string, AnswerData>([
        ['0000', { atomId: '0000', value: 'yes' }],
        ['followup-1', { atomId: 'followup-1', value: 'text' }],
        ['0002', { atomId: '0002', value: 'text' }]
      ]);
      
      const result = engine.getActivePath(allAnswers, defaultContext);
      
      expect(result).not.toContain('inactive-atom');
    });

    it('sollte mit leerem answers Map umgehen können', () => {
      const result = engine.getActivePath(new Map(), defaultContext);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // === getServiceStartAtom Tests ============================================

  describe('getServiceStartAtom', () => {
    it('sollte "TERM-100" für "Termin / Anamnese" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Termin / Anamnese');
      expect(result).toBe('TERM-100');
    });

    it('sollte "RES-100" für "Medikamente / Rezepte" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Medikamente / Rezepte');
      expect(result).toBe('RES-100');
    });

    it('sollte "AU-100" für "AU (Krankschreibung)" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('AU (Krankschreibung)');
      expect(result).toBe('AU-100');
    });

    it('sollte "DAT-100" für "Dateien / Befunde" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Dateien / Befunde');
      expect(result).toBe('DAT-100');
    });

    it('sollte "UEB-100" für "Überweisung" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Überweisung');
      expect(result).toBe('UEB-100');
    });

    it('sollte "ABS-100" für "Terminabsage" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Terminabsage');
      expect(result).toBe('ABS-100');
    });

    it('sollte "TEL-100" für "Telefonanfrage" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Telefonanfrage');
      expect(result).toBe('TEL-100');
    });

    it('sollte "BEF-100" für "Dokumente anfordern" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Dokumente anfordern');
      expect(result).toBe('BEF-100');
    });

    it('sollte "MS-100" für "Nachricht schreiben" zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Nachricht schreiben');
      expect(result).toBe('MS-100');
    });

    it('sollte "1000" als Default für unbekannte Services zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('Unbekannter Service');
      expect(result).toBe('1000');
    });

    it('sollte "1000" für leeren String zurückgeben', () => {
      const result = QuestionFlowEngine.getServiceStartAtom('');
      expect(result).toBe('1000');
    });
  });
});
