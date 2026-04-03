import { useState, useEffect } from 'react';
import { useStripe, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Trash2, Plus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}

interface PaymentMethodsProps {
  customerId?: string;
  onUpdate?: () => void;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Card brand icons mapping
const cardBrandNames: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  diners: 'Diners Club',
  unionpay: 'UnionPay',
};

export function PaymentMethods({ customerId, onUpdate }: PaymentMethodsProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  async function fetchPaymentMethods() {
    try {
      setLoading(true);
      const response = await fetch('/api/billing/payment-methods');
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      const data = await response.json();
      setMethods(data.methods || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNew() {
    try {
      setLoading(true);
      const response = await fetch('/api/billing/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      if (!response.ok) throw new Error('Failed to create setup intent');

      const data = await response.json();
      setSetupIntentSecret(data.clientSecret);
      setShowAddForm(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(methodId: string) {
    if (!confirm('Sind Sie sicher, dass Sie diese Zahlungsmethode entfernen möchten?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/billing/payment-methods/${methodId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove payment method');

      await fetchPaymentMethods();
      onUpdate?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && methods.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Zahlungsmethoden</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddNew}
          disabled={loading || showAddForm}
        >
          <Plus className="w-4 h-4 mr-1" />
          Hinzufügen
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {showAddForm && setupIntentSecret && (
        <div className="bg-gray-50 rounded-lg p-4">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: setupIntentSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#4A90E2',
                },
              },
            }}
          >
            <SetupIntentForm
              onSuccess={() => {
                setShowAddForm(false);
                setSetupIntentSecret(null);
                fetchPaymentMethods();
                onUpdate?.();
              }}
              onCancel={() => {
                setShowAddForm(false);
                setSetupIntentSecret(null);
              }}
            />
          </Elements>
        </div>
      )}

      {methods.length === 0 && !showAddForm ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Keine Zahlungsmethoden gespeichert</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddNew}
            className="mt-3"
          >
            Zahlungsmethode hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {method.card ? (
                      <>
                        {cardBrandNames[method.card.brand] || method.card.brand} •••• {method.card.last4}
                      </>
                    ) : (
                      'Karte'
                    )}
                  </p>
                  {method.card && (
                    <p className="text-sm text-gray-500">
                      Läuft ab {method.card.expMonth}/{method.card.expYear}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(method.id)}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Setup Intent Form Component
import { PaymentElement, useElements } from '@stripe/react-stripe-js';

interface SetupIntentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function SetupIntentForm({ onSuccess, onCancel }: SetupIntentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Ein Fehler ist aufgetreten');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1" />
              Speichern
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

export default PaymentMethods;
