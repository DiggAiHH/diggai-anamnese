/**
 * Dashboard Store Unit Tests
 * 
 * Tests fuer den Zustand Store mit Immer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore, selectFilteredQueueItems, selectQueueItemsByStatus, selectCriticalPatients, selectLongestWaiters } from './dashboardStore';
import type { PatientQueueItem, QueueStatus } from '../types/dashboard';

const mockPatients: PatientQueueItem[] = [
  {
    id: 'p1',
    sessionId: 's1',
    patientName: 'Max Mustermann',
    displayName: 'Max M.',
    status: 'PENDING',
    triageLevel: 'CRITICAL',
    service: 'Anamnese',
    waitTimeMinutes: 45,
    checkInTime: new Date(),
    visitType: 'IN_PERSON',
    criticalFlags: [],
    quickInfo: { allergies: [], chronicConditions: [], currentMedications: [], hasRedFlags: true },
  },
  {
    id: 'p2',
    sessionId: 's2',
    patientName: 'Anna Schmidt',
    displayName: 'Anna S.',
    status: 'IN_ANAMNESE',
    triageLevel: 'WARNING',
    service: 'Rezept',
    waitTimeMinutes: 20,
    checkInTime: new Date(),
    visitType: 'ONLINE',
    criticalFlags: [],
    quickInfo: { allergies: [], chronicConditions: [], currentMedications: [], hasRedFlags: false },
  },
  {
    id: 'p3',
    sessionId: 's3',
    patientName: 'John Doe',
    displayName: 'John D.',
    status: 'READY_FOR_DOCTOR',
    triageLevel: 'NORMAL',
    service: 'Termin',
    waitTimeMinutes: 10,
    checkInTime: new Date(),
    visitType: 'PHONE',
    criticalFlags: [],
    quickInfo: { allergies: [], chronicConditions: [], currentMedications: [], hasRedFlags: false },
  },
];

describe('DashboardStore', () => {
  beforeEach(() => {
    // Reset store state
    const store = useDashboardStore.getState();
    store.setQueueItems([]);
    store.selectPatient(null);
    store.resetFilters();
  });

  describe('Basic Actions', () => {
    it('should set queue items', () => {
      const store = useDashboardStore.getState();
      store.setQueueItems(mockPatients);
      
      expect(useDashboardStore.getState().queueItems).toHaveLength(3);
    });

    it('should select a patient', () => {
      const store = useDashboardStore.getState();
      store.selectPatient('p1');
      
      expect(useDashboardStore.getState().selectedPatientId).toBe('p1');
    });

    it('should move patient to new status', () => {
      const store = useDashboardStore.getState();
      store.setQueueItems(mockPatients);
      store.movePatient('p1', 'IN_TREATMENT');
      
      const patient = useDashboardStore.getState().queueItems.find(p => p.id === 'p1');
      expect(patient?.status).toBe('IN_TREATMENT');
    });

    it('should update patient data', () => {
      const store = useDashboardStore.getState();
      store.setQueueItems(mockPatients);
      store.updateQueueItem('p1', { waitTimeMinutes: 50 });
      
      const patient = useDashboardStore.getState().queueItems.find(p => p.id === 'p1');
      expect(patient?.waitTimeMinutes).toBe(50);
    });

    it('should remove patient from queue', () => {
      const store = useDashboardStore.getState();
      store.setQueueItems(mockPatients);
      store.removeQueueItem('p1');
      
      expect(useDashboardStore.getState().queueItems).toHaveLength(2);
    });
  });

  describe('Filters', () => {
    beforeEach(() => {
      useDashboardStore.getState().setQueueItems(mockPatients);
    });

    it('should filter by status', () => {
      const store = useDashboardStore.getState();
      store.setFilters({ status: 'PENDING' as QueueStatus });
      
      const filtered = selectFilteredQueueItems(useDashboardStore.getState());
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p1');
    });

    it('should filter by triage level', () => {
      const store = useDashboardStore.getState();
      store.setFilters({ triageLevel: 'CRITICAL' });
      
      const filtered = selectFilteredQueueItems(useDashboardStore.getState());
      expect(filtered).toHaveLength(1);
      expect(filtered[0].triageLevel).toBe('CRITICAL');
    });

    it('should filter by search query', () => {
      const store = useDashboardStore.getState();
      store.setFilters({ searchQuery: 'Anna' });
      
      const filtered = selectFilteredQueueItems(useDashboardStore.getState());
      expect(filtered).toHaveLength(1);
      expect(filtered[0].patientName).toContain('Anna');
    });

    it('should reset filters', () => {
      const store = useDashboardStore.getState();
      store.setFilters({ status: 'PENDING' as QueueStatus, searchQuery: 'test' });
      store.resetFilters();
      
      const state = useDashboardStore.getState();
      expect(state.filters.status).toBeNull();
      expect(state.filters.searchQuery).toBe('');
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      useDashboardStore.getState().setQueueItems(mockPatients);
    });

    it('should group items by status', () => {
      const grouped = selectQueueItemsByStatus(useDashboardStore.getState());
      
      expect(grouped.PENDING).toHaveLength(1);
      expect(grouped.IN_ANAMNESE).toHaveLength(1);
      expect(grouped.READY_FOR_DOCTOR).toHaveLength(1);
    });

    it('should select critical patients', () => {
      const critical = selectCriticalPatients(useDashboardStore.getState());
      
      expect(critical).toHaveLength(1);
      expect(critical[0].triageLevel).toBe('CRITICAL');
    });

    it('should select longest waiters', () => {
      const longest = selectLongestWaiters(useDashboardStore.getState(), 2);
      
      expect(longest).toHaveLength(2);
      expect(longest[0].waitTimeMinutes).toBe(45); // Max has longest wait
    });

    it('should select selected patient', () => {
      const store = useDashboardStore.getState();
      store.selectPatient('p2');
      
      const selected = useDashboardStore.getState().queueItems.find(
        p => p.id === useDashboardStore.getState().selectedPatientId
      );
      
      expect(selected?.id).toBe('p2');
    });
  });

  describe('Stats', () => {
    it('should update stats', () => {
      const store = useDashboardStore.getState();
      store.updateStats({
        totalToday: 100,
        activeCount: 50,
        criticalCount: 5,
      });
      
      const stats = useDashboardStore.getState().stats;
      expect(stats.totalToday).toBe(100);
      expect(stats.activeCount).toBe(50);
      expect(stats.criticalCount).toBe(5);
    });
  });

  describe('Loading & Error States', () => {
    it('should set loading state', () => {
      const store = useDashboardStore.getState();
      store.setLoading(true);
      
      expect(useDashboardStore.getState().isLoading).toBe(true);
    });

    it('should set error state', () => {
      const store = useDashboardStore.getState();
      store.setError('Network error');
      
      expect(useDashboardStore.getState().error).toBe('Network error');
    });

    it('should set connection state', () => {
      const store = useDashboardStore.getState();
      store.setConnected(true);
      
      expect(useDashboardStore.getState().isConnected).toBe(true);
    });
  });
});
