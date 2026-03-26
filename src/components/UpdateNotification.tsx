import { useState, useEffect } from 'react';
import { RefreshCw, ArrowUpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UpdateNotificationProps {
  /** Position of the notification */
  position?: 'top' | 'bottom';
  /** Auto-reload after showing (ms) - 0 to disable */
  autoReloadDelay?: number;
}

/**
 * UpdateNotification - Notifies users of service worker updates
 * 
 * Shows a toast when a new service worker version is available.
 * Allows users to reload to get the latest version.
 * 
 * Features:
 * - Detects SW updates
 * - Shows update notification toast
 * - Forces reload on accept
 * - Auto-reload option for seamless updates
 * - Respects user interaction
 * 
 * @example
 * <UpdateNotification position="top" />
 * 
 * @example
 * <UpdateNotification autoReloadDelay={10000} />
 */
export function UpdateNotification({
  position = 'top',
  autoReloadDelay = 0,
}: UpdateNotificationProps) {
  const { t } = useTranslation();
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [autoReloadTimer, setAutoReloadTimer] = useState<number | null>(null);
  
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    let refreshing = false;
    
    const handleUpdateFound = (registration: ServiceWorkerRegistration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        
        newWorker.addEventListener('statechange', () => {
          // Show notification when new worker is waiting
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdate(true);
            
            // Auto-reload after delay if configured
            if (autoReloadDelay > 0) {
              const timer = window.setTimeout(() => {
                handleUpdate();
              }, autoReloadDelay);
              setAutoReloadTimer(timer);
            }
          }
        });
      });
    };
    
    // Register for updates
    navigator.serviceWorker.ready.then(handleUpdateFound);
    
    // Handle controller change (new SW activated)
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (autoReloadTimer) {
        clearTimeout(autoReloadTimer);
      }
    };
  }, [autoReloadDelay, autoReloadTimer]);
  
  const handleUpdate = () => {
    if (!waitingWorker) return;
    
    // Clear auto-reload timer if user manually updates
    if (autoReloadTimer) {
      clearTimeout(autoReloadTimer);
      setAutoReloadTimer(null);
    }
    
    // Tell SW to skip waiting
    waitingWorker.postMessage('SKIP_WAITING');
    setShowUpdate(false);
  };
  
  const handleDismiss = () => {
    setShowUpdate(false);
    
    // Clear auto-reload timer
    if (autoReloadTimer) {
      clearTimeout(autoReloadTimer);
      setAutoReloadTimer(null);
    }
    
    // Store dismissal to not show again this session
    sessionStorage.setItem('update_notification_dismissed', 'true');
  };
  
  // Check if dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem('update_notification_dismissed')) {
      setShowUpdate(false);
    }
  }, []);
  
  if (!showUpdate) return null;
  
  const positionClasses = position === 'top'
    ? 'top-4 left-1/2 -translate-x-1/2'
    : 'bottom-4 left-1/2 -translate-x-1/2';
  
  return (
    <div 
      className={`fixed ${positionClasses} z-[100] w-full max-w-md px-4`}
      role="alert"
      aria-live="polite"
    >
      <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {t('updateNotification.title', 'Update verfügbar')}
            </p>
            <p className="text-xs text-blue-100">
              {t('updateNotification.description', 'Eine neue Version ist verfügbar. Laden Sie neu, um die neuesten Funktionen zu erhalten.')}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-blue-100 hover:text-white transition-colors"
            >
              {t('updateNotification.later', 'Später')}
            </button>
            <button
              onClick={handleUpdate}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              {t('updateNotification.reload', 'Neu laden')}
            </button>
          </div>
        </div>
        
        {/* Progress bar for auto-reload */}
        {autoReloadDelay > 0 && autoReloadTimer && (
          <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
              style={{ 
                animation: `shrink ${autoReloadDelay}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export default UpdateNotification;
