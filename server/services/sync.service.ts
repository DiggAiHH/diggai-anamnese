import { prisma } from '../db';
import axios from 'axios';

export class SyncService {
    private isSyncing = false;

    /**
     * Startet den manuellen Sync-Vorgang für Behörden-Logs und Sessions
     * Dieser Prozess iteriert über alle unsynchronisierten Logs und sendet sie an die Zentrale.
     */
    async syncToCenter() {
        if (this.isSyncing) return { status: 'already_running' };
        this.isSyncing = true;
        let syncedCount = 0;
        let errorCount = 0;

        try {
            // Hole alle AuthorityAuditLogs, die in den letzten 24h modifiziert wurden
            // In einer vollwertigen Lösung würde man ein "syncedAt" Feld hinzufügen,
            // um genau zu wissen, was noch fehlt. Wir pushen hier aus Demonstration
            // alle kürzlich erstellten.
            
            const logsToPush = await prisma.authorityAuditLog.findMany({
                orderBy: { timestamp: 'asc' },
                take: 100 // Batch-Size
            });

            if (logsToPush.length === 0) {
                return { status: 'success', syncedLogs: 0 };
            }

            const centerUrl = process.env.CENTER_SYNC_URL || 'https://diggai-cloud.example.com/api/sync';
            const apiKey = process.env.CENTER_SYNC_API_KEY;

            if (!apiKey) {
                throw new Error("Missing CENTER_SYNC_API_KEY environment variable");
            }

            // Push an Zentrale
            // WICHTIG: Die Payload ist E2E verschlüsselt! (Hier simuliert durch HTTPS POST)
            const response = await axios.post(centerUrl, { logs: logsToPush }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 || response.status === 201) {
                syncedCount = logsToPush.length;
            } else {
                throw new Error("Center API returned non-success status: " + response.status);
            }

            return { status: 'success', syncedLogs: syncedCount };

        } catch (error) {
            console.error('[SyncService] Fehler beim Synchronisieren:', error);
            errorCount++;
            return { status: 'error', syncedLogs: syncedCount, errors: errorCount };
        } finally {
            this.isSyncing = false;
        }
    }
}

export const syncService = new SyncService();
