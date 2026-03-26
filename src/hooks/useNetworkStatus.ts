import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  /** Current online status */
  isOnline: boolean;
  /** Whether we were previously offline (useful for "reconnected" notifications) */
  wasOffline: boolean;
  /** Type of network connection (if available) */
  connectionType: string | null;
  /** Estimated effective network speed (if available) */
  effectiveType: string | null;
  /** Whether the connection is metered (mobile data) */
  isMetered: boolean;
}

/**
 * useNetworkStatus - Hook for tracking network connectivity
 * 
 * Tracks:
 * - Online/offline status
 * - Connection type changes
 * - Network speed estimates
 * - Metered connection status
 * 
 * @example
 * const { isOnline, wasOffline } = useNetworkStatus();
 * 
 * @example
 * const { isOnline, connectionType, isMetered } = useNetworkStatus();
 * if (!isOnline) return <OfflineMessage />;
 * if (isMetered) return <LowBandwidthMode />;
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
    connectionType: null,
    effectiveType: null,
    isMetered: false,
  });
  
  // Get connection info from Network Information API (if available)
  const getConnectionInfo = useCallback(() => {
    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (conn) {
      return {
        connectionType: conn.type || null,
        effectiveType: (conn as NetworkInformation & { effectiveType?: string }).effectiveType || null,
        isMetered: conn.saveData || false,
      };
    }
    return {
      connectionType: null,
      effectiveType: null,
      isMetered: false,
    };
  }, []);
  
  useEffect(() => {
    // Initial status
    setStatus(prev => ({
      ...prev,
      ...getConnectionInfo(),
    }));
    
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        wasOffline: !prev.isOnline,
      }));
    };
    
    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: false,
      }));
    };
    
    const handleConnectionChange = () => {
      setStatus(prev => ({
        ...prev,
        ...getConnectionInfo(),
      }));
    };
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection changes (if API available)
    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (conn) {
      conn.addEventListener('change', handleConnectionChange);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [getConnectionInfo]);
  
  return status;
}

/**
 * Utility hook that returns true when offline for a minimum duration
 * Useful for avoiding flicker during brief disconnections
 * 
 * @param minimumDuration - Minimum time offline before reporting (ms)
 */
export function useDebouncedOffline(minimumDuration = 2000): boolean {
  const { isOnline } = useNetworkStatus();
  const [isDebouncedOffline, setIsDebouncedOffline] = useState(false);
  
  useEffect(() => {
    if (isOnline) {
      setIsDebouncedOffline(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setIsDebouncedOffline(true);
    }, minimumDuration);
    
    return () => clearTimeout(timer);
  }, [isOnline, minimumDuration]);
  
  return isDebouncedOffline;
}

export default useNetworkStatus;

// Type augmentation for Network Information API
declare global {
  interface NetworkInformation extends EventTarget {
    type?: string;
    effectiveType?: string;
    saveData?: boolean;
  }
}
