// ============================================
// GDT 3.0 Validator — Field & Encoding Validation
// ============================================

import { GDT_FIELDS, GDT_SATZARTEN } from './gdt-constants.js';

export interface GdtValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Mandatory fields per Satzart */
const MANDATORY_FIELDS: Record<string, string[]> = {
  [GDT_SATZARTEN.STAMMDATEN_UEBERMITTELN]: [
    GDT_FIELDS.SATZART,
    GDT_FIELDS.PAT_NR,
    GDT_FIELDS.PAT_NAME,
    GDT_FIELDS.PAT_VORNAME,
    GDT_FIELDS.PAT_GEBDAT,
  ],
  [GDT_SATZARTEN.UNTERSUCHUNG_UEBERMITTELN]: [
    GDT_FIELDS.SATZART,
    GDT_FIELDS.PAT_NR,
    GDT_FIELDS.TEST_IDENT,
    GDT_FIELDS.BEFUND_DATUM,
  ],
  [GDT_SATZARTEN.ERGEBNIS_UEBERMITTELN]: [
    GDT_FIELDS.SATZART,
    GDT_FIELDS.PAT_NR,
    GDT_FIELDS.BEFUND_TEXT,
    GDT_FIELDS.BEFUND_DATUM,
  ],
  [GDT_SATZARTEN.STAMMDATEN_ANFORDERN]: [
    GDT_FIELDS.SATZART,
    GDT_FIELDS.SENDER_ID,
    GDT_FIELDS.RECEIVER_ID,
  ],
  [GDT_SATZARTEN.UNTERSUCHUNG_ANFORDERN]: [
    GDT_FIELDS.SATZART,
    GDT_FIELDS.SENDER_ID,
    GDT_FIELDS.RECEIVER_ID,
    GDT_FIELDS.PAT_NR,
  ],
};

/** Max field lengths for common fields */
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
  [GDT_FIELDS.GDT_VERSION]: 5,
  [GDT_FIELDS.BEFUND_DATUM]: 8,
  [GDT_FIELDS.BEFUND_ZEIT]: 6,
  [GDT_FIELDS.TEST_IDENT]: 20,
};

/**
 * Validate a parsed GDT record (fields map + satzart).
 */
export function validateGdtRecord(
  fields: Map<string, string>,
  satzart: string
): GdtValidationError[] {
  const errors: GdtValidationError[] = [];

  // 1. Mandatory fields
  const mandatory = MANDATORY_FIELDS[satzart];
  if (mandatory) {
    for (const fieldId of mandatory) {
      if (!fields.has(fieldId) || !fields.get(fieldId)?.trim()) {
        errors.push({
          field: fieldId,
          code: 'MISSING_MANDATORY',
          message: `Pflichtfeld ${fieldId} fehlt für Satzart ${satzart}`,
          severity: 'error',
        });
      }
    }
  }

  // 2. Field length validation
  for (const [fieldId, value] of fields) {
    const maxLen = FIELD_MAX_LENGTHS[fieldId];
    if (maxLen && value.length > maxLen) {
      errors.push({
        field: fieldId,
        code: 'FIELD_TOO_LONG',
        message: `Feld ${fieldId}: ${value.length} Zeichen (max ${maxLen})`,
        severity: 'warning',
      });
    }
  }

  // 3. Date format TTMMJJJJ
  const dateFields = [GDT_FIELDS.PAT_GEBDAT, GDT_FIELDS.BEFUND_DATUM];
  for (const df of dateFields) {
    const val = fields.get(df);
    if (val && !/^\d{8}$/.test(val)) {
      errors.push({
        field: df,
        code: 'INVALID_DATE_FORMAT',
        message: `Feld ${df}: Ungültiges Datumsformat "${val}" (erwartet TTMMJJJJ)`,
        severity: 'error',
      });
    }
  }

  // 4. Time format HHMMSS
  const timeVal = fields.get(GDT_FIELDS.BEFUND_ZEIT);
  if (timeVal && !/^\d{6}$/.test(timeVal)) {
    errors.push({
      field: GDT_FIELDS.BEFUND_ZEIT,
      code: 'INVALID_TIME_FORMAT',
      message: `Feld ${GDT_FIELDS.BEFUND_ZEIT}: Ungültiges Zeitformat "${timeVal}" (erwartet HHMMSS)`,
      severity: 'error',
    });
  }

  // 5. Gender field
  const gender = fields.get(GDT_FIELDS.PAT_GESCHLECHT);
  if (gender && !['1', '2', '3', 'M', 'W', 'D'].includes(gender)) {
    errors.push({
      field: GDT_FIELDS.PAT_GESCHLECHT,
      code: 'INVALID_GENDER',
      message: `Feld ${GDT_FIELDS.PAT_GESCHLECHT}: Ungültiger Wert "${gender}"`,
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate raw GDT content line format (LLL FFFF DATA).
 */
export function validateGdtLineFormat(content: string): GdtValidationError[] {
  const errors: GdtValidationError[] = [];
  const lines = content.split(/\r?\n/).filter(l => l.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Must start with 3-digit length
    if (!/^\d{3}/.test(line)) {
      errors.push({
        field: `line_${i + 1}`,
        code: 'INVALID_LINE_FORMAT',
        message: `Zeile ${i + 1}: Ungültiges Format (fehlende Längenangabe)`,
        severity: 'error',
      });
      continue;
    }

    // Field code must be 4 digits
    const fieldCode = line.substring(3, 7);
    if (!/^\d{4}$/.test(fieldCode)) {
      errors.push({
        field: `line_${i + 1}`,
        code: 'INVALID_FIELD_CODE',
        message: `Zeile ${i + 1}: Ungültige Feldkennung "${fieldCode}"`,
        severity: 'error',
      });
    }

    // Declared length should match actual
    const declaredLen = parseInt(line.substring(0, 3), 10);
    const actualLen = line.length + 2; // +2 for \r\n
    if (declaredLen !== actualLen) {
      errors.push({
        field: `line_${i + 1}`,
        code: 'LENGTH_MISMATCH',
        message: `Zeile ${i + 1}: Deklarierte Länge ${declaredLen} != tatsächliche ${actualLen}`,
        severity: 'warning',
      });
    }
  }

  return errors;
}
