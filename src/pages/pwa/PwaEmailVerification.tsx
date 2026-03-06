import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { usePwaVerifyEmail } from '../../hooks/useApi';

export default function PwaEmailVerification() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const verify = usePwaVerifyEmail();

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    verify.mutate(token, {
      onSuccess: () => setStatus('success'),
      onError: () => setStatus('error'),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg text-center max-w-sm w-full space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
            <p className="text-gray-600 dark:text-gray-400">E-Mail wird verifiziert…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">E-Mail bestätigt!</h2>
            <p className="text-gray-500 text-sm">Ihr Konto ist jetzt vollständig aktiviert.</p>
            <button onClick={() => navigate('/pwa/dashboard')}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
              Zum Dashboard
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold">Verifizierung fehlgeschlagen</h2>
            <p className="text-gray-500 text-sm">Der Link ist ungültig oder abgelaufen.</p>
            <button onClick={() => navigate('/pwa/settings')}
              className="w-full py-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              Zu den Einstellungen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
