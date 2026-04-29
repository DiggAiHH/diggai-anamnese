/**
 * German PII (Personally Identifiable Information) Detection Patterns
 * 
 * This module provides regex-based PII detection optimized for German language.
 * All patterns are designed to run offline in the browser.
 * 
 * @module german-pii-patterns
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PIIDetectionResult {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: 'high' | 'medium' | 'low';
  context?: string;
}

export interface PIIDetectionOptions {
  minNameLength?: number;
  checkContext?: boolean;
  strictMode?: boolean;
  customPatterns?: Partial<PIIPatterns>;
}

export type PIIType = 
  | 'NAME'
  | 'ADDRESS'
  | 'POSTAL_CODE'
  | 'CITY'
  | 'BIRTHDATE'
  | 'PHONE'
  | 'EMAIL'
  | 'IBAN'
  | 'INSURANCE_NUMBER'
  | 'ID_CARD';

export interface PIIPatterns {
  name: RegExp;
  address: RegExp;
  postalCode: RegExp;
  city: RegExp;
  birthdate: RegExp;
  phone: RegExp;
  email: RegExp;
  iban: RegExp;
  insuranceNumber: RegExp;
  idCard: RegExp;
}

// ============================================================================
// GERMAN NAME PATTERNS
// ============================================================================

/**
 * Common German first names (high-confidence indicators)
 * Used for context validation to reduce false positives
 */
export const COMMON_GERMAN_FIRST_NAMES = new Set([
  'hans', 'peter', 'michael', 'thomas', 'andreas', 'stefan', 'christian',
  'markus', 'martin', 'alexander', 'sven', 'oliver', 'marco', 'mario',
  'daniel', 'patrick', 'manuel', 'frank', 'matthias', 'klaus', 'jürgen',
  'wolfgang', 'bernd', 'uwe', 'dieter', 'jens', 'jan', 'marcel', 'sebastian',
  'maria', 'sabine', 'petra', 'andrea', 'nicole', 'birgit', 'angelika',
  'monika', 'gabi', 'susanne', 'ute', 'heike', 'claudia', 'katharina',
  'kerstin', 'sandra', 'inge', 'helga', 'renate', 'elke',
  'anna', 'lisa', 'sarah', 'laura', 'julia', 'jennifer', 'jessica',
  'michelle', 'melanie', 'nina', 'tina', 'kristin', 'katrin', 'stefanie',
  'maximilian', 'lukas', 'leon', 'luca', 'ben', 'jonas', 'paul',
  'finn', 'noah', 'eli', 'felix', 'louis', 'henry', 'emil',
  'emma', 'mia', 'hannah', 'sophia', 'lena', 'lea', 'lina',
  'marie', 'clara', 'lilly', 'pia', 'ida', 'greta'
]);

/**
 * German name pattern with umlauts and compound names
 */
export const GERMAN_NAME_REGEX = new RegExp(
  '\\b' +
  '(?:[A-ZÄÖÜ][a-zäöüß]{1,20}|' +
  '[A-ZÄÖÜ][a-zäöüß]{1,15}-[A-ZÄÖÜ][a-zäöüß]{1,15})' +
  '(?:\\s+[A-ZÄÖÜ][a-zäöüß]{0,15}){0,2}' +
  '[\\s-]+' +
  '(?:\\s*(?:von|van|zu|zur|zum|der|die|den|de|di|del|dos|da|du)\\s+){0,2}' +
  '(?:[A-ZÄÖÜ][a-zäöüß]{1,20}(?:-[A-ZÄÖÜ][a-zäöüß]{1,20}){0,2}|' +
  "O[''][A-ZÄÖÜ][a-zäöüß]{1,15}|" +
  'M[ac][A-ZÄÖÜ][a-zäöüß]{1,15})' +
  '\\b\\.?',
  'gu'
);

/**
 * Strict German name pattern - higher confidence, fewer matches
 */
export const GERMAN_NAME_STRICT_REGEX = new RegExp(
  '\\b' +
  '[A-ZÄÖÜ][a-zäöüß]{1,14}' +
  '\\s+[A-ZÄÖÜ][a-zäöüß]{1,19}(?:-[A-ZÄÖÜ][a-zäöüß]{1,19}){0,1}' +
  '\\b',
  'gu'
);

