/**
 * Retention Cleanup Job — DSGVO-konforme 30-Tage-Löschfrist
 *
 * Sucht alle PatientSessions im Status 'PROCESSED', die älter als 30 Tage sind,
 * und löscht diese Daten DSGVO-konform (Hard Delete) aus der Datenbank.
 *
 * Prisma's onDelete: Cascade sorgt dafür, dass alle verknüpften Daten
 * (Antworten, Triage-Events, Chat-Nachrichten, etc.) mit gelöscht werden.
 *
 * Läuft 1x täglich (alle 24 Stunden).
 */

import { prisma } from '../db';

const RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Stunden

export async function startRetentionCleanupJob() {
    console.log(`[RetentionCleanup] Starte DSGVO-Löschjob (${RETENTION_DAYS} Tage Aufbewahrungsfrist)`);

    const cleanUpProcessedSessions = async () => {
        try {
            const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

            // Find all PROCESSED sessions older than retention period
            const sessionsToDelete = await prisma.patientSession.findMany({
                where: {
                    processedStatus: 'PROCESSED',
                    processedAt: {
                        lt: cutoffDate,
                    },
                },
                select: {
                    id: true,
                    tenantId: true,
                    processedAt: true,
                },
            });

            if (sessionsToDelete.length === 0) {
                return;
            }

            console.log(`[RetentionCleanup] ${sessionsToDelete.length} bearbeitete Session(s) älter als ${RETENTION_DAYS} Tage gefunden. Starte Löschung...`);

            // Delete in batches to avoid overwhelming the DB
            const BATCH_SIZE = 50;
            let totalDeleted = 0;

            for (let i = 0; i < sessionsToDelete.length; i += BATCH_SIZE) {
                const batch = sessionsToDelete.slice(i, i + BATCH_SIZE);
                const batchIds = batch.map(s => s.id);

                // Prisma cascading deletes will remove:
                // - Answer records
                // - TriageEvent records
                // - ChatMessage records
                // - AccidentDetails
                // - QueueEntry
                // - Signatures
                // - AnliegenTracking
                // - TherapyPlans
                // - ClinicalAlerts
                // - FlowProgress
                // - SecureExportLinks
                // - PackageImportLogs
                const deleted = await prisma.patientSession.deleteMany({
                    where: {
                        id: { in: batchIds },
                    },
                });

                totalDeleted += deleted.count;
            }

            console.log(`[RetentionCleanup] ${totalDeleted} Session(s) DSGVO-konform gelöscht (Hard Delete).`);
        } catch (err) {
            console.error('[RetentionCleanup] Fehler bei der Datenbereinigung:', err);
        }
    };

    // Run once at startup
    await cleanUpProcessedSessions();

    // Schedule daily
    setInterval(cleanUpProcessedSessions, CLEANUP_INTERVAL_MS);
}

export function getRetentionConfig() {
    return {
        retentionDays: RETENTION_DAYS,
        cleanupIntervalMs: CLEANUP_INTERVAL_MS,
    };
}
