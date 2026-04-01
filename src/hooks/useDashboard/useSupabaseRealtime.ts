/**
 * useSupabaseRealtime Hook
 * 
 * Echtzeit-Hook mit optimistischen Updates.
 * Unterstuetzt sowohl Socket.IO als auch Supabase Realtime.
 * 
 * Dieser Hook ist die finale Version fuer Produktion.
 * Ersetzt useRealtimeQueue mit verbesserter Fehlerbehandlung
 * und Offline-Unterstuetzung.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardStore } from '../../store/dashboardStore';
import { getQueueService, destroyQueueService, isMockMode } from '../../services/queueService';
import type { QueueStatus, PatientQueueItem } from '../../types/dashboard';

// Query-Key fuer Queue-Daten
const QUEUE_QUERY_KEY = ['dashboard', 'queue'];
const STATS_QUERY_KEY = ['dashboard', 'stats'];

interface UseSupabaseRealtimeOptions {
  enabled?: boolean;
  refetchInterval?: number;
  enableOptimisticUpdates?: boolean;
}

interface UseSupabaseRealtimeReturn {
  items: PatientQueueItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isConnected: boolean;
  isOffline: boolean;
  movePatient: (patientId: string, newStatus: QueueStatus) => Promise<void>;
  assignDoctor: (patientId: string, doctorId: string) => Promise<void>;
  refresh: () => void;
  pendingOperations: number;
}

/**
 * Hook fuer Echtzeit-Queue-Daten mit optimistischen Updates
 * 
 * @example
 * ```tsx
 * const { items, movePatient, isConnected } = useSupabaseRealtime();
 * 
 * // Patient verschieben
 * await movePatient('patient-123', 'IN_TREATMENT');
 * ```
 */
export function useSupabaseRealtime(
  options: UseSupabaseRealtimeOptions = {}
): UseSupabaseRealtimeReturn {
  const {
    enabled = true,
    enableOptimisticUpdates = true,
  } = options;

  const queryClient = useQueryClient();
  const storeSetQueueItems = useDashboardStore((state) => state.setQueueItems);
  const storeSetConnected = useDashboardStore((state) => state.setConnected);
  const storeSetLoading = useDashboardStore((state) => state.setLoading);
  const storeSetError = useDashboardStore((state) => state.setError);
  
  // Offline-Queue fuer ausstehende Operationen
  const [pendingOperations, setPendingOperations] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const pendingQueue = useRef<Array<{ patientId: string; newStatus: QueueStatus }>>([]);
  
  // Service-Ref
  const serviceRef = useRef(getQueueService());

  // Initial Load
  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUEUE_QUERY_KEY,
    queryFn: async () => {
      const service = serviceRef.current;
      const items = await service.getQueue();
      storeSetQueueItems(items);
      return items;
    },
    enabled,
    staleTime: 1000 * 30, // 30 Sekunden
  });

  // Realtime Subscription
  useEffect(() => {
    if (!enabled) return;

    const service = serviceRef.current;
    
    // Subscription fuer Updates
    const unsubscribe = service.subscribe((data) => {
      storeSetQueueItems(data);
      queryClient.setQueryData(QUEUE_QUERY_KEY, data);
      storeSetConnected(true);
      setIsOffline(false);
    });

    // Realtime starten
    service.startRealtime();
    storeSetConnected(true);

    // Online/Offline Handler
    const handleOnline = () => {
      setIsOffline(false);
      storeSetConnected(true);
      
      // Ausstehende Operationen synchronisieren
      if (pendingQueue.current.length > 0) {
        syncPendingOperations();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      storeSetConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      unsubscribe();
      service.stopRealtime();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, queryClient, storeSetQueueItems, storeSetConnected]);

  // Ausstehende Operationen synchronisieren
  const syncPendingOperations = async () => {
    const service = serviceRef.current;
    
    while (pendingQueue.current.length > 0) {
      const op = pendingQueue.current.shift();
      if (op) {
        try {
          await service.updateStatus(op.patientId, op.newStatus);
          setPendingOperations((prev) => prev - 1);
        } catch (error) {
          // Zurueck in Queue bei Fehler
          pendingQueue.current.unshift(op);
          break;
        }
      }
    }
  };

  // Optimistisches Update fuer Patienten-Verschiebung
  const movePatient = useCallback(
    async (patientId: string, newStatus: QueueStatus) => {
      const service = serviceRef.current;
      const previousItems = useDashboardStore.getState().queueItems;
      
      try {
        storeSetLoading(true);
        
        // 1. Optimistic Update im Store
        if (enableOptimisticUpdates) {
          const optimisticItems = previousItems.map((p) =>
            p.id === patientId ? { ...p, status: newStatus } : p
          );
          storeSetQueueItems(optimisticItems);
          queryClient.setQueryData(QUEUE_QUERY_KEY, optimisticItems);
        }
        
        // 2. Offline-Check
        if (!navigator.onLine) {
          pendingQueue.current.push({ patientId, newStatus });
          setPendingOperations((prev) => prev + 1);
          setIsOffline(true);
          return;
        }
        
        // 3. API Call
        await service.updateStatus(patientId, newStatus);
        
        // 4. Cache invalidieren fuer frische Daten
        queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
        
      } catch (err) {
        console.error('[useSupabaseRealtime] Failed to move patient:', err);
        
        // Rollback bei Fehler
        if (enableOptimisticUpdates) {
          storeSetQueueItems(previousItems);
          queryClient.setQueryData(QUEUE_QUERY_KEY, previousItems);
        }
        
        storeSetError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        storeSetLoading(false);
      }
    },
    [queryClient, storeSetQueueItems, storeSetLoading, storeSetError, enableOptimisticUpdates]
  );

  // Arzt zuweisen
  const assignDoctor = useCallback(
    async (patientId: string, doctorId: string) => {
      const service = serviceRef.current;
      
      try {
        storeSetLoading(true);
        await service.assignDoctor(patientId, doctorId);
        queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
      } catch (err) {
        console.error('[useSupabaseRealtime] Failed to assign doctor:', err);
        storeSetError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        storeSetLoading(false);
      }
    },
    [queryClient, storeSetLoading, storeSetError]
  );

  // Manuelles Refresh
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      // Nicht den Service zerstoeren, da er singleton ist
      // Nur bei Logout destroyQueueService() aufrufen
    };
  }, []);

  return {
    items,
    isLoading,
    isError,
    error: error as Error | null,
    isConnected: useDashboardStore((state) => state.isConnected),
    isOffline,
    movePatient,
    assignDoctor,
    refresh,
    pendingOperations,
  };
}