// ============================================================================
// GERMAN ADDRESS PATTERNS
// ============================================================================

/** German postal code (PLZ) - 5 digits */
export const GERMAN_POSTAL_CODE_REGEX = /\b([0-9]{5})\b/g;

/** German postal code with city name */
export const GERMAN_POSTAL_CITY_REGEX = new RegExp(
  '\\b(?:([0-9]{5})\\s*)?' +
  '(Berlin|München|Hamburg|Köln|Frankfurt|Stuttgart|Düsseldorf|' +
  'Dortmund|Essen|Leipzig|Bremen|Dresden|Hannover|Nürnberg|' +
  'Duisburg|Bochum|Wuppertal|Bielefeld|Bonn|Münster|Karlsruhe|' +
  'Mannheim|Augsburg|Wiesbaden|Gelsenkirchen|Mönchengladbach|' +
  'Braunschweig|Chemnitz|Kiel|Aachen|Halle|Magdeburg|Freiburg|' +
  'Krefeld|Lübeck|Oberhausen|Erfurt|Mainz|Rostock|Kassel|' +
  'Hagen|Hamm|Saarbrücken|Mülheim|Ludwigshafen|Oldenburg|' +
  'Osnabrück|Leverkusen|Heidelberg|Darmstadt|Paderborn|' +
  'Potsdam|Würzburg|Regensburg|Recklinghausen|Göttingen|' +
  'Bremerhaven|Wolfsburg|Bottrop|Remscheid|Heilbronn|' +
  'Herne|Ingolstadt|Ulm|Bergisch|Gladbach|Cottbus|Jena|' +
  'Gera|Erlangen|Moers|Siegen|Trier|Hildesheim|Salzgitter)' +
  '\\b',
  'gui'
);

/** German street address pattern */
export const GERMAN_STREET_REGEX = new RegExp(
  '\\b([A-ZÄÖÜ][a-zäöüß]{2,20}(?:[\\s-][A-ZÄÖÜ]?[a-zäöüß]{2,15}){0,3})' +
  '\\s*' +
  '(\\d{1,4}(?:[\\s/-]?(?:[a-zA-Z]{1,2}|\\d{1,3}))?)' +
  '(?:\\s*(?:Etage|E\\.\\s*G\\.|EG|OG|DG|Wohnung|Whg\\.)\\s*\\d{1,2})?' +
  '\\b',
  'gu'
);

/** Full German address */
export const GERMAN_FULL_ADDRESS_REGEX = new RegExp(
  '([A-ZÄÖÜ][a-zäöüß]{2,20}(?:\\s+[A-ZÄÖÜ]?[a-zäöüß]{2,15}){0,2}\\s+\\d{1,4}[a-zA-Z]?),' +
  '\\s*' +
  '([0-9]{5})?' +
  '\\s*' +
  '([A-ZÄÖÜ][a-zäöüß]{2,20})',
  'gui'
);

// ============================================================================
// GERMAN DATE PATTERNS (Birthdates)
// ============================================================================

/** German date format: DD.MM.YYYY */
export const GERMAN_DATE_DOT_REGEX = new RegExp(
  '(?:(?:0[1-9]|[12]\\d|3[01])' +
  '(?:\\.|\\s*/\\s*)(?:0[1-9]|1[0-2])' +
  '(?:\\.|\\s*/\\s*|\\s+-\\s+)(?:19|20)\\d{2})',
  'g'
);

/** German date with month names */
export const GERMAN_DATE_TEXT_REGEX = new RegExp(
  '(?:(?:0?[1-9]|[12]\\d|3[01])\\.?\\s*)' +
  '(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|' +
  'Jan\\.|Feb\\.|Mär\\.|Apr\\.|Jun\\.|Jul\\.|Aug\\.|Sept\\.|Okt\\.|Nov\\.|Dez\\.)' +
  '\\s+(?:19|20)\\d{2}',
  'gui'
);

/** ISO date format (YYYY-MM-DD) */
export const GERMAN_DATE_ISO_REGEX = /(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])/g;

