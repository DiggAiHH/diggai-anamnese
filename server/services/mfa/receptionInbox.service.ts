import { createHash } from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../../db';
import { decrypt } from '../encryption';
import {
  getNormalizedSessionExport,
  renderTxtExport,
  SECTION_LABELS,
  type NormalizedAnswer,
  type NormalizedSessionExport,
} from '../export/session-export.service';
import {
  completeVersand,
  ensureVersandTracking,
  markVersandProcessed,
  markVersandReadByMfa,
  setVersandStatus,
  type VersandStatus,
} from '../export/versand.service';

const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

const EMAIL_ATOM_IDS = new Set(['3003', '9010']);

type PracticeCopyAuditAction =
  | 'RECEPTION_INBOX_PRACTICE_COPY_SENT'
  | 'RECEPTION_INBOX_PRACTICE_COPY_READY'
  | 'RECEPTION_INBOX_PRACTICE_COPY_FAILED'
  | 'RECEPTION_INBOX_PRACTICE_COPY_CONFIRMED';

type ResponseAuditAction =
  | 'RECEPTION_INBOX_RESPONSE_SENT'
  | 'RECEPTION_INBOX_RESPONSE_READY'
  | 'RECEPTION_INBOX_RESPONSE_FAILED'
  | 'RECEPTION_INBOX_RESPONSE_CONFIRMED';

type InboxAuditAction =
  | PracticeCopyAuditAction
  | ResponseAuditAction
  | 'RECEPTION_INBOX_READ'
  | 'RECEPTION_INBOX_PROCESSED'
  | 'RECEPTION_INBOX_COMPLETED';

type ResponseTemplateKey = 'received' | 'in_review' | 'completed' | 'callback';

type AuditEntry = {
  action: InboxAuditAction;
  createdAt: Date;
  metadata: Record<string, unknown>;
};

type ActionState = {
  code: string;
  label: string;
  at: string | null;
  channel: string | null;
  templateKey?: string | null;
};

type SessionSummaryRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  selectedService: string;
  status: string;
  pvsExported: boolean;
  encryptedName: string | null;
  answers: Array<{
    atomId: string;
    value: string;
    encryptedValue: string | null;
    answeredAt: Date;
  }>;
  triageEvents: Array<{
    level: string;
    message: string;
    atomId: string;
    createdAt: Date;
  }>;
  assignedArzt: {
    id: string;
    displayName: string;
  } | null;
  tracking: Array<{
    id: string;
    status: string;
    createdAt: Date;
    statusUpdatedAt: Date;
  }>;
};

export interface ReceptionInboxListItem {
  sessionId: string;
  referenceId: string;
  patientName: string;
  service: string;
  sessionStatus: string;
  patientEmailAvailable: boolean;
  unresolvedCritical: number;
  triageLevel: 'EMERGENCY' | 'HIGH' | 'NORMAL';
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
  assignedArztName: string | null;
  trackingStatus: string;
  trackingStatusLabel: string;
  practiceCopyStatus: ActionState;
  responseStatus: ActionState;
  syncStatus: ActionState;
  lastActivityAt: string;
  requiresManualFollowUp: boolean;
}

export interface ReceptionInboxDetail {
  item: ReceptionInboxListItem;
  patientEmail: string | null;
  patientBirthDate: string | null;
  insuranceType: string | null;
  triageEvents: Array<{
    level: string;
    message: string;
    atomId: string;
    createdAt: string;
  }>;
  answerSections: Array<{
    key: string;
    label: string;
    answers: Array<{
      atomId: string;
      questionText: string;
      value: string;
    }>;
  }>;
  practiceCopyPreview: {
    to: string | null;
    subject: string;
    body: string;
    mailtoUrl: string | null;
    directSendAvailable: boolean;
  };
  responseTemplates: Array<{
    key: ResponseTemplateKey;
    label: string;
    subject: string;
    body: string;
    recommended: boolean;
  }>;
}

export interface ReceptionInboxStats {
  openCount: number;
  responsePendingCount: number;
  missingEmailCount: number;
  practiceCopyPendingCount: number;
  syncedCount: number;
  averageResponseMinutes: number;
}

export interface ManualComposeData {
  to: string | null;
  subject: string;
  body: string;
}

