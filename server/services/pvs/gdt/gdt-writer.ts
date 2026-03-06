// ============================================
// GDT 3.0 Writer — Objekt → GDT Datei
// ============================================

import { promises as fs } from 'fs';
import * as path from 'path';
import type { GdtExportOptions, PatientSessionFull } from '../types.js';
import { GDT_FIELDS, GDT_VERSION, GDT_SATZARTEN, GENDER_TO_GDT } from './gdt-constants.js';

/**
 * Build a single GDT line:
 *   LLL FFFF DATA\r\n
 * LLL = 3 chars total line length (incl \r\n)
 */
function gdtLine(fieldId: string, data: string): string {
  const content = fieldId + data;
  const length = content.length + 3 + 2; // 3=LLL, 2=\r\n
  const lenStr = String(length).padStart(3, '0');
  return lenStr + content + '\r\n';
}

/**
 * Build a complete GDT header block.
 */
function buildHeader(options: GdtExportOptions): string {
  let out = '';
  out += gdtLine(GDT_FIELDS.SATZART, options.satzart);
  out += gdtLine(GDT_FIELDS.GDT_VERSION, GDT_VERSION);
  out += gdtLine(GDT_FIELDS.SENDER_ID, options.senderId);
  out += gdtLine(GDT_FIELDS.RECEIVER_ID, options.receiverId);
  return out;
}

/**
 * Build patient header lines from session data.
 */
