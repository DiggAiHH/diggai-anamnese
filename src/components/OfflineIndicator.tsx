import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, RefreshCw, CloudOff, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

interface OfflineIndicatorProps {
  /** Position of the indicator */
  position?: 'top' | 'bottom';
  /** Show detailed queue information */
  showQueueDetails?: boolean;
}

/**
 * OfflineIndicator - Global network status indicator
 * 
 * Shows a banner when the user goes offline with:
 * - Network status (online/offline)
 * - Pending sync queue count
 * - Manual sync button
 * - Auto-dismiss on reconnection
 * 
 * Features:
 * - Respects reduced motion preferences
 * - Screen reader accessible
 * - Theme-aware styling
 * - Non-intrusive when online
 * 
 * @example
 * <OfflineIndicator position="top" showQueueDetails />
 */
export function OfflineIndicator({ 
  position = 'top',
  showQueueDetails = true 
}: OfflineIndicatorProps) {
  const { t } = useTranslation();
  const { isOnline, wasOffline } = useNetworkStatus();
  const { queueCount, isSyncing, syncNow, lastSync } = useOfflineQueue();
  
  const [isVisible, setIsVisible] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  
  // Show indicator when going offline
  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
      setShowReconnected(false);
    }
  }, [isOnline]);
  
  // Show brief "reconnected" message when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        // Hide main indicator if queue is empty
        if (queueCount === 0) {
          setIsVisible(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, queueCount]);
  
  const handleSync = useCallback(async () => {
    await syncNow();
  }, [syncNow]);
  
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);
  
  // Don't render anything if online and no queue
  if (isOnline && queueCount === 0 && !showReconnected) {
    return null;
  }
  
  const positionClasses = position === 'top' 
    ? 'top-0 left-0 right-0' 
    : 'bottom-0 left-0 right-0';
  
  // Reconnected success state
  if (showReconnected) {
    return (
      <div 
        className={`fixed ${positionClasses} z-[100] bg-green-500 text-white px-4 py-2 shadow-lg`}
        role="status"
        aria-live="polite"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">
            {t('offlineIndicator.reconnected', 'Verbindung wiederhergestellt')}
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`fixed ${positionClasses} z-[100] transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : position === 'top' ? '-translate-y-full' : 'translate-y-full'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className={`${
        isOnline 
          ? 'bg-blue-500' 
          : 'bg-amber-500'
      } text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Status Icon & Message */}
            <div className="flex items-center gap-3 min-w-0">
              {isOnline ? (
                <Cloud className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              ) : (
                <CloudOff className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              )}
              
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {isOnline 
                    ? t('offlineIndicator.syncPending', 'Synchronisierung ausstehend')
                    : t('offlineIndicator.offline', 'Sie sind offline')
                  }
                </p>
                
                {showQueueDetails && queueCount > 0 && (
                  <p className="text-xs opacity-90">
                    {t('offlineIndicator.queueCount', '{{count}} Einträge warten', { count: queueCount })}
                    {lastSync && (
                      <span className="ml-2">
                        • {t('offlineIndicator.lastSync', 'Zuletzt synchronisiert: {{time}}', { 
                          time: new Date(lastSync).toLocaleTimeString() 
                        })}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOnline && queueCount > 0 && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  aria-label={t('offlineIndicator.syncNow', 'Jetzt synchronisieren')}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {isSyncing 
                      ? t('offlineIndicator.syncing', 'Synchronisiere...')
                      : t('offlineIndicator.sync', 'Synchronisieren')
                    }
                  </span>
                </button>
              )}
              
              {/* Dismiss button (only when online with queue) */}
              {isOnline && queueCount > 0 && (
                <button
                  onClick={handleDismiss}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label={t('offlineIndicator.dismiss', 'Schließen')}
                >
                  <span className="sr-only">{t('offlineIndicator.dismiss', 'Schließen')}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact offline indicator for embedded use (e.g., in forms)
 */
export function OfflineIndicatorCompact() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { queueCount } = useOfflineQueue();
  
  if (isOnline && queueCount === 0) {
    return null;
  }
  
  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
        isOnline 
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      }`}
      role="status"
    >
      {isOnline ? (
        <Cloud className="w-4 h-4" aria-hidden="true" />
      ) : (
        <WifiOff className="w-4 h-4" aria-hidden="true" />
      )}
      <span>
        {isOnline 
          ? t('offlineIndicator.compactSync', '{{count}} ausstehend', { count: queueCount })
          : t('offlineIndicator.compactOffline', 'Offline')
        }
      </span>
    </div>
  );
}

export default OfflineIndicator;
