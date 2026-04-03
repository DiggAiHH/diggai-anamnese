// ─── BillingError Component ────────────────────────────────
// Error display component with retry functionality for Billing area

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, HelpCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface BillingErrorProps {
  /** Error object or error message string */
  error: Error | string;
  /** Callback to retry the failed operation */
  onRetry?: () => void;
  /** Optional custom title, defaults to German error message */
  title?: string;
  /** Optional custom icon */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show help link */
  showHelp?: boolean;
  /** Size variant */
  size?: 'default' | 'compact';
}

export type { BillingErrorProps };

/**
 * BillingError - Polished error display for billing operations
 * 
 * Features:
 * - Clean, accessible error presentation
 * - Retry functionality with loading state
 * - Help link for user assistance
 * - Smooth animations
 * - Support for both Error objects and string messages
 * 
 * @example
 * ```tsx
 * <BillingError 
 *   error={error} 
 *   onRetry={refetch}
 *   title="Zahlungsinformationen konnten nicht geladen werden"
 * />
 * ```
 */
export function BillingError({
  error,
  onRetry,
  title,
  icon,
  className = '',
  showHelp = true,
  size = 'default',
}: BillingErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const errorMessage = typeof error === 'string' ? error : error.message;
  const defaultTitle = 'Ein Fehler ist aufgetreten';

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  if (size === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        role="alert"
        aria-live="assertive"
        className={`
          bg-red-50 border border-red-200 rounded-lg p-3
          flex items-center gap-3
          ${className}
        `}
      >
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-red-800 flex-1 truncate">
          {errorMessage}
        </p>
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
            aria-label="Erneut versuchen"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        role="alert"
        aria-live="assertive"
        className={`
          bg-gradient-to-br from-red-50 to-red-100/50
          border border-red-200
          rounded-xl p-6
          text-center
          relative
          overflow-hidden
          ${className}
        `}
      >
        {/* Dismiss button (optional) */}
        {!onRetry && (
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Fehlermeldung schließen"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-4"
        >
          {icon || (
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-500" aria-hidden="true" />
            </div>
          )}
        </motion.div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          {title || defaultTitle}
        </h3>

        {/* Error Message */}
        <p className="text-red-700 mb-4 max-w-md mx-auto">
          {errorMessage}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button
              onClick={handleRetry}
              variant="primary"
              loading={isRetrying}
              icon={<RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />}
            >
              Erneut versuchen
            </Button>
          )}
          
          {showHelp && (
            <Button
              variant="ghost"
              icon={<HelpCircle className="w-4 h-4" />}
              onClick={() => window.open('/help/billing', '_blank')}
            >
              Hilfe erhalten
            </Button>
          )}
        </div>

        {/* Error Code (if available) */}
        {typeof error !== 'string' && error.name && error.name !== 'Error' && (
          <p className="mt-4 text-xs text-red-400">
            Fehlercode: {error.name}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * BillingErrorInline - Inline error display for forms and small areas
 */
interface BillingErrorInlineProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function BillingErrorInline({
  error,
  onRetry,
  className = '',
}: BillingErrorInlineProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      role="alert"
      className={`flex items-center gap-2 text-red-600 text-sm ${className}`}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1">{errorMessage}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-red-700 hover:text-red-900 underline font-medium"
        >
          Erneut versuchen
        </button>
      )}
    </motion.div>
  );
}

/**
 * BillingErrorCard - Error display for full card replacement
 */
interface BillingErrorCardProps extends BillingErrorProps {
  cardTitle?: string;
}

export function BillingErrorCard({
  error,
  onRetry,
  title,
  cardTitle,
  className = '',
}: BillingErrorCardProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-live="assertive"
      className={`
        bg-white rounded-xl p-6 border border-red-200 shadow-sm
        ${className}
      `}
    >
      {cardTitle && (
        <h4 className="text-base font-medium text-gray-900 mb-3">{cardTitle}</h4>
      )}
      
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h5 className="font-medium text-red-900 mb-1">
            {title || 'Laden fehlgeschlagen'}
          </h5>
          <p className="text-sm text-red-700 mb-3">{errorMessage}</p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Erneut laden
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default BillingError;
