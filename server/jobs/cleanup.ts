import { prisma } from '../db';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 Stunde

export async function startDatabaseCleanupJob() {
    console.log('[Cleanup] Starte automatischen Datenbank-Bereinigungsjob');

    const cleanUp = async () => {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Lösche alte Session-Waisen, die von anonymen Patienten gestartet, aber nie abgeschlossen wurden.
            // Prisma löscht via onDelete: Cascade auch alle Antworten, Sessions und Triage-Events
            const deleted = await prisma.patient.deleteMany({
                where: {
                    hashedEmail: {
                        startsWith: 'anonymous', // Unser Marker in sessions.ts
                    },
                    sessions: {
                        every: {
                            status: 'ACTIVE',
                            createdAt: {
                                lt: twentyFourHoursAgo,
                            },
                        },
                    },
                },
            });

            if (deleted.count > 0) {
                console.log(`[Cleanup] ${deleted.count} verwaiste, alte Patientendatensätze gelöscht.`);
            }
        } catch (err) {
            console.error('[Cleanup] Fehler bei der Datenbank-Bereinigung:', err);
        }
    };

    // Direkt einmal bei Start ausführen
    await cleanUp();

    // Interval einrichten
    setInterval(cleanUp, CLEANUP_INTERVAL_MS);
}
