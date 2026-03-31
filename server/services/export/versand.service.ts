import { prisma } from '../../db';
import { createLogger } from '../../logger';

const logger = createLogger('VersandService');

export type VersandChannel = 'EMAIL' | 'PRINT' | 'NFC' | 'PVS' | 'GDT' | 'FHIR';
export type VersandPriority = 'NORMAL' | 'HIGH' | 'EMERGENCY';
export type VersandStatus = 'VERSCHLUESSELT_VERSENDET' | 'ZUGESTELLT' | 'VERARBEITET' | 'GELESEN' | 'ABGESCHLOSSEN';

interface VersandSession {
  id: string;
  tenantId: string;
  pvsExportRef?: string | null;
  triageEvents: Array<{ level: string }>;
}

interface StatusUpdateOptions {
  readByMfaId?: string | null;
  readByArztId?: string | null;
}

export interface VersandChannelResult {
  channel: VersandChannel;
  success: boolean;
  deliveredAt?: Date;
  error?: string;
}

export interface VersandProcessResult {
  sessionId: string;
  priority: VersandPriority;
  status: VersandStatus;
  channelResults: VersandChannelResult[];
}

const STATUS_FLOW: VersandStatus[] = [
  'VERSCHLUESSELT_VERSENDET',
  'ZUGESTELLT',
  'VERARBEITET',
  'GELESEN',
  'ABGESCHLOSSEN',
];

function normalizeChannel(channel: string): VersandChannel {
  const normalized = channel.trim().toUpperCase();
  switch (normalized) {
    case 'EMAIL':
    case 'PRINT':
    case 'NFC':
    case 'PVS':
    case 'GDT':
    case 'FHIR':
      return normalized;
    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
}

function derivePriority(levels: string[]): VersandPriority {
  if (levels.some((level) => level === 'CRITICAL')) {
    return 'EMERGENCY';
  }

  if (levels.some((level) => level === 'WARNING')) {
    return 'HIGH';
  }

  return 'NORMAL';
}

function canTransition(current: VersandStatus, next: VersandStatus): boolean {
  const currentIndex = STATUS_FLOW.indexOf(current);
  const nextIndex = STATUS_FLOW.indexOf(next);

  return currentIndex >= 0 && nextIndex >= 0 && nextIndex >= currentIndex;
}

async function loadSession(sessionId: string): Promise<VersandSession> {
  const session = await prisma.patientSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      tenantId: true,
      pvsExportRef: true,
      triageEvents: {
        select: {
          level: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  return session;
}

async function ensureTrackingEntry(sessionId: string) {
  const existing = await prisma.anliegenTracking.findFirst({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.anliegenTracking.create({
    data: {
      sessionId,
      status: 'VERSCHLUESSELT_VERSENDET',
      statusUpdatedAt: new Date(),
    },
  });
}

async function writeAuditEntry(params: {
  tenantId: string;
  sessionId: string;
  action: 'VERSAND_CHANNEL_DISPATCH' | 'VERSAND_STATUS_UPDATE';
  metadata: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      action: params.action,
      resource: `sessions/${params.sessionId}`,
      metadata: JSON.stringify(params.metadata),
    },
  });
}

async function dispatchToChannel(
  session: VersandSession,
  channel: VersandChannel,
  priority: VersandPriority,
): Promise<VersandChannelResult> {
  const deliveredAt = new Date();

  try {
    await writeAuditEntry({
      tenantId: session.tenantId,
      sessionId: session.id,
      action: 'VERSAND_CHANNEL_DISPATCH',
      metadata: {
        channel,
        priority,
        deliveredAt: deliveredAt.toISOString(),
        pvsExportRef: session.pvsExportRef || null,
      },
    });

    return {
      channel,
      success: true,
      deliveredAt,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Dispatch failed';
    logger.error('Channel dispatch failed', {
      sessionId: session.id,
      channel,
      error: message,
    });

    return {
      channel,
      success: false,
      error: message,
    };
  }
}

export async function updateVersandStatus(
  sessionId: string,
  nextStatus: VersandStatus,
  options: StatusUpdateOptions = {},
) {
  const session = await loadSession(sessionId);
  const tracking = await ensureTrackingEntry(sessionId);
  const currentStatus = tracking.status as VersandStatus;

  if (!canTransition(currentStatus, nextStatus)) {
    throw new Error(`Invalid status transition: ${currentStatus} -> ${nextStatus}`);
  }

  const updated = await prisma.anliegenTracking.update({
    where: { id: tracking.id },
    data: {
      status: nextStatus,
      statusUpdatedAt: new Date(),
      readByMfaId: options.readByMfaId !== undefined ? options.readByMfaId : tracking.readByMfaId,
      readByArztId: options.readByArztId !== undefined ? options.readByArztId : tracking.readByArztId,
    },
  });

  await writeAuditEntry({
    tenantId: session.tenantId,
    sessionId,
    action: 'VERSAND_STATUS_UPDATE',
    metadata: {
      fromStatus: currentStatus,
      toStatus: nextStatus,
      readByMfaId: options.readByMfaId || null,
      readByArztId: options.readByArztId || null,
    },
  });

  return updated;
}

export async function processVersand(sessionId: string, channels: string[]): Promise<VersandProcessResult> {
  if (channels.length === 0) {
    throw new Error('At least one channel is required');
  }

  const session = await loadSession(sessionId);
  const normalizedChannels = Array.from(new Set(channels.map(normalizeChannel)));
  const priority = derivePriority(session.triageEvents.map((event) => event.level));

  await ensureTrackingEntry(session.id);

  const channelResults = await Promise.all(
    normalizedChannels.map((channel) => dispatchToChannel(session, channel, priority)),
  );

  const allDelivered = channelResults.every((result) => result.success);
  const targetStatus: VersandStatus = allDelivered ? 'ZUGESTELLT' : 'VERSCHLUESSELT_VERSENDET';

  await updateVersandStatus(session.id, targetStatus);

  return {
    sessionId: session.id,
    priority,
    status: targetStatus,
    channelResults,
  };
}

export async function markVersandProcessed(sessionId: string) {
  return updateVersandStatus(sessionId, 'VERARBEITET');
}

export async function markVersandReadByMfa(sessionId: string, mfaId: string) {
  return updateVersandStatus(sessionId, 'GELESEN', { readByMfaId: mfaId });
}

export async function markVersandReadByArzt(sessionId: string, arztId: string) {
  return updateVersandStatus(sessionId, 'GELESEN', { readByArztId: arztId });
}

export async function completeVersand(sessionId: string) {
  return updateVersandStatus(sessionId, 'ABGESCHLOSSEN');
}