export interface ReceptionDispatchResult {
  sent: boolean;
  mode: 'smtp' | 'manual' | 'unavailable';
  mailtoUrl: string | null;
  manualCompose: ManualComposeData;
  recipientAvailable: boolean;
}

function getRetentionBoundary(): Date {
  return new Date(Date.now() - RETENTION_MS);
}

function buildReferenceId(sessionId: string): string {
  return `REQ-${sessionId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function hashValue(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function parseJsonSafely(value?: string | null): Record<string, unknown> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseAnswerValue(serializedValue: string): unknown {
  try {
    const parsed = JSON.parse(serializedValue);
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
      return (parsed as { data: unknown }).data;
    }

    return parsed;
  } catch {
    return serializedValue;
  }
}

function stringifyAnswerValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(', ');
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function resolveAnswerValue(answer: SessionSummaryRecord['answers'][number]): string {
  if (answer.encryptedValue) {
    try {
      return decrypt(answer.encryptedValue);
    } catch {
      return '';
    }
  }

  return stringifyAnswerValue(parseAnswerValue(answer.value));
}

function resolvePatientName(record: SessionSummaryRecord): string {
  if (record.encryptedName) {
    try {
      return decrypt(record.encryptedName);
    } catch {
      return '[Name verschlüsselt]';
    }
  }

  const firstName = record.answers.find((answer) => answer.atomId === '0011');
  const lastName = record.answers.find((answer) => answer.atomId === '0001');
  const combined = [firstName, lastName]
    .map((answer) => (answer ? resolveAnswerValue(answer) : ''))
    .filter(Boolean)
    .join(' ')
    .trim();

  return combined || 'Unbekannt';
}

function resolvePatientEmail(record: SessionSummaryRecord): string | null {
  for (const answer of record.answers) {
    if (!EMAIL_ATOM_IDS.has(answer.atomId)) {
      continue;
    }

    const value = resolveAnswerValue(answer).trim();
    if (value.includes('@')) {
      return value;
    }
  }

  return null;
}

function getPracticeMailboxAddress(): string | null {
  const configured = process.env.PRACTICE_INBOX_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || null;
  if (!configured) {
    return null;
  }

  const match = configured.match(/<([^>]+)>/);
  return match ? match[1] : configured;
}

function getFromAddress(): string | null {
  return process.env.SMTP_FROM || process.env.PRACTICE_INBOX_EMAIL || process.env.SMTP_USER || null;
}

function isDirectEmailAvailable(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function buildMailtoUrl(to: string | null, subject: string): string | null {
  if (!to) {
    return null;
  }

  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getTenantName(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  return tenant?.name || 'Ihre Praxis';
}

function buildServiceDescriptor(service: string): string {
  const normalized = service.trim().toLowerCase();

  if (normalized.includes('rezept')) return 'zu Ihrem Rezeptanliegen';
  if (normalized.includes('au') || normalized.includes('krank')) return 'zu Ihrer AU-Anfrage';
  if (normalized.includes('überweisung') || normalized.includes('ueberweisung')) return 'zu Ihrer Überweisungsanfrage';
  if (normalized.includes('befund')) return 'zu Ihrer Befundanfrage';
  if (normalized.includes('telefon')) return 'zu Ihrer Rückrufbitte';
  if (normalized.includes('nachricht')) return 'zu Ihrer Nachricht an die Praxis';

  return `zu Ihrem Anliegen "${service}"`;
}

function buildPracticeCopySubject(referenceId: string): string {
  return `[DiggAI] Praxispostfach ${referenceId}`;
}

function buildPracticeCopyBody(data: NormalizedSessionExport, practiceName: string): string {
  const referenceId = buildReferenceId(data.sessionId);

  return [
    'DIGGAI ONLINE-REZEPTION -> PRAXISPOSTFACH / TOMEDO',
    '',
    `Praxis: ${practiceName}`,
    `Referenz: ${referenceId}`,
    `Anliegen: ${data.service}`,
    `Patient: ${data.patient.name}`,
    `Geburtsdatum: ${data.patient.birthDate ? new Date(data.patient.birthDate).toLocaleDateString('de-DE') : '-'}`,
    `Versicherung: ${data.patient.insuranceType || '-'}`,
    `Abgeschlossen am: ${data.completedAt ? new Date(data.completedAt).toLocaleString('de-DE') : new Date(data.createdAt).toLocaleString('de-DE')}`,
    '',
    'Bearbeitungshinweis:',
    '1. Diese E-Mail kann per Drag & Drop in Tomedo in die Akte übernommen werden.',
    '2. Bitte Bearbeitungsstand in DiggAI aktualisieren, damit beide Systeme synchron bleiben.',
    '',
    renderTxtExport(data),
  ].join('\n');
}

function buildResponseTemplatePreview(
  templateKey: ResponseTemplateKey,
  data: NormalizedSessionExport,
  practiceName: string,
): { key: ResponseTemplateKey; label: string; subject: string; body: string } {
  const referenceId = buildReferenceId(data.sessionId);
  const descriptor = buildServiceDescriptor(data.service);
  const patientName = data.patient.name || 'Patient';
  const greeting = `Guten Tag ${patientName},`;
  const signoff = ['', 'Mit freundlichen Grüßen', practiceName].join('\n');

  switch (templateKey) {
    case 'received':
      return {
        key: templateKey,
        label: 'Eingang bestätigen',
        subject: `[${referenceId}] Eingang Ihrer Anfrage`,
        body: [
          greeting,
          '',
          `wir bestätigen den Eingang Ihrer Anfrage ${descriptor}.`,
          'Ihr Vorgang wurde an das Praxisteam übergeben und wird geprüft.',
          '',
          `Referenz: ${referenceId}`,
          signoff,
        ].join('\n'),
      };
    case 'in_review':
      return {
        key: templateKey,
        label: 'In Bearbeitung',
        subject: `[${referenceId}] Ihre Anfrage wird bearbeitet`,
        body: [
          greeting,
          '',
          `Ihre Anfrage ${descriptor} befindet sich aktuell in Bearbeitung.`,
          'Sobald die Prüfung abgeschlossen ist, erhalten Sie eine Rückmeldung aus der Praxis.',
          '',
          `Referenz: ${referenceId}`,
          signoff,
        ].join('\n'),
      };
    case 'completed':
      return {
        key: templateKey,
        label: 'Bearbeitet',
        subject: `[${referenceId}] Ihre Anfrage wurde bearbeitet`,
        body: [
          greeting,
          '',
          `Ihre Anfrage ${descriptor} wurde in der Praxis bearbeitet.`,
          'Falls weitere Unterlagen oder Rückfragen erforderlich sind, meldet sich das Team direkt bei Ihnen.',
          '',
          `Referenz: ${referenceId}`,
          signoff,
        ].join('\n'),
      };
    case 'callback':
      return {
        key: templateKey,
        label: 'Bitte melden',
        subject: `[${referenceId}] Bitte melden Sie sich in der Praxis`,
        body: [
          greeting,
          '',
          `zu Ihrer Anfrage ${descriptor} benötigen wir eine kurze Rücksprache.`,
          'Bitte melden Sie sich telefonisch in der Praxis oder antworten Sie auf diese Nachricht.',
          '',
          `Referenz: ${referenceId}`,
          signoff,
        ].join('\n'),
      };
  }
}

function getRecommendedTemplates(service: string): ResponseTemplateKey[] {
  const normalized = service.trim().toLowerCase();

  if (normalized.includes('telefon')) {
    return ['received', 'callback'];
  }

  if (normalized.includes('rezept') || normalized.includes('befund')) {
    return ['received', 'completed'];
  }

  return ['received', 'in_review'];
}

function getActionState(
  entry: AuditEntry | undefined,
  fallbackCode: string,
  fallbackLabel: string,
): ActionState {
  if (!entry) {
    return {
      code: fallbackCode,
      label: fallbackLabel,
      at: null,
      channel: null,
      templateKey: null,
    };
  }

  return {
    code: String(entry.metadata.statusCode || fallbackCode),
    label: String(entry.metadata.statusLabel || fallbackLabel),
    at: entry.createdAt.toISOString(),
    channel: typeof entry.metadata.channel === 'string' ? entry.metadata.channel : null,
    templateKey: typeof entry.metadata.templateKey === 'string' ? entry.metadata.templateKey : null,
  };
}

function mapTrackingStatus(status?: string | null): { code: string; label: string } {
  switch (status) {
    case 'ZUGESTELLT':
      return { code: status, label: 'Im Postfach' };
    case 'GELESEN':
      return { code: status, label: 'Gelesen' };
    case 'VERARBEITET':
      return { code: status, label: 'Verarbeitet' };
    case 'ABGESCHLOSSEN':
      return { code: status, label: 'Abgeschlossen' };
    case 'VERSCHLUESSELT_VERSENDET':
      return { code: status, label: 'Neu' };
    default:
      return { code: 'NEU', label: 'Neu' };
  }
}

function mapSyncState(record: SessionSummaryRecord, trackingStatus: string): ActionState {
  if (trackingStatus === 'ABGESCHLOSSEN' || record.pvsExported) {
    return { code: 'SYNCED', label: 'Mit Praxis synchron', at: null, channel: 'TOMEDO', templateKey: null };
  }

  if (trackingStatus === 'VERARBEITET' || trackingStatus === 'GELESEN') {
    return { code: 'IN_PROGRESS', label: 'In Bearbeitung', at: null, channel: null, templateKey: null };
  }

  return { code: 'PENDING', label: 'Offen', at: null, channel: null, templateKey: null };
}

function determineTriageLevel(record: SessionSummaryRecord): 'EMERGENCY' | 'HIGH' | 'NORMAL' {
  if (record.triageEvents.some((event) => event.level === 'CRITICAL')) {
    return 'EMERGENCY';
  }

  if (record.triageEvents.some((event) => event.level === 'WARNING')) {
    return 'HIGH';
  }

  return 'NORMAL';
}

function latestDate(values: Array<Date | null | undefined>): Date {
  let latest = new Date(0);

  for (const value of values) {
    if (value && value.getTime() > latest.getTime()) {
      latest = value;
    }
  }

  return latest;
}

function groupAnswersBySection(answers: NormalizedAnswer[]) {
  const grouped = new Map<string, Array<{ atomId: string; questionText: string; value: string }>>();

  for (const answer of answers) {
    const items = grouped.get(answer.section) || [];
    items.push({
      atomId: answer.atomId,
      questionText: answer.questionText,
      value: answer.displayValue,
    });
    grouped.set(answer.section, items);
  }

  return Array.from(grouped.entries()).map(([key, entries]) => ({
    key,
    label: SECTION_LABELS[key] || key,
    answers: entries,
  }));
}

async function writeInboxAuditLog(params: {
  tenantId: string;
  sessionId: string;
  userId?: string | null;
  action: InboxAuditAction;
  metadata: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId || null,
      action: params.action,
      resource: `sessions/${params.sessionId}`,
      metadata: JSON.stringify(params.metadata),
    },
  });
}

async function loadInboxSessions(tenantId: string): Promise<SessionSummaryRecord[]> {
  return prisma.patientSession.findMany({
    where: {
      tenantId,
      createdAt: { gte: getRetentionBoundary() },
      status: { in: ['COMPLETED', 'SUBMITTED'] },
    },
    include: {
      answers: {
        select: {
          atomId: true,
          value: true,
          encryptedValue: true,
          answeredAt: true,
        },
        orderBy: { answeredAt: 'asc' },
      },
      triageEvents: {
        select: {
          level: true,
          message: true,
          atomId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      assignedArzt: {
        select: {
          id: true,
          displayName: true,
        },
      },
      tracking: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          statusUpdatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });
}

async function loadReceptionAuditMap(tenantId: string, sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return new Map<string, AuditEntry[]>();
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      resource: { in: sessionIds.map((sessionId) => `sessions/${sessionId}`) },
      action: { startsWith: 'RECEPTION_INBOX_' },
      createdAt: { gte: getRetentionBoundary() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      action: true,
      resource: true,
      createdAt: true,
      metadata: true,
    },
  });

  const result = new Map<string, AuditEntry[]>();
  for (const log of logs) {
    const sessionId = log.resource.replace('sessions/', '');
    const entries = result.get(sessionId) || [];
    entries.push({
      action: log.action as InboxAuditAction,
      createdAt: log.createdAt,
      metadata: parseJsonSafely(log.metadata),
    });
    result.set(sessionId, entries);
  }

  return result;
}

function findLatestAction(entries: AuditEntry[], actionPrefix: string): AuditEntry | undefined {
  return entries.find((entry) => entry.action.startsWith(actionPrefix));
}

function buildListItem(record: SessionSummaryRecord, auditEntries: AuditEntry[]): ReceptionInboxListItem {
  const referenceId = buildReferenceId(record.id);
  const patientName = resolvePatientName(record);
  const patientEmail = resolvePatientEmail(record);
  const tracking = record.tracking[0];
  const trackingState = mapTrackingStatus(tracking?.status);
  const practiceCopyStatus = getActionState(
    findLatestAction(auditEntries, 'RECEPTION_INBOX_PRACTICE_COPY_'),
    'PENDING',
    'Praxis-Mail ausstehend',
  );
  const responseStatus = getActionState(
    findLatestAction(auditEntries, 'RECEPTION_INBOX_RESPONSE_'),
    patientEmail ? 'PENDING' : 'NO_EMAIL',
    patientEmail ? 'Antwort offen' : 'Keine E-Mail hinterlegt',
  );
  const syncStatus = mapSyncState(record, tracking?.status || 'NEU');
  const expiresAtBase = tracking?.createdAt || record.completedAt || record.createdAt;
  const lastAuditAt = latestDate(auditEntries.map((entry) => entry.createdAt));
  const lastActivityAt = latestDate([
    tracking?.statusUpdatedAt,
    record.completedAt,
    record.updatedAt,
    lastAuditAt.getTime() > 0 ? lastAuditAt : null,
  ]);

  return {
    sessionId: record.id,
    referenceId,
    patientName,
    service: record.selectedService,
    sessionStatus: record.status,
    patientEmailAvailable: Boolean(patientEmail),
    unresolvedCritical: record.triageEvents.filter((event) => event.level === 'CRITICAL').length,
    triageLevel: determineTriageLevel(record),
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt?.toISOString() || null,
    expiresAt: new Date(expiresAtBase.getTime() + RETENTION_MS).toISOString(),
    assignedArztName: record.assignedArzt?.displayName || null,
    trackingStatus: trackingState.code,
    trackingStatusLabel: trackingState.label,
    practiceCopyStatus,
    responseStatus,
    syncStatus,
    lastActivityAt: lastActivityAt.toISOString(),
    requiresManualFollowUp: !patientEmail,
  };
}

function calculateStats(items: ReceptionInboxListItem[]): ReceptionInboxStats {
  const responseDurations: number[] = [];

  for (const item of items) {
    if (item.responseStatus.at) {
      const completedAt = item.completedAt || item.createdAt;
      responseDurations.push(
        Math.max(0, new Date(item.responseStatus.at).getTime() - new Date(completedAt).getTime()) / 60000,
      );
    }
  }

  const averageResponseMinutes = responseDurations.length > 0
    ? Math.round(responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length)
    : 0;

  return {
    openCount: items.filter((item) => item.trackingStatus !== 'ABGESCHLOSSEN').length,
    responsePendingCount: items.filter((item) => item.responseStatus.code === 'PENDING').length,
    missingEmailCount: items.filter((item) => !item.patientEmailAvailable).length,
    practiceCopyPendingCount: items.filter((item) => item.practiceCopyStatus.code === 'PENDING').length,
    syncedCount: items.filter((item) => item.syncStatus.code === 'SYNCED').length,
    averageResponseMinutes,
  };
}

function createTransport() {
  if (!isDirectEmailAvailable()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendStructuredMail(params: {
  to: string;
  subject: string;
  body: string;
  headers?: Record<string, string>;
}) {
  const transporter = createTransport();
  if (!transporter) {
    return false;
  }

  await transporter.sendMail({
    from: getFromAddress() || undefined,
    to: params.to,
    subject: params.subject,
    text: params.body,
    html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.5">${escapeHtml(params.body)}</pre>`,
    replyTo: getPracticeMailboxAddress() || undefined,
    headers: params.headers,
  });

  return true;
}

