/**
 * Usage Examples for German PII Detection
 * 
 * This file demonstrates common use cases for the PII detection library.
 */

import {
  detectGermanPII,
  containsGermanPII,
  redactGermanPII,
  getPIISummary,
  COMMON_GERMAN_FIRST_NAMES,
} from './german-pii-patterns';

// ============================================================================
// EXAMPLE 1: Basic Voice Input Analysis
// ============================================================================

export function analyzeVoiceInputExample() {
  const voiceTranscription = `
    Guten Tag, mein Name ist Hans Müller.
    Ich bin geboren am 15. März 1985.
    Meine Adresse ist Musterstraße 12, 12345 Berlin.
    Sie können mich unter 0170 1234567 oder hans@email.de erreichen.
  `;

  // Detect all PII
  const detections = detectGermanPII(voiceTranscription);
  
  console.log('Detected PII:');
  detections.forEach(d => {
    console.log(`  [${d.type}] ${d.value} (confidence: ${d.confidence})`);
  });
  
  // Check for specific types
  const hasName = detections.some(d => d.type === 'NAME');
  const hasBirthdate = detections.some(d => d.type === 'BIRTHDATE');
  const hasPhone = detections.some(d => d.type === 'PHONE');
  
  console.log('\nSummary:');
  console.log(`  Name detected: ${hasName}`);
  console.log(`  Birthdate detected: ${hasBirthdate}`);
  console.log(`  Phone detected: ${hasPhone}`);
  
  return detections;
}

// ============================================================================
// EXAMPLE 2: Pre-Submission Warning
// ============================================================================

export function preSubmissionCheck(userInput: string): {
  canSubmit: boolean;
  warning?: string;
  detectedTypes: string[];
} {
  // Quick check first
  if (!containsGermanPII(userInput)) {
    return { canSubmit: true, detectedTypes: [] };
  }
  
  // Detailed analysis
  const detections = detectGermanPII(userInput, {
    checkContext: true,
    strictMode: false
  });
  
  // Only warn for high/medium confidence
  const warningDetections = detections.filter(
    d => d.confidence === 'high' || d.confidence === 'medium'
  );
  
  if (warningDetections.length === 0) {
    return { canSubmit: true, detectedTypes: [] };
  }
  
  const types = [...new Set(warningDetections.map(d => d.type))];
  
  return {
    canSubmit: false,
    warning: `Persönliche Daten erkannt: ${types.join(', ')}. Möchten Sie wirklich fortfahren?`,
    detectedTypes: types
  };
}

// ============================================================================
// EXAMPLE 3: Automatic Redaction for Logging
// ============================================================================

export function safeLoggingExample() {
  const userMessage = 'Mein Name ist Anna Schmidt, ich wohne in Hamburg.';
  
  // NEVER log PII directly!
  // console.log(userMessage); // ❌ BAD
  
  // Instead, redact first
  const safeMessage = redactGermanPII(userMessage);
  console.log(safeMessage); // "[NAME] wohnt in [CITY]"
  
  // Or check if safe to log
  if (!containsGermanPII(userMessage)) {
    console.log('User said:', userMessage);
  } else {
    console.log('User message contains PII - not logging full content');
    console.log('PII summary:', getPIISummary(userMessage));
  }
}

// ============================================================================
// EXAMPLE 4: Custom Name Detection
// ============================================================================

export function addCustomNamesExample() {
  // Add uncommon names to the list
  COMMON_GERMAN_FIRST_NAMES.add('lennart');
  COMMON_GERMAN_FIRST_NAMES.add('fiete');
  COMMON_GERMAN_FIRST_NAMES.add('matilda');
  
  // Now these names will be detected with higher confidence
  const text = 'Ich bin Lennart Schmidt';
  const results = detectGermanPII(text);
  
  console.log('With custom names added:');
  console.log(results);
}

// ============================================================================
// EXAMPLE 5: Voice Input with Real-time Check
// ============================================================================

