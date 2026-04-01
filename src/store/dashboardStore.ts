/**
 * Dashboard Store
 * 
 * Zustand-basierter State-Manager für Dashboard-Daten.
 * Verwaltet Queue-Items, Filter, und UI-State.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  PatientQueueItem,
  QueueStatus,
  TriageLevel,
  DashboardStats,
  DashboardFilters,
  DashboardViewMode,
} from '../types/dashboard';

interface DashboardState {
  // Queue Data
  queueItems: PatientQueueItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isConnected: boolean;

  // Selection & UI
  selectedPatientId: string | null;
  filters: DashboardFilters;
  viewMode: DashboardViewMode;

  // Stats
  stats: DashboardStats;
}

interface DashboardActions {
  // Data Actions
  setQueueItems: (items: PatientQueueItem[]) => void;
  addQueueItem: (item: PatientQueueItem) => void;
  updateQueueItem: (patientId: string, updates: Partial<PatientQueueItem>) => void;
  removeQueueItem: (patientId: string) => void;
  movePatient: (patientId: string, newStatus: QueueStatus) => void;

  // Selection Actions
  selectPatient: (patientId: string | null) => void;

  // Filter Actions
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;

  // View Actions
  setViewMode: (mode: DashboardViewMode) => void;

  // Loading & Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;

  // Stats
  updateStats: (stats: Partial<DashboardStats>) => void;

  // Acknowledge Triage
  acknowledgeTriage: (triageId: string) => void;
}

const initialFilters: DashboardFilters = {
  status: null,
  triageLevel: null,
  service: null,
  searchQuery: '',
  dateRange: 'today',
};

const initialStats: DashboardStats = {
  totalToday: 0,
  activeCount: 0,
  completedCount: 0,
  averageWaitTime: 0,
  criticalCount: 0,
  warningCount: 0,
};

export const useDashboardStore = create<DashboardState & DashboardActions>()(
  immer((set) => ({
    // Initial State
    queueItems: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
    isConnected: false,
    selectedPatientId: null,
    filters: { ...initialFilters },
    viewMode: 'kanban',
    stats: { ...initialStats },

    // Data Actions
    setQueueItems: (items) =>
      set((state) => {
        state.queueItems = items;
        state.lastUpdated = new Date();
      }),

    addQueueItem: (item) =>
      set((state) => {
        state.queueItems.push(item);
        state.lastUpdated = new Date();
      }),

    updateQueueItem: (patientId, updates) =>
      set((state) => {
        const index = state.queueItems.findIndex((p) => p.id === patientId);
        if (index !== -1) {
          state.queueItems[index] = { ...state.queueItems[index], ...updates };
          state.lastUpdated = new Date();
        }
      }),

    removeQueueItem: (patientId) =>
      set((state) => {
        state.queueItems = state.queueItems.filter((p) => p.id !== patientId);
        state.lastUpdated = new Date();
      }),

    movePatient: (patientId, newStatus) =>
      set((state) => {
        const patient = state.queueItems.find((p) => p.id === patientId);
        if (patient) {
          patient.status = newStatus;
          state.lastUpdated = new Date();
        }
      }),

    // Selection Actions
    selectPatient: (patientId) =>
      set((state) => {
        state.selectedPatientId = patientId;
      }),

    // Filter Actions
    setFilters: (filters) =>
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      }),

    resetFilters: () =>
      set((state) => {
        state.filters = { ...initialFilters };
      }),

    // View Actions
    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),

    // Loading & Error
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    setConnected: (connected) =>
      set((state) => {
        state.isConnected = connected;
      }),

    // Stats
    updateStats: (stats) =>
      set((state) => {
        state.stats = { ...state.stats, ...stats };
      }),

    // Acknowledge Triage
    acknowledgeTriage: (_triageId) =>
      set((state) => {
        // Hier könnte die Logik zum Bestätigen eines Triage-Alerts implementiert werden
        // Z.B. Markieren als "gesehen" oder Entfernen aus der Alert-Liste
        state.lastUpdated = new Date();
      }),
  }))
);

// === Selectors ===

/**
 * Selektiert gefilterte Queue-Items
 */
export function selectFilteredQueueItems(state: DashboardState): PatientQueueItem[] {
  return state.queueItems.filter((item) => {
    const { filters } = state;

    // Status Filter
    if (filters.status && item.status !== filters.status) return false;

    // Triage Level Filter
    if (filters.triageLevel && item.triageLevel !== filters.triageLevel) return false;

    // Service Filter
    if (filters.service && item.service !== filters.service) return false;

    // Search Query Filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = item.patientName.toLowerCase().includes(query);
      const matchesDisplayName = item.displayName.toLowerCase().includes(query);
      const matchesService = item.service.toLowerCase().includes(query);
      if (!matchesName && !matchesDisplayName && !matchesService) return false;
    }

    return true;
  });
}

/**
 * Selektiert Queue-Items gruppiert nach Status (für Kanban)
 */
export function selectQueueItemsByStatus(
  state: DashboardState
): Record<QueueStatus, PatientQueueItem[]> {
  const items = selectFilteredQueueItems(state);
  const grouped: Record<QueueStatus, PatientQueueItem[]> = {
    PENDING: [],
    IN_ANAMNESE: [],
    READY_FOR_DOCTOR: [],
    IN_TREATMENT: [],
    COMPLETED: [],
    CANCELLED: [],
  };

  items.forEach((item) => {
    grouped[item.status].push(item);
  });

  return grouped;
}

/**
 * Selektiert kritische Patienten (für Alert-Panel)
 */
export function selectCriticalPatients(state: DashboardState): PatientQueueItem[] {
  return state.queueItems.filter(
    (item) => item.triageLevel === 'CRITICAL' || item.quickInfo.hasRedFlags
  );
}

/**
 * Selektiert Patienten mit längster Wartezeit
 */
export function selectLongestWaiters(
  state: DashboardState,
  limit: number = 5
): PatientQueueItem[] {
  return [...state.queueItems]
    .sort((a, b) => b.waitTimeMinutes - a.waitTimeMinutes)
    .slice(0, limit);
}

/**
 * Selektiert den aktuell ausgewählten Patienten
 */
export function selectSelectedPatient(
  state: DashboardState
): PatientQueueItem | undefined {
  return state.queueItems.find((p) => p.id === state.selectedPatientId);
}
