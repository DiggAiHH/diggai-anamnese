// ═══════════════════════════════════════════════════════════════
// Modul 7: NFC Checkpoint & Scan Service
// ═══════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { getRedisClient } from '../../redis';
import {
  NfcTapPayload,
  NfcTapResult,
  NfcCheckpointConfig,
  NFC_TIMESTAMP_DRIFT_MS,
  NFC_NONCE_TTL_S,
} from './types';

const NFC_SECRET = process.env.NFC_HMAC_SECRET || 'dev-nfc-secret-change-me';

function verifyHmac(locationId: string, praxisId: string, timestamp: number, signature: string): boolean {
  const data = `${locationId}|${praxisId}|${timestamp}`;
  const expected = crypto.createHmac('sha256', NFC_SECRET).update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

function isTimestampValid(timestamp: number): boolean {
  const now = Date.now();
  return Math.abs(now - timestamp) <= NFC_TIMESTAMP_DRIFT_MS;
}

async function isReplay(locationId: string, timestamp: number): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis?.isReady) return false; // graceful degradation
  const nonceKey = `nfc:nonce:${locationId}:${timestamp}`;
  const exists = await redis.get(nonceKey);
  if (exists) return true;
  await redis.setEx(nonceKey, NFC_NONCE_TTL_S, '1');
  return false;
}

export async function processTap(payload: NfcTapPayload): Promise<NfcTapResult> {
  const prisma = (globalThis as any).__prisma;

  // 1. Timestamp validation
  if (!isTimestampValid(payload.timestamp)) {
    return { accepted: false, rejectReason: 'TIMESTAMP_EXPIRED' };
  }

  // 2. HMAC signature validation
  try {
    if (!verifyHmac(payload.locationId, payload.praxisId, payload.timestamp, payload.signature)) {
      return { accepted: false, rejectReason: 'INVALID_SIGNATURE' };
    }
  } catch {
    return { accepted: false, rejectReason: 'INVALID_SIGNATURE' };
  }

  // 3. Replay protection
  if (await isReplay(payload.locationId, payload.timestamp)) {
    const scan = await prisma.nfcScan.create({
      data: {
        checkpointId: 'replay-blocked',
        scanStatus: 'REPLAY_BLOCKED',
        rejectReason: 'REPLAY_DETECTED',
        deviceInfo: payload.deviceInfo,
        ipHash: payload.signature.substring(0, 16),
      },
    }).catch(() => null);
    return { accepted: false, scanId: scan?.id, rejectReason: 'REPLAY_DETECTED' };
  }

  // 4. Find checkpoint
  const checkpoint = await prisma.nfcCheckpoint.findUnique({
    where: { locationId: payload.locationId },
  });

  if (!checkpoint) {
    return { accepted: false, rejectReason: 'CHECKPOINT_NOT_FOUND' };
  }

  if (!checkpoint.isActive) {
    return { accepted: false, rejectReason: 'CHECKPOINT_INACTIVE' };
  }

  // 5. Create scan record
  const scan = await prisma.nfcScan.create({
    data: {
      checkpointId: checkpoint.id,
      sessionId: payload.sessionHint || null,
      scanStatus: 'ACCEPTED',
      deviceInfo: payload.deviceInfo,
      ipHash: payload.signature.substring(0, 16),
    },
  });

  return {
    accepted: true,
    scanId: scan.id,
    checkpointType: checkpoint.type,
    roomName: checkpoint.roomName,
    sessionId: payload.sessionHint,
  };
}

export async function listCheckpoints(praxisId?: string) {
  const prisma = (globalThis as any).__prisma;
  const where = praxisId ? { praxisId } : {};
  return prisma.nfcCheckpoint.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function createCheckpoint(config: NfcCheckpointConfig) {
  const prisma = (globalThis as any).__prisma;
  return prisma.nfcCheckpoint.create({
    data: {
      locationId: config.locationId,
      praxisId: config.praxisId,
      type: config.type,
      roomName: config.roomName,
      coordinates: config.coordinates || null,
      nfcUid: config.nfcUid,
      secretRef: config.secretRef,
      isActive: config.isActive !== false,
    },
  });
}

export async function updateCheckpoint(id: string, data: Partial<NfcCheckpointConfig>) {
  const prisma = (globalThis as any).__prisma;
  return prisma.nfcCheckpoint.update({
    where: { id },
    data: {
      ...(data.roomName !== undefined && { roomName: data.roomName }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.coordinates !== undefined && { coordinates: data.coordinates }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.secretRef !== undefined && { secretRef: data.secretRef }),
    },
  });
}

export async function deleteCheckpoint(id: string) {
  const prisma = (globalThis as any).__prisma;
  // Soft-deactivate instead of hard delete (preserve scan history)
  return prisma.nfcCheckpoint.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getCheckpointScans(checkpointId: string, limit = 50) {
  const prisma = (globalThis as any).__prisma;
  return prisma.nfcScan.findMany({
    where: { checkpointId },
    orderBy: { scannedAt: 'desc' },
    take: limit,
  });
}