export class VoiceInputPIIWatcher {
  private lastCheck: number = 0;
  private readonly debounceMs: number = 500;
  private onWarning: (detections: any[]) => void;
  private onClear: () => void;
  
  constructor(
    onWarning: (detections: any[]) => void,
    onClear: () => void
  ) {
    this.onWarning = onWarning;
    this.onClear = onClear;
  }
  
  onTranscriptionUpdate(text: string) {
    const now = Date.now();
    
    // Debounce checks
    if (now - this.lastCheck < this.debounceMs) {
      return;
    }
    this.lastCheck = now;
    
    // Check for PII
    const detections = detectGermanPII(text, {
      checkContext: true,
      minNameLength: 2
    });
    
    // Only warn for high confidence items
    const highConfidence = detections.filter(d => d.confidence === 'high');
    
    if (highConfidence.length > 0) {
      this.onWarning(highConfidence);
    } else {
      this.onClear();
    }
  }
}

// ============================================================================
// EXAMPLE 6: Batch Processing
// ============================================================================

export function batchProcessingExample(transcriptions: string[]) {
  const results = transcriptions.map((text, index) => ({
    id: index,
    text: text.substring(0, 50) + '...',
    hasPII: containsGermanPII(text),
    summary: getPIISummary(text)
  }));
  
  const piiCount = results.filter(r => r.hasPII).length;
  
  console.log(`Processed ${results.length} transcriptions`);
  console.log(`${piiCount} contain PII`);
  
  return results;
}

// ============================================================================
// EXAMPLE 7: Strict vs Permissive Mode
// ============================================================================

export function strictVsPermissiveExample() {
  const ambiguousText = 'Der Müller kommt aus Berlin';
  
  // Permissive mode - more detections, possible false positives
  const permissive = detectGermanPII(ambiguousText, {
    strictMode: false,
    checkContext: true
  });
  console.log('Permissive mode:', permissive.length, 'detections');
  
  // Strict mode - fewer detections, higher precision
  const strict = detectGermanPII(ambiguousText, {
    strictMode: true,
    checkContext: true
  });
  console.log('Strict mode:', strict.length, 'detections');
}

// ============================================================================
// EXAMPLE 8: Form Validation Integration
// ============================================================================

export interface FormFieldValidation {
  field: string;
  value: string;
  containsPII: boolean;
  allowed: boolean;
  warning?: string;
}

export function validateFormForPII(
  formData: Record<string, string>,
  allowedFields: string[] = []
): FormFieldValidation[] {
  return Object.entries(formData).map(([field, value]) => {
    const hasPII = containsGermanPII(value);
    const isAllowed = allowedFields.includes(field);
    
    return {
      field,
      value: value.substring(0, 100), // Truncate for display
      containsPII: hasPII,
      allowed: !hasPII || isAllowed,
      warning: hasPII && !isAllowed
        ? `Das Feld "${field}" enthält möglicherweise persönliche Daten.`
        : undefined
    };
  });
}

// ============================================================================
// Run examples (Node.js only)
// ============================================================================

// @ts-ignore - Cannot properly type require/module in browser context
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  // @ts-ignore - Node.js main check
  if ((require as any).main === module) {
    console.log('=== German PII Detection Examples ===\n');
    
    console.log('Example 1: Voice Input Analysis');
    analyzeVoiceInputExample();
    
    console.log('\nExample 2: Pre-Submission Check');
    const check = preSubmissionCheck('Ich heiße Max Mustermann');
    console.log(check);
    
    console.log('\nExample 3: Safe Logging');
    safeLoggingExample();
    
    console.log('\nExample 4: Strict vs Permissive');
    strictVsPermissiveExample();
    
    console.log('\nExample 5: Form Validation');
    const formValidation = validateFormForPII({
      name: 'Hans Müller',
      message: 'Ich habe Schmerzen',
      email: 'hans@test.de'
    });
    console.log(formValidation);
  }
}
