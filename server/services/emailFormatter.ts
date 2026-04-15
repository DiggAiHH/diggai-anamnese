/**
 * Email Formatter Service — Tomedo-kompatible Key-Value-Textformatierung
 *
 * Wandelt Anamnese-Antworten in ein strukturiertes Textformat um,
 * das Tomedo automatisch parsen und der Patientenkartei zuordnen kann.
 *
 * Format:
 *   Feldbezeichnung              Antwort
 *   Vorname                      Max
 *   Nachname                     Mustermann
 *   Geb. datum                   01.01.1980
 *   ...
 */

import type { Question } from './emailFormatter.types';

// ─── Known atom IDs for Tomedo-critical fields ──────────────

/** Maps atomId → Tomedo field label for known patient identity fields */
const TOMEDO_FIELD_MAP: Record<string, string> = {
    '0001': 'Nachname',
    '0011': 'Vorname',
    '0002': 'Geschlecht',
    '0003': 'Geb. datum',
    '2000': 'Grund der Inanspruchnahme',
};

/** Padding width for left column alignment */
const COL_WIDTH = 40;

interface AnswerRow {
    atomId: string;
    value: string; // raw value stored in DB (JSON string: { type, data } or plain)
    encryptedValue?: string | null;
}

interface FormattedSession {
    patientName: string;       // "Nachname, Vorname"
    patientDob: string;        // "DD.MM.YYYY"
    service: string;           // e.g. "TERMIN"
    bodyText: string;          // Tomedo-parseable text block
    subject: string;           // E-Mail-Betreff for Tomedo inbox rule
}

/**
 * Parse the JSON-encoded answer value into a human-readable string.
 */
function parseAnswerValue(raw: string): string {
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
            // Standard format: { type: 'radio', data: 'ja' }
            if (parsed.data !== undefined) {
                if (Array.isArray(parsed.data)) {
                    return parsed.data.join(', ');
                }
                return String(parsed.data);
            }
            // { value: 'something' }
            if (parsed.value !== undefined) {
                return String(parsed.value);
            }
            return JSON.stringify(parsed);
        }
        return String(parsed);
    } catch {
        // Already a plain string
        return raw;
    }
}

/**
 * Build a single padded line: "Feldbezeichnung              Antwort"
 */
function formatLine(label: string, value: string): string {
    return label.padEnd(COL_WIDTH, ' ') + value;
}

/**
 * Build Tomedo-compatible email subject line.
 * Format: [DiggAI] Anamnese - Nachname, Vorname - DD.MM.YYYY
 */
export function buildTomedeSubject(nachname: string, vorname: string, gebDatum: string): string {
    const parts = ['[DiggAI] Anamnese'];
    if (nachname || vorname) {
        parts.push(`${nachname}, ${vorname}`);
    }
    if (gebDatum) {
        parts.push(gebDatum);
    }
    return parts.join(' - ');
}

/**
 * Format a complete session's answers into Tomedo-parseable text.
 *
 * @param answers   Array of { atomId, value } from the Answer table
 * @param questions Optional question catalog for rich labels (falls back to TOMEDO_FIELD_MAP)
 * @param service   Selected service type (e.g. "TERMIN")
 */
export function formatSessionForTomedo(
    answers: AnswerRow[],
    questions: Question[] | null,
    service: string,
): FormattedSession {
    // Build a quick lookup: atomId → question label
    const questionMap = new Map<string, string>();
    if (questions) {
        for (const q of questions) {
            questionMap.set(q.id, q.question);
        }
    }

    // Extract critical patient identity fields
    let vorname = '';
    let nachname = '';
    let gebDatum = '';

    const lines: string[] = [];

    // First pass: extract identity fields (ordered at top)
    const identityAtomIds = ['0001', '0011', '0002', '0003'];
    for (const atomId of identityAtomIds) {
        const answer = answers.find(a => a.atomId === atomId);
        if (answer) {
            const value = parseAnswerValue(answer.value);
            const label = TOMEDO_FIELD_MAP[atomId] || questionMap.get(atomId) || atomId;
            lines.push(formatLine(label, value));

            if (atomId === '0001') nachname = value;
            if (atomId === '0011') vorname = value;
            if (atomId === '0003') gebDatum = value;
        }
    }

    // Service line
    lines.push(formatLine('Grund der Inanspruchnahme', service));

    // Separator
    lines.push('');
    lines.push('--- Anamnese-Daten ---');
    lines.push('');

    // Second pass: all remaining answers in order
    const identitySet = new Set(identityAtomIds);
    for (const answer of answers) {
        if (identitySet.has(answer.atomId)) continue; // Already printed above

        const value = parseAnswerValue(answer.value);
        if (!value || value === 'null' || value === 'undefined') continue;

        const label = TOMEDO_FIELD_MAP[answer.atomId]
            || questionMap.get(answer.atomId)
            || `Frage ${answer.atomId}`;
        lines.push(formatLine(label, value));
    }

    // Footer
    lines.push('');
    lines.push('---');
    lines.push(`Generiert von DiggAI Anamnese am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}`);

    const bodyText = lines.join('\n');
    const subject = buildTomedeSubject(nachname, vorname, gebDatum);
    const patientName = [nachname, vorname].filter(Boolean).join(', ');

    return {
        patientName,
        patientDob: gebDatum,
        service,
        bodyText,
        subject,
    };
}
