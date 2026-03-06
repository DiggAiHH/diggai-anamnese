import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gamepad2, Wind, HelpCircle, Brain } from 'lucide-react';
import { MiniQuiz } from './MiniQuiz';
import { BreathingExercise } from './BreathingExercise';

interface WaitingContentItem {
  id: string;
  type: string;
  title: string;
  body: string;
  quizData?: string | null;
}

interface WaitingGamesProps {
  sessionId: string;
  quizItems?: WaitingContentItem[];
  onGameComplete?: (gameType: string, score?: number) => void;
  onQuizAnswer?: (quizId: string, selectedOption: number, correct: boolean) => void;
}

type GameView = 'menu' | 'quiz' | 'breathing' | 'memory';

export const WaitingGames: React.FC<WaitingGamesProps> = ({
  sessionId: _sessionId,
  quizItems = [],
  onGameComplete,
  onQuizAnswer,
}) => {
  const { t } = useTranslation();
  const [activeGame, setActiveGame] = useState<GameView>('menu');
  const [quizIndex, setQuizIndex] = useState(0);

  // Memory game state
  const [memoryCards, setMemoryCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);

  const startMemory = () => {
    const emojis = ['🩺', '💊', '🏥', '❤️', '🧠', '🦴', '👁️', '🫁'];
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setMemoryCards(shuffled);
    setMemoryFlipped([]);
    setMemoryMoves(0);
    setActiveGame('memory');
  };

  const handleMemoryClick = (id: number) => {
    if (memoryFlipped.length === 2) return;
    const card = memoryCards[id];
    if (card.flipped || card.matched) return;

    const newCards = [...memoryCards];
    newCards[id] = { ...newCards[id], flipped: true };
    const newFlipped = [...memoryFlipped, id];

    if (newFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [first, second] = newFlipped;
      if (newCards[first].emoji === newCards[second].emoji) {
        newCards[first] = { ...newCards[first], matched: true };
        newCards[second] = { ...newCards[second], matched: true };
        setMemoryCards(newCards);
        setMemoryFlipped([]);
        // Check win
        if (newCards.every((c) => c.matched)) {
          onGameComplete?.('memory', memoryMoves + 1);
        }
      } else {
        setMemoryCards(newCards);
        setMemoryFlipped(newFlipped);
        setTimeout(() => {
          setMemoryCards((prev) =>
            prev.map((c, i) => (i === first || i === second ? { ...c, flipped: false } : c))
          );
          setMemoryFlipped([]);
        }, 800);
        return;
      }
    }

    setMemoryCards(newCards);
    setMemoryFlipped(newFlipped);
  };

  // ─── Game Views ──────────────────────────────────────────

  if (activeGame === 'quiz' && quizItems.length > 0) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setActiveGame('menu')}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          ← {t('waiting.backToGames', 'Zurück zur Spieleauswahl')}
        </button>
        <MiniQuiz
          quiz={quizItems[quizIndex]}
          onAnswer={(quizId, opt, correct) => {
            onQuizAnswer?.(quizId, opt, correct);
            // Move to next quiz after delay
            setTimeout(() => {
              if (quizIndex + 1 < quizItems.length) {
                setQuizIndex(quizIndex + 1);
              } else {
                onGameComplete?.('quiz');
                setActiveGame('menu');
              }
            }, 3000);
          }}
        />
        <p className="text-[10px] text-center text-[var(--text-muted)]">
          {quizIndex + 1}/{quizItems.length}
        </p>
      </div>
    );
  }

  if (activeGame === 'breathing') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => { setActiveGame('menu'); onGameComplete?.('breathing'); }}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          ← {t('waiting.backToGames', 'Zurück zur Spieleauswahl')}
        </button>
        <BreathingExercise durationSec={120} />
      </div>
    );
  }

  if (activeGame === 'memory') {
    const allMatched = memoryCards.length > 0 && memoryCards.every((c) => c.matched);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveGame('menu')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            ← {t('waiting.backToGames', 'Zurück zur Spieleauswahl')}
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {t('waiting.moves', 'Züge')}: {memoryMoves}
          </span>
        </div>

        {allMatched ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center animate-fade-in">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-bold text-emerald-400 mb-1">
              {t('waiting.memoryWon', 'Gewonnen!')}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {t('waiting.memoryScore', '{{moves}} Züge', { moves: memoryMoves })}
            </p>
            <button
              onClick={startMemory}
              className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
            >
              {t('waiting.playAgain', 'Nochmal')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {memoryCards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleMemoryClick(card.id)}
                className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 ${
                  card.flipped || card.matched
                    ? 'bg-blue-500/10 border border-blue-500/30 scale-100'
                    : 'bg-[var(--bg-card)] border border-[var(--border-primary)] hover:border-blue-500/30 hover:scale-105'
                } ${card.matched ? 'opacity-50' : ''}`}
              >
                {card.flipped || card.matched ? card.emoji : '?'}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Menu ─────────────────────────────────────────────────

  const games = [
    {
      id: 'quiz' as const,
      icon: <HelpCircle className="w-6 h-6" />,
      label: t('waiting.miniQuiz', 'Mini-Quiz'),
      desc: t('waiting.quizDesc', 'Gesundheitswissen testen'),
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      disabled: quizItems.length === 0,
    },
    {
      id: 'breathing' as const,
      icon: <Wind className="w-6 h-6" />,
      label: t('waiting.breathingExercise', '4-7-8 Atemübung'),
      desc: t('waiting.breathingDesc2', 'Entspannung & Stressabbau'),
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      disabled: false,
    },
    {
      id: 'memory' as const,
      icon: <Brain className="w-6 h-6" />,
      label: t('waiting.memoryGame', 'Memory'),
      desc: t('waiting.memoryDesc', 'Medizinisches Paare-Finden'),
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      disabled: false,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Gamepad2 className="w-5 h-5 text-emerald-400" />
        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
          {t('waiting.games', 'Spiele & Übungen')}
        </span>
      </div>

      {games.map((game) => (
        <button
          key={game.id}
          onClick={() => game.id === 'memory' ? startMemory() : setActiveGame(game.id)}
          disabled={game.disabled}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
            game.disabled
              ? 'opacity-40 cursor-not-allowed border-[var(--border-primary)]'
              : `${game.color} hover:scale-[1.02] active:scale-[0.98]`
          }`}
        >
          <div className="shrink-0">{game.icon}</div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">{game.label}</h4>
            <p className="text-[10px] text-[var(--text-muted)]">{game.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
};
