import crypto from 'crypto';

// ─── Anonymization Service ──────────────────────────────────
// Generates and manages patient pseudonyms (PAT-XXXX-XXXX format)
// Used for analytics, exports, and audit logs

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I confusion

/**
 * Generate a unique pseudonym in format PAT-XXXX-XXXX
 */
export function generatePseudonym(): string {
  const part1 = randomBlock(4);
  const part2 = randomBlock(4);
  return `PAT-${part1}-${part2}`;
}

function randomBlock(length: number): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

/**
 * Anonymize a dataset by stripping PII.
 * Keeps: age (calculated), gender, answers (excluding free-text PII), diagnoses
 * Removes: name, birthDate, KVNR, addresses, email
 */
export function anonymizeSession(session: {
  patient?: { birthDate?: Date | string | null; gender?: string | null } | null;
  answers?: Array<{ atomId: string; value: string }>;
  triageEvents?: Array<{ level: string; message: string }>;
}): {
  patientAge?: number;
  patientGender?: string | null;
  answers: Array<{ atomId: string; value: string }>;
  triageEvents: Array<{ level: string; message: string }>;
} {
  // Calculate age from birthDate
  let patientAge: number | undefined;
  if (session.patient?.birthDate) {
    const bd = new Date(session.patient.birthDate);
    const today = new Date();
    patientAge = today.getFullYear() - bd.getFullYear();
    const monthDiff = today.getMonth() - bd.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bd.getDate())) {
      patientAge--;
    }
  }

  // Strip PII-flagged free text from answers (basic regex)
  const PII_PATTERNS = [
    /\b[A-Z][a-zäöüß]+\s[A-Z][a-zäöüß]+\b/g,              // Names (Title Case)
    /\b\d{2}\.\d{2}\.\d{4}\b/g,                              // Dates DD.MM.YYYY
    /\b[A-Z]\d{9}\b/g,                                       // KVNR pattern
    /\b\d{5}\s[A-ZÄÖÜa-zäöüß]+\b/g,                        // PLZ + Ort
    /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g,                          // Email
    /\b0\d{2,4}[\s/-]?\d{4,10}\b/g,                          // Phone numbers
  ];

  const sanitizedAnswers = (session.answers || []).map(a => {
    let val = a.value;
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed?.data === 'string') {
        let text = parsed.data;
        for (const pattern of PII_PATTERNS) {
          text = text.replace(pattern, '[ANON]');
        }
        val = JSON.stringify({ ...parsed, data: text });
      }
    } catch {
      // Not JSON — anonymize raw
      for (const pattern of PII_PATTERNS) {
        val = val.replace(pattern, '[ANON]');
      }
    }
    return { atomId: a.atomId, value: val };
  });

  return {
    patientAge,
    patientGender: session.patient?.gender || null,
    answers: sanitizedAnswers,
    triageEvents: (session.triageEvents || []).map(t => ({
      level: t.level,
      message: t.message,
    })),
  };
}
