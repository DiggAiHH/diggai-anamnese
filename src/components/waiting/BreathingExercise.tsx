import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Wind, Pause, Play, RotateCcw } from 'lucide-react';

interface BreathingExerciseProps {
  durationSec?: number;
}

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'idle';

// 4-7-8 breathing technique
const PHASES: { phase: BreathingPhase; seconds: number }[] = [
  { phase: 'inhale', seconds: 4 },
  { phase: 'hold', seconds: 7 },
  { phase: 'exhale', seconds: 8 },
];

const CYCLE_DURATION = PHASES.reduce((sum, p) => sum + p.seconds, 0); // 19s

export const BreathingExercise: React.FC<BreathingExerciseProps> = ({
  durationSec = 120,
}) => {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cycleElapsed, setCycleElapsed] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>('idle');
  const [completedCycles, setCompletedCycles] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalCycles = Math.floor(durationSec / CYCLE_DURATION);

  // Timer tick
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= durationSec) {
          setIsActive(false);
          setCurrentPhase('idle');
          return prev;
        }
        return next;
      });
      setCycleElapsed((prev) => {
        const next = prev + 1;
        if (next >= CYCLE_DURATION) {
          setCompletedCycles((c) => c + 1);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, durationSec]);

  // Determine current phase based on cycle elapsed
  useEffect(() => {
    if (!isActive) return;
    let acc = 0;
    for (const p of PHASES) {
      acc += p.seconds;
      if (cycleElapsed < acc) {
        setCurrentPhase(p.phase);
        return;
      }
    }
  }, [cycleElapsed, isActive]);

  const handleToggle = useCallback(() => {
    setIsActive((prev) => !prev);
    if (!isActive && currentPhase === 'idle') {
      setCycleElapsed(0);
      setElapsed(0);
      setCompletedCycles(0);
    }
  }, [isActive, currentPhase]);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setElapsed(0);
    setCycleElapsed(0);
    setCurrentPhase('idle');
    setCompletedCycles(0);
  }, []);

  // Circle animation scale
  const getScale = () => {
    if (currentPhase === 'inhale') return 1.3;
    if (currentPhase === 'hold') return 1.3;
    if (currentPhase === 'exhale') return 0.8;
    return 1;
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'inhale': return t('waiting.breatheIn', 'Einatmen...');
      case 'hold': return t('waiting.hold', 'Halten...');
      case 'exhale': return t('waiting.breatheOut', 'Ausatmen...');
      default: return t('waiting.readyToBreathe', 'Bereit?');
    }
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'inhale': return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
      case 'hold': return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'exhale': return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      default: return 'text-[var(--text-muted)] border-[var(--border-primary)] bg-[var(--bg-card)]';
    }
  };

  // Remaining seconds in current phase
  const getPhaseRemaining = () => {
    let acc = 0;
    for (const p of PHASES) {
      acc += p.seconds;
      if (cycleElapsed < acc) {
        return acc - cycleElapsed;
      }
    }
    return 0;
  };

  return (
    <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-black uppercase tracking-wider text-blue-400">
            {t('waiting.breathingExercise', '4-7-8 Atemübung')}
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">
          {completedCycles}/{totalCycles} {t('waiting.cycles', 'Zyklen')}
        </span>
      </div>

      {/* Breathing circle */}
      <div className="flex items-center justify-center py-6">
        <div
          className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all ${getPhaseColor()}`}
          style={{
            transform: `scale(${getScale()})`,
            transitionDuration: currentPhase === 'inhale' ? '4s' : currentPhase === 'exhale' ? '8s' : '0.3s',
          }}
        >
          <span className="text-2xl font-black">
            {isActive ? getPhaseRemaining() : '—'}
          </span>
          <span className="text-xs font-bold mt-1">
            {getPhaseText()}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isActive ? t('waiting.pause', 'Pause') : elapsed > 0 ? t('waiting.resume', 'Fortfahren') : t('waiting.start', 'Starten')}
        </button>
        {elapsed > 0 && (
          <button
            onClick={handleReset}
            className="p-3 rounded-xl border border-[var(--border-primary)] hover:bg-[var(--bg-primary)] transition-colors"
            aria-label={t('waiting.reset', 'Zurücksetzen')}
          >
            <RotateCcw className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] text-center">
        {t('waiting.breathingDesc', 'Die 4-7-8 Methode: 4 Sek. einatmen, 7 Sek. halten, 8 Sek. ausatmen. Hilft bei Stress und Anspannung.')}
      </p>
    </div>
  );
};
