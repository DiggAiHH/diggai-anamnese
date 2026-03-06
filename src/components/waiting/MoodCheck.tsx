import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SmilePlus } from 'lucide-react';

interface MoodCheckProps {
  onRespond: (mood: string) => void;
}

const MOOD_OPTIONS = [
  { emoji: '😊', key: 'good' },
  { emoji: '😐', key: 'okay' },
  { emoji: '😟', key: 'impatient' },
  { emoji: '😰', key: 'worried' },
];

export const MoodCheck: React.FC<MoodCheckProps> = ({ onRespond }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (mood: string) => {
    setSelected(mood);
    onRespond(mood);
  };

  const moodLabels: Record<string, string> = {
    good: t('waiting.moodGood', 'Gut'),
    okay: t('waiting.moodOkay', 'Geht so'),
    impatient: t('waiting.moodImpatient', 'Ungeduldig'),
    worried: t('waiting.moodWorried', 'Besorgt'),
  };

  if (selected) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center animate-fade-in">
        <p className="text-sm text-emerald-400 font-medium">
          {t('waiting.moodThanks', 'Danke für Ihr Feedback!')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <SmilePlus className="w-5 h-5 text-amber-400" />
        <span className="text-sm font-bold text-[var(--text-primary)]">
          {t('waiting.moodQuestion', 'Wie geht es Ihnen gerade?')}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {MOOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSelect(option.key)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--border-primary)] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
          >
            <span className="text-2xl">{option.emoji}</span>
            <span className="text-[10px] font-bold text-[var(--text-muted)]">
              {moodLabels[option.key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
