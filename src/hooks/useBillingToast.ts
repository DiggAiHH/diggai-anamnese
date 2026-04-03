// ─── useBillingToast Hook ──────────────────────────────────
// Toast notifications specifically for billing operations

import { useCallback } from 'react';

// Toast severity types
type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

// Toast notification interface
interface ToastNotification {
  id: string;
  message: string;
  severity: ToastSeverity;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast store (simple event emitter pattern)
class ToastStore {
  private listeners: Set<(toasts: ToastNotification[]) => void> = new Set();
  private toasts: ToastNotification[] = [];

  subscribe(listener: (toasts: ToastNotification[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  add(toast: Omit<ToastNotification, 'id'>) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.notify();

    // Auto-dismiss after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

// Singleton instance
export const toastStore = new ToastStore();

// Billing-specific toast messages
const BILLING_MESSAGES = {
  de: {
    subscriptionCreated: 'Abonnement erfolgreich erstellt',
    subscriptionCancelled: 'Abonnement wird zum Periodenende gekündigt',
    subscriptionResumed: 'Abonnement erfolgreich fortgesetzt',
    paymentMethodAdded: 'Zahlungsmethode erfolgreich hinzugefügt',
    paymentMethodRemoved: 'Zahlungsmethode entfernt',
    paymentSuccessful: 'Zahlung erfolgreich',
    paymentFailed: 'Zahlung fehlgeschlagen',
    invoiceDownloaded: 'Rechnung heruntergeladen',
    quotaWarning: 'KI-Kontingent fast aufgebraucht',
    quotaExceeded: 'KI-Kontingent überschritten',
    billingInfoUpdated: 'Rechnungsinformationen aktualisiert',
    trialEnding: 'Testphase endet bald',
    paymentRequired: 'Zahlung erforderlich',
  },
  en: {
    subscriptionCreated: 'Subscription created successfully',
    subscriptionCancelled: 'Subscription will cancel at period end',
    subscriptionResumed: 'Subscription resumed successfully',
    paymentMethodAdded: 'Payment method added successfully',
    paymentMethodRemoved: 'Payment method removed',
    paymentSuccessful: 'Payment successful',
    paymentFailed: 'Payment failed',
    invoiceDownloaded: 'Invoice downloaded',
    quotaWarning: 'AI quota running low',
    quotaExceeded: 'AI quota exceeded',
    billingInfoUpdated: 'Billing information updated',
    trialEnding: 'Trial period ending soon',
    paymentRequired: 'Payment required',
  },
};

type MessageKey = keyof typeof BILLING_MESSAGES.de;
type Language = 'de' | 'en';

/**
 * useBillingToast - Hook for billing-specific toast notifications
 * 
 * Features:
 * - Predefined billing messages in German and English
 * - Support for custom messages
 * - Action buttons in toasts
 * - Auto-dismiss with configurable duration
 * 
 * @example
 * ```tsx
 * const { showSuccess, showError, showSubscriptionCreated } = useBillingToast();
 * 
 * // Predefined billing message
 * showSubscriptionCreated();
 * 
 * // Custom message
 * showSuccess('Custom success message');
 * 
 * // With action
 * showError('Payment failed', {
 *   action: { label: 'Retry', onClick: handleRetry }
 * });
 * ```
 */
export function useBillingToast(language: Language = 'de') {
  const messages = BILLING_MESSAGES[language];

  const show = useCallback((
    message: string,
    severity: ToastSeverity,
    options?: {
      duration?: number;
      action?: { label: string; onClick: () => void };
    }
  ) => {
    return toastStore.add({
      message,
      severity,
      duration: options?.duration,
      action: options?.action,
    });
  }, []);

  const showSuccess = useCallback((
    message: string,
    options?: { duration?: number; action?: { label: string; onClick: () => void } }
  ) => show(message, 'success', options), [show]);

  const showError = useCallback((
    message: string,
    options?: { duration?: number; action?: { label: string; onClick: () => void } }
  ) => show(message, 'error', { ...options, duration: options?.duration ?? 8000 }), [show]);

  const showInfo = useCallback((
    message: string,
    options?: { duration?: number; action?: { label: string; onClick: () => void } }
  ) => show(message, 'info', options), [show]);

  const showWarning = useCallback((
    message: string,
    options?: { duration?: number; action?: { label: string; onClick: () => void } }
  ) => show(message, 'warning', { ...options, duration: options?.duration ?? 7000 }), [show]);

  // Predefined billing notifications
  const showSubscriptionCreated = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showSuccess(messages.subscriptionCreated, options);
  }, [showSuccess, messages]);

  const showSubscriptionCancelled = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showInfo(messages.subscriptionCancelled, options);
  }, [showInfo, messages]);

  const showSubscriptionResumed = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showSuccess(messages.subscriptionResumed, options);
  }, [showSuccess, messages]);

  const showPaymentMethodAdded = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showSuccess(messages.paymentMethodAdded, options);
  }, [showSuccess, messages]);

  const showPaymentMethodRemoved = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showInfo(messages.paymentMethodRemoved, options);
  }, [showInfo, messages]);

  const showPaymentSuccessful = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showSuccess(messages.paymentSuccessful, options);
  }, [showSuccess, messages]);

  const showPaymentFailed = useCallback((error?: string, options?: { action?: { label: string; onClick: () => void } }) => {
    return showError(error || messages.paymentFailed, { ...options, duration: 10000 });
  }, [showError, messages]);

  const showInvoiceDownloaded = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showSuccess(messages.invoiceDownloaded, options);
  }, [showSuccess, messages]);

  const showQuotaWarning = useCallback((remaining: number, options?: { action?: { label: string; onClick: () => void } }) => {
    return showWarning(`${messages.quotaWarning} (${remaining} verbleibend)`, {
      ...options,
      duration: 10000,
    });
  }, [showWarning, messages]);

  const showQuotaExceeded = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showError(messages.quotaExceeded, {
      ...options,
      action: options?.action || { label: 'Upgrade', onClick: () => {} },
      duration: 0, // Don't auto-dismiss
    });
  }, [showError, messages]);

  const showBillingInfoUpdated = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showSuccess(messages.billingInfoUpdated, options);
  }, [showSuccess, messages]);

  const showTrialEnding = useCallback((daysLeft: number, options?: { action?: { label: string; onClick: () => void } }) => {
    return showWarning(
      `${messages.trialEnding} (${daysLeft} Tage verbleibend)`,
      { ...options, duration: 15000 }
    );
  }, [showWarning, messages]);

  const showPaymentRequired = useCallback((options?: { action?: { label: string; onClick: () => void } }) => {
    return showError(messages.paymentRequired, {
      ...options,
      action: options?.action || { label: 'Zahlungsmethode hinzufügen', onClick: () => {} },
      duration: 0, // Don't auto-dismiss
    });
  }, [showError, messages]);

  return {
    // Generic methods
    show,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    
    // Predefined billing notifications
    showSubscriptionCreated,
    showSubscriptionCancelled,
    showSubscriptionResumed,
    showPaymentMethodAdded,
    showPaymentMethodRemoved,
    showPaymentSuccessful,
    showPaymentFailed,
    showInvoiceDownloaded,
    showQuotaWarning,
    showQuotaExceeded,
    showBillingInfoUpdated,
    showTrialEnding,
    showPaymentRequired,
  };
}

/**
 * ToastContainer component - Render this at app root to display toasts
 */
export function ToastContainer() {
  // This would typically use a state subscription to toastStore
  // and render the actual toast UI components
  // Implementation depends on the app's toast UI system
  return null;
}

export default useBillingToast;
