/**
 * useCalmAnimation Hook
 * 
 * A utility hook for anxiety-reducing animations that respects user preferences.
 * 
 * Features:
 * - Detects prefers-reduced-motion media query
 * - Provides CSS variable access for consistent animation timing
 * - Offers helper functions for calm animation classes
 * - Ensures all animations are subtle and calming
 * 
 * Psychology-Based Animation Timing:
 * - Page Transitions: 400ms, cubic-bezier(0.4, 0, 0.2, 1)
 * - Button Hover: 200ms, ease-out
 * - Loading States: 800ms loop, ease-in-out
 * - Success Feedback: 600ms, cubic-bezier(0.34, 1.56, 0.64, 1)
 * - Error Feedback: 300ms, ease-out (NO SHAKE!)
 * - Modal Open: 300ms, cubic-bezier(0.4, 0, 0.2, 1)
 * - Modal Close: 200ms, ease-in
 * 
 * @example
 * const { shouldAnimate, getCalmClass } = useCalmAnimation();
 * 
 * @example
 * const { ref, shouldAnimate } = useCalmAnimation<HTMLDivElement>();
 * return <div ref={ref} className={shouldAnimate ? 'animate-breathing' : ''} />
 */

import { useEffect, useState, useCallback, useRef, type RefObject } from 'react';

// Animation timing constants (in milliseconds)
export const ANIMATION_DURATIONS = {
  /** Page transitions - smooth and unhurried */
  PAGE: 400,
  /** Button interactions - quick feedback */
  BUTTON: 200,
  /** Loading states - continuous loop */
  LOADING: 800,
  /** Success feedback - celebratory but gentle */
  SUCCESS: 600,
  /** Error feedback - quick but NO SHAKE */
  ERROR: 300,
  /** Modal opening - smooth reveal */
  MODAL_OPEN: 300,
  /** Modal closing - quick dismissal */
  MODAL_CLOSE: 200,
  /** Toast notifications - gentle entrance */
  TOAST: 400,
  /** Breathing animation cycle - 4 second rhythm */
  BREATHING: 4000,
  /** Standard fade transitions */
  FADE: 300,
} as const;

// CSS easing functions
export const ANIMATION_EASINGS = {
  /** Standard ease - most transitions */
  STANDARD: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Decelerate - elements entering */
  DECELERATE: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Accelerate - elements exiting */
  ACCELERATE: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Bounce - success states only */
  BOUNCE: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Gentle - subtle movements */
  GENTLE: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  /** Breath - continuous animations */
  BREATH: 'ease-in-out',
} as const;

// Stagger delays for lists
export const STAGGER = {
  BASE: 50,
  MAX: 500,
} as const;

export interface UseCalmAnimationReturn<T extends HTMLElement = HTMLElement> {
  /** Ref to attach to the animated element */
  ref: RefObject<T | null>;
  /** Whether animations should play (false if user prefers reduced motion) */
  shouldAnimate: boolean;
  /** Whether the reduced motion preference is set */
  prefersReducedMotion: boolean;
  /** Get a calm animation class with proper timing */
  getCalmClass: (type: AnimationType, options?: AnimationOptions) => string;
  /** Get CSS transition string */
  getTransition: (property?: string, duration?: number, easing?: string) => string;
  /** Animation timing values */
  durations: typeof ANIMATION_DURATIONS;
  /** Easing function values */
  easings: typeof ANIMATION_EASINGS;
}

export type AnimationType = 
  | 'page' 
  | 'button' 
  | 'loading' 
  | 'success' 
  | 'error' 
  | 'modalOpen' 
  | 'modalClose' 
  | 'toast' 
  | 'breathing' 
  | 'fade';

export interface AnimationOptions {
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Custom duration override (ms) */
  duration?: number;
  /** Whether to apply reduced motion */
  respectReducedMotion?: boolean;
}

/**
 * Maps animation types to their CSS variable names
 */
const ANIMATION_TYPE_MAP: Record<AnimationType, { duration: string; easing: string }> = {
  page: { duration: '--animation-duration-page', easing: '--animation-easing-standard' },
  button: { duration: '--animation-duration-button', easing: '--animation-easing-standard' },
  loading: { duration: '--animation-duration-loading', easing: '--animation-easing-breath' },
  success: { duration: '--animation-duration-success', easing: '--animation-easing-bounce' },
  error: { duration: '--animation-duration-error', easing: '--animation-easing-gentle' },
  modalOpen: { duration: '--animation-duration-modal-open', easing: '--animation-easing-standard' },
  modalClose: { duration: '--animation-duration-modal-close', easing: '--animation-easing-accelerate' },
  toast: { duration: '--animation-duration-toast', easing: '--animation-easing-standard' },
  breathing: { duration: '--animation-duration-breathing', easing: '--animation-easing-breath' },
  fade: { duration: '--animation-duration-fade', easing: '--animation-easing-standard' },
};

