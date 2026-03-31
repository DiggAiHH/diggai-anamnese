import { prisma } from '../../db';
import { decrypt, isPIIAtom } from '../encryption';

export interface ExportScopeContext {
  role?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
}

export interface NormalizedAnswer {
  atomId: string;
  questionText: string;
  section: string;
  rawValue: unknown;
  displayValue: string;
  answeredAt: Date;
}

export interface NormalizedTriageEvent {
  level: string;
  atomId: string;
  message: string;
  createdAt: Date;
}

export interface NormalizedSessionExport {
  sessionId: string;
  tenantId: string;
  patientName: string;
  patientEmail: string | null;
  patient: {
    name: string;
    gender: string | null;
    birthDate: Date | null;
    insuranceType: string | null;
  };
  service: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  answers: NormalizedAnswer[];
  triageEvents: NormalizedTriageEvent[];
}

export class ExportAccessError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const SECTION_LABELS: Record<string, string> = {
  basis: 'Personalien',
  versicherung: 'Versicherung',
  adresse: 'Adresse',
  kontakt: 'Kontaktdaten',
  beschwerden: 'Aktuelle Beschwerden',
  koerpermasse: 'Körpermaße',
  rauchen: 'Raucherstatus',
  impfungen: 'Impfstatus',
  familie: 'Familienanamnese',
  beruf: 'Beruf & Lebensstil',
  diabetes: 'Diabetes',
  beeintraechtigung: 'Beeinträchtigungen',
  implantate: 'Implantate',
  blutverduenner: 'Blutverdünner',
  allergien: 'Allergien',
  gesundheitsstoerungen: 'Gesundheitsstörungen',
  vorerkrankungen: 'Vorerkrankungen',
  'medikamente-freitext': 'Medikamente',
  schwangerschaft: 'Schwangerschaft',
  rezepte: 'Rezeptanfrage',
  dateien: 'Dokumenten-Upload',
  'au-anfrage': 'AU-Anfrage',
  ueberweisung: 'Überweisungsanfrage',
  absage: 'Terminabsage',
  telefon: 'Telefonanfrage',
  'befund-anforderung': 'Befundanforderung',
  nachricht: 'Nachricht',
  abschluss: 'Abschluss',
  'bg-unfall': 'BG-Unfall',
  sonstige: 'Sonstige Angaben',
};

function parseAnswerValue(serializedValue: string): { rawValue: unknown; displayValue: string } {
  try {
    const parsed = JSON.parse(serializedValue);
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
      const rawValue = (parsed as { data: unknown }).data;
      return {
        rawValue,
        displayValue: Array.isArray(rawValue) ? rawValue.map(String).join(', ') : String(rawValue ?? ''),
      };
    }

    if (typeof parsed === 'string') {
      return { rawValue: parsed, displayValue: parsed };
    }

    return {
      rawValue: parsed,
      displayValue: Array.isArray(parsed) ? parsed.map(String).join(', ') : JSON.stringify(parsed),
    };
  } catch {
    return { rawValue: serializedValue, displayValue: serializedValue };
  }
}

function resolvePatientName(
  encryptedName: string | null | undefined,
  answers: NormalizedAnswer[],
): string {
  if (encryptedName) {
    try {
      return decrypt(encryptedName);
    } catch {
      return '[Name verschlüsselt]';
    }
  }

  const firstName = answers.find((answer) => answer.atomId === '0011')?.displayValue;
  const lastName = answers.find((answer) => answer.atomId === '0001')?.displayValue;
  const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
  return combined || 'Unbekannt';
}

function resolvePatientEmail(answers: NormalizedAnswer[]): string | null {
  const emailAtoms = new Set(['3003', '9010']);
  for (const answer of answers) {
    if (!emailAtoms.has(answer.atomId)) continue;
    if (typeof answer.rawValue === 'string' && answer.rawValue.includes('@')) {
      return answer.rawValue.trim();
    }
  }

  return null;
}

export function ensureScopeAccess(
  session: { id: string; tenantId: string; assignedArztId?: string | null },
  scope?: ExportScopeContext,
): void {
  if (!scope) return;

  if (scope.tenantId && session.tenantId !== scope.tenantId) {
    throw new ExportAccessError(403, 'EXPORT_SCOPE_VIOLATION', 'Kein Zugriff auf diese Sitzung');
  }

  if (scope.role === 'arzt' && scope.userId && session.assignedArztId && session.assignedArztId !== scope.userId) {
    throw new ExportAccessError(403, 'EXPORT_SCOPE_VIOLATION', 'Kein Zugriff auf diese Sitzung');
  }

  if (scope.role === 'patient' && scope.sessionId && scope.sessionId !== session.id) {
    throw new ExportAccessError(403, 'EXPORT_SCOPE_VIOLATION', 'Kein Zugriff auf diese Sitzung');
  }
}

