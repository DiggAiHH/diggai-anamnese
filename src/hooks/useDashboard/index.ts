/**
 * Dashboard Hooks Export
 * 
 * Zentrale Export-Datei fuer alle Dashboard-Hooks.
 */

// Legacy exports (fuer Abwaertskompatibilitaet)
export {
  useRealtimeQueue,
  useQueueStats,
  useCriticalPatients,
  useLongestWaiters,
} from './useRealtimeQueue';

// Neue Phase 5 exports
export {
  useSupabaseRealtime,
  useRealtimeStats,
  useRealtimeAlerts,
} from './useSupabaseRealtime';

// Service exports
export {
  getQueueService,
  destroyQueueService,
  isMockMode,
} from '../../services/queueService';
