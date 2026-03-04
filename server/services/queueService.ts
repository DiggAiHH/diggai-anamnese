/**
 * Queue Service — Persistent queue management using Prisma
 * Replaces the old in-memory queue array with database-backed operations.
 */
// QueueEntry local interface (avoids prisma generate dependency)
interface QueueEntry {
  id: string;
  sessionId: string;
  patientName: string;
  service: string;
  priority: string;
  status: string;
  position: number | null;
  estimatedWaitMin: number | null;
  entertainmentMode: string | null;
  deviceType: string | null;
  joinedAt: Date;
  calledAt: Date | null;
  treatmentStartedAt: Date | null;
  completedAt: Date | null;
  feedbackRating: number | null;
}

const db = (globalThis as any).__prisma as any;

// Priority sort order
const PRIORITY_ORDER: Record<string, number> = { EMERGENCY: 0, URGENT: 1, NORMAL: 2 };

// Average minutes per patient for wait estimation
const AVG_MINUTES_PER_PATIENT = 8;

export interface QueueStats {
    waiting: number;
    called: number;
    inTreatment: number;
    total: number;
    avgWaitMin: number;
    longestWaitMin: number;
}

export interface QueueState {
    queue: QueueEntry[];
    stats: QueueStats;
}

/**
 * Recalculate positions for all WAITING entries.
 * Sorts by priority (EMERGENCY > URGENT > NORMAL), then FIFO.
 */
