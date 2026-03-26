/**
 * Spinner Component
 * 
 * A calming breathing animation for loading states.
 * Designed to reduce anxiety with a gentle 4-second breathing cycle.
 * 
 * Psychology-based design:
 * - Breathing animation mimics calm breathing rhythm
 * - Soft opacity changes instead of aggressive spinning
 * - Reduced motion support for accessibility
 * 
 * @example
 * <Spinner size="md" variant="breathing" />
 * <Spinner size="lg" label="Wird geladen..." />
 */

import { useCalmAnimation } from '../../hooks/useCalmAnimation';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'breathing' | 'pulse' | 'dots';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const dotSizeMap = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

/**
 * Breathing Spinner - Gentle pulsing circle
 * Mimics a calm breathing rhythm to reduce user anxiety
 */
function BreathingSpinner({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
  const { ref, shouldAnimate } = useCalmAnimation<HTMLSpanElement>();
  
  return (
    <span
      ref={ref}
      className={`
        inline-block rounded-full
        bg-current/30
        ${sizeMap[size]}
        ${className}
        ${shouldAnimate ? 'animate-breathing' : ''}
      `.trim()}
      style={{ color: 'var(--accent)' }}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Pulse Spinner - Soft opacity pulsing
 * Alternative calming animation
 */
function PulseSpinner({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
  const { ref, shouldAnimate } = useCalmAnimation<HTMLSpanElement>();
  
  return (
    <span
      ref={ref}
      className={`
        inline-block rounded-full
        bg-current/60
        ${sizeMap[size]}
        ${className}
        ${shouldAnimate ? 'animate-pulseSoft' : ''}
      `.trim()}
      style={{ color: 'var(--accent)' }}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Dots Spinner - Gentle fading dots
 * Three dots with staggered breathing animation
 */
function DotsSpinner({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
  const { ref, shouldAnimate } = useCalmAnimation<HTMLDivElement>();
  
  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 ${className}`}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`
            inline-block rounded-full bg-current
            ${dotSizeMap[size]}
            ${shouldAnimate ? 'animate-breathing' : ''}
          `.trim()}
          style={{ 
            color: 'var(--accent)',
            animationDelay: shouldAnimate ? `${i * 0.4}s` : '0s'
          }}
        />
      ))}
    </div>
  );
}

/**
 * Main Spinner Component
 * 
 * Default: Breathing animation (calming, anxiety-reducing)
 * Props allow switching to alternative calming animations
 */
export function Spinner({ 
  size = 'md', 
  variant = 'breathing',
  className = '',
  label
}: SpinnerProps) {
  const spinnerContent = (() => {
    switch (variant) {
      case 'pulse':
        return <PulseSpinner size={size} className={className} />;
      case 'dots':
        return <DotsSpinner size={size} className={className} />;
      case 'breathing':
      default:
        return <BreathingSpinner size={size} className={className} />;
    }
  })();

  if (label) {
    return (
      <div className="flex flex-col items-center gap-3">
        {spinnerContent}
        <span className="text-sm text-[var(--text-secondary)] animate-gentleFadeIn">
          {label}
        </span>
      </div>
    );
  }

  return spinnerContent;
}

/**
 * Legacy Spinner export for backward compatibility
 * @deprecated Use Spinner with variant='breathing' instead
 */
export function LegacySpinner({ size = 'md', className = '' }: Omit<SpinnerProps, 'variant' | 'label'>) {
  const { ref, shouldAnimate } = useCalmAnimation<HTMLSpanElement>();
  
  const sizeMapLegacy = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <span
      ref={ref}
      className={`
        inline-block rounded-full
        border-current/30 border-t-current
        ${sizeMapLegacy[size]}
        ${className}
        ${shouldAnimate ? 'animate-spin' : ''}
      `.trim()}
      style={{ color: 'var(--accent)' }}
      role="status"
      aria-label="Loading"
    />
  );
}
