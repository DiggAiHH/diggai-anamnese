/**
 * ChapterProgress — Kapitel-basierte Fortschrittsanzeige
 *
 * Forschungsgrundlage:
 * - Nielsen Heuristik #1: Visibility of System Status
 * - Goal Gradient Effect (Hull 1932, Kivetz et al. 2006): Motivation steigt mit sichtbarem Fortschritt
 * - Cognitive Load Theory (Sweller 1988): Chunking reduziert extraneous load
 *
 * Zeigt Fortschritt als Kapitel statt als einzelne Fragen:
 * "Grunddaten ✓ → Anliegen [====] → Medikamente ○ → Abschluss ○"
 * + Zeitschätzung: "Verbleibend: ca. 4 Min"
 */

import { useTranslation } from 'react-i18next';
import { Check, Circle, ChevronRight } from 'lucide-react';

export interface Chapter {
  id: string;
  titleKey: string;
  titleFallback: string;
  /** Estimated minutes for this chapter */
  estimatedMinutes: number;
  /** Section IDs from questions.ts that belong to this chapter */
  sections: string[];
}

/** Default chapter definitions mapping to question sections */
export const DEFAULT_CHAPTERS: readonly Chapter[] = [
  {
    id: 'identity',
    titleKey: 'progress.step.welcome',
    titleFallback: 'Grunddaten',
    estimatedMinutes: 2,
    sections: ['basis'],
  },
  {
    id: 'reason',
    titleKey: 'progress.step.details',
    titleFallback: 'Ihr Anliegen',
    estimatedMinutes: 3,
    sections: ['anamnese', 'verlauf'],
  },
  {
    id: 'history',
    titleKey: 'progress.step.history',
    titleFallback: 'Vorerkrankungen',
    estimatedMinutes: 2,
    sections: ['vorerkrankungen'],
  },
  {
    id: 'medications',
    titleKey: 'progress.step.medications',
    titleFallback: 'Medikamente & Allergien',
    estimatedMinutes: 2,
    sections: ['medikamente', 'allergien'],
  },
  {
    id: 'symptoms',
    titleKey: 'progress.step.symptoms',
    titleFallback: 'Symptome',
    estimatedMinutes: 2,
    sections: ['symptome'],
  },
  {
    id: 'lifestyle',
    titleKey: 'progress.step.lifestyle',
    titleFallback: 'Weitere Infos',
    estimatedMinutes: 1,
    sections: ['lifestyle', 'sozial'],
  },
  {
    id: 'review',
    titleKey: 'progress.step.review',
    titleFallback: 'Überprüfung',
    estimatedMinutes: 1,
    sections: ['zusammenfassung'],
  },
] as const;

type ChapterStatus = 'completed' | 'active' | 'pending';

interface ChapterProgressProps {
  /** Which chapter index is currently active (0-based) */
  activeChapterIndex: number;
  /** Total questions answered so far (for time estimation) */
  answeredCount: number;
  /** Total estimated questions */
  totalEstimated: number;
  /** Override chapters if needed */
  chapters?: readonly Chapter[];
  /** Compact mode for mobile */
  compact?: boolean;
}

export function ChapterProgress({
  activeChapterIndex,
  answeredCount,
  totalEstimated,
  chapters = DEFAULT_CHAPTERS,
  compact = false,
}: ChapterProgressProps) {
  const { t } = useTranslation();

  const getStatus = (index: number): ChapterStatus => {
    if (index < activeChapterIndex) return 'completed';
    if (index === activeChapterIndex) return 'active';
    return 'pending';
  };

  // Estimate remaining time based on remaining chapters
  const remainingChapters = chapters.slice(activeChapterIndex);
  const remainingMinutes = remainingChapters.reduce((sum, ch) => sum + ch.estimatedMinutes, 0);

  // Overall percentage (for the linear progress bar)
  const overallPercent = totalEstimated > 0
    ? Math.min(100, Math.round((answeredCount / totalEstimated) * 100))
    : 0;

  return (
    <div className="w-full space-y-3">
      {/* Time Estimate */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span className="font-medium">
          {t('progress.aria_label', 'Fortschritt der Befragung')}
        </span>
        <span className="font-semibold text-[var(--text-primary)]">
          {t('progress.minutes_remaining', 'Noch ~{{min}} Min.', { min: remainingMinutes })}
        </span>
      </div>

      {/* Overall Progress Bar */}
      <div className="w-full h-2 rounded-full bg-[rgba(44,95,138,0.12)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#4A90E2] to-[#81B29A] transition-all duration-500 ease-out"
          style={{ width: `${overallPercent}%` }}
          role="progressbar"
          aria-valuenow={overallPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('progress.percent_label', '{{percent}}% der Fragen beantwortet', { percent: overallPercent })}
        />
      </div>

      {/* Chapter Steps */}
      {!compact && (
        <div className="flex items-center gap-1 overflow-x-auto py-1" role="list" aria-label={t('progress.chapters', 'Kapitel')}>
          {chapters.map((chapter, index) => {
            const status = getStatus(index);
            return (
              <div key={chapter.id} className="flex items-center shrink-0" role="listitem">
                {/* Step indicator */}
                <div className="flex items-center gap-1.5">
                  {status === 'completed' ? (
                    <div className="w-5 h-5 rounded-full bg-[#81B29A] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" aria-hidden="true" />
                    </div>
                  ) : status === 'active' ? (
                    <div className="w-5 h-5 rounded-full bg-[#4A90E2] flex items-center justify-center animate-pulse">
                      <Circle className="w-2.5 h-2.5 text-white fill-white" aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--border-primary)]" />
                  )}
                  <span
                    className={[
                      'text-xs font-medium whitespace-nowrap',
                      status === 'completed' ? 'text-[#81B29A]' : '',
                      status === 'active' ? 'text-[#4A90E2] font-semibold' : '',
                      status === 'pending' ? 'text-[var(--text-secondary)]' : '',
                    ].join(' ')}
                  >
                    {t(chapter.titleKey, chapter.titleFallback)}
                  </span>
                </div>

                {/* Connector */}
                {index < chapters.length - 1 && (
                  <ChevronRight className="w-3 h-3 mx-1 text-[var(--border-primary)] shrink-0" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
