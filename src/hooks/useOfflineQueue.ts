import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDb } from '../lib/offlineDb';
import { useNetworkStatus } from './useNetworkStatus';

interface OfflineQueueState {
  /** Number of pending items in queue */
  queueCount: number;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Timestamp of last successful sync */
  lastSync: number | null;
  /** Error from last sync attempt */
  lastError: string | null;
}

interface OfflineQueueActions {
  /** Manually trigger sync */
  syncNow: () => Promise<void>;
  /** Clear all pending items (use with caution) */
  clearQueue: () => Promise<void>;
}

/**
 * useOfflineQueue - Hook for managing offline data queue
 * 
 * Tracks pending items in IndexedDB and provides sync functionality.
 * Automatically syncs when connection is restored.
 * 
 * @example
 * const { queueCount, isSyncing, syncNow } = useOfflineQueue();
 * 
 * @example
 * const { queueCount, lastSync } = useOfflineQueue();
 * <Badge count={queueCount} />
 */
export function useOfflineQueue(): OfflineQueueState & OfflineQueueActions {
  const { isOnline } = useNetworkStatus();
  const [state, setState] = useState<OfflineQueueState>({
    queueCount: 0,
    isSyncing: false,
    lastSync: null,
    lastError: null,
  });
  
  const syncInProgress = useRef(false);
  
  // Update queue count from IndexedDB
  const updateQueueCount = useCallback(async () => {
    try {
      const pendingDiary = await offlineDb.pendingDiary.where('synced').equals(0).count();
      const pendingMeasures = await offlineDb.pendingMeasures.where('synced').equals(0).count();
      const queueItems = await offlineDb.offlineQueue.where('synced').equals(0).count();
      
      setState(prev => ({
        ...prev,
        queueCount: pendingDiary + pendingMeasures + queueItems,
      }));
      
      // Store in localStorage for quick access by SW
      localStorage.setItem('pwa_pending_queue', String(pendingDiary + pendingMeasures + queueItems));
    } catch (error) {
      console.error('Failed to update queue count:', error);
    }
  }, []);
  
  // Initial count and periodic updates
  useEffect(() => {
    updateQueueCount();
    
    // Update every 5 seconds
    const interval = setInterval(updateQueueCount, 5000);
    
    return () => clearInterval(interval);
  }, [updateQueueCount]);
  
  // Sync function
  const syncNow = useCallback(async () => {
    if (syncInProgress.current || !isOnline) {
      return;
    }
    
    syncInProgress.current = true;
    setState(prev => ({ ...prev, isSyncing: true, lastError: null }));
    
    try {
      // Trigger background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('submit-answers');
        await (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('sync-diary');
      } else {
        // Fallback: sync manually via API calls
        await performManualSync();
      }
      
      // Wait a moment for sync to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update count
      await updateQueueCount();
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: Date.now(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastError: error instanceof Error ? error.message : 'Sync failed',
      }));
    } finally {
      syncInProgress.current = false;
    }
  }, [isOnline, updateQueueCount]);
  
  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && state.queueCount > 0 && !state.isSyncing) {
      syncNow();
    }
  }, [isOnline, state.queueCount, state.isSyncing, syncNow]);
  
  // Manual sync fallback for browsers without Background Sync API
  const performManualSync = async () => {
    // Get pending diary entries
    const pendingDiary = await offlineDb.pendingDiary.where('synced').equals(0).toArray();
    
    for (const entry of pendingDiary) {
      try {
        const response = await fetch('/api/pwa/diary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        
        if (response.ok) {
          await offlineDb.pendingDiary.update(entry.id!, { synced: true });
        }
      } catch (error) {
        console.error('Failed to sync diary entry:', error);
      }
    }
  };
  
  const clearQueue = useCallback(async () => {
    try {
      await offlineDb.pendingDiary.clear();
      await offlineDb.pendingMeasures.clear();
      await offlineDb.offlineQueue.clear();
      await updateQueueCount();
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }, [updateQueueCount]);
  
  return {
    ...state,
    syncNow,
    clearQueue,
  };
}

export default useOfflineQueue;
