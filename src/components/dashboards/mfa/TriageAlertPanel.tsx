/**
 * TriageAlertPanel Component
 * 
 * Zeigt kritische Patienten mit Warnungen an.
 * Pulsierende Animation fuer CRITICAL-Level.
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { useCriticalPatients } from '../../../hooks/useDashboard/useRealtimeQueue';
import { useDashboardStore } from '../../../store/dashboardStore';
import { TriageBadge } from '../shared/TriageBadge';
import { cn } from '../../../lib/utils';

interface TriageAlertPanelProps {
  className?: string;
  enableSound?: boolean;
}

export const TriageAlertPanel: React.FC<TriageAlertPanelProps> = ({
  className,
  enableSound = true,
}) => {
  const { t } = useTranslation();
  const { patients, hasCritical, criticalCount } = useCriticalPatients();
  const selectPatient = useDashboardStore((state) => state.selectPatient);

  // Akustische Warnung bei kritischen Patienten
  useEffect(() => {
    if (!enableSound || !hasCritical) return;

    // Einfacher Beep-Sound
    const playAlert = () => {
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 880; // A5
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.warn('Audio alert failed:', error);
      }
    };

    playAlert();
  }, [hasCritical, enableSound, patients.length]);

  if (!hasCritical) {
    return (
      <div
        className={cn(
          'bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-emerald-400">
              {t('dashboard.triage.allClear')}
            </h3>
            <p className="text-sm text-emerald-400/70">
              {t('dashboard.triage.noCriticalPatients')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="triage-alert-panel"
      className={cn(
        'bg-red-500/10 border border-red-500/30 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-red-500/20 border-b border-red-500/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-red-400">
              {t('dashboard.triage.criticalAlert')}
            </h3>
            <p className="text-sm text-red-400/70">
              {criticalCount} {t('dashboard.triage.criticalPatients')}
            </p>
          </div>
        </div>
        
        {/* Sound Toggle */}
        <button
          className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          aria-label={enableSound ? 'Ton aus' : 'Ton an'}
        >
          {enableSound ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Kritische Patienten Liste */}
      <div className="p-4 space-y-3">
        {patients
          .filter((p) => p.triageLevel === 'CRITICAL')
          .slice(0, 3)
          .map((patient) => (
            <div
              key={patient.id}
              onClick={() => selectPatient(patient.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer',
                'bg-red-500/10 border border-red-500/20',
                'hover:bg-red-500/20 transition-colors'
              )}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center text-white font-semibold text-sm">
                {patient.patientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">
                    {patient.displayName}
                  </span>
                  <TriageBadge
                    level="CRITICAL"
                    size="sm"
                    pulse
                    showLabel={false}
                  />
                </div>
                <p className="text-sm text-white/50 truncate">
                  {patient.service}
                </p>
              </div>

              {/* Flags */}
              {patient.criticalFlags.length > 0 && (
                <div className="flex flex-col gap-1">
                  {patient.criticalFlags.slice(0, 2).map((flag) => (
                    <span
                      key={flag.id}
                      className="text-xs text-red-300 bg-red-500/20 px-2 py-0.5 rounded"
                    >
                      {flag.description}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

        {patients.filter((p) => p.triageLevel === 'CRITICAL').length > 3 && (
          <p className="text-center text-sm text-red-400/70">
            +{patients.filter((p) => p.triageLevel === 'CRITICAL').length - 3} weitere
          </p>
        )}
      </div>
    </div>
  );
};
