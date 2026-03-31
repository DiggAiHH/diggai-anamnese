import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSessionStore } from './sessionStore';

// Mock encryptedStorage
vi.mock('../utils/secureStorage', () => ({
  encryptedStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('SessionStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useSessionStore.setState({
      sessionId: null,
      token: null,
      isNewPatient: true,
      gender: '',
      birthDate: '',
      selectedService: '',
      insuranceType: '',
      flowStep: 'landing',
      currentAtomId: null,
      atomHistory: [],
      pendingAtoms: [],
      answers: {},
      atoms: {},
      activeAlerts: [],
      isLoading: false,
      error: null,
      progress: 0,
      isHydrated: false,
      infoBreakHistory: [],
      entertainmentMode: 'AUTO',
    });
  });

  describe('Session Management', () => {
    it('should set session', () => {
      const { setSession } = useSessionStore.getState();
      
      setSession('session-123', 'token-456');
      
      const state = useSessionStore.getState();
      expect(state.sessionId).toBe('session-123');
      expect(state.token).toBe('token-456');
    });

    it('should set session without token', () => {
      const { setSession } = useSessionStore.getState();
      
      setSession('session-789');
      
      const state = useSessionStore.getState();
      expect(state.sessionId).toBe('session-789');
      expect(state.token).toBeNull();
    });

    it('should clear session and reset state', () => {
      const { setSession, setAnswer, clearSession } = useSessionStore.getState();
      
      setSession('session-123', 'token-456');
      setAnswer('atom-1', 'value');
      
      clearSession();
      
      const state = useSessionStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.token).toBeNull();
      expect(state.answers).toEqual({});
      expect(state.flowStep).toBe('landing');
    });

    it('should set patient data', () => {
      const { setPatientData } = useSessionStore.getState();
      
      setPatientData({
        isNewPatient: false,
        gender: 'female',
        birthDate: '1990-05-15',
        selectedService: 'Kardiologie',
        insuranceType: 'private',
      });
      
      const state = useSessionStore.getState();
      expect(state.isNewPatient).toBe(false);
      expect(state.gender).toBe('female');
      expect(state.birthDate).toBe('1990-05-15');
      expect(state.selectedService).toBe('Kardiologie');
      expect(state.insuranceType).toBe('private');
    });

    it('should partially update patient data', () => {
      const { setPatientData } = useSessionStore.getState();
      
      setPatientData({ gender: 'male' });
      
      const state = useSessionStore.getState();
      expect(state.gender).toBe('male');
      expect(state.isNewPatient).toBe(true); // unchanged
    });
  });

  describe('Navigation', () => {
    it('should set flow step', () => {
      const { setFlowStep } = useSessionStore.getState();
      
      setFlowStep('questionnaire');
      
      expect(useSessionStore.getState().flowStep).toBe('questionnaire');
    });

    it('should navigate to atom and update history', () => {
      const { navigateToAtom } = useSessionStore.getState();
      
      navigateToAtom('atom-1');
      
      const state = useSessionStore.getState();
      expect(state.currentAtomId).toBe('atom-1');
      expect(state.atomHistory).toEqual([]);
    });

    it('should add previous atom to history when navigating', () => {
      const { navigateToAtom } = useSessionStore.getState();
      
      navigateToAtom('atom-1');
      navigateToAtom('atom-2');
      
      const state = useSessionStore.getState();
      expect(state.currentAtomId).toBe('atom-2');
      expect(state.atomHistory).toEqual(['atom-1']);
    });

    it('should go back to previous atom', () => {
      const { navigateToAtom, goBack } = useSessionStore.getState();
      
      navigateToAtom('atom-1');
      navigateToAtom('atom-2');
      goBack();
      
      const state = useSessionStore.getState();
      expect(state.currentAtomId).toBe('atom-1');
      expect(state.atomHistory).toEqual([]);
    });

    it('should not go back when history is empty', () => {
      const { goBack } = useSessionStore.getState();
      
      goBack(); // Should not throw
      
      expect(useSessionStore.getState().currentAtomId).toBeNull();
    });

    it('should clear pending atoms on go back', () => {
      const { navigateToAtom, setPendingAtoms, goBack } = useSessionStore.getState();
      
      navigateToAtom('atom-1');
      navigateToAtom('atom-2');
      setPendingAtoms(['atom-3', 'atom-4']);
      goBack();
      
      expect(useSessionStore.getState().pendingAtoms).toEqual([]);
    });

    it('should set pending atoms', () => {
      const { setPendingAtoms } = useSessionStore.getState();
      
      setPendingAtoms(['atom-3', 'atom-4']);
      
      expect(useSessionStore.getState().pendingAtoms).toEqual(['atom-3', 'atom-4']);
    });

    it('should pop pending atom', () => {
      const { setPendingAtoms, popPendingAtom } = useSessionStore.getState();
      
      setPendingAtoms(['atom-3', 'atom-4']);
      const next = popPendingAtom();
      
      expect(next).toBe('atom-3');
      expect(useSessionStore.getState().pendingAtoms).toEqual(['atom-4']);
    });

    it('should return null when popping empty pending atoms', () => {
      const { popPendingAtom } = useSessionStore.getState();
      
      const next = popPendingAtom();
      
      expect(next).toBeNull();
    });
  });

  describe('Answers', () => {
    it('should set answer', () => {
      const { setAnswer } = useSessionStore.getState();
      
      setAnswer('atom-1', 'yes');
      
      const state = useSessionStore.getState();
      expect(state.answers['atom-1']).toEqual({
        atomId: 'atom-1',
        value: 'yes',
        answeredAt: expect.any(Date),
      });
    });

    it('should update existing answer', () => {
      vi.useFakeTimers();
      const { setAnswer } = useSessionStore.getState();
      
      setAnswer('atom-1', 'yes');
      const firstAnswer = useSessionStore.getState().answers['atom-1'];
      
      // Wait a moment to ensure different timestamp
      vi.advanceTimersByTime(10);
      
      setAnswer('atom-1', 'no');
      const secondAnswer = useSessionStore.getState().answers['atom-1'];
      
      expect(secondAnswer.value).toBe('no');
      expect(secondAnswer.atomId).toBe('atom-1');
      vi.useRealTimers();
    });

    it('should handle different answer types', () => {
      const { setAnswer } = useSessionStore.getState();
      
      setAnswer('atom-string', 'text answer');
      setAnswer('atom-array', ['option1', 'option2']);
      setAnswer('atom-boolean', true);
      setAnswer('atom-number', 42);
      setAnswer('atom-object', { key: 'value' });
      
      const state = useSessionStore.getState();
      expect(state.answers['atom-string'].value).toBe('text answer');
      expect(state.answers['atom-array'].value).toEqual(['option1', 'option2']);
      expect(state.answers['atom-boolean'].value).toBe(true);
      expect(state.answers['atom-number'].value).toBe(42);
      expect(state.answers['atom-object'].value).toEqual({ key: 'value' });
    });
  });

  describe('Atoms', () => {
    it('should load atoms', () => {
      const { loadAtoms } = useSessionStore.getState();
      
      const atoms = [
        {
          id: 'atom-1',
          module: 1,
          category: 1,
          questionText: 'Question 1',
          answerType: 'text',
          section: 'general',
          orderIndex: 1,
          isRedFlag: false,
          isPII: false,
        },
        {
          id: 'atom-2',
          module: 1,
          category: 1,
          questionText: 'Question 2',
          answerType: 'radio',
          section: 'general',
          orderIndex: 2,
          isRedFlag: true,
          isPII: false,
        },
      ];
      
      loadAtoms(atoms);
      
      const state = useSessionStore.getState();
      expect(state.atoms['atom-1'].questionText).toBe('Question 1');
      expect(state.atoms['atom-2'].questionText).toBe('Question 2');
    });

    it('should merge new atoms with existing ones', () => {
      const { loadAtoms } = useSessionStore.getState();
      
      loadAtoms([{
        id: 'atom-1',
        module: 1,
        category: 1,
        questionText: 'Original',
        answerType: 'text',
        section: 'general',
        orderIndex: 1,
        isRedFlag: false,
        isPII: false,
      }]);
      
      loadAtoms([{
        id: 'atom-2',
        module: 1,
        category: 1,
        questionText: 'New',
        answerType: 'radio',
        section: 'general',
        orderIndex: 2,
        isRedFlag: false,
        isPII: false,
      }]);
      
      const state = useSessionStore.getState();
      expect(state.atoms['atom-1'].questionText).toBe('Original');
      expect(state.atoms['atom-2'].questionText).toBe('New');
    });
  });

  describe('Triage Alerts', () => {
    it('should add alert', () => {
      const { addAlert } = useSessionStore.getState();
      
      addAlert({
        level: 'CRITICAL',
        atomId: 'atom-1',
        message: 'Critical condition detected',
        triggerValues: null,
      });
      
      const state = useSessionStore.getState();
      expect(state.activeAlerts).toHaveLength(1);
      expect(state.activeAlerts[0].level).toBe('CRITICAL');
    });

    it('should add multiple alerts', () => {
      const { addAlert } = useSessionStore.getState();
      
      addAlert({ level: 'WARNING', atomId: 'atom-1', message: 'Warning', triggerValues: null });
      addAlert({ level: 'CRITICAL', atomId: 'atom-2', message: 'Critical', triggerValues: null });
      
      const state = useSessionStore.getState();
      expect(state.activeAlerts).toHaveLength(2);
    });

    it('should clear all alerts', () => {
      const { addAlert, clearAlerts } = useSessionStore.getState();
      
      addAlert({ level: 'WARNING', atomId: 'atom-1', message: 'Warning', triggerValues: null });
      clearAlerts();
      
      expect(useSessionStore.getState().activeAlerts).toEqual([]);
    });
  });

  describe('UI State', () => {
    it('should set loading state', () => {
      const { setLoading } = useSessionStore.getState();
      
      setLoading(true);
      expect(useSessionStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useSessionStore.getState().isLoading).toBe(false);
    });

    it('should set error', () => {
      const { setError } = useSessionStore.getState();
      
      setError('Something went wrong');
      expect(useSessionStore.getState().error).toBe('Something went wrong');
      
      setError(null);
      expect(useSessionStore.getState().error).toBeNull();
    });

    it('should set progress', () => {
      const { setProgress } = useSessionStore.getState();
      
      setProgress(50);
      expect(useSessionStore.getState().progress).toBe(50);
    });

    it('should set hydrated', () => {
      const { setHydrated } = useSessionStore.getState();
      
      setHydrated();
      expect(useSessionStore.getState().isHydrated).toBe(true);
    });
  });

  describe('Entertainment', () => {
    it('should add info break to history', () => {
      const { addInfoBreakSeen } = useSessionStore.getState();
      
      addInfoBreakSeen('content-1');
      addInfoBreakSeen('content-2');
      
      expect(useSessionStore.getState().infoBreakHistory).toEqual(['content-1', 'content-2']);
    });

    it('should set entertainment mode', () => {
      const { setEntertainmentMode } = useSessionStore.getState();
      
      setEntertainmentMode('GAMES');
      expect(useSessionStore.getState().entertainmentMode).toBe('GAMES');
    });
  });
});
