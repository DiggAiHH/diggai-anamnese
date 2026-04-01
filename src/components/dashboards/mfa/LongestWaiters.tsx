/**
 * LongestWaiters Component
 * 
 * Zeigt die Patienten mit der laengsten Wartezeit.
 * Aktualisiert sich automatisch jede Minute.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, AlertCircle } from 'lucide-react';
import { useLongestWaiters } from '../../../hooks/useDashboard/useRealtimeQueue';
import { useDashboardStore } from '../../../store/dashboardStore';
import { formatDuration } from '../../../lib/dateUtils';
import { cn } from '../../../lib/utils';
import type { PatientQueueItem } from '../../../types/dashboard';

interface LongestWaitersProps {
  limit?: number;
  warningThreshold?: number; // Minuten bis Warnung
  criticalThreshold?: number; // Minuten bis Kritisch
  className?: string;
}

export const LongestWaiters: React.FC<LongestWaitersProps> = ({
  limit = 5,
  warningThreshold = 30,
  criticalThreshold = 45,
  className,
}) => {
  const { t } = useTranslation();
  const { patients } = useLongestWaiters(limit);
  const selectPatient = useDashboardStore((state) => state.selectPatient);

  if (patients.length === 0) {
    return (
      <div
        className={cn(
          'bg-white/5 border border-white/10 rounded-xl p-4',
          className
        )}
      >
        <h3 className="font-semibold text-white mb-2">
          {t('dashboard.waitTime.longest')}
        </h3>
        <p className="text-sm text-white/40">
          {t('dashboard.waitTime.noPatients')}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="longest-waiters"
      className={cn(
        'bg-white/5 border border-white/10 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="font-semibold text-white">
          {t('dashboard.waitTime.longest')}
        </h3>
        <Clock className="w-4 h-4 text-white/40" />
      </div>

      {/* Liste */}
      <div className="divide-y divide-white/5">
        {patients.map((patient, index) => (
          <WaiterRow
            key={patient.id}
            patient={patient}
            index={index}
            warningThreshold={warningThreshold}
            criticalThreshold={criticalThreshold}
            onClick={() => selectPatient(patient.id)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Einzelne Zeile in der Warteliste
 */
const WaiterRow: React.FC<{
  patient: PatientQueueItem;
  index: number;
  warningThreshold: number;
  criticalThreshold: number;
  onClick: () => void;
}> = ({ patient, index, warningThreshold, criticalThreshold, onClick }) => {
  const [displayTime, setDisplayTime] = useState(patient.waitTimeMinutes);

  // Timer fuer Live-Update der Wartezeit
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime((prev) => prev + 1);
    }, 60000); // Jede Minute

    return () => clearInterval(interval);
  }, []);

  // Farbe basierend auf Wartezeit
  const getWaitTimeColor = (minutes: number): string => {
    if (minutes >= criticalThreshold) return 'text-red-400';
    if (minutes >= warningThreshold) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getRowColor = (minutes: number): string => {
    if (minutes >= criticalThreshold) return 'bg-red-500/5 hover:bg-red-500/10';
    if (minutes >= warningThreshold) return 'bg-amber-500/5 hover:bg-amber-500/10';
    return 'hover:bg-white/5';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
        getRowColor(displayTime)
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Rang */}
      <span
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
          index === 0
            ? 'bg-red-500/30 text-red-400'
            : index === 1
            ? 'bg-amber-500/30 text-amber-400'
            : index === 2
            ? 'bg-yellow-500/30 text-yellow-400'
            : 'bg-white/10 text-white/60'
        )}
      >
        {index + 1}
      </span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {patient.displayName}
        </p>
        <p className="text-xs text-white/40 truncate">
          {patient.service}
        </p>
      </div>

      {/* Wartezeit */}
      <div className="flex items-center gap-2">
        {displayTime >= warningThreshold && (
          <AlertCircle
            className={cn(
              'w-4 h-4',
              displayTime >= criticalThreshold ? 'text-red-400' : 'text-amber-400'
            )}
          />
        )}
        <span
          className={cn(
            'font-semibold text-sm',
            getWaitTimeColor(displayTime)
          )}
        >
          {formatDuration(displayTime)}
        </span>
      </div>
    </div>
  );
};