function appendCustomNote(body: string, customNote?: string | null): string {
  const note = customNote?.trim();
  if (!note) {
    return body;
  }

  return `${body}\n\nZusätzliche Information:\n${note}`;
}

export async function listReceptionInbox(tenantId: string): Promise<{
  items: ReceptionInboxListItem[];
  stats: ReceptionInboxStats;
}> {
  const sessions = await loadInboxSessions(tenantId);
  const auditMap = await loadReceptionAuditMap(tenantId, sessions.map((session) => session.id));
  const items = sessions.map((session) => buildListItem(session, auditMap.get(session.id) || []));

  return {
    items,
    stats: calculateStats(items),
  };
}

export async function getReceptionInboxDetail(tenantId: string, sessionId: string): Promise<ReceptionInboxDetail> {
  const [sessionData, practiceName] = await Promise.all([
    getNormalizedSessionExport(sessionId, { tenantId }),
    getTenantName(tenantId),
  ]);

  const sessions = await loadInboxSessions(tenantId);
  const sessionRecord = sessions.find((session) => session.id === sessionId);
  if (!sessionRecord) {
    throw new Error('Session not found');
  }

  const auditMap = await loadReceptionAuditMap(tenantId, [sessionId]);
  const item = buildListItem(sessionRecord, auditMap.get(sessionId) || []);
  const referenceId = buildReferenceId(sessionId);
  const practiceCopySubject = buildPracticeCopySubject(referenceId);
  const practiceCopyBody = buildPracticeCopyBody(sessionData, practiceName);
  const recommendedTemplates = new Set(getRecommendedTemplates(sessionData.service));
  const responseTemplates = (['received', 'in_review', 'completed', 'callback'] as ResponseTemplateKey[])
    .map((templateKey) => {
      const preview = buildResponseTemplatePreview(templateKey, sessionData, practiceName);
      return {
        ...preview,
        recommended: recommendedTemplates.has(templateKey),
      };
    });

  return {
    item,
    patientEmail: sessionData.patientEmail,
    patientBirthDate: sessionData.patient.birthDate?.toISOString() || null,
    insuranceType: sessionData.patient.insuranceType,
    triageEvents: sessionData.triageEvents.map((event) => ({
      level: event.level,
      message: event.message,
      atomId: event.atomId,
      createdAt: event.createdAt.toISOString(),
    })),
    answerSections: groupAnswersBySection(sessionData.answers),
    practiceCopyPreview: {
      to: getPracticeMailboxAddress(),
      subject: practiceCopySubject,
      body: practiceCopyBody,
      mailtoUrl: buildMailtoUrl(getPracticeMailboxAddress(), practiceCopySubject),
      directSendAvailable: isDirectEmailAvailable(),
    },
    responseTemplates,
  };
}

