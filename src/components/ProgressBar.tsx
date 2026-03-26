import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning';
  colorClass?: string;
  currentStep?: number;
  totalSteps?: number;
}

export function ProgressBar({ 
  progress, 
  className = '', 
  showPercentage = false,
  size = 'md',
  variant = 'default'
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  // Psychology-based colors
  const getBarColor = () => {
    switch (variant) {
      case 'success':
        return '#81B29A'; // Sage green
      case 'warning':
        return '#F4A261'; // Warm amber
      default:
        return clampedProgress >= 100 
          ? '#81B29A' // Complete - sage green
          : clampedProgress >= 60 
            ? '#4A90E2' // Good progress - serene blue
            : '#5E8B9E'; // Starting - dusty blue
    }
  };
  
  const getBackgroundColor = () => {
    return 'rgba(44, 95, 138, 0.12)';
  };
  
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div 
        className={`w-full rounded-full overflow-hidden ${sizeClasses[size]}`}
        style={{ backgroundColor: getBackgroundColor() }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ 
            backgroundColor: getBarColor(),
            backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)'
          }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ 
            duration: 0.5, 
            ease: [0.4, 0, 0.2, 1]
          }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between mt-1.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Fortschritt
          </span>
          <motion.span 
            className="text-xs font-medium"
            style={{ color: getBarColor() }}
            key={clampedProgress}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {Math.round(clampedProgress)}%
          </motion.span>
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
