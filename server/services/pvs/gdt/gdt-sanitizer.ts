/**
 * @module gdt-sanitizer
 * @description Input-Sanitization und Validation für GDT-Daten
 *
 * @security Schützt vor:
 *   - Injection-Angriffen (GDT-Injection, Command Injection)
 *   - Buffer Overflows (durch Längenvalidierung)
 *   - Encoding-Angriffen
 *   - Malformed Data-Angriffen
 *
 * @compliance KBV GDT 3.0 Standard
 * @encoding ISO-8859-15 (default), CP437 (legacy)
 */

import { GDT_FIELDS, GDT_SATZARTEN } from './gdt-constants.js';

/** Validierungs-Fehler */
export interface SanitizationError {
  field: string;
  code: SanitizationErrorCode;
  message: string;
  severity: 'error' | 'warning';
  originalValue?: string;
}

/** Fehler-Codes */
export type SanitizationErrorCode =
  | 'NULL_BYTE'
  | 'CONTROL_CHAR'
  | 'INVALID_ENCODING'
  | 'FIELD_TOO_LONG'
  | 'INVALID_FORMAT'
  | 'INJECTION_PATTERN'
  | 'INVALID_SATZART'
  | 'INVALID_FIELD_ID'
  | 'PATH_TRAVERSAL'
  | 'SUSPICIOUS_PATTERN'
  | 'INVALID_DATE'
  | 'INVALID_TIME';

/** Sanitization-Result */
export interface SanitizationResult {
  sanitized: string;
  isValid: boolean;
  errors: SanitizationError[];
  warnings: SanitizationError[];
  originalLength: number;
  sanitizedLength: number;
}

/** GDT-Sanitization-Config */
export interface GdtSanitizationConfig {
  /** Erlaubte Zeichensätze (default: 'iso-8859-15') */
  encoding?: 'iso-8859-15' | 'cp437' | 'utf-8';
  /** Maximale Zeilenlänge (default: 999) */
  maxLineLength?: number;
  /** Strikt-Modus: Warnings werden zu Errors (default: false) */
  strictMode?: boolean;
  /** Erlaubte Satzarten (default: alle) */
  allowedSatzarten?: string[];
  /** Erlaubte Feldkennungen (default: alle bekannten) */
  allowedFieldIds?: string[];
  /** Ob Dateipfade validiert werden sollen (default: true) */
  validatePaths?: boolean;
}

