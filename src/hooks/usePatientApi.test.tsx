import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCreateSession,
  useSessionState,
  useSubmitAnswer,
  useMedications,
  useSubmitMedications,
  useSurgeries,
  useSubmitSurgeries,
  useSubmitSession,
  useAtoms,
} from './useApi/usePatientApi';
import { useSessionStore } from '../store/sessionStore';
import * as client from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    createSession: vi.fn(),
    getSessionState: vi.fn(),
    submitAnswer: vi.fn(),
    getMedications: vi.fn(),
    submitMedications: vi.fn(),
    getSurgeries: vi.fn(),
    submitSurgeries: vi.fn(),
    submitSession: vi.fn(),
    getAtoms: vi.fn(),
  },
  setAuthToken: vi.fn(),
}));

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('useCreateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({
      sessionId: null,
      flowStep: 'landing',
      currentAtomId: null,
    });
  });

  it('should create session and update store', async () => {
    const mockResponse = {
      sessionId: 'session-123',
      nextAtomIds: ['atom-1'],
    };
    vi.mocked(client.api.createSession).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateSession(), { wrapper });

    result.current.mutate({ email: 'test@test.de', isNewPatient: false, gender: 'm', birthDate: '1990-01-01', selectedService: 'Allgemeinmedizin' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.createSession).toHaveBeenCalledWith({
      email: 'test@test.de', isNewPatient: false, gender: 'm', birthDate: '1990-01-01', selectedService: 'Allgemeinmedizin',
    });

    const store = useSessionStore.getState();
    expect(store.sessionId).toBe('session-123');
    expect(store.flowStep).toBe('questionnaire');
    expect(store.currentAtomId).toBe('atom-1');
  });

  it('should handle session creation error', async () => {
    const mockError = new Error('Failed to create session');
    vi.mocked(client.api.createSession).mockRejectedValueOnce(mockError);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateSession(), { wrapper });

    result.current.mutate({ email: 'test@test.de', isNewPatient: false, gender: 'm', birthDate: '1990-01-01', selectedService: 'Service' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(useSessionStore.getState().error).toBeTruthy();
  });
});

describe('useSessionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch session state when sessionId is provided', async () => {
    const mockState = {
      sessionId: 'session-123',
      progress: { completed: 5, total: 20, percentage: 25 },
      answers: {},
    };
    vi.mocked(client.api.getSessionState).mockResolvedValueOnce(mockState);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSessionState('session-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.getSessionState).toHaveBeenCalledWith('session-123');
    expect(result.current.data).toEqual(mockState);
  });

  it('should not fetch when sessionId is null', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSessionState(null), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useSubmitAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({
      sessionId: 'session-123',
      answers: {},
      progress: 0,
    });
  });

  it('should submit answer successfully', async () => {
    const mockResponse = {
      nextAtomIds: ['atom-2'],
      progress: { completed: 1, total: 10, percentage: 10 },
      routingHints: [],
      redFlags: [],
    };
    vi.mocked(client.api.submitAnswer).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    result.current.mutate({ atomId: 'atom-1', value: 'yes' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.submitAnswer).toHaveBeenCalledWith('session-123', {
      atomId: 'atom-1',
      value: 'yes',
    });
  });

  it('should handle routing hints in response', async () => {
    // Neuer kanonischer Schlüssel `routingHints`. Inhalt = patient-sichere RoutingHint-Objekte
    // (siehe RoutingEngine.toPatientSafeView). `staffMessage` existiert in der Response NICHT.
    const mockResponse = {
      nextAtomIds: ['atom-2'],
      progress: { completed: 1, total: 10, percentage: 10 },
      routingHints: [
        {
          ruleId: 'PRIORITY_TEST',
          level: 'PRIORITY' as const,
          patientMessage: 'Bitte wenden Sie sich umgehend an das Praxispersonal.',
          workflowAction: 'inform_staff_now' as const,
        },
      ],
    };
    vi.mocked(client.api.submitAnswer).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    result.current.mutate({ atomId: 'atom-1', value: 'priority' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const store = useSessionStore.getState();
    expect(store.activeAlerts).toHaveLength(1);
    expect(store.activeAlerts[0].level).toBe('CRITICAL'); // Store-Schema mappt PRIORITY → CRITICAL
    expect(store.activeAlerts[0].message).toBe('Bitte wenden Sie sich umgehend an das Praxispersonal.');
  });

  it('should fall back to redFlags alias when routingHints absent (backwards-compat)', async () => {
    const mockResponse = {
      nextAtomIds: ['atom-2'],
      progress: { completed: 1, total: 10, percentage: 10 },
      // Server-Build noch ohne routingHints — redFlags trägt aber bereits den neuen RoutingHint-Shape.
      redFlags: [
        {
          ruleId: 'INFO_TEST',
          level: 'INFO' as const,
          patientMessage: 'Bitte besprechen Sie diesen Punkt mit dem Personal.',
          workflowAction: 'mark_for_review' as const,
        },
      ],
    };
    vi.mocked(client.api.submitAnswer).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    result.current.mutate({ atomId: 'atom-1', value: 'info' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const store = useSessionStore.getState();
    expect(store.activeAlerts).toHaveLength(1);
    expect(store.activeAlerts[0].level).toBe('WARNING'); // INFO → WARNING im Store-Mapping
  });

  it('should throw error when no session exists', async () => {
    useSessionStore.setState({ sessionId: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    result.current.mutate({ atomId: 'atom-1', value: 'yes' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Keine aktive Session');
  });
});

describe('useMedications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ sessionId: 'session-123' });
  });

  it('should fetch medications', async () => {
    const mockMedications = [
      { id: 'med-1', name: 'Aspirin', dosage: '100mg' },
      { id: 'med-2', name: 'Ibuprofen', dosage: '400mg' },
    ];
    vi.mocked(client.api.getMedications).mockResolvedValueOnce(mockMedications);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMedications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.getMedications).toHaveBeenCalledWith('session-123');
    expect(result.current.data).toEqual(mockMedications);
  });

  it('should not fetch when sessionId is null', () => {
    useSessionStore.setState({ sessionId: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMedications(), { wrapper });

    expect(result.current.isLoading).toBe(false);
  });
});

describe('useSubmitMedications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ sessionId: 'session-123' });
  });

  it('should submit medications and invalidate cache', async () => {
    const mockResponse = { success: true };
    vi.mocked(client.api.submitMedications).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitMedications(), { wrapper });

    const medications = [{ name: 'Aspirin', dosage: '100mg' }];
    result.current.mutate(medications);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.submitMedications).toHaveBeenCalledWith('session-123', medications);
  });
});

