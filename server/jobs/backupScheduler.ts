// ─── Automatisches Datenbank-Backup (Scheduler) ─────────────
// Erstellt taeglich um 03:00 Uhr ein verschluesseltes Backup.
// Nutzt den existierenden backupService (pg_dump + AES-256-GCM).
// Verwaltet Retention-Policy (max Alter + max Anzahl).

import * as cron from 'node-cron';
import { createBackup, listBackups, deleteBackup, getBackupSchedule } from '../services/system/backupService';

let backupCron: ReturnType<typeof cron.schedule> | null = null;

async function runScheduledBackup(): Promise<void> {
    console.log('[Backup] Starte geplantes automatisches Backup...');
    try {
        const schedule = await getBackupSchedule();
        const result = await createBackup({
            type: schedule.type || 'full',
            trigger: 'scheduled',
        });
        console.log(`[Backup] Backup erfolgreich: ${result.filename} (${(result.fileSize / 1024 / 1024).toFixed(2)} MB)`);

        // Retention-Policy anwenden
        await applyRetention(schedule.retentionDays || 30, schedule.maxBackups || 10);
    } catch (err) {
        console.error('[Backup] Automatisches Backup fehlgeschlagen:', err);
    }
}

async function applyRetention(retentionDays: number, maxBackups: number): Promise<void> {
    try {
        const backups = await listBackups({ status: 'COMPLETED' });
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);

        // Alte Backups nach Retention-Zeitraum loeschen
        for (const backup of backups) {
            if (new Date(backup.startedAt) < cutoff) {
                await deleteBackup(backup.id);
                console.log(`[Backup] Retention: Altes Backup ${backup.filename} geloescht (aelter als ${retentionDays} Tage)`);
            }
        }

        // Max-Anzahl-Limit einhalten
        const remaining = await listBackups({ status: 'COMPLETED' });
        if (remaining.length > maxBackups) {
            const toDelete = remaining.slice(maxBackups);
            for (const backup of toDelete) {
                await deleteBackup(backup.id);
                console.log(`[Backup] Retention: Ueberzaehliges Backup ${backup.filename} geloescht (max ${maxBackups})`);
            }
        }
    } catch (err) {
        console.error('[Backup] Retention-Policy Fehler:', err);
    }
}

export function startBackupScheduler(): void {
    const cronExpr = process.env.BACKUP_CRON || '0 3 * * *'; // Default: 03:00 taeglich
    console.log(`[Backup] Automatischer Backup-Scheduler gestartet (${cronExpr})`);

    backupCron = cron.schedule(cronExpr, async () => {
        await runScheduledBackup();
    });
}

export function stopBackupScheduler(): void {
    if (backupCron) {
        backupCron.stop();
        backupCron = null;
        console.log('[Backup] Backup-Scheduler gestoppt');
    }
}
