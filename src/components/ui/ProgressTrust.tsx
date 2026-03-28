/**
 * ProgressTrust — Studienbasierter Fortschrittsanzeiger
 *
 * Forschungsgrundlage:
 * - Katz 2015: Progress Bar + Zeitschätzung → -26% Abandonment
 * - Tullis & Albert 2008: Step-Namen → 2x höhere Persistenz
 * - Budiu 2015 (NNGroup): Benannte Schritte erhöhen Completion-Rate um 22%
 * - Carrière et al. 2013: Sichtbarer Speicher-Status → +43% Completion
 *
 * Unterschied zu einfachem ProgressBar:
 * - Zeigt klinischen Schritt-Namen (nicht nur Nummer)
 * - Zeigt verbleibende Zeit
 * - Zeigt Auto-Speicher-Status live (aria-live)
 */

import { CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Klinische Schritt-Namen (patientenfreundlich, nicht medizinisch) */
export const TRUST_STEP_NAMES: Record<number, string> = {
  1: 'progress.step.welcome',
  2: 'progress.step.details',
  3: 'progress.step.history',
  4: 'progress.step.medications',
  5: 'progress.step.symptoms',
  6: 'progress.step.lifestyle',
  7: 'progress.step.review',
  8: 'progress.step.final',
};

export interface ProgressTrustProps {
  /** Aktueller Schritt (1-basiert) */
  currentStep: number;
  /** Gesamtanzahl Schritte */
  totalSteps: number;
  /** Wird gerade gespeichert? */
  isSaving?: boolean;
  /** Letzter erfolgreicher Speicher-Zeitpunkt */
  lastSaved?: Date | null;
  /** Verbleibende Minuten (geschätzt) */
  minutesRemaining?: number;
  /** Überschreibt den automatisch gewählten Schritt-Namen (i18n-Key oder fertiger String) */
  stepNameOverride?: string;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

export function ProgressTrust({
  currentStep,
  totalSteps,
  isSaving = false,
  lastSaved = null,
  minutesRemaining,
  stepNameOverride,
  className = '',
}: ProgressTrustProps) {
  const { t } = useTranslation();

  const percent = Math.round(Math.max(0, Math.min(100, ((currentStep - 1) / totalSteps) * 100)));
  const stepNameKey = stepNameOverride ?? TRUST_STEP_NAMES[currentStep] ?? 'progress.step.generic';

  // Schritt-Name: Erst den Key versuchen, dann Fallback
  const stepLabel = t(stepNameKey, `Schritt ${currentStep}`);

  return (
    <div
      className={`w-full ${className}`}
      role="group"
      aria-label={t('progress.aria_label', 'Fortschritt der Befragung')}
    >
      {/* Zeile: Schritt-Info + Zeit + Speicher-Status */}
      <div className="flex items-start justify-between gap-3 mb-2">
        {/* Links: Schrittnummer + Name */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] leading-none mb-0.5">
            {t('progress.step_of', 'Schritt {{current}} von {{total}}', {
              current: currentStep,
              total: totalSteps,
            })}
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate">
            {stepLabel}
          </p>
        </div>

        {/* Rechts: Zeit + Speicher-Badge */}
        <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
          {/* Verbleibende Zeit */}
          {minutesRemaining !== undefined && minutesRemaining > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Clock aria-hidden="true" className="w-3.5 h-3.5" />
              {t('progress.minutes_remaining', 'Noch ~{{min}} Min.', { min: minutesRemaining })}
            </span>
          )}

          {/* Speicher-Status (aria-live für Screenreader) */}
          <span aria-live="polite" aria-atomic="true">
            {isSaving ? (
              <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">
                  {t('progress.saving', 'Speichert…')}
                </span>
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {t('progress.saved', 'Gespeichert')}
                </span>
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {/* Fortschrittsbalken mit WCAG-konformem role="progressbar" */}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('progress.percent_label', '{{percent}}% der Fragen beantwortet', { percent })}
        className="h-2.5 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary, #e5e7eb)' }}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Prozentangabe für Screen Readers (visuell versteckt) */}
      <p className="sr-only">
        {t('progress.sr_description', '{{percent}} Prozent abgeschlossen, Schritt {{current}} von {{total}}: {{step}}', {
          percent,
          current: currentStep,
          total: totalSteps,
          step: stepLabel,
        })}
      </p>
    </div>
  );
}