function buildPatientBlock(session: PatientSessionFull): string {
  let out = '';
  const p = session.patient;
  if (!p) return out;

  if (p.patientNumber) out += gdtLine(GDT_FIELDS.PAT_NR, p.patientNumber);
  // Name: encrypted in DB — use decrypted name if available, else patientNumber as fallback
  out += gdtLine(GDT_FIELDS.PAT_NAME, (p as any).decryptedLastName || p.patientNumber || p.id.substring(0, 8));
  out += gdtLine(GDT_FIELDS.PAT_VORNAME, (p as any).decryptedFirstName || '');

  if (p.birthDate) {
    const d = new Date(p.birthDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    out += gdtLine(GDT_FIELDS.PAT_GEBDAT, dd + mm + yyyy);
  }

  if (p.gender) {
    out += gdtLine(GDT_FIELDS.PAT_GESCHLECHT, GENDER_TO_GDT[p.gender] || '0');
  }
  if (p.versichertenNr) out += gdtLine(GDT_FIELDS.PAT_VERSNR, p.versichertenNr);
  if (p.kassenname) out += gdtLine(GDT_FIELDS.PAT_KASSENNAME, p.kassenname);
  if (p.kassennummer) out += gdtLine(GDT_FIELDS.PAT_KASSENNR, p.kassennummer);
  if (p.versichertenArt) out += gdtLine(GDT_FIELDS.PAT_VERSART, p.versichertenArt);

  return out;
}

/**
 * Build a structured Befundtext (findings) from anamnese answers.
 * Each line becomes a 6220 field.
 */
function buildBefundBlock(session: PatientSessionFull): string {
  let out = '';
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const HH = String(now.getHours()).padStart(2, '0');
  const MM = String(now.getMinutes()).padStart(2, '0');
  const SS = String(now.getSeconds()).padStart(2, '0');

  out += gdtLine(GDT_FIELDS.BEFUND_DATUM, dd + mm + yyyy);
  out += gdtLine(GDT_FIELDS.BEFUND_ZEIT, HH + MM + SS);
  out += gdtLine(GDT_FIELDS.TEST_IDENT, 'DIGGAI_ANAMNESE');
  out += gdtLine(GDT_FIELDS.TEST_BEZ, 'DiggAI Digitale Anamnese');

  // Header line
  out += gdtLine(GDT_FIELDS.BEFUND_TEXT, '═══════════════════════════════════');
  out += gdtLine(GDT_FIELDS.BEFUND_TEXT, 'DIGGAI ANAMNESE-BERICHT');
  out += gdtLine(GDT_FIELDS.BEFUND_TEXT, '═══════════════════════════════════');
  out += gdtLine(GDT_FIELDS.BEFUND_TEXT, `Datum: ${dd}.${mm}.${yyyy} ${HH}:${MM}`);
  out += gdtLine(GDT_FIELDS.BEFUND_TEXT, `Service: ${session.selectedService}`);
  out += gdtLine(GDT_FIELDS.BEFUND_TEXT, `Antworten: ${session.answers.length}`);
  out += gdtLine(GDT_FIELDS.BEFUND_TEXT, '');

  // Triage summary
  if (session.triageEvents.length > 0) {
    out += gdtLine(GDT_FIELDS.BEFUND_TEXT, '── TRIAGE ──');
    for (const t of session.triageEvents) {
      const emoji = t.level === 'CRITICAL' ? '🔴' : '🟡';
      out += gdtLine(GDT_FIELDS.BEFUND_TEXT, `${emoji} ${t.level}: ${t.message}`);
    }
    out += gdtLine(GDT_FIELDS.BEFUND_TEXT, '');
  }

  // Answers grouped by parsing atomId prefix
  out += gdtLine(GDT_FIELDS.BEFUND_TEXT, '── ANAMNESE-ANTWORTEN ──');
  for (const a of session.answers) {
    try {
      const val = JSON.parse(a.value);
      const displayVal = val.data ?? val.value ?? a.value;
      out += gdtLine(GDT_FIELDS.BEFUND_TEXT, `[${a.atomId}]: ${displayVal}`);
    } catch {
      out += gdtLine(GDT_FIELDS.BEFUND_TEXT, `[${a.atomId}]: ${a.value}`);
    }
  }

  // Comment: Session metadata
  out += gdtLine(GDT_FIELDS.KOMMENTAR, `Session-ID: ${session.id}`);
  if (session.completedAt) {
    const dur = Math.round((new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()) / 60000);
    out += gdtLine(GDT_FIELDS.KOMMENTAR, `Dauer: ${dur} Min.`);
  }

  return out;
}

/**
 * Build a complete GDT 3.0 file for an anamnese result (Satzart 6301).
 */
export function buildAnamneseResult(
  session: PatientSessionFull,
  options: GdtExportOptions,
): string {
  let content = '';
  content += buildHeader({ ...options, satzart: GDT_SATZARTEN.ERGEBNIS_UEBERMITTELN });
  content += buildPatientBlock(session);
  content += buildBefundBlock(session);
  return content;
}

/**
 * Build a GDT 3.0 file requesting patient master data (Satzart 6310).
 */
export function buildStammdatenAnfordern(
  patientNr: string,
  options: GdtExportOptions,
): string {
  let content = '';
  content += buildHeader({ ...options, satzart: GDT_SATZARTEN.STAMMDATEN_ANFORDERN });
  content += gdtLine(GDT_FIELDS.PAT_NR, patientNr);
  return content;
}

/**
 * Write a GDT file to the export directory.
 * Filename: DIGGAI_[PatNr]_[Timestamp].gdt
 * Uses atomic write (temp → rename) for safety.
 */
export async function writeGdtFile(
  content: string,
  exportDir: string,
  patientNr: string,
): Promise<string> {
  const timestamp = Date.now();
  const safePat = (patientNr || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `DIGGAI_${safePat}_${timestamp}.gdt`;
  const filePath = path.join(exportDir, filename);
  const tempPath = filePath + '.tmp';

  // Ensure directory exists
  await fs.mkdir(exportDir, { recursive: true });

  // Atomic write: write temp → rename
  await fs.writeFile(tempPath, content, { encoding: 'latin1' }); // ISO-8859-15 ≈ latin1
  await fs.rename(tempPath, filePath);

  return filePath;
}