/**
 * Hook for calm, anxiety-reducing animations
 * 
 * @example Basic usage with ref
 * ```tsx
 * const { ref, shouldAnimate } = useCalmAnimation<HTMLDivElement>();
 * return <div ref={ref} className={shouldAnimate ? 'animate-breathing' : ''} />
 * ```
 * 
 * @example Using animation helper
 * ```tsx
 * const { getCalmClass } = useCalmAnimation();
 * return <div className={getCalmClass('success')} />
 * ```
 */
export function useCalmAnimation<T extends HTMLElement = HTMLElement>(): UseCalmAnimationReturn<T> {
  const ref = useRef<T>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  /**
   * Get a calm animation class with proper timing
   */
  const getCalmClass = useCallback((type: AnimationType, options: AnimationOptions = {}): string => {
    const { delay = 0, duration, respectReducedMotion = true } = options;
    
    // Respect reduced motion preference
    if (respectReducedMotion && prefersReducedMotion) {
      return '';
    }

    const typeMap = ANIMATION_TYPE_MAP[type];
    const animationClasses: Record<AnimationType, string> = {
      page: 'animate-pageEnter',
      button: 'transition-all duration-200',
      loading: 'animate-breathing',
      success: 'animate-successScale',
      error: 'animate-gentleFadeIn',
      modalOpen: 'animate-modalEnter',
      modalClose: 'animate-modalExit',
      toast: 'animate-slideInRight',
      breathing: 'animate-breathing',
      fade: 'animate-gentleFadeIn',
    };

    const baseClass = animationClasses[type] || '';
    const delayStyle = delay > 0 ? ` animation-delay-[${delay}ms]` : '';
    
    return `${baseClass}${delayStyle}`.trim();
  }, [prefersReducedMotion]);

  /**
   * Get CSS transition string
   */
  const getTransition = useCallback((
    property: string = 'all', 
    duration: number = ANIMATION_DURATIONS.BUTTON, 
    easing: string = ANIMATION_EASINGS.STANDARD
  ): string => {
    if (prefersReducedMotion) {
      return 'none';
    }
    return `${property} ${duration}ms ${easing}`;
  }, [prefersReducedMotion]);

  return {
    ref,
    shouldAnimate: !prefersReducedMotion,
    prefersReducedMotion,
    getCalmClass,
    getTransition,
    durations: ANIMATION_DURATIONS,
    easings: ANIMATION_EASINGS,
  };
}

/**
 * Standalone hook to check reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Helper to create staggered animation delays
 */
export function useStaggerDelay(itemIndex: number, baseDelay: number = STAGGER.BASE): string {
  const delay = Math.min(itemIndex * baseDelay, STAGGER.MAX);
  return `${delay}ms`;
}

/**
 * Get CSS custom properties for animations
 * Useful for inline styles with dynamic values
 */
export function getAnimationCSSProperties(): Record<string, string> {
  return {
    '--animation-duration-page': `${ANIMATION_DURATIONS.PAGE}ms`,
    '--animation-duration-button': `${ANIMATION_DURATIONS.BUTTON}ms`,
    '--animation-duration-loading': `${ANIMATION_DURATIONS.LOADING}ms`,
    '--animation-duration-success': `${ANIMATION_DURATIONS.SUCCESS}ms`,
    '--animation-duration-error': `${ANIMATION_DURATIONS.ERROR}ms`,
    '--animation-duration-modal-open': `${ANIMATION_DURATIONS.MODAL_OPEN}ms`,
    '--animation-duration-modal-close': `${ANIMATION_DURATIONS.MODAL_CLOSE}ms`,
    '--animation-duration-toast': `${ANIMATION_DURATIONS.TOAST}ms`,
    '--animation-duration-breathing': `${ANIMATION_DURATIONS.BREATHING}ms`,
    '--animation-duration-fade': `${ANIMATION_DURATIONS.FADE}ms`,
    '--animation-easing-standard': ANIMATION_EASINGS.STANDARD,
    '--animation-easing-decelerate': ANIMATION_EASINGS.DECELERATE,
    '--animation-easing-accelerate': ANIMATION_EASINGS.ACCELERATE,
    '--animation-easing-bounce': ANIMATION_EASINGS.BOUNCE,
    '--animation-easing-gentle': ANIMATION_EASINGS.GENTLE,
    '--animation-easing-breath': ANIMATION_EASINGS.BREATH,
  } as Record<string, string>;
}

export default useCalmAnimation;
