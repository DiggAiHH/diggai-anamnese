// ─── Modul 5: Patient Portal PWA — Offline Sync Service ─────

import type {
  OfflineSyncPayload,
  SyncResult,
  ChangesSinceResult,
  DiaryEntryData,
  MeasureTrackingData,
  MessageData,
  ConsentData,
} from './types';

// ─── Prisma helper ──────────────────────────────────────────

function getPrisma() {
  const prisma = (globalThis as any).__prisma;
  if (!prisma) {
    throw new Error('Prisma client not initialised');
  }
  return prisma;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Resolve the patientId associated with a given PatientAccount.
 */
async function getPatientId(accountId: string): Promise<string> {
  const prisma = getPrisma();
  const account = await prisma.patientAccount.findUnique({
    where: { id: accountId },
    select: { patientId: true },
  });
  if (!account) {
    throw new Error('PatientAccount nicht gefunden.');
  }
  return account.patientId;
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Process offline-created diary entries and measure trackings.
 *
 * Strategy:
 *  - For each diary entry: check if a matching entry already exists for the
 *    same account + date. If yes, count as conflict (skip). Otherwise, insert.
 *  - For each measure tracking: check by account + measureId + scheduledDate.
 *    If duplicate, count as conflict. Otherwise, insert.
 *  - Mark all created records with `offlineCreated: true` and `syncedAt: now`.
 */
export async function syncOfflineData(
  accountId: string,
  payload: OfflineSyncPayload,
): Promise<SyncResult> {
  const prisma = getPrisma();
  const patientId = await getPatientId(accountId);
  const now = new Date();

  let synced = 0;
  let conflicts = 0;

  // ── Diary entries ──────────────────────────────────────────
  for (const entry of payload.diaryEntries) {
    const entryDate = entry.date ? new Date(entry.date) : now;

    // Conflict detection: same account + same calendar day
    const dayStart = new Date(entryDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(entryDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.diaryEntry.findFirst({
      where: {
        accountId,
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    if (existing) {
      conflicts++;
      continue;
    }

    await prisma.diaryEntry.create({
      data: {
        accountId,
        patientId,
        date: entryDate,
        mood: entry.mood ?? null,
        painLevel: entry.painLevel ?? null,
        sleepQuality: entry.sleepQuality ?? null,
        sleepHours: entry.sleepHours ?? null,
        symptoms: entry.symptoms ?? [],
        notes: entry.notes ?? null,
        vitalBp: entry.vitals?.bp ?? null,
        vitalPulse: entry.vitals?.pulse ?? null,
        vitalTemp: entry.vitals?.temp ?? null,
        vitalWeight: entry.vitals?.weight ?? null,
        vitalBloodSugar: entry.vitals?.bloodSugar ?? null,
        offlineCreated: true,
        syncedAt: now,
      },
    });
    synced++;
  }

  // ── Measure trackings ─────────────────────────────────────
  for (const tracking of payload.measureTrackings) {
    const scheduledDate = new Date(tracking.scheduledDate);

    // Conflict detection: same account + measure + scheduledDate
    const existing = await prisma.measureTracking.findFirst({
      where: {
        accountId,
        measureId: tracking.measureId,
        scheduledDate,
      },
    });

    if (existing) {
      conflicts++;
      continue;
    }

    await prisma.measureTracking.create({
      data: {
        accountId,
        measureId: tracking.measureId,
        scheduledDate,
        completedDate: tracking.completedDate ? new Date(tracking.completedDate) : null,
        dose: tracking.dose ?? null,
        notes: tracking.notes ?? null,
        sideEffects: tracking.sideEffects ?? [],
        offlineCreated: true,
        syncedAt: now,
      },
    });
    synced++;
  }

  return {
    synced,
    conflicts,
    serverTimestamp: now.toISOString(),
  };
}

/**
 * Retrieve all server-side changes since a given timestamp.
 * Used by the client to reconcile its local cache after reconnecting.
 */
export async function getChangesSince(
  accountId: string,
  lastSyncAt: string,
): Promise<ChangesSinceResult> {
  const prisma = getPrisma();
  const since = new Date(lastSyncAt);
  const now = new Date();

  const [diaryEntries, measureTrackings, messages, consents] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { accountId, updatedAt: { gt: since } },
      orderBy: { date: 'desc' },
    }),
    prisma.measureTracking.findMany({
      where: { accountId, createdAt: { gt: since } },
      orderBy: { scheduledDate: 'desc' },
    }),
    prisma.providerMessage.findMany({
      where: { accountId, createdAt: { gt: since } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.patientConsent.findMany({
      where: { accountId, updatedAt: { gt: since } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return {
    diaryEntries: diaryEntries as DiaryEntryData[],
    measureTrackings: measureTrackings as MeasureTrackingData[],
    messages: messages as MessageData[],
    consents: consents as ConsentData[],
    serverTimestamp: now.toISOString(),
  };
}