/** Unsichere Zeichen/Sequenzen */
const DANGEROUS_PATTERNS = [
  // Null Bytes
  { pattern: /\x00/g, code: 'NULL_BYTE' as const, message: 'Null-Byte gefunden' },
  
  // Control Characters (außer CR/LF/TAB)
  { pattern: /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, code: 'CONTROL_CHAR' as const, message: 'Kontrollzeichen gefunden' },
  
  // Shell Injection Patterns
  { pattern: /[;&|`$(){}[\]\\]/g, code: 'INJECTION_PATTERN' as const, message: 'Shell-Injection-Zeichen gefunden' },
  
  // Path Traversal
  { pattern: /\.\.[\\/]/g, code: 'PATH_TRAVERSAL' as const, message: 'Path Traversal Pattern gefunden' },
  { pattern: /[\\/]%2e%2e/gi, code: 'PATH_TRAVERSAL' as const, message: 'URL-encoded Path Traversal' },
  
  // SQL Injection (basic)
  { pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, code: 'INJECTION_PATTERN' as const, message: 'SQL-Keyword gefunden' },
  
  // XML/HTML Injection
  { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, code: 'INJECTION_PATTERN' as const, message: 'Script-Tag gefunden' },
  { pattern: /javascript:/gi, code: 'INJECTION_PATTERN' as const, message: 'JavaScript-Protocol gefunden' },
  
  // Suspicious Unicode
  { pattern: /[\u202a-\u202e]/g, code: 'SUSPICIOUS_PATTERN' as const, message: 'Bidirectional Unicode gefunden' },
  { pattern: /[\u200b-\u200f\ufeff]/g, code: 'SUSPICIOUS_PATTERN' as const, message: 'Zero-width Unicode gefunden' },
];

/** Gültige Feldkennungen (4-stellige Nummern) */
const VALID_FIELD_ID_PATTERN = /^\d{4}$/;

/** Maximale Längen pro Feldtyp */
const FIELD_MAX_LENGTHS: Record<string, number> = {
  [GDT_FIELDS.PAT_NR]: 10,
  [GDT_FIELDS.PAT_NAME]: 28,
  [GDT_FIELDS.PAT_VORNAME]: 28,
  [GDT_FIELDS.PAT_GEBDAT]: 8,
  [GDT_FIELDS.PAT_GESCHLECHT]: 1,
  [GDT_FIELDS.PAT_PLZ]: 7,
  [GDT_FIELDS.PAT_VERSNR]: 12,
  [GDT_FIELDS.SENDER_ID]: 8,
  [GDT_FIELDS.RECEIVER_ID]: 8,
  [GDT_FIELDS.BEFUND_TEXT]: 32000, // Variable Länge
};

/**
 * Validiert und sanitisiert einen GDT-Inhalts-String
 * 
 * @param content - Der zu validierende GDT-Inhalt
 * @param config - Sanitization-Konfiguration
 * @returns SanitizationResult mit validiertem Content und Fehlern
 * 
 * @example
 * const result = sanitizeGdtContent('3101Müller');
 * if (!result.isValid) {
 *   console.error(result.errors);
 * }
 */
export function sanitizeGdtContent(
  content: string,
  config: GdtSanitizationConfig = {}
): SanitizationResult {
  const {
    maxLineLength = 999,
    strictMode = false,
    allowedSatzarten = Object.values(GDT_SATZARTEN),
    allowedFieldIds = Object.values(GDT_FIELDS),
    validatePaths = true,
  } = config;

  const errors: SanitizationError[] = [];
  const warnings: SanitizationError[] = [];

  let sanitized = content;
  const originalLength = content.length;

  // 1. Prüfe auf gefährliche Patterns
  for (const { pattern, code, message } of DANGEROUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      const error: SanitizationError = {
        field: 'content',
        code,
        message: `${message}: "${matches[0].slice(0, 20)}"`,
        severity: 'error',
        originalValue: matches[0],
      };

      if (code === 'CONTROL_CHAR' && !strictMode) {
        // Entferne Kontrollzeichen, behandle als Warning
        sanitized = sanitized.replace(pattern, '');
        warnings.push(error);
      } else {
        errors.push(error);
      }
    }
  }

  // 2. Zeilenweise Validierung
  const lines = sanitized.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const lineResult = sanitizeGdtLine(line, i + 1, {
      maxLineLength,
      allowedFieldIds,
      validatePaths,
    });

    errors.push(...lineResult.errors);
    warnings.push(...lineResult.warnings);
    lines[i] = lineResult.sanitized;
  }

  sanitized = lines.join('\r\n');

  // 3. Satzart validieren
  const satzartMatch = sanitized.match(/8000(\d{4})/);
  if (satzartMatch) {
    const satzart = satzartMatch[1];
    if (!allowedSatzarten.includes(satzart)) {
      errors.push({
        field: GDT_FIELDS.SATZART,
        code: 'INVALID_SATZART',
        message: `Ungültige Satzart: ${satzart}`,
        severity: 'error',
        originalValue: satzart,
      });
    }
  }

  // 4. Encoding-Validierung (ISO-8859-15 Unterstützung)
  const encodingResult = validateEncoding(sanitized, config.encoding ?? 'iso-8859-15');
  if (!encodingResult.valid) {
    errors.push({
      field: 'encoding',
      code: 'INVALID_ENCODING',
      message: encodingResult.message,
      severity: 'error',
    });
  }

  return {
    sanitized,
    isValid: errors.length === 0,
    errors,
    warnings: strictMode ? [] : warnings,
    originalLength,
    sanitizedLength: sanitized.length,
  };
}

/**
 * Sanitisiert eine einzelne GDT-Zeile
 */
function sanitizeGdtLine(
  line: string,
  lineNumber: number,
  config: {
    maxLineLength: number;
    allowedFieldIds: string[];
    validatePaths: boolean;
  }
): SanitizationResult {
  const errors: SanitizationError[] = [];
  const warnings: SanitizationError[] = [];
  let sanitized = line;

  // Prüfe Längenangabe (erste 3 Zeichen)
  const declaredLength = parseInt(line.substring(0, 3), 10);
  if (isNaN(declaredLength) || declaredLength > config.maxLineLength) {
    errors.push({
      field: `line_${lineNumber}`,
      code: 'INVALID_FORMAT',
      message: `Ungültige Längenangabe: ${line.substring(0, 3)}`,
      severity: 'error',
    });
  }

  // Prüfe Feldkennung (Zeichen 4-7)
  const fieldId = line.substring(3, 7);
  if (!VALID_FIELD_ID_PATTERN.test(fieldId)) {
    errors.push({
      field: `line_${lineNumber}`,
      code: 'INVALID_FIELD_ID',
      message: `Ungültige Feldkennung: ${fieldId}`,
      severity: 'error',
    });
  } else if (!config.allowedFieldIds.includes(fieldId)) {
    warnings.push({
      field: `line_${lineNumber}`,
      code: 'INVALID_FIELD_ID',
      message: `Unbekannte Feldkennung: ${fieldId}`,
      severity: 'warning',
    });
  }

  // Prüfe auf Pfad-Traversal in relevanten Feldern
  if (config.validatePaths) {
    const pathFields: string[] = [GDT_FIELDS.SENDER_ID, GDT_FIELDS.RECEIVER_ID];
    if (pathFields.includes(fieldId)) {
      const value = line.substring(7);
      if (/[.]{2}|[\\/]/.test(value)) {
        errors.push({
          field: fieldId,
          code: 'PATH_TRAVERSAL',
          message: `Pfad-Traversal in Feld ${fieldId} erkannt`,
          severity: 'error',
          originalValue: value,
        });
        // Sanitisiere: Entferne Pfad-Zeichen
        sanitized = line.substring(0, 7) + value.replace(/[.]{2}|[\\/]/g, '_');
      }
    }
  }

  // Prüfe Feldlänge
  const maxLength = FIELD_MAX_LENGTHS[fieldId];
  if (maxLength && line.length > maxLength + 7) { // +7 für Länge + Feld-ID
    const content = line.substring(7);
    if (content.length > maxLength) {
      warnings.push({
        field: fieldId,
        code: 'FIELD_TOO_LONG',
        message: `Feld ${fieldId}: ${content.length} Zeichen (max ${maxLength})`,
        severity: 'warning',
        originalValue: content,
      });
      // Truncate
      sanitized = line.substring(0, 7 + maxLength);
    }
  }

  return {
    sanitized,
    isValid: errors.length === 0,
    errors,
    warnings,
    originalLength: line.length,
    sanitizedLength: sanitized.length,
  };
}

/**
 * Validiert Zeichenkodierung
 */
function validateEncoding(content: string, encoding: string): { valid: boolean; message: string } {
  if (encoding === 'utf-8') {
    return { valid: true, message: '' };
  }

  // ISO-8859-15 valid chars: 0x00-0xFF mit bestimmten Einschränkungen
  const invalidChars: string[] = [];
  
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    
    // ISO-8859-15 unterstützt 0x00-0xFF
    if (code > 0xFF) {
      invalidChars.push(content[i]);
    }
  }

  if (invalidChars.length > 0) {
    return {
      valid: false,
      message: `Zeichen nicht im ${encoding} Zeichensatz: ${invalidChars.slice(0, 5).join(', ')}${invalidChars.length > 5 ? '...' : ''}`,
    };
  }

  return { valid: true, message: '' };
}

/**
 * Sanitisiert einen Patientennamen (spezielle Regeln)
 * 
 * @param name - Der zu sanitizierende Name
 * @returns Sanitizierter Name
 */
export function sanitizePatientName(name: string): string {
  // Erlaubt: Buchstaben, Leerzeichen, Bindestrich, Apostroph
  // Entfernt: Zahlen, Sonderzeichen, HTML/XML
  
  return name
    // Entferne HTML/XML Tags
    .replace(/<[^>]*>/g, '')
    // Entferne nicht erlaubte Zeichen
    .replace(/[^\p{L}\s\-'’]/gu, '')
    // Normalisiere Whitespace
    .replace(/\s+/g, ' ')
    // Trim
    .trim()
    // Max Länge
    .slice(0, 28);
}

/**
 * Sanitisiert eine Patientennummer
 * 
 * @param patNr - Die zu sanitizierende Nummer
 * @returns Sanitizierte Nummer
 */
export function sanitizePatientNumber(patNr: string): string {
  // Nur alphanumerisch, max 10 Zeichen
  return patNr
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 10)
    .toUpperCase();
}

/**
 * Validiert GDT-Datum (TTMMJJJJ)
 * 
 * @param date - Das zu validierende Datum
 * @returns ValidationResult
 */
export function validateGdtDate(date: string): { valid: boolean; sanitized: string; error?: string } {
  // Entferne nicht-Ziffern
  const sanitized = date.replace(/\D/g, '').slice(0, 8);
  
  if (sanitized.length !== 8) {
    return { valid: false, sanitized, error: 'Datum muss 8 Ziffern haben (TTMMJJJJ)' };
  }

  const day = parseInt(sanitized.substring(0, 2), 10);
  const month = parseInt(sanitized.substring(2, 4), 10);
  const year = parseInt(sanitized.substring(4, 8), 10);

  if (day < 1 || day > 31) {
    return { valid: false, sanitized, error: 'Ungültiger Tag' };
  }
  if (month < 1 || month > 12) {
    return { valid: false, sanitized, error: 'Ungültiger Monat' };
  }
  if (year < 1900 || year > 2100) {
    return { valid: false, sanitized, error: 'Ungültiges Jahr' };
  }

  // Plausibilitätscheck
  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1) {
    return { valid: false, sanitized, error: 'Ungültiges Datum' };
  }

  return { valid: true, sanitized };
}

/**
 * Validiert GDT-Zeit (HHMMSS)
 */
export function validateGdtTime(time: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = time.replace(/\D/g, '').slice(0, 6);
  
  if (sanitized.length !== 6) {
    return { valid: false, sanitized, error: 'Zeit muss 6 Ziffern haben (HHMMSS)' };
  }

  const hours = parseInt(sanitized.substring(0, 2), 10);
  const minutes = parseInt(sanitized.substring(2, 4), 10);
  const seconds = parseInt(sanitized.substring(4, 6), 10);

  if (hours > 23) return { valid: false, sanitized, error: 'Ungültige Stunde' };
  if (minutes > 59) return { valid: false, sanitized, error: 'Ungültige Minute' };
  if (seconds > 59) return { valid: false, sanitized, error: 'Ungültige Sekunde' };

  return { valid: true, sanitized };
}

/**
 * Erstellt einen GDT-Sanitizer mit fixer Konfiguration
 */
export function createGdtSanitizer(config: GdtSanitizationConfig) {
  return {
    sanitize: (content: string) => sanitizeGdtContent(content, config),
    sanitizeName: sanitizePatientName,
    sanitizePatNr: sanitizePatientNumber,
    validateDate: validateGdtDate,
    validateTime: validateGdtTime,
  };
}
