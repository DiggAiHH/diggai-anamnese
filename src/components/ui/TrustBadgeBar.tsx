/**
 * TrustBadgeBar — Studienbasierte Vertrauenssignale
 *
 * Forschungsgrundlage:
 * - Adjekum et al. 2018 (JMIR): Privacy-Badges above-the-fold → +15–25% Completion
 * - Busch-Casler & Radic 2023 (DE-spezifisch): DSGVO-Transparenz → +12–18% Completion
 * - Yin et al. 2021: Sicherheits-Symbole → bis zu 30x höhere Trust-Odds
 *
 * Platzierung: Above-the-fold, sichtbar bevor der Patient ein Feld ausfüllt
 */

import { ShieldCheck, Lock, UserCheck, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TrustBadgeBarProps {
  /** Zusätzliche CSS-Klassen (Positioning, Margin) */
  className?: string;
  /** Kompakte Darstellung – weniger Padding, kleinere Schrift */
  compact?: boolean;
}

export function TrustBadgeBar({ className = '', compact = false }: TrustBadgeBarProps) {
  const { t } = useTranslation();

  const badges = [
    {
      id: 'dsgvo',
      icon: <ShieldCheck aria-hidden="true" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: t('trust.badge.dsgvo', 'DSGVO-konform'),
      colorClass:
        'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/60 dark:border-blue-800',
    },
    {
      id: 'encrypted',
      icon: <Lock aria-hidden="true" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: t('trust.badge.encrypted', 'Ende-zu-Ende verschlüsselt'),
      colorClass:
        'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800',
    },
    {
      id: 'doctor-only',
      icon: <UserCheck aria-hidden="true" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: t('trust.badge.doctor_only', 'Nur Ihr Arzt sieht Ihre Daten'),
      colorClass:
        'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-900/60 dark:border-slate-700',
    },
    {
      id: 'non-commercial',
      icon: <Award aria-hidden="true" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: t('trust.badge.non_commercial', 'Keine kommerzielle Weitergabe'),
      colorClass:
        'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/60 dark:border-violet-800',
    },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t('trust.badge.aria_group', 'Datenschutz- und Sicherheitszertifizierungen')}
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
    >
      {badges.map((badge) => (
        <span
          key={badge.id}
          className={[
            'inline-flex items-center gap-1.5 rounded-full border font-medium select-none',
            compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
            badge.colorClass,
          ].join(' ')}
        >
          {badge.icon}
          {badge.label}
        </span>
      ))}
    </div>
  );
}