export async function markReceptionInboxRead(
  tenantId: string,
  sessionId: string,
  mfaId: string,
) {
  await getNormalizedSessionExport(sessionId, { tenantId });
  await ensureVersandTracking(sessionId);

  try {
    await markVersandReadByMfa(sessionId, mfaId);
  } catch {
    // Ignore invalid transitions when the item is already complete.
  }

  await writeInboxAuditLog({
    tenantId,
    sessionId,
    userId: mfaId,
    action: 'RECEPTION_INBOX_READ',
    metadata: {
      statusCode: 'READ',
      statusLabel: 'Gelesen',
    },
  });
}

export async function markReceptionInboxProcessed(
  tenantId: string,
  sessionId: string,
  mfaId: string,
) {
  await getNormalizedSessionExport(sessionId, { tenantId });
  await ensureVersandTracking(sessionId);
  await markVersandProcessed(sessionId);
  await writeInboxAuditLog({
    tenantId,
    sessionId,
    userId: mfaId,
    action: 'RECEPTION_INBOX_PROCESSED',
    metadata: {
      statusCode: 'PROCESSED',
      statusLabel: 'Verarbeitet',
    },
  });
}

export async function markReceptionInboxCompleted(
  tenantId: string,
  sessionId: string,
  mfaId: string,
) {
  await getNormalizedSessionExport(sessionId, { tenantId });
  await ensureVersandTracking(sessionId);
  await completeVersand(sessionId);
  await writeInboxAuditLog({
    tenantId,
    sessionId,
    userId: mfaId,
    action: 'RECEPTION_INBOX_COMPLETED',
    metadata: {
      statusCode: 'COMPLETED',
      statusLabel: 'Abgeschlossen',
    },
  });
}

