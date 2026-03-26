import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  /** Minimum number of visits before showing prompt */
  minVisits?: number;
  /** Cooldown period after dismissal (days) */
  dismissCooldownDays?: number;
  /** Show on mobile only */
  mobileOnly?: boolean;
}

const STORAGE_KEY = 'install_prompt_dismissed';
const VISIT_KEY = 'install_prompt_visits';

/**
 * InstallPrompt - Smart PWA install prompt
 * 
 * Features:
 * - Respects user dismissal with configurable cooldown
 * - Tracks visit count before showing
 * - Mobile-only option
 * - Analytics tracking
 * - Smooth animations
 * 
 * @example
 * <InstallPrompt minVisits={2} dismissCooldownDays={7} />
 * 
 * @example
 * <InstallPrompt mobileOnly />
 */
export function InstallPrompt({
  minVisits = 2,
  dismissCooldownDays = 30,
  mobileOnly = false,
}: InstallPromptProps) {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [visits, setVisits] = useState(0);
  
  useEffect(() => {
    // Check if mobile only
    if (mobileOnly && !(/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent))) {
      return;
    }
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }
    
    // Increment visit count
    const currentVisits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_KEY, String(currentVisits));
    setVisits(currentVisits);
    
    // Check cooldown
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismiss = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceDismiss < dismissCooldownDays) {
        return;
      }
    }
    
    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show if minimum visits reached
      if (currentVisits >= minVisits) {
        setShowPrompt(true);
      }
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(VISIT_KEY);
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [minVisits, dismissCooldownDays, mobileOnly]);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show install prompt
    deferredPrompt.prompt();
    
    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    
    // Track analytics
    try {
      await fetch('/api/analytics/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          visits,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Ignore analytics errors
    }
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    
    setShowPrompt(false);
  };
  
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    
    // Track dismiss
    try {
      fetch('/api/analytics/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: 'dismissed',
          visits,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {
      // Ignore
    }
  };
  
  if (!showPrompt) return null;
  
  return (
    <div 
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6" aria-hidden="true" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 id="install-title" className="font-semibold text-[var(--text-primary)] mb-1">
              {t('installPrompt.title', 'DiggAI installieren')}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('installPrompt.description', 'Installieren Sie die App für schnelleren Zugriff und Offline-Funktionen.')}
            </p>
          </div>
          
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={t('installPrompt.dismiss', 'Schließen')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 px-4 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium transition-colors hover:bg-[var(--border-primary)]"
          >
            {t('installPrompt.later', 'Später')}
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {t('installPrompt.install', 'Installieren')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