/** Birthdate indicators */
const BIRTHDATE_INDICATORS = [
  'geboren', 'geb', 'geb.', 'geburtsdatum', 'birthday', 'born',
  'geburtstag', 'am', 'vom', 'geb am', 'geb. am'
];

// ============================================================================
// GERMAN PHONE NUMBER PATTERNS
// ============================================================================

/** German mobile phone numbers (015x, 016x, 017x) */
export const GERMAN_MOBILE_REGEX = new RegExp(
  '(?:\\+|00)?(?:49|0049)?\\s*' +
  '0?' +
  '(?:15[1-57-9]|16[23]|17[0-9])' +
  '[\\s/-]?(?:\\d{1,4}[\\s/-]?){1,4}\\d{1,4}' +
  '(?=\\D|$)',
  'g'
);

/** German landline numbers */
export const GERMAN_LANDLINE_REGEX = new RegExp(
  '(?:\\+|00)?(?:49|0049)?\\s*' +
  '(?:0(?:[2-9]\\d{1,4}))' +
  '[\\s/-]?' +
  '(?:\\d{1,4}[\\s/-]?){1,4}\\d{1,4}' +
  '(?=\\D|$)',
  'g'
);

/** Generic German phone number */
export const GERMAN_PHONE_REGEX = new RegExp(
  '(?:\\+|00)?(?:49|0049)?[\\s/-]?' +
  '0?' +
  '(?:[1-9]\\d{1,5})' +
  '[\\s/-]?' +
  '(?:\\d{2,4}[\\s/-]?){1,3}\\d{2,4}' +
  '(?=\\D|$)',
  'g'
);

/** German phone with labels (Tel:, Telefon:, etc.) */
export const GERMAN_PHONE_LABELED_REGEX = new RegExp(
  '(?:Telefon|Tel|Tel\\.|Fon|Fax|Mobil|Handy)\\s*[:\\-]?\\s*' +
  '(?:\\+|00)?(?:49|0049)?\\s*\\d[\\d\\s\\-/]{6,20}',
  'gui'
);

// ============================================================================
// EMAIL & IBAN PATTERNS
// ============================================================================

/** Email address pattern */
export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** German IBAN pattern (starts with DE) */
export const GERMAN_IBAN_REGEX = /\bDE\d{2}[\s]?([0-9a-zA-Z]{4}[\s]?){4}[0-9a-zA-Z]{2}\b/gi;

/** German health insurance number */
export const GERMAN_INSURANCE_NUMBER_REGEX = /\b([A-Z][0-9]{2})(?:[0-9]{8}|[0-9]{2}[\s]?[0-9]{6})\b/gi;

/** German ID card number */
export const GERMAN_ID_CARD_REGEX = /\b[A-Z]{1,2}[0-9]{7,8}\b/g;

// ============================================================================
// PATTERN COLLECTION
// ============================================================================

export const DEFAULT_PATTERNS: PIIPatterns = {
  name: GERMAN_NAME_REGEX,
  address: GERMAN_FULL_ADDRESS_REGEX,
  postalCode: GERMAN_POSTAL_CODE_REGEX,
  city: GERMAN_POSTAL_CITY_REGEX,
  birthdate: GERMAN_DATE_DOT_REGEX,
  phone: GERMAN_PHONE_REGEX,
  email: EMAIL_REGEX,
  iban: GERMAN_IBAN_REGEX,
  insuranceNumber: GERMAN_INSURANCE_NUMBER_REGEX,
  idCard: GERMAN_ID_CARD_REGEX
};

// ============================================================================
// CONTEXT VALIDATION
// ============================================================================

/** Words indicating personal context */
export const PERSONAL_CONTEXT_WORDS = new Set([
  'ich', 'mein', 'meine', 'mich', 'mir',
  'mein name', 'ich heiße', 'ich bin', 'meine adresse',
  'wohne', 'wohnhaft', 'ansässig', 'geboren', 'geb'
]);

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a matched string is likely a real name
 */
