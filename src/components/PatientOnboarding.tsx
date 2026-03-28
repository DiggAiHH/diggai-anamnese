/**
 * PatientOnboarding — First 10 Seconds Trust Builder
 *
 * Forschungsgrundlage:
 * - Lindgaard et al. 2006: Users form judgments in 50ms — first impression is critical
 * - Adjekum et al. 2018 (JMIR): Privacy badges above-the-fold → +15–25% completion
 * - Katz 2015: Time estimates → -26% abandonment
 * - Trust Transfer Theory: Institutional signals (doctor name, encryption) transfer trust
 *
 * Shown BEFORE ConsentFlow. Purpose:
 * 1. Warm, personal welcome
 * 2. Three trust icons (encrypted, doctor-only, auto-delete)
 * 3. Time estimate ("ca. 3–5 Minuten")
 * 4. "Jetzt starten" → proceeds to ConsentFlow
 */

import { useTranslation } from 'react-i18next';
import { Lock, UserCheck, Trash2, Clock, ArrowRight } from 'lucide-react';
import { TrustBadgeBar } from './ui/TrustBadgeBar';

interface PatientOnboardingProps {
  onStart: () => void;
  estimatedMinutes?: number;
  clinicName?: string;
}

export function PatientOnboarding({
  onStart,
  estimatedMinutes = 5,
  clinicName,
}: PatientOnboardingProps) {
  const { t } = useTranslation();

  const trustPoints = [
    {
      id: 'encrypted',
      icon: <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />,
      title: t('onboarding.trust.encrypted', 'Ende-zu-Ende verschlüsselt'),
      desc: t('onboarding.trust.encrypted_desc', 'Ihre Daten werden sofort mit AES-256 verschlüsselt.'),
    },
    {
      id: 'doctor-only',
      icon: <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />,
      title: t('onboarding.trust.doctor_only', 'Nur Ihr Arzt sieht Ihre Daten'),
      desc: t('onboarding.trust.doctor_only_desc', 'Kein Zugriff durch Dritte — niemals.'),
    },
    {
      id: 'auto-delete',
      icon: <Trash2 className="w-6 h-6 text-violet-600 dark:text-violet-400" aria-hidden="true" />,
      title: t('onboarding.trust.auto_delete', 'Automatische Löschung'),
      desc: t('onboarding.trust.auto_delete_desc', 'Ihre Daten werden nach Behandlungsende gelöscht.'),
    },
  ] as const;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Welcome Heading */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/40 mb-2">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)]">
            {t('onboarding.welcome', 'Willkommen bei Ihrer digitalen Anamnese')}
          </h1>
          {clinicName && (
            <p className="text-sm text-[var(--text-secondary)]">
              {clinicName}
            </p>
          )}
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            {t(
              'onboarding.intro',
              'Bereiten Sie Ihren Arztbesuch bequem vor — sicher, vertraulich und in Ihrem Tempo.',
            )}
          </p>
        </div>

        {/* Time Estimate (Katz 2015: -26% abandonment) */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] text-sm font-medium text-[var(--text-primary)]">
          <Clock className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
          {t('onboarding.time_estimate', 'Dauert ca. {{min}} Minuten', { min: estimatedMinutes })}
        </div>

        {/* Three Trust Points */}
        <div className="space-y-3">
          {trustPoints.map((point) => (
            <div
              key={point.id}
              className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)] text-left"
            >
              <div className="shrink-0 mt-0.5">{point.icon}</div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{point.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{point.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badge Bar */}
        <TrustBadgeBar compact className="justify-center" />

        {/* CTA */}
        <button
          type="button"
          onClick={onStart}
          className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-base font-bold shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:ring-offset-2 inline-flex items-center justify-center gap-2"
        >
          {t('onboarding.cta', 'Jetzt starten')}
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* No-login signal */}
        <p className="text-xs text-[var(--text-secondary)]">
          {t('onboarding.no_login', 'Keine Anmeldung erforderlich. Ihre Daten sind anonym bis Sie sich identifizieren.')}
        </p>
      </div>
    </div>
  );
}
