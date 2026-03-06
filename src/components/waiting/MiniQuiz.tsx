import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';

interface QuizOption {
  text: string;
  correct: boolean;
}

interface QuizData {
  question: string;
  options: QuizOption[];
  explanation: string;
}

interface WaitingContentItem {
  id: string;
  title: string;
  quizData?: string | null;
}

interface MiniQuizProps {
  quiz: WaitingContentItem;
  onAnswer?: (quizId: string, selectedOption: number, correct: boolean) => void;
}

export const MiniQuiz: React.FC<MiniQuizProps> = ({ quiz, onAnswer }) => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const quizData: QuizData | null = (() => {
    if (!quiz.quizData) return null;
    try {
      return JSON.parse(quiz.quizData) as QuizData;
    } catch {
      return null;
    }
  })();

  const handleSelect = useCallback((index: number) => {
    if (revealed || !quizData) return;
    setSelectedOption(index);
    setRevealed(true);
    const correct = quizData.options[index]?.correct ?? false;
    onAnswer?.(quiz.id, index, correct);
  }, [revealed, quizData, quiz.id, onAnswer]);

  if (!quizData) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">{t('waiting.quizError', 'Quiz nicht verfügbar')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-amber-400" />
        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
          {t('waiting.quiz', 'Mini-Quiz')}
        </span>
      </div>

      <h3 className="text-base font-bold text-[var(--text-primary)]">
        {quizData.question}
      </h3>

      <div className="space-y-2">
        {quizData.options.map((option, i) => {
          let optionStyle = 'border-[var(--border-primary)] hover:border-blue-500/30 hover:bg-blue-500/5 cursor-pointer';
          if (revealed) {
            if (option.correct) {
              optionStyle = 'border-emerald-500/50 bg-emerald-500/10';
            } else if (i === selectedOption) {
              optionStyle = 'border-red-500/50 bg-red-500/10';
            } else {
              optionStyle = 'border-[var(--border-primary)] opacity-50';
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all text-sm ${optionStyle}`}
            >
              {revealed && option.correct && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
              {revealed && i === selectedOption && !option.correct && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              {!revealed && (
                <span className="w-5 h-5 rounded-full border border-[var(--border-primary)] bg-[var(--bg-primary)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
              )}
              <span className="text-[var(--text-primary)]">{option.text}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation after answer */}
      {revealed && (
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 animate-fade-in">
          <p className="text-xs font-bold text-blue-400 mb-1">{t('waiting.explanation', 'Erklärung')}</p>
          <p className="text-sm text-[var(--text-secondary)]">{quizData.explanation}</p>
        </div>
      )}
    </div>
  );
};
