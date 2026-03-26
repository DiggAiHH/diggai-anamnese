import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

// Psychology-based celebration colors (calming, not overstimulating)
const CELEBRATION_COLORS = [
  '#4A90E2', // Serene Blue - trust
  '#81B29A', // Sage Green - healing
  '#F4A261', // Warm Amber - warmth
  '#5E8B9E', // Dusty Blue - calm
  '#A8D5BA', // Soft Mint - balance
  '#C7C3E6', // Light Lavender - peaceful
];

interface ConfettiPieceProps {
  delay: number;
  color: string;
  x: number;
}

function ConfettiPiece({ delay, color, x }: ConfettiPieceProps) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ 
        backgroundColor: color,
        left: `${x}%`,
        top: '-10px'
      }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{ 
        y: ['0vh', '100vh'],
        rotate: [0, 720],
        opacity: [1, 1, 0]
      }}
      transition={{ 
        duration: 2.5, 
        delay, 
        ease: 'easeIn' 
      }}
    />
  );
}

interface CelebrationOverlayProps {
  show: boolean;
  onComplete?: () => void;
}

export function CelebrationOverlay({ show, onComplete }: CelebrationOverlayProps) {
  const [pieces, setPieces] = useState<Array<{ id: number; color: string; x: number; delay: number }>>([]);
  
  useEffect(() => {
    if (show) {
      // Generate confetti pieces with psychology-based colors
      const newPieces = Array.from({ length: 30 }, (_, i) => ({
        id: Date.now() + i,
        color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length],
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setPieces(newPieces);
      
      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(piece => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          color={piece.color}
          x={piece.x}
        />
      ))}
    </div>
  );
}

interface CompletionCheckmarkProps {
  progress: number;
  className?: string;
}

export function CompletionCheckmark({ progress, className = '' }: CompletionCheckmarkProps) {
  // Psychology-based progress colors
  const color = progress >= 100 
    ? '#81B29A' // Sage green for complete
    : progress >= 60 
      ? '#4A90E2' // Serene blue for good progress
      : '#F4A261'; // Warm amber for starting
      
  const bgColor = progress >= 100 
    ? 'rgba(129, 178, 154, 0.15)'
    : progress >= 60 
      ? 'rgba(74, 144, 226, 0.15)'
      : 'rgba(244, 162, 97, 0.15)';
  
  return (
    <motion.div
      className={`flex items-center justify-center rounded-full ${className}`}
      style={{ 
        backgroundColor: bgColor,
        width: '48px',
        height: '48px'
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <CheckCircle2 
        className="w-6 h-6"
        style={{ color }}
      />
    </motion.div>
  );
}

interface ProgressCelebrationProps {
  progress: number;
  className?: string;
}

export function ProgressCelebration({ progress, className = '' }: ProgressCelebrationProps) {
  const [showSparkle, setShowSparkle] = useState(false);
  
  useEffect(() => {
    if (progress > 0 && progress % 25 === 0) {
      setShowSparkle(true);
      const timer = setTimeout(() => setShowSparkle(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [progress]);
  
  // Psychology-based color
  const sparkleColor = progress >= 75 
    ? '#81B29A' 
    : progress >= 50 
      ? '#4A90E2' 
      : '#5E8B9E';
  
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {progress}%
      </span>
      <AnimatePresence>
        {showSparkle && (
          <motion.div
            className="absolute -right-6"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
          >
            <Sparkles 
              className="w-4 h-4"
              style={{ color: sparkleColor }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CelebrationOverlay;
