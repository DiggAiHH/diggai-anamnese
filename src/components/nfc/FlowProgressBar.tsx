// ═══════════════════════════════════════════════════════════════
// Modul 7: Flow Progress Bar Component
// ═══════════════════════════════════════════════════════════════

import { useTranslation } from 'react-i18next';

interface FlowProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  status: string;
  delayMinutes?: number;
  compact?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'from-blue-500 to-blue-600',
  PAUSED: 'from-yellow-500 to-yellow-600',
  COMPLETED: 'from-green-500 to-green-600',
  CANCELLED: 'from-red-500 to-red-600',
};

export function FlowProgressBar({ currentStep, totalSteps, stepLabels, status, delayMinutes, compact = false }: FlowProgressBarProps) {
  const { t } = useTranslation();
  const percent = totalSteps > 0 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`bg-gradient-to-r ${STATUS_COLORS[status] || STATUS_COLORS.ACTIVE} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
          {currentStep + 1}/{totalSteps}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t('nfc.flow_progress', 'Fortschritt')}
        </span>
        <div className="flex items-center gap-2">
          {delayMinutes && delayMinutes > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              ⏰ +{delayMinutes}min
            </span>
          )}
          <span className="text-sm text-[var(--text-secondary)]">{percent}%</span>
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className={`bg-gradient-to-r ${STATUS_COLORS[status] || STATUS_COLORS.ACTIVE} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Step dots */}
      {stepLabels && (
        <div className="flex justify-between mt-1">
          {stepLabels.map((label, idx) => (
            <div key={idx} className="flex flex-col items-center" style={{ width: `${100 / stepLabels.length}%` }}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                idx < currentStep ? 'bg-green-500' :
                idx === currentStep ? 'bg-blue-500 ring-2 ring-blue-300 dark:ring-blue-700' :
                'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span className="text-[10px] text-[var(--text-secondary)] mt-1 truncate max-w-full text-center">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FlowProgressBar;