export function isLikelyRealName(
  match: string,
  fullText: string,
  startIndex: number
): boolean {
  const lowerMatch = match.toLowerCase().trim();
  const parts = lowerMatch.split(/[\s-]+/);
  
  // Must have at least 2 parts
  if (parts.length < 2) return false;
  
  // Check if first name is in common names list
  const firstName = parts[0].replace(/[^a-zäöüß]/g, '');
  const isCommonFirstName = COMMON_GERMAN_FIRST_NAMES.has(firstName);
  
  // Check surrounding context
  const contextStart = Math.max(0, startIndex - 50);
  const contextEnd = Math.min(fullText.length, startIndex + match.length + 50);
  const context = fullText.substring(contextStart, contextEnd).toLowerCase();
  
  // Check for personal context words
  const hasPersonalContext = Array.from(PERSONAL_CONTEXT_WORDS).some(
    word => context.includes(word)
  );
  
  // Check if it looks like a valid name pattern
  const hasValidPattern = /^[A-ZÄÖÜ][a-zäöüß]+(?:[\s-]+[A-ZÄÖÜ])/.test(match);
  
  // Check for noble/location prefixes
  const hasNamePrefix = /\s+(?:von|van|zu|zur|zum|der|die|den|de|di|del|dos|da|du)\s+[A-ZÄÖÜ]/.test(match);
  
  // Score-based validation
  let score = 0;
  if (isCommonFirstName) score++;
  if (hasPersonalContext) score++;
  if (hasValidPattern) score++;
  if (hasNamePrefix) score++;
  
  return score >= 2;
}

/**
 * Validates if a date is likely a birthdate
 */
export function isLikelyBirthdate(
  match: string,
  fullText: string,
  startIndex: number
): boolean {
  const contextStart = Math.max(0, startIndex - 100);
  const contextEnd = Math.min(fullText.length, startIndex + match.length + 100);
  const context = fullText.substring(contextStart, contextEnd).toLowerCase();
  
  // Check for birthdate keywords
  const hasBirthIndicator = BIRTHDATE_INDICATORS.some(
    indicator => context.includes(indicator)
  );
  
  // Extract year from date
  const yearMatch = match.match(/(?:19|20)(\d{2})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    // Reject future dates regardless of context
    if (year > currentYear) {
      return false;
    }
    
    // Reasonable birth year
    if (year >= 1900 && year <= currentYear - 5) {
      return hasBirthIndicator || (age >= 0 && age <= 120);
    }
  }
  
  return hasBirthIndicator;
}

/**
 * Validates if a number is likely a phone number
 */
export function isLikelyPhoneNumber(match: string): boolean {
  const digitsOnly = match.replace(/\D/g, '');
  
  // German phone numbers: 6-15 digits
  if (digitsOnly.length < 6 || digitsOnly.length > 15) {
    return false;
  }
  
  // Check for German mobile prefixes
  const isGermanMobile = /^49?(0)?(15[1-57-9]|16[23]|17[0-9])/.test(digitsOnly);
  
  // Check for German landline area codes
  const isGermanLandline = /^49?(0)?[2-9]\d{1,4}/.test(digitsOnly);
  
  return isGermanMobile || isGermanLandline || digitsOnly.length >= 10;
}

/**
 * Extracts context around a match
 */
