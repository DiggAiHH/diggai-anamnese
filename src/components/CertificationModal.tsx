import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PatternLock } from './inputs/PatternLock';
import { hashPattern } from '../utils/patternAuth';
import { api } from '../api/client';

interface CertificationModalProps {
  sessionId: string;
  patientName: string;
  patientGender?: string;
  patientBirthDate?: string;
  onClose: () => void;
  onCertified: (data: { patientNumber: string; patientId: string }) => void;
}

type CertifyStep = 'confirm' | 'insurance' | 'pattern' | 'done';

/**
 * CertificationModal – MFA-initiated patient identity certification.
 * Flow: Confirm identity → Enter insurance number → Patient draws pattern → Done.
 */
export function CertificationModal({
  sessionId,
  patientName,
  patientGender,
  patientBirthDate,
  onClose,
  onCertified,
}: CertificationModalProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<CertifyStep>('confirm');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ patientNumber: string; patientId: string } | null>(null);
  const [patternScore, _setPatternScore] = useState(0);

  const handleCertify = useCallback(async () => {
    if (!insuranceNumber || insuranceNumber.length < 5) {
      setError(t('certify.error_insurance', 'Gültige Versicherungsnummer erforderlich'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.certifyPatient(sessionId, {
        insuranceNumber,
        birthDate: patientBirthDate || '',
        patientName: patientName || undefined,
        gender: patientGender || undefined,
      });

      if (response.success) {
        setResult({ patientNumber: response.patientNumber, patientId: response.patientId });
        setStep('pattern');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Zertifizierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, [sessionId, insuranceNumber, patientBirthDate, patientName, patientGender, t]);

  const handlePatternCreated = useCallback(
    async (pattern: number[]) => {
      if (!result) return;

      setLoading(true);
      try {
        const patternHash = await hashPattern(pattern);
        await api.setPattern(result.patientId, patternHash);
        setStep('done');
        onCertified(result);
      } catch {
        setError(t('certify.pattern_error', 'Muster konnte nicht gespeichert werden'));
      } finally {
        setLoading(false);
      }
    },
    [result, onCertified, t]
  );

  const handleSkipPattern = () => {
    if (result) {
      setStep('done');
      onCertified(result);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--bg-overlay, rgba(0,0,0,0.6))' }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Step 1: Confirm Identity */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              🪪 {t('certify.title', 'Patienten-Zertifizierung')}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('certify.confirm_text', 'Bitte bestätigen Sie die Identität des Patienten anhand eines gültigen Ausweisdokuments.')}
            </p>

            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)' }}>
              <div className="text-sm space-y-2" style={{ color: 'var(--text-primary)' }}>
                <p><strong>{t('certify.name', 'Name')}:</strong> {patientName || '—'}</p>
                <p><strong>{t('certify.gender', 'Geschlecht')}:</strong> {patientGender || '—'}</p>
                <p><strong>{t('certify.birthdate', 'Geburtsdatum')}:</strong> {patientBirthDate || '—'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('insurance')} className="btn-primary flex-1">
                ✅ {t('certify.identity_confirmed', 'Identität bestätigt')}
              </button>
              <button onClick={onClose} className="btn-secondary px-4">
                {t('certify.cancel', 'Abbrechen')}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Insurance Number */}
        {step === 'insurance' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              💳 {t('certify.insurance_title', 'Versicherungsdaten')}
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('certify.insurance_number', 'Versicherungsnummer')} *
              </label>
              <input
                type="text"
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value.replace(/\s/g, ''))}
                placeholder="z.B. A123456789"
                className="input-base w-full"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCertify}
                disabled={loading || insuranceNumber.length < 5}
                className="btn-primary flex-1"
              >
                {loading ? '⏳ Zertifiziere...' : `📋 ${t('certify.submit', 'Zertifizieren')}`}
              </button>
              <button onClick={() => setStep('confirm')} className="btn-secondary px-4">
                {t('certify.back', 'Zurück')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Pattern Setup */}
        {step === 'pattern' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              🔐 {t('certify.pattern_title', 'Sicherheitsmuster einrichten')}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('certify.pattern_desc', 'Der Patient zeichnet jetzt ein Sicherheitsmuster für zukünftige Besuche.')}
            </p>

            {result && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
                ✅ {t('certify.certified', 'Zertifiziert')} — PID: <strong>{result.patientNumber}</strong>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <PatternLock
              mode="create"
              onComplete={handlePatternCreated}
              disabled={loading}
            />

            {patternScore > 0 && (
              <div className="text-center">
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('certify.pattern_strength', 'Sicherheit')}: {patternScore}%
                </div>
                <div className="w-full h-2 rounded-full mt-1" style={{ background: 'var(--bg-input)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${patternScore}%`,
                      background: patternScore > 70 ? '#22c55e' : patternScore > 40 ? '#eab308' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSkipPattern}
              className="text-sm underline block mx-auto"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('certify.skip_pattern', 'Muster überspringen')}
            </button>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">🎉</div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('certify.done_title', 'Zertifizierung abgeschlossen!')}
            </h3>
            {result && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <strong>{t('certify.patient_number', 'Patientennummer')}:</strong>{' '}
                  <span className="font-mono text-lg" style={{ color: 'var(--accent)' }}>
                    {result.patientNumber}
                  </span>
                </p>
              </div>
            )}
            <button onClick={onClose} className="btn-primary px-8">
              {t('certify.close', 'Fertig')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
