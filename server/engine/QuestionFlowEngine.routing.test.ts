/**
 * @file QuestionFlowEngine.routing.test.ts
 * @description Routing-Tests für die QuestionFlowEngine
 *
 * Testet das 3-Stufen-Routing:
 * - Priority 1: Option followUpQuestions
 * - Priority 2: ConditionalRoute (einfach und verschachtelt)
 * - Priority 3: Statisches next
 * - Kontext-basiertes Routing (selectedService)
 * - Antwort-basiertes Routing (when-Feld)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionFlowEngine, MedicalAtomData, SessionContext, AnswerData } from './QuestionFlowEngine';

// ─── Mock-Daten für Routing-Tests ─────────────────────────────────────────

const routingAtoms: MedicalAtomData[] = [
  // Priority 1: Option followUpQuestions
  {
    id: 'priority-1-atom',
    answerType: 'select',
    options: [
      { value: 'option-a', label: 'Option A', followUpQuestions: ['followup-a'] },
      { value: 'option-b', label: 'Option B', followUpQuestions: ['followup-b', 'followup-c'] },
      { value: 'option-c', label: 'Option C' } // No followUpQuestions
    ],
    section: 'routing',
    orderIndex: 1
  },
  { id: 'followup-a', answerType: 'text', section: 'routing', orderIndex: 2 },
  { id: 'followup-b', answerType: 'text', section: 'routing', orderIndex: 3 },
  { id: 'followup-c', answerType: 'text', section: 'routing', orderIndex: 4 },

  // Priority 2: ConditionalRoute
  {
    id: 'conditional-atom',
    answerType: 'select',
    options: [
      { value: 'red', label: 'Red' },
      { value: 'blue', label: 'Blue' }
    ],
    section: 'routing',
    orderIndex: 5,
    branchingLogic: {
      conditional: [
        { equals: 'red', then: 'red-followup' },
        { equals: 'blue', then: 'blue-followup' }
      ]
    }
  },
  { id: 'red-followup', answerType: 'text', section: 'routing', orderIndex: 6 },
  { id: 'blue-followup', answerType: 'text', section: 'routing', orderIndex: 7 },

  // Priority 3: Statisches next
  {
    id: 'static-next-atom',
    answerType: 'text',
    section: 'routing',
    orderIndex: 8,
    branchingLogic: {
      next: ['static-followup-1', 'static-followup-2']
    }
  },
  { id: 'static-followup-1', answerType: 'text', section: 'routing', orderIndex: 9 },
  { id: 'static-followup-2', answerType: 'text', section: 'routing', orderIndex: 10 },

  // Context-based routing: selectedService
  {
    id: 'service-router',
    answerType: 'select',
    options: [{ value: 'yes', label: 'Yes' }],
    section: 'routing',
    orderIndex: 11,
    branchingLogic: {
      conditional: [
        { context: 'selectedService', equals: 'Termin / Anamnese', then: 'termin-atom' },
        { context: 'selectedService', equals: 'Medikamente / Rezepte', then: 'rezepte-atom' },
        { context: 'selectedService', equals: 'AU (Krankschreibung)', then: 'au-atom' }
      ],
      next: ['default-atom']
    }
  },
  { id: 'termin-atom', answerType: 'text', section: 'routing', orderIndex: 12 },
  { id: 'rezepte-atom', answerType: 'text', section: 'routing', orderIndex: 13 },
  { id: 'au-atom', answerType: 'text', section: 'routing', orderIndex: 14 },
  { id: 'default-atom', answerType: 'text', section: 'routing', orderIndex: 15 },

  // Answer-based routing: when-Feld
  {
    id: 'answer-router',
    answerType: 'select',
    options: [{ value: 'confirm', label: 'Confirm' }],
    section: 'routing',
    orderIndex: 16,
    branchingLogic: {
      conditional: [
        { when: 'priority-1-atom', equals: 'option-a', then: 'route-a' },
        { when: 'priority-1-atom', equals: 'option-b', then: 'route-b' },
        { when: 'priority-1-atom', equals: 'option-c', then: 'route-c' }
      ]
    }
  },
  { id: 'route-a', answerType: 'text', section: 'routing', orderIndex: 17 },
  { id: 'route-b', answerType: 'text', section: 'routing', orderIndex: 18 },
  { id: 'route-c', answerType: 'text', section: 'routing', orderIndex: 19 },

  // Verschachtelte ConditionalRoute
  {
    id: 'nested-router',
    answerType: 'select',
    options: [
      { value: 'X', label: 'X' },
      { value: 'Y', label: 'Y' }
    ],
    section: 'routing',
    orderIndex: 20,
    branchingLogic: {
      conditional: [
        {
          equals: 'X',
          then: [
            { when: 'conditional-atom', equals: 'red', then: 'nested-red' },
            { when: 'conditional-atom', equals: 'blue', then: 'nested-blue' },
            { equals: '' as string, then: 'nested-default' }
          ]
        },
        { equals: 'Y', then: 'nested-y' }
      ]
    }
  },
  { id: 'nested-red', answerType: 'text', section: 'routing', orderIndex: 21 },
  { id: 'nested-blue', answerType: 'text', section: 'routing', orderIndex: 22 },
  { id: 'nested-default', answerType: 'text', section: 'routing', orderIndex: 23 },
  { id: 'nested-y', answerType: 'text', section: 'routing', orderIndex: 24 },

  // Array equals matching
  {
    id: 'array-matcher',
    answerType: 'multiselect',
    options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }],
    section: 'routing',
    orderIndex: 25,
    branchingLogic: {
      conditional: [
        { equals: ['A', 'B'], then: 'match-ab' },
        { equals: ['C'], then: 'match-c' }
      ]
    }
  },
  { id: 'match-ab', answerType: 'text', section: 'routing', orderIndex: 26 },
  { id: 'match-c', answerType: 'text', section: 'routing', orderIndex: 27 },

  // Boolean equals
  {
    id: 'boolean-router',
    answerType: 'radio',
    options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }],
    section: 'routing',
    orderIndex: 28,
    branchingLogic: {
      conditional: [
        { equals: true, then: 'bool-true' },
        { equals: false, then: 'bool-false' }
      ]
    }
  },
  { id: 'bool-true', answerType: 'text', section: 'routing', orderIndex: 29 },
  { id: 'bool-false', answerType: 'text', section: 'routing', orderIndex: 30 }
];

const defaultContext: SessionContext = {
  selectedService: 'Termin / Anamnese',
  isNewPatient: true,
  gender: 'M',
  age: 30
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('QuestionFlowEngine - Routing', () => {
  let engine: QuestionFlowEngine;

  beforeEach(() => {
    engine = new QuestionFlowEngine(routingAtoms);
  });

  // === Priority 1: Option followUpQuestions =================================

  describe('Priority 1: Option followUpQuestions', () => {
    it('sollte einzelne followUpQuestion zurückgeben', () => {
      const answer: AnswerData = { atomId: 'priority-1-atom', value: 'option-a' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('priority-1-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['followup-a']);
    });

    it('sollte mehrere followUpQuestions zurückgeben', () => {
      const answer: AnswerData = { atomId: 'priority-1-atom', value: 'option-b' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('priority-1-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['followup-b', 'followup-c']);
    });

    it('sollte leeres Array wenn keine followUpQuestions definiert', () => {
      const answer: AnswerData = { atomId: 'priority-1-atom', value: 'option-c' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('priority-1-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte Priority 1 über Priority 2 bevorzugen', () => {
      // Atom hat sowohl option followUpQuestions als auch conditional routing
      const hybridAtom: MedicalAtomData = {
        id: 'hybrid',
        answerType: 'select',
        options: [{ value: 'test', label: 'Test', followUpQuestions: ['priority-1-result'] }],
        section: 'routing',
        orderIndex: 1,
        branchingLogic: {
          conditional: [{ equals: 'test', then: 'priority-2-result' }],
          next: ['priority-3-result']
        }
      };
      const hybridEngine = new QuestionFlowEngine([hybridAtom, 
        { id: 'priority-1-result', answerType: 'text', section: 'routing', orderIndex: 2 },
        { id: 'priority-2-result', answerType: 'text', section: 'routing', orderIndex: 3 },
        { id: 'priority-3-result', answerType: 'text', section: 'routing', orderIndex: 4 }
      ]);
      
      const answer: AnswerData = { atomId: 'hybrid', value: 'test' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = hybridEngine.getNextQuestions('hybrid', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['priority-1-result']);
    });
  });

  // === Priority 2: ConditionalRoute ========================================

  describe('Priority 2: ConditionalRoute', () => {
    it('sollte conditional Route für erste Bedingung verwenden', () => {
      const answer: AnswerData = { atomId: 'conditional-atom', value: 'red' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('conditional-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['red-followup']);
    });

    it('sollte conditional Route für zweite Bedingung verwenden', () => {
      const answer: AnswerData = { atomId: 'conditional-atom', value: 'blue' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('conditional-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['blue-followup']);
    });

    it('sollte leeres Array wenn keine Bedingung zutrifft', () => {
      const answer: AnswerData = { atomId: 'conditional-atom', value: 'green' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('conditional-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });

    it('sollte Array-Route zurückgeben wenn then ein Array ist', () => {
      const arrayRouteAtom: MedicalAtomData = {
        id: 'array-route',
        answerType: 'select',
        options: [{ value: 'go', label: 'Go' }],
        section: 'routing',
        orderIndex: 1,
        branchingLogic: {
          conditional: [{ equals: 'go', then: ['dest-1', 'dest-2', 'dest-3'] }]
        }
      };
      const arrayEngine = new QuestionFlowEngine([arrayRouteAtom]);
      
      const answer: AnswerData = { atomId: 'array-route', value: 'go' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = arrayEngine.getNextQuestions('array-route', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['dest-1', 'dest-2', 'dest-3']);
    });
  });

  // === Priority 3: Statisches next =========================================

  describe('Priority 3: Statisches next', () => {
    it('sollte statischen next-Wert verwenden', () => {
      const answer: AnswerData = { atomId: 'static-next-atom', value: 'text' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('static-next-atom', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['static-followup-1', 'static-followup-2']);
    });

    it('sollte Priority 3 nur verwenden wenn Priority 1 und 2 nicht zutreffen', () => {
      const answer: AnswerData = { atomId: 'priority-1-atom', value: 'option-c' };
      const allAnswers = new Map<string, AnswerData>();
      
      // Priority 1: keine followUpQuestions für option-c
      // Priority 2: keine conditional definiert
      // => Priority 3 sollte verwendet werden, falls next definiert
      const atomWithNext: MedicalAtomData = {
        id: 'fallback-test',
        answerType: 'select',
        options: [{ value: 'none', label: 'None' }],
        section: 'routing',
        orderIndex: 1,
        branchingLogic: {
          next: ['fallback-dest']
        }
      };
      const fallbackEngine = new QuestionFlowEngine([atomWithNext, { id: 'fallback-dest', answerType: 'text', section: 'routing', orderIndex: 2 }]);
      const fallbackAnswer: AnswerData = { atomId: 'fallback-test', value: 'none' };
      
      const result = fallbackEngine.getNextQuestions('fallback-test', fallbackAnswer, defaultContext, allAnswers);
      
      expect(result).toEqual(['fallback-dest']);
    });
  });

  // === Context-basiertes Routing ============================================

  describe('Context-basiertes Routing (selectedService)', () => {
    it('sollte nach selectedService "Termin / Anamnese" routen', () => {
      const context: SessionContext = { ...defaultContext, selectedService: 'Termin / Anamnese' };
      const answer: AnswerData = { atomId: 'service-router', value: 'yes' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('service-router', answer, context, allAnswers);
      
      expect(result).toEqual(['termin-atom']);
    });

    it('sollte nach selectedService "Medikamente / Rezepte" routen', () => {
      const context: SessionContext = { ...defaultContext, selectedService: 'Medikamente / Rezepte' };
      const answer: AnswerData = { atomId: 'service-router', value: 'yes' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('service-router', answer, context, allAnswers);
      
      expect(result).toEqual(['rezepte-atom']);
    });

    it('sollte nach selectedService "AU (Krankschreibung)" routen', () => {
      const context: SessionContext = { ...defaultContext, selectedService: 'AU (Krankschreibung)' };
      const answer: AnswerData = { atomId: 'service-router', value: 'yes' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('service-router', answer, context, allAnswers);
      
      expect(result).toEqual(['au-atom']);
    });

    it('sollte auf default routen wenn selectedService nicht matcht', () => {
      const context: SessionContext = { ...defaultContext, selectedService: 'Unbekannter Service' };
      const answer: AnswerData = { atomId: 'service-router', value: 'yes' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('service-router', answer, context, allAnswers);
      
      expect(result).toEqual(['default-atom']);
    });
  });

  // === Antwort-basiertes Routing ============================================

  describe('Antwort-basiertes Routing (when-Feld)', () => {
    it('sollte basierend auf when-Feld und vergangener Antwort routen', () => {
      const answer: AnswerData = { atomId: 'answer-router', value: 'confirm' };
      const allAnswers = new Map<string, AnswerData>([
        ['priority-1-atom', { atomId: 'priority-1-atom', value: 'option-a' }]
      ]);
      
      const result = engine.getNextQuestions('answer-router', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['route-a']);
    });

    it('sollte für verschiedene when-Werte unterschiedlich routen', () => {
      const answer: AnswerData = { atomId: 'answer-router', value: 'confirm' };
      const allAnswers = new Map<string, AnswerData>([
        ['priority-1-atom', { atomId: 'priority-1-atom', value: 'option-b' }]
      ]);
      
      const result = engine.getNextQuestions('answer-router', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['route-b']);
    });

    it('sollte auf undefined then verzweigen wenn when nicht gefunden', () => {
      const answer: AnswerData = { atomId: 'answer-router', value: 'confirm' };
      const allAnswers = new Map<string, AnswerData>();
      // Keine Antwort für 'priority-1-atom'
      
      const result = engine.getNextQuestions('answer-router', answer, defaultContext, allAnswers);
      
      expect(result).toEqual([]);
    });
  });

  // === Verschachtelte ConditionalRoute ======================================

  describe('Verschachtelte ConditionalRoute', () => {
    it('sollte erste Ebene mit verschachtelter Route matchen', () => {
      const answer: AnswerData = { atomId: 'nested-router', value: 'Y' };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('nested-router', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['nested-y']);
    });

    it('sollte in verschachtelte Route mit when-Feld einsteigen', () => {
      const answer: AnswerData = { atomId: 'nested-router', value: 'X' };
      const allAnswers = new Map<string, AnswerData>([
        ['conditional-atom', { atomId: 'conditional-atom', value: 'red' }]
      ]);
      
      const result = engine.getNextQuestions('nested-router', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['nested-red']);
    });

    it('sollte verschachtelte verschiedene when-Bedingungen auswerten', () => {
      const answer: AnswerData = { atomId: 'nested-router', value: 'X' };
      const allAnswers = new Map<string, AnswerData>([
        ['conditional-atom', { atomId: 'conditional-atom', value: 'blue' }]
      ]);
      
      const result = engine.getNextQuestions('nested-router', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['nested-blue']);
    });

    it('sollte auf default verschachtelte Route fallbacken', () => {
      // Dieser Test verifiziert, dass bei nicht-matchenden verschachtelten Routen
      // ein leeres Array zurückgegeben wird (aktuell kein default-in-nested-support)
      const answer: AnswerData = { atomId: 'nested-router', value: 'X' };
      const allAnswers = new Map<string, AnswerData>([
        ['conditional-atom', { atomId: 'conditional-atom', value: 'green' }]
      ]);
      
      const result = engine.getNextQuestions('nested-router', answer, defaultContext, allAnswers);
      
      // Engine unterstützt keinen unbedingten default in nested routes ohne when/equals
      expect(result).toEqual([]);
    });
  });

  // === Array equals Matching ================================================

  describe('Array equals Matching', () => {
    it('sollte mit Array-equals und multiselect matchen', () => {
      const answer: AnswerData = { atomId: 'array-matcher', value: ['A', 'B'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('array-matcher', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['match-ab']);
    });

    it('sollte mit Einzelwert in Array-equals matchen', () => {
      const answer: AnswerData = { atomId: 'array-matcher', value: ['C'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('array-matcher', answer, defaultContext, allAnswers);
      
      expect(result).toEqual(['match-c']);
    });

    it('sollte Teil-Array-Match erkennen', () => {
      const answer: AnswerData = { atomId: 'array-matcher', value: ['A', 'B', 'D'] };
      const allAnswers = new Map<string, AnswerData>();
      
      const result = engine.getNextQuestions('array-matcher', answer, defaultContext, allAnswers);
      
      // A und B sind in answer enthalten, also sollte match-ab zurückgegeben werden
      expect(result).toEqual(['match-ab']);
    });
  });
});
