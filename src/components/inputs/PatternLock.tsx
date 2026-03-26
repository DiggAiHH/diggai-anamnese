import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PatternLockProps {
  onComplete: (pattern: number[]) => void;
  onError?: (msg?: string) => void;
  size?: number;
  disabled?: boolean;
  error?: boolean;
  mode?: 'create' | 'verify';
}

const DOTS_COUNT = 9;
const GRID_SIZE = 3;

// Psychology-based colors
const COLORS = {
  normal: '#4A90E2',     // Serene Blue
  error: '#E07A5F',      // Soft Coral (not bright red)
  success: '#81B29A',    // Sage Green
  dot: {
    default: 'rgba(107, 139, 164, 0.3)',
    selected: '#4A90E2',
    error: '#E07A5F'
  }
};

export function PatternLock({ 
  onComplete, 
  onError, 
  size = 240, 
  disabled = false,
  error = false 
}: PatternLockProps) {
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [showError, setShowError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dotRadius = size / 12;
  const cellSize = size / GRID_SIZE;
  const padding = cellSize / 2;

  // Get dot center position
  const getDotPosition = useCallback((index: number) => {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    return {
      x: padding + col * cellSize,
      y: padding + row * cellSize
    };
  }, [cellSize, padding]);

  // Draw the pattern on canvas
  const drawPattern = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw connecting lines
    if (selectedDots.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = showError ? COLORS.error : COLORS.normal;

      const firstDot = getDotPosition(selectedDots[0]);
      ctx.moveTo(firstDot.x, firstDot.y);

      for (let i = 1; i < selectedDots.length; i++) {
        const pos = getDotPosition(selectedDots[i]);
        ctx.lineTo(pos.x, pos.y);
      }

      // Draw to current position if drawing
      if (isDrawing && currentPos) {
        ctx.lineTo(currentPos.x, currentPos.y);
      }

      ctx.stroke();
    }
  }, [selectedDots, isDrawing, currentPos, showError, size, getDotPosition]);

  useEffect(() => {
    drawPattern();
  }, [drawPattern]);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        setSelectedDots([]);
        onError?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [error, onError]);

  const getDotFromPosition = (clientX: number, clientY: number): number | null => {
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = 0; i < DOTS_COUNT; i++) {
      const pos = getDotPosition(i);
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance <= dotRadius * 2) {
        return i;
      }
    }
    return null;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || showError) return;
    
    setIsDrawing(true);
    setSelectedDots([]);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dot = getDotFromPosition(clientX, clientY);
    if (dot !== null) {
      setSelectedDots([dot]);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled || showError) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setCurrentPos({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }

    const dot = getDotFromPosition(clientX, clientY);
    if (dot !== null && !selectedDots.includes(dot)) {
      setSelectedDots(prev => [...prev, dot]);
    }
  };

  const handleEnd = () => {
    if (!isDrawing || disabled) return;
    
    setIsDrawing(false);
    setCurrentPos(null);

    if (selectedDots.length >= 4) {
      onComplete(selectedDots);
    } else {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
        setSelectedDots([]);
      }, 800);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative touch-none select-none"
      style={{ width: size, height: size }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      {/* Canvas for lines */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Dots */}
      {Array.from({ length: DOTS_COUNT }).map((_, i) => {
        const pos = getDotPosition(i);
        const isSelected = selectedDots.includes(i);
        const isLastSelected = selectedDots[selectedDots.length - 1] === i;

        return (
          <motion.div
            key={i}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              left: pos.x - dotRadius,
              top: pos.y - dotRadius,
              width: dotRadius * 2,
              height: dotRadius * 2,
            }}
            animate={{
              scale: isSelected ? 1.2 : 1,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {/* Outer ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: isSelected 
                  ? (showError ? COLORS.dot.error : COLORS.dot.selected)
                  : COLORS.dot.default,
              }}
              animate={{
                scale: isLastSelected ? [1, 1.3, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
            />
            
            {/* Inner dot */}
            <div 
              className="relative rounded-full"
              style={{
                width: dotRadius,
                height: dotRadius,
                backgroundColor: isSelected 
                  ? '#ffffff'
                  : 'var(--bg-primary)',
              }}
            />
          </motion.div>
        );
      })}

      {/* Error message */}
      <AnimatePresence>
        {showError && (
          <motion.div
            className="absolute -bottom-8 left-0 right-0 text-center text-sm"
            style={{ color: COLORS.error }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            Mindestens 4 Punkte verbinden
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success indicator */}
      <AnimatePresence>
        {selectedDots.length >= 4 && !showError && !isDrawing && (
          <motion.div
            className="absolute -bottom-8 left-0 right-0 text-center text-sm"
            style={{ color: COLORS.success }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            Muster gespeichert
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PatternLock;
