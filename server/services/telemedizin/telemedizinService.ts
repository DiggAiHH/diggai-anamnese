// ─── Telemedizin Service ───────────────────────────────────
// Modul 8: WebRTC video consultation management

import type {
  TelemedicineSessionData,
  CreateSessionInput,
  JoinSessionInput,
  SessionSummary,
  TelemedizinStats,
} from './types';
import { DEFAULT_ICE_SERVERS } from './types';
import crypto from 'crypto';

function getPrisma() {
  return (globalThis as any).__prisma;
}

// ─── Create Session ────────────────────────────────────────

export async function createSession(input: CreateSessionInput): Promise<TelemedicineSessionData> {
  const prisma = getPrisma();

  const roomToken = crypto.randomBytes(32).toString('base64url');

  const session = await prisma.telemedicineSession.create({
    data: {
      patientSessionId: input.patientSessionId,
      arztId: input.arztId,
      patientId: input.patientId,
      scheduledAt: new Date(input.scheduledAt),
      duration: input.duration || 30,
      status: 'SCHEDULED',
      roomToken,
      iceServers: DEFAULT_ICE_SERVERS,
      consentGiven: false,
      recordingEnabled: false,
      notes: input.notes,
      prescriptions: [],
    },
  });

  return formatSession(session);
}

// ─── Get Session ───────────────────────────────────────────

export async function getSession(sessionId: string): Promise<TelemedicineSessionData | null> {
  const prisma = getPrisma();

  const session = await prisma.telemedicineSession.findUnique({
    where: { id: sessionId },
  });

  return session ? formatSession(session) : null;
}

// ─── Join Session (with consent check) ─────────────────────

export async function joinSession(input: JoinSessionInput): Promise<{ session: TelemedicineSessionData; token: string }> {
  const prisma = getPrisma();

  const session = await prisma.telemedicineSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!session) throw new Error('Sitzung nicht gefunden');
  if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
    throw new Error('Sitzung ist bereits beendet');
  }

  if (!input.consentGiven) {
    throw new Error('Einwilligung zur Videosprechstunde ist erforderlich (§ 630d BGB)');
  }

  const updates: Record<string, unknown> = {};

  if (!session.consentGiven && input.role === 'PATIENT') {
    updates.consentGiven = true;
    updates.consentTimestamp = new Date();
  }

  if (session.status === 'SCHEDULED' || session.status === 'WAITING') {
    if (input.role === 'PATIENT') {
      updates.status = 'WAITING';
    } else if (input.role === 'ARZT') {
      updates.status = 'ACTIVE';
      updates.startedAt = new Date();
    }
  }

  const updated = await prisma.telemedicineSession.update({
    where: { id: input.sessionId },
    data: updates,
  });

  // Generate participant-specific token
  const participantToken = crypto
    .createHmac('sha256', session.roomToken)
    .update(`${input.participantId}:${input.role}:${Date.now()}`)
    .digest('base64url');

  return {
    session: formatSession(updated),
    token: participantToken,
  };
}

// ─── End Session ───────────────────────────────────────────

export async function endSession(sessionId: string, notes?: string): Promise<TelemedicineSessionData> {
  const prisma = getPrisma();

  const session = await prisma.telemedicineSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new Error('Sitzung nicht gefunden');

  const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
  const duration = Math.round((Date.now() - startedAt) / 60000); // minutes

  const updated = await prisma.telemedicineSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
      duration,
      ...(notes && { notes }),
    },
  });

  return formatSession(updated);
}

// ─── Cancel Session ────────────────────────────────────────

export async function cancelSession(sessionId: string, reason?: string): Promise<TelemedicineSessionData> {
  const prisma = getPrisma();

  const updated = await prisma.telemedicineSession.update({
    where: { id: sessionId },
    data: {
      status: 'CANCELLED',
      endedAt: new Date(),
      metadata: reason ? { cancelReason: reason } : undefined,
    },
  });

  return formatSession(updated);
}

// ─── Mark No-Show ──────────────────────────────────────────

export async function markNoShow(sessionId: string): Promise<TelemedicineSessionData> {
  const prisma = getPrisma();

  const updated = await prisma.telemedicineSession.update({
    where: { id: sessionId },
    data: {
      status: 'NO_SHOW',
      endedAt: new Date(),
    },
  });

  return formatSession(updated);
}

