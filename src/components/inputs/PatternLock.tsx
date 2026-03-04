import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PatternLockProps {
  mode: 'create' | 'verify';
  gridSize?: number;
  onComplete: (pattern: number[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

const DOT_RADIUS = 14;
const DOT_ACTIVE_RADIUS = 18;
const LINE_WIDTH = 4;

/**
 * PatternLock – Security pattern input component.
 * Patient connects dots on a grid by touch/mouse drag.
 * The sequence of dot indices forms the security code.
 */
export function PatternLock({
  mode,
  gridSize = 4,
  onComplete,
  onError,
  disabled = false,
}: PatternLockProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [confirmPattern, setConfirmPattern] = useState<number[] | null>(null);
  const [step, setStep] = useState<'draw' | 'confirm' | 'done'>('draw');
  const [error, setError] = useState<string | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  const totalDots = gridSize * gridSize;

  // Calculate dot positions
  const getDotPositions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return [];

    const size = canvas.width;
    const padding = 40;
    const cellSize = (size - padding * 2) / (gridSize - 1);

    const positions: { x: number; y: number; index: number }[] = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        positions.push({
          x: padding + col * cellSize,
          y: padding + row * cellSize,
          index: row * gridSize + col,
        });
      }
    }
    return positions;
  }, [gridSize]);

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const positions = getDotPositions();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines between selected dots
    if (selectedDots.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = error ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = LINE_WIDTH * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const firstDot = positions[selectedDots[0]];
      ctx.moveTo(firstDot.x, firstDot.y);

      for (let i = 1; i < selectedDots.length; i++) {
        const dot = positions[selectedDots[i]];
        ctx.lineTo(dot.x, dot.y);
      }

      ctx.stroke();
    }

    // Draw line to current touch/mouse position
    if (isDrawing && selectedDots.length > 0 && currentPos) {
      const lastDot = positions[selectedDots[selectedDots.length - 1]];
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = LINE_WIDTH * dpr;
      ctx.lineCap = 'round';
      ctx.moveTo(lastDot.x, lastDot.y);
      ctx.lineTo(currentPos.x * dpr, currentPos.y * dpr);
      ctx.stroke();
    }

    // Draw dots
    for (const pos of positions) {
      const isSelected = selectedDots.includes(pos.index);
      const radius = (isSelected ? DOT_ACTIVE_RADIUS : DOT_RADIUS) * dpr;

      // Outer ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? error
          ? 'rgba(239, 68, 68, 0.2)'
          : 'rgba(59, 130, 246, 0.2)'
        : 'rgba(148, 163, 184, 0.15)';
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, (isSelected ? 8 : 5) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? error
          ? '#ef4444'
          : '#3b82f6'
        : 'rgba(148, 163, 184, 0.6)';
      ctx.fill();

      // Selection order number
      if (isSelected) {
        const order = selectedDots.indexOf(pos.index) + 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${12 * dpr}px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(order), pos.x, pos.y);
      }
    }
  }, [selectedDots, isDrawing, currentPos, getDotPositions, error, gridSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Setup canvas DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(container.clientWidth, 360);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    draw();
  }, [draw]);

  // Get dot index near a point
  const getDotAt = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const x = (clientX - rect.left) * dpr;
      const y = (clientY - rect.top) * dpr;

      const positions = getDotPositions();
      const hitRadius = 28 * dpr;

      for (const pos of positions) {
        const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        if (dist < hitRadius) return pos.index;
      }
      return null;
    },
    [getDotPositions]
  );

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      setError(null);
      const dot = getDotAt(clientX, clientY);
      if (dot !== null) {
        setIsDrawing(true);
        setSelectedDots([dot]);
      }
    },
    [getDotAt, disabled]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawing || disabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      setCurrentPos({ x: clientX - rect.left, y: clientY - rect.top });

      const dot = getDotAt(clientX, clientY);
      if (dot !== null && !selectedDots.includes(dot)) {
        setSelectedDots((prev) => [...prev, dot]);
      }
    },
    [isDrawing, getDotAt, selectedDots, disabled]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentPos(null);

    if (selectedDots.length < 4) {
      setError(t('pattern.min_dots', 'Mindestens 4 Punkte verbinden'));
      setTimeout(() => {
        setSelectedDots([]);
        setError(null);
      }, 1000);
      return;
    }

    if (mode === 'verify') {
      onComplete(selectedDots);
      return;
    }

    // Create mode: two-step
    if (step === 'draw') {
      setConfirmPattern([...selectedDots]);
      setSelectedDots([]);
      setStep('confirm');
    } else if (step === 'confirm') {
      // Compare patterns
      if (
        confirmPattern &&
        confirmPattern.length === selectedDots.length &&
        confirmPattern.every((v, i) => v === selectedDots[i])
      ) {
        setStep('done');
        onComplete(selectedDots);
      } else {
        setError(t('pattern.mismatch', 'Muster stimmt nicht überein. Bitte erneut versuchen.'));
        onError?.(t('pattern.mismatch', 'Muster stimmt nicht überein'));
        setTimeout(() => {
          setSelectedDots([]);
          setConfirmPattern(null);
          setStep('draw');
          setError(null);
        }, 1500);
      }
    }
  }, [isDrawing, selectedDots, mode, step, confirmPattern, onComplete, onError, t]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  };

  const reset = () => {
    setSelectedDots([]);
    setConfirmPattern(null);
    setStep('draw');
    setError(null);
  };

  const instruction = mode === 'verify'
    ? t('pattern.instruction_verify', 'Zeichnen Sie Ihr Sicherheitsmuster')
    : step === 'draw'
      ? t('pattern.instruction_create', 'Zeichnen Sie ein neues Sicherheitsmuster (mind. 4 Punkte)')
      : t('pattern.instruction_confirm', 'Bestätigen Sie Ihr Muster');

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {instruction}
        </p>
        {error && (
          <p className="text-sm text-red-400 mt-1 animate-pulse">{error}</p>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative touch-none select-none rounded-2xl p-2"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          maxWidth: 360,
          width: '100%',
          aspectRatio: '1',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="w-full h-full cursor-pointer"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Keyboard fallback for accessibility */}
      <div className="w-full max-w-[360px]">
        <details className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <summary className="cursor-pointer hover:underline">
            {t('pattern.keyboard_mode', 'Tastatur-Eingabe (Barrierefreiheit)')}
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <p className="w-full text-xs mb-1">
              {t('pattern.keyboard_instruction', 'Punkte der Reihe nach anklicken (1-{{total}}):', { total: totalDots })}
            </p>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
              {Array.from({ length: totalDots }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={disabled || selectedDots.includes(i)}
                  onClick={() => {
                    if (!selectedDots.includes(i)) {
                      const next = [...selectedDots, i];
                      setSelectedDots(next);
                    }
                  }}
                  className="w-10 h-10 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: selectedDots.includes(i) ? 'var(--accent)' : 'var(--bg-input)',
                    color: selectedDots.includes(i) ? '#fff' : 'var(--text-primary)',
                    border: `1px solid ${selectedDots.includes(i) ? 'var(--accent)' : 'var(--border-primary)'}`,
                  }}
                >
                  {selectedDots.includes(i) ? selectedDots.indexOf(i) + 1 : i + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleEnd}
              disabled={selectedDots.length < 4}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: selectedDots.length >= 4 ? 'var(--accent)' : 'var(--bg-input)',
                color: selectedDots.length >= 4 ? '#fff' : 'var(--text-muted)',
              }}
            >
              {t('pattern.confirm_btn', 'Bestätigen')}
            </button>
          </div>
        </details>
      </div>

      {(selectedDots.length > 0 || step === 'confirm') && (
        <button
          type="button"
          onClick={reset}
          className="text-sm underline transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('pattern.reset', 'Zurücksetzen')}
        </button>
      )}

      {mode === 'verify' && (
        <button
          type="button"
          onClick={() => onError?.(t('pattern.forgot', 'Muster vergessen — bitte an der Anmeldung wenden'))}
          className="text-xs underline"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('pattern.forgot', 'Muster vergessen?')}
        </button>
      )}
    </div>
  );
}
