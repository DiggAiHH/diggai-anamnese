import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * SovereigntyBanner — M6 (Arzt-Feedback 2026-05-03)
 *
 * Hinweis fuer Patienten: ihre Anamnese-Daten gehoeren ihnen,
 * sie koennen jederzeit nachpflegen + an jeden Arzt weitergeben,
 * DiggAI gibt sie nicht weiter.
 *
 * Dismissable; Status fuer 7 Tage in localStorage.
 */
const STORAGE_KEY = 'anamnese_banner_dismissed_at';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function SovereigntyBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isDismissed());
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore — banner just won't persist */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="note"
      aria-live="polite"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5"
    >
      <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
      <div className="flex-1 text-sm leading-relaxed">
        <p className="font-bold text-[var(--text-primary)]">
          {t('anamnese.start.sovereignty_banner.title', 'Ihre Daten gehören Ihnen.')}
        </p>
        <p className="mt-1 text-[var(--text-secondary)]">
          {t(
            'anamnese.start.sovereignty_banner.body',
            'Ihre Anamnese-Daten sind Teil Ihrer persönlichen Gesundheitsakte. Sie können diese jederzeit nachpflegen und an jeden Arzt Ihrer Wahl weitergeben — DiggAI gibt sie niemals weiter.',
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('anamnese.start.sovereignty_banner.dismiss', 'Hinweis schließen')}
        className="shrink-0 rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-emerald-500/20 hover:text-[var(--text-primary)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
