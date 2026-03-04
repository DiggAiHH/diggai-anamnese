import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PatternLock } from './PatternLock';
import { hashPattern } from '../../utils/patternAuth';
import { api } from '../../api/client';

interface PatientIdentifyProps {
  onIdentified: (data: {
    patientId: string;
    patientNumber: string;
    name: string;
    gender: string;
    birthDate: string;
  }) => void;
  onFallback: () => void;
  onError?: (message: string) => void;
}

type IdentifyStep = 'form' | 'pattern' | 'success';

/**
 * PatientIdentify – Fast-track identification for returning patients.
 * Collects birthDate + insuranceNumber, optionally verifies security pattern.
 * Replaces the full 0001→0011→0002→0003→0004 chain for known patients.
 */
export function PatientIdentify({ onIdentified, onFallback, onError }: PatientIdentifyProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<IdentifyStep>('form');
  const [birthDate, setBirthDate] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [patientNumber, setPatientNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<{
    patientId: string;
    patientNumber: string;
    name: string;
    gender: string;
    birthDate: string;
    requiresPattern: boolean;
  } | null>(null);

  const handleLookup = useCallback(async () => {
    setError(null);

    if (!birthDate) {
      setError(t('identify.error_birthdate', 'Bitte Geburtsdatum eingeben'));
      return;
    }
    if (!insuranceNumber || insuranceNumber.length < 5) {
      setError(t('identify.error_insurance', 'Bitte gültige Versicherungsnummer eingeben'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.identifyPatient({
        birthDate,
        insuranceNumber,
        patientNumber: patientNumber || undefined,
      });

      if (response.found && response.patient) {
        setPatientData({
          patientId: response.patient.id,
          patientNumber: response.patient.patientNumber || '',
          name: response.patient.name || '',
          gender: response.patient.gender || '',
          birthDate: response.patient.birthDate || birthDate,
          requiresPattern: response.patient.requiresPattern || false,
        });

        if (response.patient.requiresPattern) {
          setStep('pattern');
        } else {
          setStep('success');
          onIdentified({
            patientId: response.patient.id,
            patientNumber: response.patient.patientNumber || '',
            name: response.patient.name || '',
            gender: response.patient.gender || '',
            birthDate: response.patient.birthDate || birthDate,
          });
        }
      } else {
        setError(t('identify.not_found', 'Patient nicht gefunden. Bitte Daten manuell eingeben.'));
        setTimeout(() => onFallback(), 2000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verbindungsfehler';
      if (msg.includes('429') || msg.includes('rate')) {
        setError(t('identify.rate_limit', 'Zu viele Versuche. Bitte warten Sie 10 Minuten.'));
      } else {
        setError(t('identify.error_server', 'Serverfehler. Bitte an der Anmeldung wenden.'));
      }
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [birthDate, insuranceNumber, patientNumber, onIdentified, onFallback, onError, t]);

  const handlePatternComplete = useCallback(
    async (pattern: number[]) => {
      if (!patientData) return;

      setLoading(true);
      try {
        const patternHash = await hashPattern(pattern);
        const response = await api.verifyPattern({
          patientId: patientData.patientId,
          patternHash,
        });

        if (response.verified) {
          setStep('success');
          onIdentified({
            patientId: patientData.patientId,
            patientNumber: patientData.patientNumber,
            name: patientData.name,
            gender: patientData.gender,
            birthDate: patientData.birthDate,
          });
        } else {
          setError(t('pattern.wrong', 'Falsches Muster. Bitte erneut versuchen.'));
        }
      } catch {
        setError(t('identify.error_server', 'Serverfehler'));
      } finally {
        setLoading(false);
      }
    },
    [patientData, onIdentified, t]
  );

  // Complexity indicator for UX (patternComplexity removed – unused)

  if (step === 'pattern') {
    return (
      <div className="question-container animate-in">
        <h2 className="question-title">
          {t('pattern.title', '🔐 Sicherheitsmuster')}
        </h2>
        <p className="question-description mb-4">
          {t('pattern.instruction_verify', 'Zeichnen Sie Ihr Sicherheitsmuster')}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <PatternLock
          mode="verify"
          onComplete={handlePatternComplete}
          onError={(msg) => {
            setError(msg);
            onFallback();
          }}
          disabled={loading}
        />

        <button
          type="button"
          onClick={onFallback}
          className="mt-6 text-sm underline block mx-auto"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('identify.manual_entry', 'Daten manuell eingeben')}
        </button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="question-container animate-in text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="question-title">
          {t('identify.welcome_back', 'Willkommen zurück!')}
        </h2>
        {patientData && (
          <p className="question-description">
            {patientData.name && `${patientData.name} — `}
            {patientData.patientNumber && `PID: ${patientData.patientNumber}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="question-container animate-in">
      <h2 className="question-title">
        {t('identify.title', '🔍 Patienten-Identifikation')}
      </h2>
      <p className="question-description mb-6">
        {t(
          'identify.subtitle',
          'Als bestehender Patient benötigen wir nur wenige Daten zur Identifikation.'
        )}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center animate-pulse">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Geburtsdatum */}
        <div>
          <label
            htmlFor="identify-birthdate"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('identify.birthdate', 'Geburtsdatum')} *
          </label>
          <input
            id="identify-birthdate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="input-base w-full"
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Versicherungsnummer */}
        <div>
          <label
            htmlFor="identify-insurance"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('identify.insurance_number', 'Versicherungsnummer')} *
          </label>
          <input
            id="identify-insurance"
            type="text"
            value={insuranceNumber}
            onChange={(e) => setInsuranceNumber(e.target.value.replace(/\s/g, ''))}
            placeholder={t('identify.insurance_placeholder', 'z.B. A123456789') as string}
            className="input-base w-full"
            required
            autoComplete="off"
            maxLength={20}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('identify.insurance_hint', 'Steht auf Ihrer Gesundheitskarte')}
          </p>
        </div>

        {/* Patientennummer (optional) */}
        <div>
          <label
            htmlFor="identify-pid"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('identify.patient_number', 'Patientennummer (optional)')}
          </label>
          <input
            id="identify-pid"
            type="text"
            value={patientNumber}
            onChange={(e) => setPatientNumber(e.target.value)}
            placeholder={t('identify.pid_placeholder', 'z.B. P-10001') as string}
            className="input-base w-full"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={handleLookup}
          disabled={loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('identify.searching', 'Suche...')}
            </>
          ) : (
            t('identify.submit', 'Identifizieren')
          )}
        </button>

        <button
          type="button"
          onClick={onFallback}
          className="btn-secondary px-6"
        >
          {t('identify.skip', 'Überspringen')}
        </button>
      </div>

      <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
        {t(
          'identify.privacy_note',
          '§630f BGB — Ihre Daten werden ausschließlich zur Identifikation verwendet.'
        )}
      </p>
    </div>
  );
}
