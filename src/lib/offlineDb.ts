import Dexie, { type Table } from 'dexie';

// Define the Dexie database with proper TypeScript interfaces

export interface PendingDiaryEntry {
  id?: number; // auto-increment
  tempId: string; // client-side UUID for deduplication
  accountId: string;
  date: string; // ISO date string
  mood?: string;
  painLevel?: number;
  sleepQuality?: number;
  sleepHours?: number;
  symptoms?: string[];
  notes?: string;
  vitalBp?: string;
  vitalBpSys?: number;
  vitalBpDia?: number;
  vitalPulse?: number;
  vitalTemp?: number;
  vitalWeight?: number;
  vitalBloodSugar?: number;
  offlineCreated: boolean;
  synced: boolean;
  createdAt: string;
}

export interface PendingMeasureTracking {
  id?: number;
  tempId: string;
  accountId: string;
  measureId: string;
  scheduledDate: string;
  completedDate?: string;
  skippedDate?: string;
  skippedReason?: string;
  dose?: string;
  notes?: string;
  sideEffects?: string[];
  offlineCreated: boolean;
  synced: boolean;
  createdAt: string;
}

export interface CachedData {
  id?: number;
  key: string; // e.g. 'diary-list', 'medications'
  data: any;
  cachedAt: string;
  expiresAt?: string;
}

export interface OfflineQueueItem {
  id?: number;
  type: 'diary' | 'measure' | 'message';
  payload: any;
  createdAt: string;
  synced: boolean;
  error?: string;
}

class DiggAIOfflineDB extends Dexie {
  pendingDiary!: Table<PendingDiaryEntry, number>;
  pendingMeasures!: Table<PendingMeasureTracking, number>;
  cachedData!: Table<CachedData, number>;
  offlineQueue!: Table<OfflineQueueItem, number>;

  constructor() {
    super('diggai-pwa-offline-v2');
    this.version(1).stores({
      pendingDiary: '++id, tempId, accountId, synced, createdAt',
      pendingMeasures: '++id, tempId, accountId, measureId, synced, createdAt',
      cachedData: '++id, key, cachedAt',
      offlineQueue: '++id, type, synced, createdAt',
    });
  }
}

export const offlineDb = new DiggAIOfflineDB();

// ─── Public API (backwards-compatible with old offlineDb.ts) ──

export async function addPendingDiaryEntry(entry: Omit<PendingDiaryEntry, 'id'>): Promise<number> {
  return offlineDb.pendingDiary.add(entry);
}

export async function getPendingDiaryEntries(accountId: string): Promise<PendingDiaryEntry[]> {
  return offlineDb.pendingDiary.where({ accountId, synced: 0 }).toArray();
}

export async function markDiaryEntrySynced(tempId: string): Promise<void> {
  await offlineDb.pendingDiary.where('tempId').equals(tempId).modify({ synced: true });
}

export async function clearSyncedDiaryEntries(): Promise<void> {
  await offlineDb.pendingDiary.where('synced').equals(1).delete();
}

export async function cacheData(key: string, data: any, ttlSeconds = 3600): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  await offlineDb.cachedData.where('key').equals(key).delete();
  await offlineDb.cachedData.add({ key, data, cachedAt: now.toISOString(), expiresAt });
}

export async function getCachedData(key: string): Promise<any | null> {
  const item = await offlineDb.cachedData.where('key').equals(key).first();
  if (!item) return null;
  if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
    await offlineDb.cachedData.where('key').equals(key).delete();
    return null;
  }
  return item.data;
}

// Legacy compat functions (keep old API working)
export async function addPendingEntry(type: 'diary' | 'measure', data: any): Promise<void> {
  if (type === 'diary') {
    await addPendingDiaryEntry({ ...data, synced: false, createdAt: new Date().toISOString() });
  }
}

export async function getPendingEntries(accountId: string): Promise<any[]> {
  return getPendingDiaryEntries(accountId);
}

export async function markSynced(tempId: string): Promise<void> {
  return markDiaryEntrySynced(tempId);
}

export async function clearSynced(): Promise<void> {
  return clearSyncedDiaryEntries();
}
