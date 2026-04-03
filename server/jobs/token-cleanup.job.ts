/**
 * @module token-cleanup.job
 * @description Cron Job für Bereinigung abgelaufener Refresh Tokens
 *
 * Läuft täglich um 3:00 Uhr und löscht:
 * - Abgelaufene Tokens älter als 30 Tage
 * - Revoked Tokens älter als 30 Tage
 *
 * @schedule Täglich 03:00
 */

import { schedule } from 'node-cron';
import { cleanupExpiredTokens, getTokenStats } from '../services/auth/refresh-token.service';

const CLEANUP_SCHEDULE = '0 3 * * *'; // Täglich um 3:00 Uhr
const TOKEN_RETENTION_DAYS = 30;

let isJobScheduled = false;

/**
 * Startet den Token-Cleanup Cron Job
 */
export function startTokenCleanupJob(): void {
    if (isJobScheduled) {
        console.log('[TokenCleanup] Job already scheduled');
        return;
    }

    console.log('[TokenCleanup] Scheduling daily cleanup job for 03:00');

    schedule(CLEANUP_SCHEDULE, async () => {
        console.log('[TokenCleanup] Starting daily token cleanup...');

        try {
            // Stats vor Cleanup
            const statsBefore = await getTokenStats();
            console.log('[TokenCleanup] Stats before cleanup:', statsBefore);

            // Cleanup durchführen
            const deletedCount = await cleanupExpiredTokens(TOKEN_RETENTION_DAYS);
            console.log(`[TokenCleanup] Deleted ${deletedCount} expired/revoked tokens`);

            // Stats nach Cleanup
            const statsAfter = await getTokenStats();
            console.log('[TokenCleanup] Stats after cleanup:', statsAfter);

            // Warnung bei vielen aktiven Tokens
            if (statsAfter.totalActive > 10000) {
                console.warn('[TokenCleanup] WARNING: High number of active tokens:', statsAfter.totalActive);
            }

            // Warnung bei Reuse-Detection
            if (statsAfter.reuseDetected > 0) {
                console.warn('[TokenCleanup] SECURITY: Reuse detected count:', statsAfter.reuseDetected);
            }

        } catch (err) {
            console.error('[TokenCleanup] Error during cleanup:', err);
        }
    });

    isJobScheduled = true;
}

/**
 * Stoppt den Token-Cleanup Cron Job (für Tests)
 */
export function stopTokenCleanupJob(): void {
    isJobScheduled = false;
}

/**
 * Manuelles Ausführen des Cleanups (für Admin-Endpoints)
 */
export async function runManualCleanup(retentionDays = TOKEN_RETENTION_DAYS): Promise<{
    success: boolean;
    deletedCount: number;
    stats: Awaited<ReturnType<typeof getTokenStats>>;
}> {
    const stats = await getTokenStats();
    const deletedCount = await cleanupExpiredTokens(retentionDays);

    return {
        success: true,
        deletedCount,
        stats,
    };
}
