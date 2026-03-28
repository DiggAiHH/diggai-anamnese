/**
 * AutoSaveIndicator — Visual confirmation that answers are saved
 *
 * Forschungsgrundlage:
 * - Endowment Effect (Kahneman et al. 1990): People value what they've invested in
 * - Loss Aversion: Fear of losing entered data reduces trust
 * - Micro-feedback: Small confirmations reduce anxiety (Brave & Nass 2002)
 *
 * Shows a subtle "Gespeichert" indicator after each answer to reassure
 * that progress won't be lost on page refresh or timeout.
 */

import { useEffect, useState } from 'react';
import { Check, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../store/sessionStore';

export function AutoSaveIndicator() {
  const { t } = useTranslation();
  const lastSavedAt = useSessionStore((s) => s.lastSavedAt);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastSavedAt) return;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [lastSavedAt]);

  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-[#81B29A] animate-fade-in transition-opacity duration-500"
      role="status"
      aria-live="polite"
    >
      <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
      <Check className="w-3 h-3" aria-hidden="true" />
      <span>{t('progress.saved', 'Gespeichert')}</span>
    </div>
  );
}
