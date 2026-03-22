// ─── Checkout Form ─────────────────────────────────────────
// Stripe Payment Element Form for secure card collection
// PCI-Compliant: Uses Stripe Elements, no card data in our code

import { useState, type FormEvent } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface CheckoutFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  returnUrl?: string;
  buttonText?: string;
  showSecureNotice?: boolean;
}

/**
 * Stripe Checkout Form using Payment Element
 * 
 * Features:
 * - PCI-compliant card collection
 * - Apple Pay / Google Pay support (if enabled in Stripe)
 * - Real-time validation
 * - Error handling
 * 
 * @example
 * ```tsx
 * <CheckoutForm 
 *   onSuccess={() => console.log('Payment confirmed')}
 *   returnUrl="https://example.com/success"
 * />
 * ```
 */
export function CheckoutForm({
  onSuccess,
  onError,
  returnUrl = `${window.location.origin}/billing/success`,
  buttonText,
  showSecureNotice = true
}: CheckoutFormProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Confirm payment/setup using Stripe Elements
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
          // Optional: Add payment method save preference
          payment_method_data: {
            billing_details: {
              // Can be pre-filled from user data
            }
          }
        },
        // Uncomment to handle confirmation on server instead
        // redirect: 'if_required',
      });

      if (error) {
        // Show error to customer
        const message = error.message || t('billing.paymentError', 'Zahlung fehlgeschlagen');
        setErrorMessage(message);
        onError?.(message);
      } else {
        // Payment succeeded (this won't be reached with redirect)
        setIsComplete(true);
        onSuccess?.();
      }
    } catch (err: any) {
      const message = err.message || t('billing.unexpectedError', 'Ein unerwarteter Fehler ist aufgetreten');
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle payment element change to track completion
  const handleChange = (event: any) => {
    setIsComplete(event.complete);
    if (event.error) {
      setErrorMessage(event.error.message);
    } else {
      setErrorMessage(null);
    }
  };

  if (!stripe || !elements) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">
          {t('billing.loadingStripe', 'Zahlungssystem wird geladen...')}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Payment Element - collects card details securely */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <PaymentElement 
          onChange={handleChange}
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto',
              }
            }
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Secure Notice */}
      {showSecureNotice && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Lock className="w-3 h-3" />
          <span>
            {t('billing.secureNotice', 'SSL-gesichert · PCI-DSS Level 1 · Keine Kartendaten werden gespeichert')}
          </span>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isLoading || !isComplete}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('billing.processing', 'Wird verarbeitet...')}
          </>
        ) : (
          buttonText || t('billing.payNow', 'Jetzt bezahlen')
        )}
      </Button>
    </form>
  );
}

/**
 * Setup Intent Form
 * For collecting payment method without immediate charge
 * Used when creating subscriptions with trial period
 */
export function SetupIntentForm({
  onSuccess,
  onError,
  buttonText,
}: {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  buttonText?: string;
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing/setup-complete`,
        },
      });

      if (error) {
        const message = error.message || t('billing.setupError', 'Einrichtung fehlgeschlagen');
        setErrorMessage(message);
        onError?.(message);
      } else {
        onSuccess?.();
      }
    } catch (err: any) {
      const message = err.message || t('billing.unexpectedError', 'Ein unerwarteter Fehler ist aufgetreten');
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (event: any) => {
    setIsComplete(event.complete);
    if (event.error) {
      setErrorMessage(event.error.message);
    } else {
      setErrorMessage(null);
    }
  };

  if (!stripe || !elements) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <PaymentElement onChange={handleChange} />
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Lock className="w-3 h-3" />
        <span>
          {t('billing.secureNotice', 'SSL-gesichert · Ihre Kartendaten sind sicher')}
        </span>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isLoading || !isComplete}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('billing.saving', 'Wird gespeichert...')}
          </>
        ) : (
          buttonText || t('billing.savePaymentMethod', 'Zahlungsmethode speichern')
        )}
      </Button>
    </form>
  );
}

export default CheckoutForm;