export async function sendPracticeInboxCopy(params: {
  tenantId: string;
  sessionId: string;
  userId?: string | null;
}): Promise<ReceptionDispatchResult> {
  const [sessionData, practiceName] = await Promise.all([
    getNormalizedSessionExport(params.sessionId, { tenantId: params.tenantId }),
    getTenantName(params.tenantId),
  ]);

  const practiceMailbox = getPracticeMailboxAddress();
  const referenceId = buildReferenceId(params.sessionId);
  const subject = buildPracticeCopySubject(referenceId);
  const body = buildPracticeCopyBody(sessionData, practiceName);
  const manualCompose = {
    to: practiceMailbox,
    subject,
    body,
  };

  await ensureVersandTracking(params.sessionId);

  if (!practiceMailbox) {
    await writeInboxAuditLog({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      userId: params.userId || null,
      action: 'RECEPTION_INBOX_PRACTICE_COPY_FAILED',
      metadata: {
        statusCode: 'FAILED',
        statusLabel: 'Praxis-Mailbox fehlt',
        channel: 'CONFIG',
      },
    });

    return {
      sent: false,
      mode: 'unavailable',
      mailtoUrl: null,
      manualCompose,
      recipientAvailable: false,
    };
  }

  try {
    const sent = await sendStructuredMail({
      to: practiceMailbox,
      subject,
      body,
      headers: {
        'X-DiggAI-Reference': referenceId,
        'X-DiggAI-Session': params.sessionId,
      },
    });

    if (sent) {
      await setVersandStatus(params.sessionId, 'ZUGESTELLT' as VersandStatus);
      await writeInboxAuditLog({
        tenantId: params.tenantId,
        sessionId: params.sessionId,
        userId: params.userId || null,
        action: 'RECEPTION_INBOX_PRACTICE_COPY_SENT',
        metadata: {
          statusCode: 'SENT',
          statusLabel: 'Per Praxis-E-Mail gesendet',
          channel: 'SMTP',
        },
      });

      return {
        sent: true,
        mode: 'smtp',
        mailtoUrl: null,
        manualCompose,
        recipientAvailable: true,
      };
    }
  } catch {
    await writeInboxAuditLog({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      userId: params.userId || null,
      action: 'RECEPTION_INBOX_PRACTICE_COPY_FAILED',
      metadata: {
        statusCode: 'FAILED',
        statusLabel: 'SMTP-Versand fehlgeschlagen',
        channel: 'SMTP',
      },
    });
  }

  await writeInboxAuditLog({
    tenantId: params.tenantId,
    sessionId: params.sessionId,
    userId: params.userId || null,
    action: 'RECEPTION_INBOX_PRACTICE_COPY_READY',
    metadata: {
      statusCode: 'READY',
      statusLabel: 'Apple Mail vorbereiten',
      channel: 'MAILTO_SAFE_SUBJECT',
    },
  });

  return {
    sent: false,
    mode: 'manual',
    mailtoUrl: buildMailtoUrl(practiceMailbox, subject),
    manualCompose,
    recipientAvailable: true,
  };
}