export function extractContext(
  text: string,
  startIndex: number,
  endIndex: number,
  contextLength: number = 30
): string {
  const contextStart = Math.max(0, startIndex - contextLength);
  const contextEnd = Math.min(text.length, endIndex + contextLength);
  return text.substring(contextStart, contextEnd);
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detects PII in German text using regex patterns
 */
export function detectGermanPII(
  text: string,
  options: PIIDetectionOptions = {}
): PIIDetectionResult[] {
  const {
    minNameLength = 2,
    checkContext = true,
    strictMode = false,
    customPatterns = {}
  } = options;
  
  const patterns: PIIPatterns = { ...DEFAULT_PATTERNS, ...customPatterns };
  const results: PIIDetectionResult[] = [];
  const seen = new Set<string>();
  
  const addResult = (
    type: PIIType,
    value: string,
    startIndex: number,
    endIndex: number,
    confidence: 'high' | 'medium' | 'low'
  ) => {
    const key = `${type}:${startIndex}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    
    results.push({
      type,
      value: value.trim(),
      startIndex,
      endIndex,
      confidence,
      context: checkContext ? extractContext(text, startIndex, endIndex) : undefined
    });
  };
  
  // Detect names
  const namePattern = strictMode ? GERMAN_NAME_STRICT_REGEX : patterns.name;
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    const value = match[0];
    if (value.length >= minNameLength * 2) {
      const confidence = checkContext
        ? isLikelyRealName(value, text, match.index) ? 'high' : 'low'
        : 'medium';
      
      if (confidence !== 'low') {
        addResult('NAME', value, match.index, match.index + value.length, confidence);
      }
    }
  }
  
  // Detect birthdates
  const birthdatePatterns = [patterns.birthdate, GERMAN_DATE_TEXT_REGEX];
  for (const pattern of birthdatePatterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];
      const confidence = checkContext
        ? isLikelyBirthdate(value, text, match.index) ? 'high' : 'low'
        : 'medium';
      
      if (confidence !== 'low') {
        addResult('BIRTHDATE', value, match.index, match.index + value.length, confidence);
      }
    }
  }
  
  // Detect addresses
  patterns.address.lastIndex = 0;
  while ((match = patterns.address.exec(text)) !== null) {
    addResult('ADDRESS', match[0], match.index, match.index + match[0].length, 'high');
  }
  
  // Detect postal codes
  patterns.postalCode.lastIndex = 0;
  while ((match = patterns.postalCode.exec(text)) !== null) {
    const plz = match[1];
    const prefix = parseInt(plz.substring(0, 2));
    if (prefix >= 1 && prefix <= 99) {
      addResult('POSTAL_CODE', plz, match.index, match.index + plz.length, 'high');
    }
  }
  
  // Detect cities
  patterns.city.lastIndex = 0;
  while ((match = patterns.city.exec(text)) !== null) {
    addResult('CITY', match[0], match.index, match.index + match[0].length, 'high');
  }
  
  // Detect phone numbers
  const phonePatterns = [patterns.phone, GERMAN_PHONE_LABELED_REGEX];
  for (const pattern of phonePatterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];
      if (isLikelyPhoneNumber(value)) {
        addResult('PHONE', value, match.index, match.index + value.length, 'high');
      }
    }
  }
  
  // Detect emails
  patterns.email.lastIndex = 0;
  while ((match = patterns.email.exec(text)) !== null) {
    addResult('EMAIL', match[0], match.index, match.index + match[0].length, 'high');
  }
  
  // Detect IBANs
  patterns.iban.lastIndex = 0;
  while ((match = patterns.iban.exec(text)) !== null) {
    addResult('IBAN', match[0], match.index, match.index + match[0].length, 'high');
  }
  
  // Sort by start index
  results.sort((a, b) => a.startIndex - b.startIndex);
  
  return results;
}

/**
 * Redacts detected PII from text
 */
export function redactGermanPII(
  text: string,
  _replacement: string = '[REDACTED]',
  options: PIIDetectionOptions = {}
): string {
  const detections = detectGermanPII(text, options);
  
  if (detections.length === 0) {
    return text;
  }
  
  const sorted = [...detections].sort((a, b) => b.startIndex - a.startIndex);
  
  let result = text;
  for (const detection of sorted) {
    result = 
      result.substring(0, detection.startIndex) +
      `[${detection.type}]` +
      result.substring(detection.endIndex);
  }
  
  return result;
}

/**
 * Checks if text contains any PII
 */
export function containsGermanPII(
  text: string,
  options: PIIDetectionOptions = {}
): boolean {
  return detectGermanPII(text, options).length > 0;
}

/**
 * Gets a summary of detected PII types
 */
export function getPIISummary(
  text: string,
  options: PIIDetectionOptions = {}
): Partial<Record<PIIType, number>> {
  const detections = detectGermanPII(text, options);
  const summary: Partial<Record<PIIType, number>> = {};
  
  for (const detection of detections) {
    summary[detection.type] = (summary[detection.type] || 0) + 1;
  }
  
  return summary;
}

export default {
  detectGermanPII,
  redactGermanPII,
  containsGermanPII,
  getPIISummary,
  isLikelyRealName,
  isLikelyBirthdate,
  isLikelyPhoneNumber,
  extractContext,
  DEFAULT_PATTERNS,
  COMMON_GERMAN_FIRST_NAMES
};
