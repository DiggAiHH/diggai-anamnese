/**
 * German PII Detection Library
 * 
 * Offline-capable PII detection for German text.
 * 
 * @example
 * ```typescript
 * import { detectGermanPII, usePIIDetection } from './pii-detection';
 * 
 * const results = detectGermanPII('Hans Müller, 15.03.1985');
 * ```
 */

// Core patterns and functions
export {
  // Main detection function
  detectGermanPII,
  containsGermanPII,
  redactGermanPII,
  getPIISummary,
  
  // Validation helpers
  isLikelyRealName,
  isLikelyBirthdate,
  isLikelyPhoneNumber,
  extractContext,
  
  // Pattern constants
  DEFAULT_PATTERNS,
  COMMON_GERMAN_FIRST_NAMES,
  GERMAN_NAME_REGEX,
  GERMAN_NAME_STRICT_REGEX,
  GERMAN_POSTAL_CODE_REGEX,
  GERMAN_POSTAL_CITY_REGEX,
  GERMAN_STREET_REGEX,
  GERMAN_FULL_ADDRESS_REGEX,
  GERMAN_DATE_DOT_REGEX,
  GERMAN_DATE_TEXT_REGEX,
  GERMAN_DATE_ISO_REGEX,
  GERMAN_MOBILE_REGEX,
  GERMAN_LANDLINE_REGEX,
  GERMAN_PHONE_REGEX,
  GERMAN_PHONE_LABELED_REGEX,
  EMAIL_REGEX,
  GERMAN_IBAN_REGEX,
  GERMAN_INSURANCE_NUMBER_REGEX,
  GERMAN_ID_CARD_REGEX,
  PERSONAL_CONTEXT_WORDS,
  
  // Types
  type PIIDetectionResult,
  type PIIDetectionOptions,
  type PIIType,
  type PIIPatterns,
} from './german-pii-patterns';

// React hooks
export {
  usePIIDetection,
  useHasPII,
  type UsePIIDetectionOptions,
  type UsePIIDetectionReturn,
} from './usePIIDetection';

// React components
export {
  PIIDetectionWarning,
  PIIWarningBadge,
  type PIIDetectionWarningProps,
  type PIIWarningBadgeProps,
} from './PIIDetectionWarning';

// Default export
export { default } from './german-pii-patterns';
