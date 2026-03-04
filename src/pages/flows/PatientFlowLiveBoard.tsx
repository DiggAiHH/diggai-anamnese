// ═══════════════════════════════════════════════════════════════
// Modul 7: Patient Flow Live Board — MFA/Arzt Dashboard
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlowProgressBar } from '../../components/nfc/FlowProgressBar';

interface FlowEntry {
  sessionId: string;
  patientName: string;
  flowName: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  delayMinutes: number;
  stepType: string;
  roomName: string;
  startedAt: string;
}

const DEMO_ENTRIES: FlowEntry[] = [
  { sessionId: 's1', patientName: 'Müller, K.', flowName: 'Allgemeinuntersuchung', currentStep: 2, totalSteps: 5, status: 'ACTIVE', delayMinutes: 0, stepType: 'LAB', roomName: 'Labor 1', startedAt: new Date(Date.now() - 20 * 60000).toISOString() },
  { sessionId: 's2', patientName: 'Schmidt, A.', flowName: 'Vorsorge U40', currentStep: 1, totalSteps: 4, status: 'ACTIVE', delayMinutes: 10, stepType: 'WAITING', roomName: 'Wartezimmer', startedAt: new Date(Date.now() - 35 * 60000).toISOString() },
  { sessionId: 's3', patientName: 'Weber, T.', flowName: 'EKG-Check', currentStep: 3, totalSteps: 4, status: 'ACTIVE', delayMinutes: 0, stepType: 'CONSULTATION', roomName: 'Zimmer 2', startedAt: new Date(Date.now() - 45 * 60000).toISOString() },
  { sessionId: 's4', patientName: 'Fischer, L.', flowName: 'Blutabnahme', currentStep: 2, totalSteps: 3, status: 'COMPLETED', delayMinutes: 0, stepType: 'CHECKOUT', roomName: 'Ausgang', startedAt: new Date(Date.now() - 60 * 60000).toISOString() },
];

const STEP_ICONS: Record<string, string> = {
  WAITING: '🪑', REGISTRATION: '📋', LAB: '🧪', EKG: '💓',
  CONSULTATION: '👨‍⚕️', CHECKOUT: '✅', PAYMENT: '💳',
};

export function PatientFlowLiveBoard() {
  const { t } = useTranslation();
  const [entries] = useState<FlowEntry[]>(DEMO_ENTRIES);
  const [filter, setFilter] = useState<'all' | 'active' | 'delayed' | 'completed'>('all');

  const filtered = entries.filter(e => {
    if (filter === 'active') return e.status === 'ACTIVE' && e.delayMinutes === 0;
    if (filter === 'delayed') return e.delayMinutes > 0;
    if (filter === 'completed') return e.status === 'COMPLETED';
    return true;
  });

  const activeCount = entries.filter(e => e.status === 'ACTIVE').length;
  const delayedCount = entries.filter(e => e.delayMinutes > 0).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t('flows.liveboard', 'Patienten-Flow LiveBoard')}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {t('flows.liveboard_sub', 'Echtzeit-Übersicht aller aktiven Behandlungsabläufe')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {activeCount} {t('flows.active', 'Aktiv')}
            </span>
            {delayedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm font-medium">
                ⏰ {delayedCount} {t('flows.delayed', 'Verzögert')}
              </span>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'delayed', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {f === 'all' && t('flows.filter_all', 'Alle')}
              {f === 'active' && t('flows.filter_active', 'Aktiv')}
              {f === 'delayed' && t('flows.filter_delayed', 'Verzögert')}
              {f === 'completed' && t('flows.filter_completed', 'Abgeschlossen')}
            </button>
          ))}
        </div>

        {/* Flow cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(entry => (
            <div key={entry.sessionId} className={`bg-[var(--bg-secondary)] rounded-2xl p-5 border ${
              entry.delayMinutes > 0
                ? 'border-amber-300 dark:border-amber-700'
                : entry.status === 'COMPLETED'
                ? 'border-green-300 dark:border-green-700'
                : 'border-[var(--border-primary)]'
            }`}>
              {/* Patient + Flow header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{entry.patientName}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{entry.flowName}</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                  entry.status === 'ACTIVE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                  entry.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                  {entry.status}
                </span>
              </div>

              {/* Current station */}
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[var(--bg-primary)]">
                <span className="text-lg">{STEP_ICONS[entry.stepType] || '📍'}</span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{entry.roomName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{entry.stepType}</p>
                </div>
              </div>

              {/* Delay badge */}
              {entry.delayMinutes > 0 && (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  ⏰ +{entry.delayMinutes} Min. {t('flows.delay', 'Verzögerung')}
                </div>
              )}

              {/* Progress */}
              <FlowProgressBar
                currentStep={entry.currentStep}
                totalSteps={entry.totalSteps}
                status={entry.status}
                delayMinutes={entry.delayMinutes}
                compact
              />

              {/* Actions */}
              {entry.status === 'ACTIVE' && (
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    {t('flows.advance', 'Weiter')}
                  </button>
                  <button className="flex-1 py-1.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-lg transition-colors">
                    {t('flows.delay_btn', 'Verzögern')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl mb-4 block">🏥</span>
            <p className="text-[var(--text-secondary)]">{t('flows.no_active', 'Keine aktiven Flows')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientFlowLiveBoard;
