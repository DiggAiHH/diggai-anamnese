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

  // M2 (Arzt-Feedback 2026-05-03): einheitlicher Pastell-Token statt 4 verschiedener Farben.
  // Token: var(--pastel-compliance) — Lavendel/Mint, in src/design/tokens.ts gepflegt.
  const pastelClass =
    'text-slate-700 bg-[var(--pastel-compliance,#E8F0FE)] border-[var(--pastel-compliance-border,#C9D9F4)] dark:text-slate-200 dark:bg-slate-800/70 dark:border-slate-700';

  const badges = [
    {
      id: 'dsgvo',
      icon: <ShieldCheck aria-hidden="true" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: t('trust.badge.dsgvo', 'DSGVO-konform'),
      colorClass: pastelClass,
    },
    {
      id: 'encrypted',
      icon: <Lock aria-hidden="true" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: t('trust.badge.encrypted', 'Ende-zu-Ende verschlüsselt'),
      colorClass: pastelClass,
    },
    {
      id: 'doctor-only',
      icon: <UserCheck aria-hidden="true" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: t('trust.badge.doctor_only', 'Nur Ihr Arzt sieht Ihre Daten'),
      colorClass: pastelClass,
    },
    {
      id: 'non-commercial',
      icon: <Award aria-hidden="true" className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      label: t('trust.badge.non_commercial', 'Keine kommerzielle Weitergabe'),
      colorClass: pastelClass,
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