describe('useSurgeries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ sessionId: 'session-123' });
  });

  it('should fetch surgeries', async () => {
    const mockSurgeries = [
      { id: 'surg-1', procedure: 'Appendectomy', date: '2020-01-01' },
    ];
    vi.mocked(client.api.getSurgeries).mockResolvedValueOnce(mockSurgeries);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSurgeries(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.getSurgeries).toHaveBeenCalledWith('session-123');
    expect(result.current.data).toEqual(mockSurgeries);
  });
});

describe('useSubmitSurgeries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ sessionId: 'session-123' });
  });

  it('should submit surgeries', async () => {
    const mockResponse = { success: true };
    vi.mocked(client.api.submitSurgeries).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitSurgeries(), { wrapper });

    const surgeries = [{ procedure: 'Surgery', date: '2020-01-01' }];
    result.current.mutate(surgeries);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.submitSurgeries).toHaveBeenCalledWith('session-123', surgeries);
  });
});

describe('useSubmitSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ sessionId: 'session-123', flowStep: 'questionnaire' });
  });

  it('should submit session and update flow step', async () => {
    const mockResponse = { success: true, completed: true };
    vi.mocked(client.api.submitSession).mockResolvedValueOnce(mockResponse);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubmitSession(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.submitSession).toHaveBeenCalledWith('session-123');
    expect(useSessionStore.getState().flowStep).toBe('submitted');
  });
});

describe('useAtoms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ atoms: {} });
  });

  it('should fetch atoms and load to store', async () => {
    const mockAtoms = {
      atoms: [
        { id: 'atom-1', questionText: 'Question 1', answerType: 'text', module: 1, category: 1, section: 'general', orderIndex: 1, isRedFlag: false, isPII: false },
        { id: 'atom-2', questionText: 'Question 2', answerType: 'radio', module: 1, category: 1, section: 'general', orderIndex: 2, isRedFlag: false, isPII: false },
      ],
    };
    vi.mocked(client.api.getAtoms).mockResolvedValueOnce(mockAtoms);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAtoms(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAtoms.atoms);

    const store = useSessionStore.getState();
    expect(store.atoms['atom-1']).toBeDefined();
    expect(store.atoms['atom-2']).toBeDefined();
  });

  it('should fetch specific atoms by IDs', async () => {
    const mockAtoms = {
      atoms: [
        { id: 'atom-1', questionText: 'Question 1', answerType: 'text', module: 1, category: 1, section: 'general', orderIndex: 1, isRedFlag: false, isPII: false },
      ],
    };
    vi.mocked(client.api.getAtoms).mockResolvedValueOnce(mockAtoms);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAtoms(['atom-1']), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.api.getAtoms).toHaveBeenCalledWith(['atom-1']);
  });
});