export async function recalcPositions(): Promise<void> {
    const waiting = await db.queueEntry.findMany({
        where: { status: 'WAITING' },
        orderBy: [{ joinedAt: 'asc' }],
    });

    // Sort by priority then joinedAt
    waiting.sort((a: any, b: any) => {
        const diff = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
        if (diff !== 0) return diff;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    // Batch update positions and wait estimates
    const updates = waiting.map((entry: any, idx: number) =>
        db.queueEntry.update({
            where: { id: entry.id },
            data: {
                position: idx + 1,
                estimatedWaitMin: idx * AVG_MINUTES_PER_PATIENT,
            },
        })
    );

    if (updates.length > 0) {
        await db.$transaction(updates);
    }
}

/**
 * Get complete queue state for the arzt/admin dashboard
 */
export async function getQueueState(): Promise<QueueState> {
    const entries = await db.queueEntry.findMany({
        where: { status: { not: 'DONE' } },
        orderBy: [{ position: 'asc' }],
    });

    const now = new Date();
    const waitingEntries = entries.filter((e: any) => e.status === 'WAITING');
    const waitMinutes = waitingEntries.map((e: any) =>
        Math.floor((now.getTime() - e.joinedAt.getTime()) / 60000)
    );

    return {
        queue: entries,
        stats: {
            waiting: waitingEntries.length,
            called: entries.filter((e: any) => e.status === 'CALLED').length,
            inTreatment: entries.filter((e: any) => e.status === 'IN_TREATMENT').length,
            total: entries.length,
            avgWaitMin: waitMinutes.length > 0
                ? Math.round(waitMinutes.reduce((a: any, b: any) => a + b, 0) / waitMinutes.length)
                : 0,
            longestWaitMin: waitMinutes.length > 0 ? Math.max(...waitMinutes) : 0,
        },
    };
}

/**
 * Join the queue — creates a new persistent entry
 */
export async function joinQueue(data: {
    sessionId: string;
    patientName: string;
    service: string;
    priority?: string;
    entertainmentMode?: string;
    deviceType?: string;
}): Promise<QueueEntry> {
    // Check for existing WAITING entry (prevent duplicates)
    const existing = await db.queueEntry.findFirst({
        where: {
            sessionId: data.sessionId,
            status: 'WAITING',
        },
    });
    if (existing) return existing;

    const entry = await db.queueEntry.create({
        data: {
            sessionId: data.sessionId,
            patientName: data.patientName,
            service: data.service,
            priority: data.priority || 'NORMAL',
            status: 'WAITING',
            entertainmentMode: data.entertainmentMode || 'AUTO',
            deviceType: data.deviceType || null,
        },
    });

    await recalcPositions();
    return entry;
}

/**
 * Get a single queue entry by ID
 */
export async function getEntryById(id: string): Promise<QueueEntry | null> {
    return db.queueEntry.findUnique({ where: { id } });
}

/**
 * Get queue position for a specific session
 */
export async function getPositionBySession(sessionId: string) {
    const entry = await db.queueEntry.findFirst({
        where: { sessionId, status: { not: 'DONE' } },
    });
    if (!entry) return { position: null, status: null, estimatedWaitMin: null, queueLength: 0 };

    const queueLength = await db.queueEntry.count({
        where: { status: 'WAITING' },
    });

    return {
        position: entry.position,
        status: entry.status,
        estimatedWaitMin: entry.estimatedWaitMin,
        queueLength,
    };
}

/**
 * Call a patient — transition from WAITING to CALLED
 */
export async function callEntry(id: string): Promise<QueueEntry> {
    const entry = await db.queueEntry.update({
        where: { id },
        data: {
            status: 'CALLED',
            calledAt: new Date(),
        },
    });
    await recalcPositions();
    return entry;
}

/**
 * Start treatment — transition from CALLED to IN_TREATMENT
 */
export async function treatEntry(id: string): Promise<QueueEntry> {
    const entry = await db.queueEntry.update({
        where: { id },
        data: {
            status: 'IN_TREATMENT',
            treatmentStartedAt: new Date(),
        },
    });
    await recalcPositions();
    return entry;
}

/**
 * Complete treatment — transition to DONE
 */
export async function doneEntry(id: string): Promise<QueueEntry> {
    const entry = await db.queueEntry.update({
        where: { id },
        data: {
            status: 'DONE',
            completedAt: new Date(),
        },
    });
    await recalcPositions();
    return entry;
}

/**
 * Remove a queue entry entirely
 */
export async function removeEntry(id: string): Promise<void> {
    await db.queueEntry.delete({ where: { id } });
    await recalcPositions();
}

/**
 * Submit feedback rating for a completed visit
 */
export async function submitFeedback(id: string, rating: number): Promise<QueueEntry> {
    return db.queueEntry.update({
        where: { id },
        data: { feedbackRating: Math.min(5, Math.max(1, rating)) },
    });
}

/**
 * Get adaptive flow config for a session based on wait time and queue length
 */
export async function getFlowConfig(sessionId: string) {
    const entry = await db.queueEntry.findFirst({
        where: { sessionId, status: 'WAITING' },
    });

    if (!entry) {
        return { level: 0, breakFrequency: 999, breakDuration: 0, contentTypes: [], extraQuestionsEnabled: false };
    }

    const waitMin = Math.floor((Date.now() - entry.joinedAt.getTime()) / 60000);
    const queueLength = await db.queueEntry.count({ where: { status: 'WAITING' } });

    const level = getAdaptiveLevel(waitMin, queueLength);

    const configs = {
        0: { breakFrequency: 999, breakDuration: 0, contentTypes: [] as string[], extraQuestionsEnabled: false },
        1: { breakFrequency: 5, breakDuration: 15, contentTypes: ['HEALTH_TIP', 'FUN_FACT'], extraQuestionsEnabled: false },
        2: { breakFrequency: 3, breakDuration: 30, contentTypes: ['HEALTH_TIP', 'FUN_FACT', 'MINI_QUIZ', 'SEASONAL_INFO'], extraQuestionsEnabled: false },
        3: { breakFrequency: 2, breakDuration: 45, contentTypes: ['HEALTH_TIP', 'MINI_QUIZ', 'BREATHING_EXERCISE', 'PRAXIS_NEWS'], extraQuestionsEnabled: true },
    };

    return { level, ...configs[level] };
}

function getAdaptiveLevel(waitMinutes: number, queueLength: number): 0 | 1 | 2 | 3 {
    if (waitMinutes > 30 || queueLength > 15) return 3;
    if (waitMinutes > 20 || queueLength > 10) return 2;
    if (waitMinutes > 10 || queueLength > 5) return 1;
    return 0;
}

/**
 * Clean up old DONE entries (older than 24h)
 */
export async function cleanupOldEntries(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db.queueEntry.deleteMany({
        where: {
            status: 'DONE',
            completedAt: { lt: cutoff },
        },
    });
    return result.count;
}
