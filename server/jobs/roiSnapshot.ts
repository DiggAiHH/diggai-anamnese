import { createDailySnapshot } from '../services/roiService';

/**
 * ROI Snapshot Cron Job
 * Erstellt täglich um 23:59 einen Snapshot der Tagesleistung.
 * Wird über setInterval gesteuert (kein zusätzliches cron-Paket nötig).
 */

let snapshotTimer: ReturnType<typeof setInterval> | null = null;

function getMillisUntilMidnight(): number {
    const now = new Date();
    const target = new Date(now);
    target.setHours(23, 59, 0, 0);

    // If we're past 23:59, schedule for tomorrow
    if (now >= target) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
}

async function runSnapshot() {
    try {
        await createDailySnapshot();
    } catch (err) {
        console.error('[ROI-Job] Snapshot failed:', err);
    }
}

export function startROISnapshotJob(): void {
    // Schedule first run at 23:59 today (or tomorrow if past)
    const msUntil = getMillisUntilMidnight();
    console.log(`[ROI-Job] Next snapshot in ${Math.round(msUntil / 60000)} minutes`);

    setTimeout(() => {
        runSnapshot();
        // Then run every 24 hours
        snapshotTimer = setInterval(runSnapshot, 24 * 60 * 60 * 1000);
    }, msUntil);
}

export function stopROISnapshotJob(): void {
    if (snapshotTimer) {
        clearInterval(snapshotTimer);
        snapshotTimer = null;
    }
}
