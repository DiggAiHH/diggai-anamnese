/**
 * useRealtimeQueue Hook
 * 
 * Verwaltet Echtzeit-Daten für die Patienten-Warteschlange.
 * Unterstützt Mock-Daten (Entwicklung) und Socket.IO/Supabase (Produktion).
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardStore } from '../../store/dashboardStore';
import {
  getMockDashboardEngine,
  destroyMockDashboardEngine,
} from '../../data/mockDashboards';
import type { QueueStatus, PatientQueueItem, QueueUpdateEvent } from '../../types/dashboard';

// Feature-Flag für Mock-Daten
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DASHBOARD === 'true' || !import.meta.env.VITE_API_URL;

// Query-Key für Queue-Daten
const QUEUE_QUERY_KEY = ['dashboard', 'queue'];

interface UseRealtimeQueueOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseRealtimeQueueReturn {
  items: PatientQueueItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isConnected: boolean;
  movePatient: (patientId: string, newStatus: QueueStatus) => Promise<void>;
  refresh: () => void;
}

/**
 * Hook für Echtzeit-Queue-Daten
 */
export function useRealtimeQueue(options: UseRealtimeQueueOptions = {}): UseRealtimeQueueReturn {
  const { enabled = true, refetchInterval = 5000 } = options;
  const queryClient = useQueryClient();
  const storeSetQueueItems = useDashboardStore((state) => state.setQueueItems);
  const storeSetConnected = useDashboardStore((state) => state.setConnected);
  const storeMovePatient = useDashboardStore((state) => state.movePatient);
  const storeSetLoading = useDashboardStore((state) => state.setLoading);
  const storeSetError = useDashboardStore((state) => state.setError);
  
  // Ref für Mock-Engine-Subscription
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Query für Queue-Daten
  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUEUE_QUERY_KEY,
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // Mock-Daten: Initial load
        const engine = getMockDashboardEngine();
        return engine.getQueueItems();
      }
      
      // Produktion: API-Call
      const response = await fetch('/api/queue');
      if (!response.ok) {
        throw new Error('Failed to fetch queue data');
      }
      const data = await response.json();
      return data.items as PatientQueueItem[];
    },
    enabled,
    refetchInterval: USE_MOCK_DATA ? false : refetchInterval, // Mock hat eigene Updates
  });

  // Realtime-Subscription (Mock oder Socket.IO)
  useEffect(() => {
    if (!enabled) return;

    if (USE_MOCK_DATA) {
      // Mock-Engine Setup
      const engine = getMockDashboardEngine({ enableRealtime: true });
      engine.startRealtimeSimulation();
      
      // Subscription für Updates
      const unsubscribe = engine.subscribe((data) => {
        storeSetQueueItems(data);
        storeSetConnected(true);
      });
      
      unsubscribeRef.current = () => {
        unsubscribe();
        engine.stopRealtimeSimulation();
      };
      
      // Initiale Daten
      storeSetQueueItems(engine.getQueueItems());
      
    } else {
      // Produktion: Socket.IO Setup
      // TODO: Socket.IO-Integration implementieren
      // socket.on('queue:update', handleQueueUpdate);
      // socket.on('queue:patient:moved', handlePatientMoved);
      
      storeSetConnected(true);
    }

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      if (USE_MOCK_DATA) {
        destroyMockDashboardEngine();
      }
    };
  }, [enabled, storeSetQueueItems, storeSetConnected]);

  // Optimistisches Update für Patienten-Verschiebung
  const movePatient = useCallback(
    async (patientId: string, newStatus: QueueStatus) => {
      const previousItems = useDashboardStore.getState().queueItems;
      
      try {
        // 1. Optimistic Update im Store
        storeSetLoading(true);
        storeMovePatient(patientId, newStatus);
        
        if (USE_MOCK_DATA) {
          // Mock: Direkt auf Engine aktualisieren
          const engine = getMockDashboardEngine();
          engine.movePatient(patientId, newStatus);
        } else {
          // Produktion: API-Call
          const response = await fetch(`/api/queue/${patientId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to update patient status');
          }
        }
        
        // Query-Cache aktualisieren
        queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
        
      } catch (err) {
        // Rollback bei Fehler
        console.error('Failed to move patient:', err);
        useDashboardStore.getState().setQueueItems(previousItems);
        storeSetError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        storeSetLoading(false);
      }
    },
    [queryClient, storeMovePatient, storeSetLoading, storeSetError]
  );

  // Manuelles Refresh
  const refresh = useCallback(() => {
    if (USE_MOCK_DATA) {
      const engine = getMockDashboardEngine();
      storeSetQueueItems(engine.getQueueItems());
    } else {
      refetch();
    }
  }, [refetch, storeSetQueueItems]);

  return {
    items,
    isLoading,
    isError,
    error: error as Error | null,
    isConnected: useDashboardStore((state) => state.isConnected),
    movePatient,
    refresh,
  };
}

/**
 * Hook für Queue-Statistiken
 */
export function useQueueStats(options: UseRealtimeQueueOptions = {}) {
  const { enabled = true } = options;
  const storeUpdateStats = useDashboardStore((state) => state.updateStats);
  const stats = useDashboardStore((state) => state.stats);

  useEffect(() => {
    if (!enabled) return;

    if (USE_MOCK_DATA) {
      const engine = getMockDashboardEngine();
      
      // Stats regelmäßig aktualisieren
      const interval = setInterval(() => {
        storeUpdateStats(engine.getStats());
      }, 3000);
      
      // Initiale Stats
      storeUpdateStats(engine.getStats());
      
      return () => clearInterval(interval);
    }
  }, [enabled, storeUpdateStats]);

  return stats;
}

/**
 * Hook für kritische Patienten (Triage-Alerts)
 */
export function useCriticalPatients() {
  const items = useDashboardStore((state) => state.queueItems);
  
  const criticalPatients = items.filter(
    (item) => item.triageLevel === 'CRITICAL' || item.quickInfo.hasRedFlags
  );
  
  const hasCritical = criticalPatients.length > 0;
  
  return {
    patients: criticalPatients,
    count: criticalPatients.length,
    hasCritical,
    criticalCount: items.filter((i) => i.triageLevel === 'CRITICAL').length,
    warningCount: items.filter((i) => i.triageLevel === 'WARNING').length,
  };
}

/**
 * Hook für Patienten mit längster Wartezeit
 */
export function useLongestWaiters(limit: number = 5) {
  const items = useDashboardStore((state) => state.queueItems);
  
  const longestWaiters = [...items]
    .sort((a, b) => b.waitTimeMinutes - a.waitTimeMinutes)
    .slice(0, limit);
  
  return {
    patients: longestWaiters,
    maxWaitTime: longestWaiters[0]?.waitTimeMinutes ?? 0,
    averageWaitTime: items.length > 0
      ? Math.floor(items.reduce((sum, i) => sum + i.waitTimeMinutes, 0) / items.length)
      : 0,
  };
}
