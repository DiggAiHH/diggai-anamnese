// ─── Eskalations-Workflow Worker ─────────────────────────────
// Ueberwacht unbestaetigte Triage-Alarme.
// Timeout-Stufen: 5 Min → Re-Alert, 15 Min → Alle Aerzte, 30 Min → System-Log.
// Laeuft alle 2 Minuten.

import * as cron from 'node-cron';
import { prisma } from '../db';
import { getIO } from '../socket';

interface EscalationLevel {
    thresholdMinutes: number;
    action: 're-alert' | 'broadcast' | 'system-log';
    label: string;
}

const ESCALATION_LEVELS: EscalationLevel[] = [
    { thresholdMinutes: 5, action: 're-alert', label: 'Erneuter Alert an Arzt-Dashboard' },
    { thresholdMinutes: 15, action: 'broadcast', label: 'Broadcast an alle Aerzte + MFA' },
    { thresholdMinutes: 30, action: 'system-log', label: 'System-Eskalation protokolliert' },
];

let escalationCron: ReturnType<typeof cron.schedule> | null = null;

// Track which escalation level was already sent for each event to prevent duplicate notifications
const lastEscalationLevel = new Map<string, string>();

async function checkUnacknowledgedAlerts(): Promise<void> {
    const now = new Date();

    // Finde alle CRITICAL Events ohne Bestaetigung
    const unacknowledged = await prisma.triageEvent.findMany({
        where: {
            level: 'CRITICAL',
            acknowledgedBy: null,
        },
        include: {
            session: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    if (unacknowledged.length === 0) {
        // Cleanup dedup map when all events are acknowledged
        lastEscalationLevel.clear();
        return;
    }

    // Clean up entries for events that have been acknowledged
    const activeIds = new Set(unacknowledged.map(e => e.id));
    for (const key of lastEscalationLevel.keys()) {
        if (!activeIds.has(key)) lastEscalationLevel.delete(key);
    }

    const io = getIO();

    for (const event of unacknowledged) {
        const ageMinutes = (now.getTime() - event.createdAt.getTime()) / 60000;
        const lastLevel = lastEscalationLevel.get(event.id);

        for (const level of ESCALATION_LEVELS) {
            if (ageMinutes >= level.thresholdMinutes) {
                // Skip if we already sent this escalation level for this event
                if (lastLevel === level.action) continue;

                if (level.action === 're-alert' && ageMinutes < ESCALATION_LEVELS[1].thresholdMinutes) {
                    // Re-alert nur an Arzt-Room
                    if (io) {
                        io.to('arzt').emit('triage:escalation', {
                            eventId: event.id,
                            sessionId: event.sessionId,
                            level: event.level,
                            message: event.message,
                            atomId: event.atomId,
                            ageMinutes: Math.round(ageMinutes),
                            escalationLevel: level.label,
                            action: level.action,
                            timestamp: now.toISOString(),
                        });
                    }
                    console.log(`[Eskalation] Re-Alert: Event ${event.id} seit ${Math.round(ageMinutes)} Min unbestaetigt`);
                    lastEscalationLevel.set(event.id, level.action);
                }

                if (level.action === 'broadcast' && ageMinutes < ESCALATION_LEVELS[2].thresholdMinutes) {
                    // Broadcast an ALLE verbundenen Clients
                    if (io) {
                        io.emit('triage:escalation-critical', {
                            eventId: event.id,
                            sessionId: event.sessionId,
                            level: event.level,
                            message: event.message,
                            atomId: event.atomId,
                            ageMinutes: Math.round(ageMinutes),
                            escalationLevel: level.label,
                            action: level.action,
                            urgent: true,
                            timestamp: now.toISOString(),
                        });
                    }
                    console.warn(`[Eskalation] BROADCAST: Event ${event.id} seit ${Math.round(ageMinutes)} Min unbestaetigt!`);
                    lastEscalationLevel.set(event.id, level.action);
                }

                if (level.action === 'system-log' && ageMinutes >= ESCALATION_LEVELS[2].thresholdMinutes) {
                    console.error(`[Eskalation] SYSTEM-LOG: CRITICAL Triage ${event.id} seit ${Math.round(ageMinutes)} Min OHNE Bestaetigung! Session: ${event.sessionId}, Atom: ${event.atomId}, Meldung: ${event.message}`);
                    lastEscalationLevel.set(event.id, level.action);
                }
            }
        }
    }

    if (unacknowledged.length > 0) {
        console.log(`[Eskalation] ${unacknowledged.length} unbestaetigte CRITICAL Events geprueft`);
    }
}

export function startEscalationWorker(): void {
    console.log('[Eskalation] Eskalations-Workflow Worker gestartet (alle 2 Min)');

    escalationCron = cron.schedule('*/2 * * * *', async () => {
        try {
            await checkUnacknowledgedAlerts();
        } catch (err) {
            console.error('[Eskalation] Worker-Fehler:', err);
        }
    });
}

export function stopEscalationWorker(): void {
    if (escalationCron) {
        escalationCron.stop();
        escalationCron = null;
        console.log('[Eskalation] Worker gestoppt');
    }
}
