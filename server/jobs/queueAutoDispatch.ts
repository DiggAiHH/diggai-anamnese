// ─── Queue Auto-Dispatch Worker ──────────────────────────────
// Automatische Zuweisung wartender Patienten an verfuegbare Aerzte.
// Priorisiert: EMERGENCY > URGENT > NORMAL (FIFO innerhalb Prio).
// Laeuft alle 3 Minuten.

import * as cron from 'node-cron';
import { prisma } from '../db';
import { getIO } from '../socket';

let dispatchCron: ReturnType<typeof cron.schedule> | null = null;

async function autoDispatchQueue(): Promise<void> {
    const io = getIO();

    // Finde wartende Patienten (sortiert nach Prio + Wartezeit)
    const waiting = await prisma.queueEntry.findMany({
        where: { status: 'WAITING' },
        orderBy: [{ joinedAt: 'asc' }],
    });

    if (waiting.length === 0) return;

    // Sortiere nach Prioritaet
    const PRIO_ORDER: Record<string, number> = { EMERGENCY: 0, URGENT: 1, NORMAL: 2 };
    waiting.sort((a, b) => {
        const diff = (PRIO_ORDER[a.priority] ?? 2) - (PRIO_ORDER[b.priority] ?? 2);
        return diff !== 0 ? diff : a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    // Finde verfuegbare Aerzte (nicht aktuell in Behandlung)
    // Zaehle aktive Behandlungen pro Session
    const activePatientSessions = await prisma.queueEntry.findMany({
        where: { status: { in: ['CALLED', 'IN_TREATMENT'] } },
    });

    // Auto-Call: Wenn weniger als X Patienten gleichzeitig CALLED sind
    const rawMax = Number(process.env.MAX_CONCURRENT_CALLED || 3);
    const maxConcurrentCalled = Number.isFinite(rawMax) && rawMax >= 1 && rawMax <= 20 ? rawMax : 3;
    const currentlyCalled = activePatientSessions.filter(e => e.status === 'CALLED').length;

    if (currentlyCalled >= maxConcurrentCalled) return;

    // Automatisch die naechsten Patienten aufrufen
    const slotsAvailable = maxConcurrentCalled - currentlyCalled;
    const toCall = waiting.slice(0, slotsAvailable);

    for (const entry of toCall) {
        try {
            await prisma.queueEntry.update({
                where: { id: entry.id },
                data: {
                    status: 'CALLED',
                    calledAt: new Date(),
                },
            });

            // Socket.IO Notification
            if (io) {
                io.to('arzt').emit('queue:auto-called', {
                    entryId: entry.id,
                    sessionId: entry.sessionId,
                    patientName: entry.patientName,
                    service: entry.service,
                    priority: entry.priority,
                    waitMinutes: Math.round((Date.now() - entry.joinedAt.getTime()) / 60000),
                    timestamp: new Date().toISOString(),
                });

                // Patient benachrichtigen
                io.emit('queue:called', {
                    sessionId: entry.sessionId,
                    message: 'Sie werden aufgerufen!',
                });
            }

            console.log(`[Queue-Dispatch] Auto-Call: ${entry.patientName} (${entry.priority}, ${entry.service})`);
        } catch (err) {
            console.error(`[Queue-Dispatch] Fehler beim Auto-Call fuer ${entry.id}:`, err);
        }
    }

    // Positionen neu berechnen
    if (toCall.length > 0) {
        const remainingWaiting = await prisma.queueEntry.findMany({
            where: { status: 'WAITING' },
            orderBy: [{ joinedAt: 'asc' }],
        });

        remainingWaiting.sort((a, b) => {
            const diff = (PRIO_ORDER[a.priority] ?? 2) - (PRIO_ORDER[b.priority] ?? 2);
            return diff !== 0 ? diff : a.joinedAt.getTime() - b.joinedAt.getTime();
        });

        const updates = remainingWaiting.map((entry, idx) =>
            prisma.queueEntry.update({
                where: { id: entry.id },
                data: { position: idx + 1, estimatedWaitMin: idx * 8 },
            })
        );

        if (updates.length > 0) {
            await prisma.$transaction(updates);
        }

        // Broadcast neue Queue-State
        if (io) {
            const state = await prisma.queueEntry.findMany({
                where: { status: { not: 'DONE' } },
                orderBy: [{ position: 'asc' }],
            });
            io.to('arzt').emit('queue:update', { queue: state });
        }

        console.log(`[Queue-Dispatch] ${toCall.length} Patient(en) automatisch aufgerufen, ${remainingWaiting.length} warten noch`);
    }
}

export function startQueueAutoDispatch(): void {
    console.log('[Queue-Dispatch] Auto-Dispatch Worker gestartet (alle 3 Min)');

    dispatchCron = cron.schedule('*/3 * * * *', async () => {
        try {
            await autoDispatchQueue();
        } catch (err) {
            console.error('[Queue-Dispatch] Worker-Fehler:', err);
        }
    });
}

export function stopQueueAutoDispatch(): void {
    if (dispatchCron) {
        dispatchCron.stop();
        dispatchCron = null;
        console.log('[Queue-Dispatch] Worker gestoppt');
    }
}