export async function sendReceptionResponse(params: {
  tenantId: string;
  sessionId: string;
  userId?: string | null;
  templateKey: ResponseTemplateKey;
  customNote?: string | null;
  mode?: 'auto' | 'smtp' | 'manual';
}): Promise<ReceptionDispatchResult> {
  const [sessionData, practiceName] = await Promise.all([
    getNormalizedSessionExport(params.sessionId, { tenantId: params.tenantId }),
    getTenantName(params.tenantId),
  ]);

  const preview = buildResponseTemplatePreview(params.templateKey, sessionData, practiceName);
  const body = appendCustomNote(preview.body, params.customNote);
  const recipientEmail = sessionData.patientEmail;
  const manualCompose = {
    to: recipientEmail,
    subject: preview.subject,
    body,
  };

  if (!recipientEmail) {
    await writeInboxAuditLog({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      userId: params.userId || null,
      action: 'RECEPTION_INBOX_RESPONSE_FAILED',
      metadata: {
        statusCode: 'NO_EMAIL',
        statusLabel: 'Keine E-Mail hinterlegt',
        channel: 'NONE',
        templateKey: params.templateKey,
      },
    });

    return {
      sent: false,
      mode: 'unavailable',
      mailtoUrl: null,
      manualCompose,
      recipientAvailable: false,
    };
  }

  const recipientEmailHash = hashValue(recipientEmail);
  const shouldSendDirect = params.mode === 'smtp' || (params.mode !== 'manual' && isDirectEmailAvailable());

  if (shouldSendDirect) {
    try {
      const sent = await sendStructuredMail({
        to: recipientEmail,
        subject: preview.subject,
        body,
        headers: {
          'X-DiggAI-Reference': buildReferenceId(params.sessionId),
          'X-DiggAI-Session': params.sessionId,
        },
      });

      if (sent) {
        await writeInboxAuditLog({
          tenantId: params.tenantId,
          sessionId: params.sessionId,
          userId: params.userId || null,
          action: 'RECEPTION_INBOX_RESPONSE_SENT',
          metadata: {
            statusCode: 'SENT',
            statusLabel: 'Antwort per Praxis-E-Mail gesendet',
            channel: 'SMTP',
            templateKey: params.templateKey,
            recipientEmailHash,
          },
        });

        return {
          sent: true,
          mode: 'smtp',
          mailtoUrl: null,
          manualCompose,
          recipientAvailable: true,
        };
      }
    } catch {
      await writeInboxAuditLog({
        tenantId: params.tenantId,
        sessionId: params.sessionId,
        userId: params.userId || null,
        action: 'RECEPTION_INBOX_RESPONSE_FAILED',
        metadata: {
          statusCode: 'FAILED',
          statusLabel: 'SMTP-Antwort fehlgeschlagen',
          channel: 'SMTP',
          templateKey: params.templateKey,
          recipientEmailHash,
        },
      });
    }
  }

  await writeInboxAuditLog({
    tenantId: params.tenantId,
    sessionId: params.sessionId,
    userId: params.userId || null,
    action: 'RECEPTION_INBOX_RESPONSE_READY',
    metadata: {
      statusCode: 'READY',
      statusLabel: 'Manuelle Antwort vorbereiten',
      channel: 'MANUAL_COMPOSE',
      templateKey: params.templateKey,
      recipientEmailHash,
    },
  });

  return {
    sent: false,
    mode: 'manual',
    mailtoUrl: buildMailtoUrl(null, preview.subject),
    manualCompose,
    recipientAvailable: true,
  };
}

