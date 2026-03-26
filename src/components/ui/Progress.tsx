import type { HTMLAttributes } from 'react';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Visual variant */
  variant?: 'default' | 'calm' | 'success' | 'minimal';
  /** Size of the progress bar */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage label */
  showLabel?: boolean;
  /** Label position */
  labelPosition?: 'inside' | 'outside' | 'none';
  /** Optional label formatter */
  formatLabel?: (value: number, max: number) => string;
  /** Animated transitions */
  animated?: boolean;
}

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  labelPosition = 'outside',
  formatLabel,
  animated = true,
  className = '',
  ...props
}: ProgressProps) {
  // Normalize value to 0-100 range
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Size styles
  const sizeStyles = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };
  
  // Phase 6: Variant styles with calming colors
  const variantStyles = {
    default: {
      track: 'bg-[rgba(44,95,138,0.12)]',
      fill: 'bg-gradient-to-r from-[#4A90E2] to-[#81B29A]',
      shadow: 'shadow-[0_0_12px_rgba(74,144,226,0.3)]',
    },
    calm: {
      track: 'bg-[rgba(94,139,158,0.12)]',
      fill: 'bg-gradient-to-r from-[#5E8B9E] to-[#4A90E2]',
      shadow: 'shadow-[0_0_12px_rgba(94,139,158,0.3)]',
    },
    success: {
      track: 'bg-[rgba(129,178,154,0.12)]',
      fill: 'bg-gradient-to-r from-[#81B29A] to-[#5A8F76]',
      shadow: 'shadow-[0_0_12px_rgba(129,178,154,0.3)]',
    },
    minimal: {
      track: 'bg-[var(--border-primary)]',
      fill: 'bg-[var(--accent)]',
      shadow: '',
    },
  };
  
  const styles = variantStyles[variant];
  const displayLabel = formatLabel 
    ? formatLabel(value, max) 
    : `${Math.round(percentage)}%`;
  
  return (
    <div 
      className={`w-full ${className}`}
      {...props}
    >
      {/* Label outside */}
      {showLabel && labelPosition === 'outside' && (
        <div className="flex justify-between items-center mb-2">
          <span 
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Progress
          </span>
          <span 
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {displayLabel}
          </span>
        </div>
      )}
      
      {/* Progress Track */}
      <div 
        className={`
          w-full 
          ${sizeStyles[size]}
          rounded-full 
          overflow-hidden
          ${styles.track}
        `.trim()}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={showLabel ? displayLabel : 'Progress'}
      >
        {/* Progress Fill */}
        <div
          className={`
            h-full
            rounded-full
            ${styles.fill}
            ${styles.shadow}
            ${animated ? 'transition-all duration-500 ease-out' : ''}
          `.trim()}
          style={{ 
            width: `${percentage}%`,
            backgroundImage: variant !== 'minimal' 
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
              : undefined,
            backgroundSize: '200% 100%',
          }}
        >
          {/* Label inside (only for lg size) */}
          {showLabel && labelPosition === 'inside' && size === 'lg' && (
            <span className="flex items-center justify-center h-full text-xs font-semibold text-white">
              {displayLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Linear progress indicator with steps
interface StepProgressProps {
  /** Total number of steps */
  steps: number;
  /** Current active step (0-indexed) */
  currentStep: number;
  /** Step labels */
  labels?: string[];
  /** Variant */
  variant?: 'default' | 'calm' | 'minimal';
}

export function StepProgress({ 
  steps, 
  currentStep, 
  labels, 
  variant = 'default' 
}: StepProgressProps) {
  const variantColors = {
    default: { active: '#4A90E2', completed: '#81B29A', pending: 'var(--border-primary)' },
    calm: { active: '#5E8B9E', completed: '#4A90E2', pending: 'var(--border-primary)' },
    minimal: { active: 'var(--accent)', completed: 'var(--text-secondary)', pending: 'var(--border-primary)' },
  };
  
  const colors = variantColors[variant];
  
  return (
    <div className="w-full">
      {/* Progress line */}
      <div className="relative flex items-center">
        {/* Background line */}
        <div 
          className="absolute left-0 right-0 h-0.5 rounded-full"
          style={{ backgroundColor: colors.pending }}
        />
        
        {/* Active progress */}
        <div 
          className="absolute left-0 h-0.5 rounded-full transition-all duration-500 ease-out"
          style={{ 
            backgroundColor: colors.completed,
            width: `${(currentStep / (steps - 1)) * 100}%`
          }}
        />
        
        {/* Step indicators */}
        <div className="relative flex justify-between w-full">
          {Array.from({ length: steps }, (_, i) => {
            const isCompleted = i < currentStep;
            const isActive = i === currentStep;
            const isPending = i > currentStep;
            
            return (
              <div 
                key={i}
                className={`
                  flex flex-col items-center gap-2
                  ${isActive ? 'scale-110' : ''}
                  transition-transform duration-300
                `}
              >
                {/* Step dot */}
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 transition-all duration-300
                    ${isCompleted ? 'border-transparent' : ''}
                    ${isActive ? 'border-white shadow-lg' : ''}
                  `}
                  style={{ 
                    backgroundColor: isCompleted 
                      ? colors.completed 
                      : isActive 
                        ? colors.active 
                        : 'transparent',
                    borderColor: isPending ? colors.pending : 'transparent',
                    boxShadow: isActive ? `0 0 0 4px ${colors.active}30` : undefined
                  }}
                />
                
                {/* Step label */}
                {labels && labels[i] && (
                  <span 
                    className={`
                      text-xs font-medium whitespace-nowrap
                      ${isActive ? 'scale-105' : ''}
                      transition-all duration-300
                    `}
                    style={{ 
                      color: isActive 
                        ? 'var(--text-primary)' 
                        : isCompleted 
                          ? 'var(--text-secondary)' 
                          : 'var(--text-muted)'
                    }}
                  >
                    {labels[i]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
