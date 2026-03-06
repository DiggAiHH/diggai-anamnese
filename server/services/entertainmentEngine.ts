/**
 * Entertainment Engine — Periodic content push for waiting patients.
 * Runs every 60 seconds, selects appropriate content based on wait time,
 * seen history, season, language, priority, and entertainment mode preference.
 */

const db = (globalThis as any).__prisma as any;

// Season mapping based on month
function getCurrentSeason(): string {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'SPRING';
  if (month >= 5 && month <= 7) return 'SUMMER';
  if (month >= 8 && month <= 10) return 'AUTUMN';
  return 'WINTER';
}

/**
 * Select the next piece of content for a waiting patient.
 */
async function selectNextContent(
  waitMin: number,
  seenIds: string[],
  language: string,
  entertainmentMode: string
): Promise<any | null> {
  const season = getCurrentSeason();

  // Build type filter based on entertainment mode
  let preferredTypes: string[] | undefined;
  if (entertainmentMode === 'GAMES') {
    preferredTypes = ['MINI_QUIZ', 'BREATHING_EXERCISE', 'FUN_FACT'];
  } else if (entertainmentMode === 'READING') {
    preferredTypes = ['HEALTH_TIP', 'PRAXIS_NEWS', 'SEASONAL_INFO', 'FUN_FACT'];
  } else if (entertainmentMode === 'QUIET') {
    preferredTypes = ['BREATHING_EXERCISE'];
  }
  // AUTO = all types

  const content = await db.waitingContent.findFirst({
    where: {
      AND: [
        { isActive: true },
        { language },
        { minWaitMin: { lte: waitMin } },
        { OR: [{ maxWaitMin: null }, { maxWaitMin: { gte: waitMin } }] },
        { OR: [{ seasonal: null }, { seasonal: season }] },
        ...(seenIds.length > 0 ? [{ id: { notIn: seenIds } }] : []),
        ...(preferredTypes ? [{ type: { in: preferredTypes } }] : []),
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { viewCount: 'asc' },
    ],
  });

  return content;
}

/**
 * Mark content as seen by updating the queue entry's content history.
 */
async function markContentSeen(queueEntryId: string, contentId: string): Promise<void> {
  const entry = await db.queueEntry.findUnique({ where: { id: queueEntryId } });
  if (!entry) return;

  const history: string[] = entry.contentHistory ? JSON.parse(entry.contentHistory) : [];
  history.push(contentId);

  await db.queueEntry.update({
    where: { id: queueEntryId },
    data: { contentHistory: JSON.stringify(history) },
  });

  // Increment view count
  await db.waitingContent.update({
    where: { id: contentId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => { /* content may have been deleted */ });
}

// Set of mood-check minutes already triggered per session (in-memory, resets on server restart)
const moodChecksSent = new Map<string, Set<number>>();

/**
 * Tick function — called every 60 seconds for each waiting patient.
 * Pushes content and mood-checks via Socket.IO.
 */
export async function tick(
  sessionId: string,
  io: any
): Promise<void> {
  const entry = await db.queueEntry.findFirst({
    where: { sessionId, status: 'WAITING' },
  });
  if (!entry) return;

  const waitMin = Math.floor((Date.now() - entry.joinedAt.getTime()) / 60000);
  const seenIds: string[] = entry.contentHistory ? JSON.parse(entry.contentHistory) : [];
  const language = 'de'; // Could be derived from session in future

  // Select and push content
  const content = await selectNextContent(waitMin, seenIds, language, entry.entertainmentMode || 'AUTO');
  if (content) {
    io.to(`session:${sessionId}`).emit('queue:entertainment', {
      content,
      reason: waitMin > 15 ? 'lange_wartezeit' : 'engagement',
    });
    await markContentSeen(entry.id, content.id);
  }

  // Mood-check at 10, 20, 30 minutes
  const moodMinutes = [10, 20, 30];
  if (!moodChecksSent.has(sessionId)) {
    moodChecksSent.set(sessionId, new Set());
  }
  const sent = moodChecksSent.get(sessionId)!;

  for (const minute of moodMinutes) {
    if (waitMin >= minute && !sent.has(minute)) {
      sent.add(minute);
      io.to(`session:${sessionId}`).emit('queue:mood-check', {
        question: 'Wie geht es Ihnen gerade?',
        options: ['😊 Gut', '😐 Geht so', '😟 Ungeduldig', '😰 Besorgt'],
      });
      break; // Only one mood-check per tick
    }
  }
}

/**
 * Start the entertainment engine — runs a periodic loop.
 */
let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startEntertainmentEngine(io: any): void {
  if (intervalHandle) return; // Already running

  intervalHandle = setInterval(async () => {
    try {
      // Get all currently WAITING queue entries
      const waitingEntries = await db.queueEntry.findMany({
        where: { status: 'WAITING' },
        select: { sessionId: true },
      });

      // Tick for each waiting patient
      for (const entry of waitingEntries) {
        await tick(entry.sessionId, io).catch((err: Error) => {
          console.error(`[EntertainmentEngine] Error for session ${entry.sessionId}:`, err.message);
        });
      }
    } catch (err) {
      console.error('[EntertainmentEngine] Tick error:', err);
    }
  }, 60_000); // Every 60 seconds

  console.log('[EntertainmentEngine] Started — ticking every 60s');
}

export function stopEntertainmentEngine(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    moodChecksSent.clear();
    console.log('[EntertainmentEngine] Stopped');
  }
}