export async function confirmReceptionDispatch(params: {
  tenantId: string;
  sessionId: string;
  userId?: string | null;
  kind: 'practice-copy' | 'response';
}) {
  await getNormalizedSessionExport(params.sessionId, { tenantId: params.tenantId });

  if (params.kind === 'practice-copy') {
    await ensureVersandTracking(params.sessionId);
    await setVersandStatus(params.sessionId, 'ZUGESTELLT' as VersandStatus);
    await writeInboxAuditLog({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      userId: params.userId || null,
      action: 'RECEPTION_INBOX_PRACTICE_COPY_CONFIRMED',
      metadata: {
        statusCode: 'CONFIRMED',
        statusLabel: 'Praxis-Mail manuell bestätigt',
        channel: 'MANUAL',
      },
    });
    return;
  }

  await writeInboxAuditLog({
    tenantId: params.tenantId,
    sessionId: params.sessionId,
    userId: params.userId || null,
    action: 'RECEPTION_INBOX_RESPONSE_CONFIRMED',
    metadata: {
      statusCode: 'CONFIRMED',
      statusLabel: 'Antwort manuell bestätigt',
      channel: 'MANUAL',
    },
  });
}

export async function cleanupReceptionInboxData() {
  const boundary = getRetentionBoundary();
  const staleTrackings = await prisma.anliegenTracking.findMany({
    where: {
      createdAt: { lte: boundary },
    },
    select: {
      id: true,
      session: {
        select: {
          status: true,
        },
      },
    },
  });

  const deletableTrackingIds = staleTrackings
    .filter((tracking) => {
      const status = tracking.session?.status;
      return !status || ['COMPLETED', 'SUBMITTED', 'EXPIRED'].includes(status);
    })
    .map((tracking) => tracking.id);

  const trackingDeleteResult = deletableTrackingIds.length > 0
    ? await prisma.anliegenTracking.deleteMany({
        where: {
          id: { in: deletableTrackingIds },
        },
      })
    : { count: 0 };

  const auditDeleteResult = await prisma.auditLog.deleteMany({
    where: {
      action: { startsWith: 'RECEPTION_INBOX_' },
      createdAt: { lte: boundary },
    },
  });

  return {
    deletedTrackings: trackingDeleteResult.count,
    deletedAuditLogs: auditDeleteResult.count,
  };
}