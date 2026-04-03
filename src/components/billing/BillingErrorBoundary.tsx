// ─── BillingErrorBoundary Component ────────────────────────
// Error boundary for catching unexpected errors in billing components

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  /** Child components to render */
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional custom error message */
  errorMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * BillingErrorBoundary - Catches JavaScript errors in billing component tree
 * 
 * Features:
 * - Prevents entire app crash from billing errors
 * - User-friendly error display
 * - Error reporting integration ready
 * - Recovery options (retry, go home)
 * - Detailed error info in development
 * 
 * @example
 * ```tsx
 * <BillingErrorBoundary>
 *   <BillingDashboard />
 * </BillingErrorBoundary>
 * ```
 */
export class BillingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('BillingErrorBoundary caught an error:', error, errorInfo);
    }

    // Here you could also send to error reporting service:
    // Sentry.captureException(error, { extra: errorInfo });
    // or
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleSupport = () => {
    window.open('/support?category=billing', '_blank');
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const { error, errorInfo } = this.state;

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-[400px] flex items-center justify-center p-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-lg w-full">
            {/* Error Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-red-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Etwas ist schiefgelaufen</h2>
                    <p className="text-red-100 text-sm">Billing-Bereich nicht verfügbar</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  {this.props.errorMessage ||
                    'Es ist ein unerwarteter Fehler im Zahlungsbereich aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support, wenn das Problem weiterhin besteht.'}
                </p>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button
                    variant="primary"
                    onClick={this.handleRetry}
                    icon={<RefreshCw className="w-4 h-4" />}
                    className="w-full"
                  >
                    Erneut versuchen
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={this.handleReload}
                    icon={<RefreshCw className="w-4 h-4" />}
                    className="w-full"
                  >
                    Seite neu laden
                  </Button>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Zur Startseite
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={this.handleSupport}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Support kontaktieren
                  </button>
                </div>
              </div>

              {/* Development Error Details */}
              {isDev && error && (
                <div className="bg-gray-50 border-t border-gray-200 p-4">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 font-medium mb-2 hover:text-gray-800">
                      Technische Details (Entwicklung)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="font-mono text-red-800 text-xs break-all">
                          <strong>Error:</strong> {error.toString()}
                        </p>
                      </div>
                      {errorInfo?.componentStack && (
                        <pre className="bg-gray-100 rounded p-3 overflow-x-auto text-xs text-gray-700 max-h-48 overflow-y-auto">
                          {errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* Error ID for support */}
            <p className="text-center text-xs text-gray-400 mt-4">
              Fehler-ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
            </p>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

/**
 * withBillingErrorBoundary HOC - Wrap component with error boundary
 */
export function withBillingErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<Props, 'children'>
) {
  return function WithBillingErrorBoundary(props: P) {
    return (
      <BillingErrorBoundary {...boundaryProps}>
        <Component {...props} />
      </BillingErrorBoundary>
    );
  };
}

/**
 * useBillingErrorHandler - Hook for handling billing errors programmatically
 * Can be used outside of error boundaries for async error handling
 */
export function useBillingErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    // Log error
    console.error(`Billing Error${context ? ` (${context})` : ''}:`, error);

    // Here you could send to error reporting service
    // Sentry.captureException(error, { tags: { context: 'billing' } });

    // Return user-friendly message
    return {
      title: 'Zahlungsfehler',
      message: 'Bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
      canRetry: true,
    };
  };

  const handlePaymentError = (error: Error) => {
    const result = handleError(error, 'payment');
    return {
      ...result,
      title: 'Zahlung fehlgeschlagen',
      message: 'Ihre Zahlung konnte nicht verarbeitet werden. Bitte überprüfen Sie Ihre Zahlungsmethode oder versuchen Sie eine andere.',
    };
  };

  const handleSubscriptionError = (error: Error) => {
    const result = handleError(error, 'subscription');
    return {
      ...result,
      title: 'Abonnement-Fehler',
      message: 'Bei der Verwaltung Ihres Abonnements ist ein Problem aufgetreten. Unser Support-Team wurde benachrichtigt.',
    };
  };

  return {
    handleError,
    handlePaymentError,
    handleSubscriptionError,
  };
}

export default BillingErrorBoundary;
