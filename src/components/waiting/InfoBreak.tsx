import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Clock } from 'lucide-react';

interface WaitingContentItem {
  id: string;
  type: string;
  title: string;
  body: string;
  displayDurationSec?: number;
}

interface InfoBreakProps {
  content: WaitingContentItem;
  onDismiss: () => void;
  onSkip: () => void;
}

export const InfoBreak: React.FC<InfoBreakProps> = ({ content, onDismiss, onSkip }) => {
  const { t } = useTranslation();
  const duration = content.displayDurationSec ?? 15;
  const [remaining, setRemaining] = useState(duration);
  const [canSkip, setCanSkip] = useState(duration <= 5);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Allow skip after 5 seconds
  useEffect(() => {
    if (canSkip) return;
    const timeout = setTimeout(() => setCanSkip(true), 5000);
    return () => clearTimeout(timeout);
  }, [canSkip]);

  // Auto-dismiss when timer runs out
  useEffect(() => {
    if (remaining <= 0) {
      onDismiss();
    }
  }, [remaining, onDismiss]);

  const handleSkip = useCallback(() => {
    if (canSkip) {
      onSkip();
    }
  }, [canSkip, onSkip]);

  const typeLabel = (() => {
    switch (content.type) {
      case 'HEALTH_TIP': return t('waiting.healthTip', 'Gesundheitstipp');
      case 'FUN_FACT': return t('waiting.funFact', 'Wussten Sie?');
      case 'MINI_QUIZ': return t('waiting.quiz', 'Mini-Quiz');
      case 'BREATHING_EXERCISE': return t('waiting.breathingExercise', '4-7-8 Atemübung');
      default: return t('waiting.info', 'Information');
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-blue-500/30 bg-[var(--bg-card)] shadow-2xl shadow-blue-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-primary)] bg-blue-500/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-blue-400">
              {typeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <Clock className="w-3 h-3" />
            {remaining}s
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">
            {content.title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {content.body}
          </p>
        </div>

        {/* Timer bar */}
        <div className="w-full h-1 bg-[var(--bg-primary)]">
          <div
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(remaining / duration) * 100}%` }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={handleSkip}
            disabled={!canSkip}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              canSkip
                ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                : 'text-[var(--text-muted)]/30 cursor-not-allowed'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            {canSkip
              ? t('waiting.skip', 'Überspringen')
              : t('waiting.skipIn', 'Überspringen in {{sec}}s', { sec: Math.max(0, 5 - (duration - remaining)) })}
          </button>

          <button
            onClick={onDismiss}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            {t('waiting.continue', 'Weiter')}
          </button>
        </div>
      </div>
    </div>
  );
};
