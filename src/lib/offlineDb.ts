const DB_NAME = 'diggai-pwa-offline';
const DB_VERSION = 1;

interface OfflineEntry {
    id: string;
    type: 'diary' | 'tracking';
    data: Record<string, unknown>;
    createdAt: string;
    synced: boolean;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('pendingSync')) {
                const store = db.createObjectStore('pendingSync', { keyPath: 'id' });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('synced', 'synced', { unique: false });
            }
            if (!db.objectStoreNames.contains('cachedData')) {
                db.createObjectStore('cachedData', { keyPath: 'key' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function addPendingEntry(entry: OfflineEntry): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pendingSync', 'readwrite');
        tx.objectStore('pendingSync').put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getPendingEntries(type?: string): Promise<OfflineEntry[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pendingSync', 'readonly');
        const store = tx.objectStore('pendingSync');
        const req = type
            ? store.index('type').getAll(type)
            : store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter((e: OfflineEntry) => !e.synced));
        req.onerror = () => reject(req.error);
    });
}

export async function markSynced(ids: string[]): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pendingSync', 'readwrite');
        const store = tx.objectStore('pendingSync');
        for (const id of ids) {
            const req = store.get(id);
            req.onsuccess = () => {
                if (req.result) {
                    store.put({ ...req.result, synced: true });
                }
            };
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function clearSynced(): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pendingSync', 'readwrite');
        const store = tx.objectStore('pendingSync');
        const req = store.index('synced').openCursor(IDBKeyRange.only(true));
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function cacheData(key: string, data: unknown): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('cachedData', 'readwrite');
        tx.objectStore('cachedData').put({ key, data, updatedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('cachedData', 'readonly');
        const req = tx.objectStore('cachedData').get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data as T : null);
        req.onerror = () => reject(req.error);
    });
}
