// ============================================
// GDT 3.0 Parser — Datei → Objekt
// ============================================

import type { GdtRecord, GdtPatientData } from '../types.js';
import { GDT_FIELDS, GDT_GENDER_MAP } from './gdt-constants.js';

/**
 * Parse a GDT 3.0 file content into a structured record.
 *
 * GDT line format:
 *   LLL FFFF DATA\r\n
 *   LLL  = 3 chars: line length (incl. LLL + CR+LF)
 *   FFFF = 4 chars: field identifier
 *   DATA = rest of line (variable length)
 */
export function parseGdtFile(content: string): GdtRecord {
  const fields = new Map<string, string[]>();
  let satzart = '';
  let version = '';
  let senderId = '';
  let receiverId = '';

  // Normalize line endings
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    if (line.length < 7) continue; // need at least LLL + FFFF

    // First 3 chars = length, next 4 = field id, rest = data
    const fieldId = line.substring(3, 7);
    const data = line.substring(7).trim();

    // Collect field values (fields can repeat)
    const existing = fields.get(fieldId) || [];
    existing.push(data);
    fields.set(fieldId, existing);

    // Extract well-known header fields
    if (fieldId === GDT_FIELDS.SATZART) satzart = data;
    if (fieldId === GDT_FIELDS.GDT_VERSION) version = data;
    if (fieldId === GDT_FIELDS.SENDER_ID) senderId = data;
    if (fieldId === GDT_FIELDS.RECEIVER_ID) receiverId = data;
  }

  return {
    satzart,
    version: version || '03.00',
    senderId,
    receiverId,
    fields,
    raw: content,
  };
}

/**
 * Extract patient demographic data from a parsed GDT record.
 */
export function extractPatientData(record: GdtRecord): GdtPatientData {
  const get = (fieldId: string): string => {
    const vals = record.fields.get(fieldId);
    return vals?.[0] ?? '';
  };

  const genderCode = get(GDT_FIELDS.PAT_GESCHLECHT);
  const birthStr = get(GDT_FIELDS.PAT_GEBDAT);
  let birthDate: Date | null = null;

  if (birthStr && birthStr.length === 8) {
    // Format: TTMMJJJJ → DD MM YYYY
    const day = parseInt(birthStr.substring(0, 2), 10);
    const month = parseInt(birthStr.substring(2, 4), 10) - 1;
    const year = parseInt(birthStr.substring(4, 8), 10);
    birthDate = new Date(year, month, day);
    if (isNaN(birthDate.getTime())) birthDate = null;
  }

  return {
    patNr: get(GDT_FIELDS.PAT_NR),
    lastName: get(GDT_FIELDS.PAT_NAME),
    firstName: get(GDT_FIELDS.PAT_VORNAME),
    birthDate,
    gender: GDT_GENDER_MAP[genderCode] || 'unknown',
    insuranceType: get(GDT_FIELDS.PAT_VERSART) || undefined,
    insuranceNr: get(GDT_FIELDS.PAT_VERSNR) || undefined,
    insuranceName: get(GDT_FIELDS.PAT_KASSENNAME) || undefined,
    insuranceId: get(GDT_FIELDS.PAT_KASSENNR) || undefined,
  };
}

/**
 * Validate a GDT record for mandatory header fields.
 */
export function validateGdtRecord(record: GdtRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!record.satzart) errors.push('Satzart (8000) fehlt');
  if (!record.senderId && !record.receiverId) errors.push('Weder Sender (8402) noch Empfänger (8401) vorhanden');

  // For patient data transfers, check patient number
  if (['6311', '6302'].includes(record.satzart)) {
    const patNr = record.fields.get(GDT_FIELDS.PAT_NR);
    if (!patNr?.[0]) errors.push('Patientennummer (3000) fehlt');
  }

  return { valid: errors.length === 0, errors };
}
