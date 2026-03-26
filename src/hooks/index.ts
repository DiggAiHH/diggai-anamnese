/**
 * Hooks Index
 * 
 * Central export for all custom hooks.
 * 
 * @example
 * import { useNetworkStatus, useOfflineQueue } from '@/hooks';
 */

// Existing hooks
export * from './useAgentApi';
export { useBilling } from './useBilling';
export { useFullscreen } from './useFullscreen';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export * from './useOpsApi';
export * from './usePatientApi';
export { useSocketEvents } from './useSocketEvents';
export * from './useStaffApi';
export * from './useThemeApi';
export { useVoiceNavigation } from './useVoiceNavigation';
export { STAFF_SESSION_QUERY_KEY, useStaffSession } from './useStaffSession';

// New hooks for production readiness
export { useNetworkStatus, useDebouncedOffline } from './useNetworkStatus';
export { useOfflineQueue } from './useOfflineQueue';
export { useFocusTrap, useFocusVisible } from './useFocusTrap';

// Animation hooks - calming, anxiety-reducing animations
export { 
  useCalmAnimation, 
  useReducedMotion, 
  useStaggerDelay,
  getAnimationCSSProperties,
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  STAGGER
} from './useCalmAnimation';
export type { 
  AnimationType, 
  AnimationOptions, 
  UseCalmAnimationReturn 
} from './useCalmAnimation';
