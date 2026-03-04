// ============================================
// PVS Mapping Engine — DiggAI ↔ Standard Formats
// ============================================

import type { PatientSessionFull, BefundtextOptions } from './types.js';

/**
 * Build structured Befundtext from a completed session.
 * Used by GDT export (each line → one 6220 field) and FHIR narrative.
 */
export function buildBefundtext(
  session: PatientSessionFull,
  options: BefundtextOptions = {
    format: 'structured',
    includeTriageDetails: true,
    includeMedications: true,
    includeSurgeries: true,
  },
): string[] {
  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════');
  lines.push('DIGGAI ANAMNESE-BERICHT');
  lines.push('═══════════════════════════════════');

  const date = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString('de-DE')
    : new Date(session.createdAt).toLocaleDateString('de-DE');
  const time = session.completedAt
    ? new Date(session.completedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : new Date(session.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  lines.push(`Datum: ${date} ${time}`);
  lines.push(`Service: ${session.selectedService}`);
  lines.push(`Antworten: ${session.answers.length}`);

  if (session.completedAt) {
    const dur = Math.round(
      (new Date(session.completedAt).getTime() - new Date(session.createdAt).getTime()) / 60000,
    );
    lines.push(`Dauer: ${dur} Min.`);
  }
  lines.push('');

  // Triage
  if (options.includeTriageDetails && session.triageEvents.length > 0) {
    lines.push('── TRIAGE ──');
    for (const t of session.triageEvents) {
      const emoji = t.level === 'CRITICAL' ? '🔴 KRITISCH' : '🟡 WARNUNG';
      lines.push(`${emoji}: ${t.message}`);
    }
    lines.push('');
  }

  // Answers
  if (options.format === 'structured' || options.format === 'both') {
    lines.push('── ANAMNESE-ANTWORTEN ──');

    // Group by atomId prefix (module)
    const grouped = new Map<string, Array<{ atomId: string; display: string }>>();
    for (const a of session.answers) {
      let display: string;
      try {
        const val = JSON.parse(a.value);
        display = String(val.data ?? val.value ?? a.value);
      } catch {
        display = a.value;
      }

      // Derive group from atomId: "RES-100" → "RES", "0000" → "BASIS"
      const dash = a.atomId.indexOf('-');
      const group = dash > 0 ? a.atomId.substring(0, dash) : 'BASIS';

      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push({ atomId: a.atomId, display });
    }

    for (const [group, answers] of grouped) {
      lines.push(`  [${group}]`);
      for (const a of answers) {
        lines.push(`    ${a.atomId}: ${a.display}`);
      }
    }
    lines.push('');
  }

  if (options.format === 'freetext' || options.format === 'both') {
    lines.push('── ZUSAMMENFASSUNG ──');
    const summary = session.answers.map(a => {
      try {
        const val = JSON.parse(a.value);
        return String(val.data ?? val.value ?? a.value);
      } catch {
        return a.value;
      }
    }).filter(v => v && v !== 'undefined').join('; ');
    lines.push(summary);
    lines.push('');
  }

  // Footer
  lines.push(`Session-ID: ${session.id}`);
  lines.push(`Erstellt durch: DiggAI Digitale Anamnese`);

  return lines;
}

/**
 * Count exportable fields for a session.
 */
export function countExportFields(session: PatientSessionFull): number {
  let count = 0;
  // Patient demographics
  if (session.patient) {
    count += 5; // id, name placeholder, birthDate, gender, versichertenNr
  }
  // Answers
  count += session.answers.length;
  // Triage events
  count += session.triageEvents.length;
  // Session metadata
  count += 3; // date, time, service
  return count;
}