// ─── Add Prescription ──────────────────────────────────────

export async function addPrescription(sessionId: string, prescription: string): Promise<{ prescriptions: string[] }> {
  const prisma = getPrisma();

  const session = await prisma.telemedicineSession.findUnique({
    where: { id: sessionId },
    select: { prescriptions: true },
  });

  if (!session) throw new Error('Sitzung nicht gefunden');

  const prescriptions = [...(session.prescriptions || []), prescription];

  await prisma.telemedicineSession.update({
    where: { id: sessionId },
    data: { prescriptions },
  });

  return { prescriptions };
}

// ─── Set Follow-Up ─────────────────────────────────────────

export async function setFollowUp(sessionId: string, followUpDate: string): Promise<{ followUpDate: string }> {
  const prisma = getPrisma();

  await prisma.telemedicineSession.update({
    where: { id: sessionId },
    data: { followUpDate: new Date(followUpDate) },
  });

  return { followUpDate };
}

// ─── List Sessions ─────────────────────────────────────────

export async function listSessions(
  filters: { arztId?: string; patientId?: string; status?: string; fromDate?: string; toDate?: string },
  limit = 50
): Promise<SessionSummary[]> {
  const prisma = getPrisma();

  const where: any = {};
  if (filters.arztId) where.arztId = filters.arztId;
  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.status) where.status = filters.status;
  if (filters.fromDate || filters.toDate) {
    where.scheduledAt = {};
    if (filters.fromDate) where.scheduledAt.gte = new Date(filters.fromDate);
    if (filters.toDate) where.scheduledAt.lte = new Date(filters.toDate);
  }

  const sessions = await prisma.telemedicineSession.findMany({
    where,
    orderBy: { scheduledAt: 'desc' },
    take: limit,
  });

  return sessions.map((s: any) => ({
    id: s.id,
    arztId: s.arztId,
    patientId: s.patientId,
    status: s.status,
    scheduledAt: s.scheduledAt.toISOString(),
    duration: s.duration,
    consentGiven: s.consentGiven,
  }));
}

// ─── Stats ─────────────────────────────────────────────────

export async function getStats(): Promise<TelemedizinStats> {
  const prisma = getPrisma();

  const sessions = await prisma.telemedicineSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const completed = sessions.filter((s: any) => s.status === 'COMPLETED');
  const noShows = sessions.filter((s: any) => s.status === 'NO_SHOW');
  const upcoming = sessions.filter((s: any) =>
    s.status === 'SCHEDULED' && new Date(s.scheduledAt) > new Date()
  );

  const avgDuration = completed.length > 0
    ? completed.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / completed.length
    : 0;

  const byStatus = Object.entries(
    sessions.reduce((acc: Record<string, number>, s: any) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count: count as number }));

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    averageDuration: Math.round(avgDuration),
    noShowRate: sessions.length > 0 ? noShows.length / sessions.length : 0,
    byStatus,
    upcomingSessions: upcoming.slice(0, 10).map((s: any) => ({
      id: s.id,
      arztId: s.arztId,
      patientId: s.patientId,
      status: s.status,
      scheduledAt: s.scheduledAt.toISOString(),
      duration: s.duration,
      consentGiven: s.consentGiven,
    })),
  };
}

// ─── Helpers ───────────────────────────────────────────────

function formatSession(s: any): TelemedicineSessionData {
  return {
    id: s.id,
    patientSessionId: s.patientSessionId,
    arztId: s.arztId,
    patientId: s.patientId,
    scheduledAt: s.scheduledAt.toISOString(),
    startedAt: s.startedAt?.toISOString(),
    endedAt: s.endedAt?.toISOString(),
    duration: s.duration,
    status: s.status,
    roomToken: s.roomToken,
    iceServers: s.iceServers || DEFAULT_ICE_SERVERS,
    consentGiven: s.consentGiven,
    consentTimestamp: s.consentTimestamp?.toISOString(),
    recordingEnabled: s.recordingEnabled,
    recordingUrl: s.recordingUrl,
    notes: s.notes,
    prescriptions: s.prescriptions || [],
    followUpDate: s.followUpDate?.toISOString(),
    metadata: s.metadata,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
