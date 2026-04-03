import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface VerificationStatus {
  success: boolean;
  subscription?: {
    id: string;
    tier: string;
    status: string;
    trialEndsAt: string;
  };
}

export function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<VerificationStatus['subscription'] | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setError('Keine Session ID gefunden. Bitte kontaktieren Sie den Support.');
      return;
    }

    // Verify the checkout session
    async function verifyCheckout() {
      try {
        const response = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || 'Verifizierung fehlgeschlagen');
        }

        setSubscription(data.subscription);
        setStatus('success');
      } catch (err: any) {
        console.error('Checkout verification failed:', err);
        setError(err.message);
        setStatus('error');
      }
    }

    verifyCheckout();
  }, [sessionId]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Zahlung wird verifiziert...
          </h2>
          <p className="text-gray-600">
            Bitte warten Sie einen Moment, während wir Ihre Zahlung bestätigen.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ein Fehler ist aufgetreten
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Die Verifizierung Ihrer Zahlung ist fehlgeschlagen.'}
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/pricing')} className="w-full">
              Zurück zur Preisübersicht
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.href = 'mailto:support@diggai.de'}
              className="w-full"
            >
              Support kontaktieren
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Willkommen bei DiggAI!
          </h1>

          <p className="text-gray-600 mb-6">
            Ihre Zahlung war erfolgreich. Ihre 14-tägige Testphase beginnt jetzt.
          </p>

          {subscription && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Ihr Abonnement</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Tarif:</span>
                  <span className="font-medium text-blue-900">{subscription.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Status:</span>
                  <span className="font-medium text-blue-900">
                    {subscription.status === 'TRIAL' ? 'Testphase' : 'Aktiv'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Test endet:</span>
                  <span className="font-medium text-blue-900">
                    {new Date(subscription.trialEndsAt).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/verwaltung')}
              className="w-full"
              size="lg"
            >
              Zum Dashboard
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/onboarding')}
              className="w-full"
            >
              Einrichtung starten
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            Eine Bestätigungs-E-Mail wurde an Sie gesendet.
            <br />
            Bei Fragen erreichen Sie uns unter{' '}
            <a href="mailto:support@diggai.de" className="text-blue-600 hover:underline">
              support@diggai.de
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSuccess;
