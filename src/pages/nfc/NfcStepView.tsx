// ═══════════════════════════════════════════════════════════════
// Modul 7: NFC Step View — Patient's current flow step
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface FlowStep {
  order: number;
  type: string;
  roomType?: string;
  estimatedMinutes: number;
  instructions: any;
  preparationVideo?: string;
}

interface FlowProgress {
  currentStep: number;
  status: string;
  delayMinutes: number;
  delayReason?: string;
  flow: {
    name: string;
    steps: FlowStep[];
  };
}

const STEP_ICONS: Record<string, string> = {
  WAITING: '🪑',
  REGISTRATION: '📋',
  LAB: '🧪',
  EKG: '💓',
  CONSULTATION: '👨‍⚕️',
  CHECKOUT: '✅',
  PAYMENT: '💳',
};

const STEP_COLORS: Record<string, string> = {
  WAITING: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
  REGISTRATION: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  LAB: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  EKG: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
  CONSULTATION: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  CHECKOUT: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
  PAYMENT: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700',
};

export function NfcStepView({ progress }: { progress: FlowProgress }) {
  const { t, i18n } = useTranslation();
  const [, setElapsed] = useState(0);

  const currentStepData = progress.flow.steps[progress.currentStep];
  const totalSteps = progress.flow.steps.length;
  const percentComplete = Math.round(((progress.currentStep + 1) / totalSteps) * 100);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const getInstruction = (instructions: any): string => {
    if (typeof instructions === 'string') return instructions;
    return instructions?.[i18n.language] || instructions?.de || instructions?.en || '';
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 border border-[var(--border-primary)]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">{progress.flow.name}</span>
          <span className="text-sm text-[var(--text-secondary)]">{progress.currentStep + 1}/{totalSteps} {t('nfc.steps', 'Schritte')}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Delay notice */}
      {progress.delayMinutes > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700 flex items-start gap-3">
          <span className="text-xl">⏰</span>
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {t('nfc.delay_notice', 'Verzögerung')}: ~{progress.delayMinutes} {t('nfc.minutes', 'Minuten')}
            </p>
            {progress.delayReason && (
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{progress.delayReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Current step card */}
      {currentStepData && (
        <div className={`rounded-2xl p-6 border-2 ${STEP_COLORS[currentStepData.type] || 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">{STEP_ICONS[currentStepData.type] || '📍'}</span>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)] font-medium">
                {t('nfc.current_station', 'Aktuelle Station')}
              </p>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {currentStepData.roomType || currentStepData.type}
              </h2>
            </div>
          </div>

          <p className="text-[var(--text-primary)] mb-4">
            {getInstruction(currentStepData.instructions)}
          </p>

          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>~{currentStepData.estimatedMinutes} {t('nfc.minutes', 'Minuten')}</span>
          </div>
        </div>
      )}

      {/* Step timeline */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 border border-[var(--border-primary)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t('nfc.your_flow', 'Ihr Behandlungsablauf')}</h3>
        <div className="space-y-3">
          {progress.flow.steps.map((step, idx) => {
            const isDone = idx < progress.currentStep;
            const isCurrent = idx === progress.currentStep;
            return (
              <div key={idx} className={`flex items-center gap-3 ${isDone ? 'opacity-60' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isDone ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-2 dark:ring-offset-gray-800' :
                  'bg-gray-200 dark:bg-gray-700 text-[var(--text-secondary)]'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span className={`text-sm ${isCurrent ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {STEP_ICONS[step.type]} {step.roomType || step.type}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default NfcStepView;