export async function getNormalizedSessionExport(
  sessionId: string,
  scope?: ExportScopeContext,
): Promise<NormalizedSessionExport> {
  const session = await prisma.patientSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: { orderBy: { answeredAt: 'asc' } },
      triageEvents: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!session) {
    throw new ExportAccessError(404, 'EXPORT_SESSION_NOT_FOUND', 'Session nicht gefunden');
  }

  ensureScopeAccess(session, scope);

  const atoms = await prisma.medicalAtom.findMany({
    select: {
      id: true,
      questionText: true,
      section: true,
    },
  });
  const atomMap = new Map(atoms.map((atom) => [atom.id, atom]));

  const answers: NormalizedAnswer[] = session.answers.map((answer) => {
    const atom = atomMap.get(answer.atomId);

    if (isPIIAtom(answer.atomId) && answer.encryptedValue) {
      try {
        const decryptedValue = decrypt(answer.encryptedValue);
        return {
          atomId: answer.atomId,
          questionText: atom?.questionText || `Frage ${answer.atomId}`,
          section: atom?.section || 'sonstige',
          rawValue: decryptedValue,
          displayValue: decryptedValue,
          answeredAt: answer.answeredAt,
        };
      } catch {
        return {
          atomId: answer.atomId,
          questionText: atom?.questionText || `Frage ${answer.atomId}`,
          section: atom?.section || 'sonstige',
          rawValue: null,
          displayValue: '[Entschlüsselung fehlgeschlagen]',
          answeredAt: answer.answeredAt,
        };
      }
    }

    const parsed = parseAnswerValue(answer.value);
    return {
      atomId: answer.atomId,
      questionText: atom?.questionText || `Frage ${answer.atomId}`,
      section: atom?.section || 'sonstige',
      rawValue: parsed.rawValue,
      displayValue: parsed.displayValue,
      answeredAt: answer.answeredAt,
    };
  });

  const patientName = resolvePatientName(session.encryptedName, answers);
  const patientEmail = resolvePatientEmail(answers);

  return {
    sessionId: session.id,
    tenantId: session.tenantId,
    patientName,
    patientEmail,
    patient: {
      name: patientName,
      gender: session.gender || null,
      birthDate: session.birthDate ?? null,
      insuranceType: session.insuranceType || null,
    },
    service: session.selectedService,
    status: session.status,
    createdAt: session.createdAt,
    completedAt: session.completedAt ?? null,
    answers,
    triageEvents: session.triageEvents.map((event) => ({
      level: event.level,
      atomId: event.atomId,
      message: event.message,
      createdAt: event.createdAt,
    })),
  };
}

export function escapeCsvValue(value: string): string {
  let safe = value.replace(/;/g, ',').replace(/\n/g, ' ').replace(/\r/g, '');
  if (/^\s*[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  return safe;
}

export function sanitizeFilenamePart(value: string): string {
  const cleaned = value
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 64) || 'Patient';
}

export function buildExportFilename(patientName: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = sanitizeFilenamePart(patientName);
  return `Anamnese_${safeName}_${date}.${extension}`;
}

export function renderTxtExport(data: NormalizedSessionExport): string {
  const lines: string[] = [];

  lines.push('ANAMNESE-BERICHT');
  lines.push(`Patient: ${data.patient.name}`);
  lines.push(`Geschlecht: ${data.patient.gender || '-'}`);
  lines.push(`Geburtsdatum: ${data.patient.birthDate ? new Date(data.patient.birthDate).toLocaleDateString('de-DE') : '-'}`);
  lines.push(`Versicherung: ${data.patient.insuranceType || '-'}`);
  lines.push(`Anliegen: ${data.service}`);
  lines.push(`Status: ${data.status}`);
  lines.push(`Erstellt am: ${new Date(data.createdAt).toLocaleString('de-DE')}`);
  lines.push(`Exportiert am: ${new Date().toLocaleString('de-DE')}`);
  lines.push('');

  const groupedAnswers = new Map<string, NormalizedAnswer[]>();
  for (const answer of data.answers) {
    const key = answer.section || 'sonstige';
    const list = groupedAnswers.get(key) || [];
    list.push(answer);
    groupedAnswers.set(key, list);
  }

  for (const [section, answers] of groupedAnswers.entries()) {
    lines.push(`[${SECTION_LABELS[section] || section}]`);
    for (const answer of answers) {
      lines.push(`- ${answer.questionText}: ${answer.displayValue || '-'}`);
    }
    lines.push('');
  }

  if (data.triageEvents.length > 0) {
    lines.push('[Triage-Alarme]');
    for (const event of data.triageEvents) {
      lines.push(`- [${event.level}] ${event.message} (Frage ${event.atomId}, ${new Date(event.createdAt).toLocaleString('de-DE')})`);
    }
    lines.push('');
  }

  lines.push('Hinweis: Dieses Dokument enthält Gesundheitsdaten nach Art. 9 DSGVO.');
  return lines.join('\n');
}

