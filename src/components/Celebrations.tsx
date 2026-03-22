import { useEffect, useState, useCallback, useMemo } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
}

/**
 * CompletionCelebration — Lightweight confetti animation at 100% progress.
 * Pure CSS + JS, zero dependencies.
 */
export function CompletionCelebration({ show }: { show: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [visible, setVisible] = useState(false);

  const colors = useMemo(() => ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#22c55e'], []);

  const generate = useCallback(() => {
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 50; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
      });
    }
    return newPieces;
  }, [colors]);

  useEffect(() => {
    if (show) {
      // Respect prefers-reduced-motion for users sensitive to animations
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setPieces(generate());
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [show, generate]);

  if (!visible || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute confetti-piece"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: '2px',
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * AnswerCheckmark — Small check animation shown briefly after answering.
 */
export function AnswerCheckmark({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false);

  // Derive visibility from prop instead of syncing via effect
  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 800);
    return () => clearTimeout(timer);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="inline-flex items-center gap-1.5 text-emerald-400 animate-in" aria-hidden="true">
      <svg className="w-5 h-5 checkmark-animate" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" className="checkmark-path" />
      </svg>
      <span className="text-xs font-semibold">✓</span>
    </div>
  );
}

/**
 * ProgressRing — Circular progress indicator for compact display.
 */
export function ProgressRing({ progress, size = 40, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  const color = progress >= 100 ? '#10b981' : progress >= 60 ? '#3b82f6' : '#f59e0b';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-primary)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span
        className="absolute text-[9px] font-bold"
        style={{ color }}
      >
        {Math.round(progress)}%
      </span>
    </div>
  );
}