/**
 * Hook fuer Queue-Statistiken mit Realtime-Updates
 */
export function useRealtimeStats(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const storeUpdateStats = useDashboardStore((state) => state.updateStats);
  const stats = useDashboardStore((state) => state.stats);
  const serviceRef = useRef(getQueueService());

  useEffect(() => {
    if (!enabled) return;

    const service = serviceRef.current;
    
    // Stats beim Mount laden
    service.getStats().then((newStats) => {
      storeUpdateStats(newStats);
    });

    // Regelmaessige Updates
    const interval = setInterval(async () => {
      try {
        const newStats = await service.getStats();
        storeUpdateStats(newStats);
      } catch (error) {
        console.warn('[useRealtimeStats] Error fetching stats:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, storeUpdateStats]);

  return {
    ...stats,
    isMockMode: isMockMode(),
  };
}

/**
 * Hook fuer kritische Patienten mit Echtzeit-Alerts
 */
export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    patientId: string;
    message: string;
    level: 'CRITICAL' | 'WARNING';
    timestamp: Date;
  }>>([]);

  useEffect(() => {
    if (isMockMode()) return;

    // Socket.IO Alert Listener
    import('../../lib/socketClient').then((mod) => {
      const s = mod.getSocket();
      
      s.on('triage:alert', (data: {
        patientId: string;
        level: 'CRITICAL' | 'WARNING';
        message: string;
      }) => {
        setAlerts((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${data.patientId}`,
            patientId: data.patientId,
            message: data.message,
            level: data.level,
            timestamp: new Date(),
          },
        ]);
      });
    });

    return () => {
      import('../../lib/socketClient').then((mod) => {
        const s = mod.getSocket();
        s.off('triage:alert');
      });
    };
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  return {
    alerts,
    dismissAlert,
    hasAlerts: alerts.length > 0,
    criticalCount: alerts.filter((a) => a.level === 'CRITICAL').length,
  };
}

// Re-export fuer Migration
export { useSupabaseRealtime as useRealtimeQueue };
