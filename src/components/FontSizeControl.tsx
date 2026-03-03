import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FONT_SIZE_KEY = 'diggai-font-size';
const MIN_SIZE = 90;
const MAX_SIZE = 150;
const STEP = 10;
const DEFAULT_SIZE = 100;

/**
 * FontSizeControl — Accessibility zoom for elderly patients.
 * Adjusts the root font-size percentage. Persisted in localStorage.
 */
export function FontSizeControl() {
  const { t } = useTranslation();
  const [size, setSize] = useState(() => {
    try {
      const stored = localStorage.getItem(FONT_SIZE_KEY);
      return stored ? Number(stored) : DEFAULT_SIZE;
    } catch {
      return DEFAULT_SIZE;
    }
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${size}%`;
    try {
      localStorage.setItem(FONT_SIZE_KEY, String(size));
    } catch {
      // localStorage may be unavailable
    }
  }, [size]);

  const increase = useCallback(() => setSize(s => Math.min(s + STEP, MAX_SIZE)), []);
  const decrease = useCallback(() => setSize(s => Math.max(s - STEP, MIN_SIZE)), []);
  const reset = useCallback(() => setSize(DEFAULT_SIZE), []);

  return (
    <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-1" role="group" aria-label={t('fontsize.group_label', 'Schriftgröße anpassen')}>
      <button
        type="button"
        onClick={decrease}
        disabled={size <= MIN_SIZE}
        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label={t('fontsize.decrease', 'Schrift verkleinern')}
        title={t('fontsize.decrease', 'Schrift verkleinern')}
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={reset}
        className="px-1.5 py-1 rounded-lg text-xs font-mono font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all min-w-[36px] text-center"
        aria-label={t('fontsize.reset', 'Schriftgröße zurücksetzen')}
        title={t('fontsize.reset_short', 'Zurücksetzen')}
      >
        {size === DEFAULT_SIZE ? (
          <RotateCcw className="w-3.5 h-3.5 mx-auto" />
        ) : (
          `${size}%`
        )}
      </button>

      <button
        type="button"
        onClick={increase}
        disabled={size >= MAX_SIZE}
        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label={t('fontsize.increase', 'Schrift vergrößern')}
        title={t('fontsize.increase', 'Schrift vergrößern')}
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
}
