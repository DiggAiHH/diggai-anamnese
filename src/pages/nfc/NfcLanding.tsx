// ═══════════════════════════════════════════════════════════════
// Modul 7: NFC Landing Page — Shows after NFC tap
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export function NfcLanding() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'scanning' | 'accepted' | 'rejected' | 'error'>('scanning');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const locationId = searchParams.get('loc') || searchParams.get('locationId');
    const praxisId = searchParams.get('p') || searchParams.get('praxisId');
    const timestamp = searchParams.get('ts');
    const signature = searchParams.get('sig');

    if (!locationId || !praxisId || !timestamp || !signature) {
      setStatus('error');
      setError(t('nfc.missing_params', 'Ungültiger NFC-Link. Bitte erneut scannen.'));
      return;
    }

    const processScan = async () => {
      try {
        const res = await api.nfcScan({
          locationId,
          praxisId,
          timestamp: Number(timestamp),
          signature,
          deviceInfo: navigator.userAgent,
        });

        if (res.accepted) {
          setStatus('accepted');
          setResult(res);
        } else {
          setStatus('rejected');
          setError(res.reason || t('nfc.scan_rejected', 'Scan wurde abgelehnt'));
        }
      } catch (err: any) {
        setStatus('error');
        setError(t('nfc.scan_error', 'Verbindungsfehler beim NFC-Scan'));
      }
    };

    processScan();
  }, [searchParams, t]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* NFC Icon */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
            status === 'scanning' ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' :
            status === 'accepted' ? 'bg-green-100 dark:bg-green-900/30' :
            'bg-red-100 dark:bg-red-900/30'
          }`}>
            {status === 'scanning' && (
              <svg className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === 'accepted' && (
              <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {(status === 'rejected' || status === 'error') && (
              <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            {status === 'scanning' && t('nfc.scanning', 'NFC wird verarbeitet...')}
            {status === 'accepted' && t('nfc.welcome', 'Willkommen!')}
            {status === 'rejected' && t('nfc.rejected', 'Scan abgelehnt')}
            {status === 'error' && t('nfc.error', 'Fehler')}
          </h1>

          {status === 'scanning' && (
            <p className="text-[var(--text-secondary)]">
              {t('nfc.please_wait', 'Bitte warten Sie einen Moment...')}
            </p>
          )}
        </div>

        {/* Success: Show checkpoint info */}
        {status === 'accepted' && result && (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-lg border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">
                {result.checkpointType === 'ENTRANCE' && '🏥'}
                {result.checkpointType === 'WAITING' && '🪑'}
                {result.checkpointType === 'LAB' && '🧪'}
                {result.checkpointType === 'EKG' && '💓'}
                {result.checkpointType === 'ROOM' && '🚪'}
                {result.checkpointType === 'CHECKOUT' && '✅'}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {result.roomName || result.checkpointType}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('nfc.station_registered', 'Station erfolgreich registriert')}
                </p>
              </div>
            </div>

            {result.checkpointType === 'ENTRANCE' && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('nfc.entrance_info', 'Sie wurden erfolgreich eingecheckt. Bitte folgen Sie den Anweisungen auf dem Bildschirm.')}
                </p>
              </div>
            )}

            {result.checkpointType === 'CHECKOUT' && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('nfc.checkout_info', 'Vielen Dank für Ihren Besuch!')}
                </p>
                <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
                  {t('nfc.give_feedback', 'Feedback geben')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error/Rejected */}
        {(status === 'rejected' || status === 'error') && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200 text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
            >
              {t('nfc.retry', 'Erneut versuchen')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NfcLanding;
