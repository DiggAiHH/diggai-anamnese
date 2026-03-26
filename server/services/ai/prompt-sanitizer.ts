/**
 * @module prompt-sanitizer
 * @description LLM Prompt Injection Prevention and Input Sanitization
 * @security HIGH-003 LLM Prompt Injection Protection
 */

// Injection patterns to detect prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+(instructions?|commands?)/i,
  /system\s*[:\-]\s*you\s+are/i,
  /system\s*prompt/i,
  /override\s+(instructions?|rules?)/i,
  /disregard\s+(previous|all)/i,
  /\bDAN\b|\bdo\s+anything\s+now\b/i,
  /jailbreak/i,
  /<<\|endoftext\|>>/i,
  /\[INST\].*?\[\/INST\]/i,
  /###\s*SYSTEM\s*:/i,
  /\{\{.*?\}\}/g,  // Template injection
  /<script>/i,
  /\[\/system\]/i,
  /\[\/user\]/i,
  /\[\/assistant\]/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,
  /\[\s*insert\s+/i,
  /\{\s*system\s*\}/i,
  /new\s+command:/i,
  /you\s+are\s+now/i,
  /from\s+now\s+on/i,
  /forget\s+(everything|all|previous)/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+(if\s+you\s+are)?/i,
  /roleplay\s+as/i,
];

// Maximum allowed input length
const MAX_LENGTH = 4000;

/**
 * Detects potential prompt injection attempts
 * @param input - The input string to check
 * @returns Object with detection results and matched patterns
 */
export function detectPromptInjection(input: string): { 
  detected: boolean; 
  pattern?: string; 
  matches: string[];
} {
  if (typeof input !== 'string') {
    return { detected: false, matches: [] };
  }
  
  const matches: string[] = [];
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      matches.push(pattern.source);
    }
  }
  
  return {
    detected: matches.length > 0,
    pattern: matches.length > 0 ? matches[0] : undefined,
    matches,
  };
}

/**
 * Sanitizes input for LLM processing
 * @param input - The raw input string
 * @returns Sanitized string or null if injection detected
 */
export function sanitizePromptInput(input: string): string | null {
  if (typeof input !== 'string') {
    console.warn('[AI Security] Invalid input type:', typeof input);
    return null;
  }
  
  // Check for injection attempts
  const injectionCheck = detectPromptInjection(input);
  if (injectionCheck.detected) {
    console.warn('[AI Security] Potential prompt injection detected:', {
      input: input.slice(0, 50),
      patterns: injectionCheck.matches,
    });
    return null;
  }
  
  // Additional sanitization
  return input
    .replace(/[<>]/g, '')  // Remove angle brackets
    .replace(/\x00/g, '')  // Remove null bytes
    .trim();
}

/**
 * Enhanced sanitization for LLM inputs with detailed feedback
 * @param input - The raw input string
 * @returns Object with sanitized text, blocked status, and warnings
 */
export function sanitizeForLlm(input: string): { 
  sanitized: string; 
  blocked: boolean; 
  warnings: string[];
} {
  const warnings: string[] = [];
  
  if (typeof input !== 'string') {
    return { 
      sanitized: '', 
      blocked: true, 
      warnings: ['Input must be a string'] 
    };
  }
  
  // Check for injection attempts
  const injectionCheck = detectPromptInjection(input);
  if (injectionCheck.detected) {
    warnings.push(`Potential prompt injection detected: ${injectionCheck.matches.join(', ')}`);
  }
  
  let sanitized = input
    // Remove potential prompt control characters
    .replace(/[<>{}\[\]]/g, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Check length limit
  if (sanitized.length > MAX_LENGTH) {
    warnings.push(`Input truncated from ${sanitized.length} to ${MAX_LENGTH} characters`);
    sanitized = sanitized.slice(0, MAX_LENGTH);
  }
  
  return {
    sanitized,
    blocked: injectionCheck.detected,
    warnings,
  };
}

/**
 * Validates medical input for safe LLM processing
 * Allows legitimate medical terminology while blocking injections
 * @param input - The medical input to validate
 * @returns Validation result with safe/unsafe status
 */
export function validateMedicalInput(input: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' };
  }
  
  // Check for injection
  const injectionCheck = detectPromptInjection(input);
  if (injectionCheck.detected) {
    return { 
      valid: false, 
      error: 'Input contains potentially harmful patterns' 
    };
  }
  
  // Sanitize
  const sanitized = sanitizePromptInput(input);
  if (sanitized === null) {
    return { valid: false, error: 'Input could not be sanitized' };
  }
  
  return { valid: true, sanitized };
}
