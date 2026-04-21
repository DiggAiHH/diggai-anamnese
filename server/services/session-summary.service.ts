/**
 * @module session-summary.service
 * @description Writes a customer-visible markdown summary to EpisodeNote
 *   immediately after a session is submitted. The next session in the same
 *   episode can read the prior summaries as longitudinal context for the
 *   documentation / doctor-briefing agent.
 *
 *   Deterministic by default — no LLM required. If an LLM is configured it
 *   is still only used via the separate dokumentation agent pipeline; this
 *   service is the always-on baseline so a patient never ends a session
 *   with nothing in the portal to show for it.
 *
 * @security EpisodeNote content is encrypted at rest by episode.addNote().
 */

import { prisma } from '../db';
import { addNote } from './episode.service';
import { decrypt } from './encryption';

export interface SessionSummaryInput {
  sessionId: string;
  visibleToPatient?: boolean;
}

export interface PriorSummaryContext {
  createdAt: Date;
  markdown: string;
}

/**
 * Build the markdown summary for one session. Pure function — no DB access.
 */
export function renderSessionMarkdown(params: {
  sessionId: string;
  selectedService: string;
  createdAt: Date;
  completedAt: Date | null;
  answers: Array<{ atomId: string; value: string; answeredAt: Date }>;
  triageEvents: Array<{ level: string; message: string; triggerValues: string; createdAt: Date }>;
}): string {
  const { sessionId, selectedService, createdAt, completedAt, answers, triageEvents } = params;

  const durationMs = completedAt && createdAt
    ? new Date(completedAt).getTime() - new Date(createdAt).getTime()
    : null;
  const durationMin = durationMs ? Math.round(durationMs / 60000) : null;

  const lines: string[] = [];
  lines.push(`# Anamnese-Zusammenfassung — ${selectedService}`);
  lines.push('');
  lines.push(`- **Session:** \`${sessionId}\``);
  lines.push(`- **Datum:** ${new Date(createdAt).toISOString().slice(0, 10)}`);
  if (durationMin !== null) {
    lines.push(`- **Dauer:** ${durationMin} min`);
  }
  lines.push(`- **Beantwortete Atome:** ${answers.length}`);
  lines.push('');

  // Triage section — only if there are events
  const criticalEvents = triageEvents.filter((e) => e.level === 'CRITICAL');
  const warningEvents = triageEvents.filter((e) => e.level === 'WARNING');

  if (criticalEvents.length > 0) {
    lines.push('## Kritische Hinweise');
    for (const e of criticalEvents) {
      lines.push(`- **${e.message}** (${new Date(e.createdAt).toISOString().slice(0, 16).replace('T', ' ')})`);
    }
    lines.push('');
  }

  if (warningEvents.length > 0) {
    lines.push('## Hinweise');
    for (const e of warningEvents) {
      lines.push(`- ${e.message}`);
    }
    lines.push('');
  }

  // Answer highlights: show the first 12 non-empty answers in order
  const highlights = answers
    .map((a) => {
      let parsedValue: unknown = a.value;
      try {
        parsedValue = JSON.parse(a.value);
      } catch {
        /* value was already a primitive string */
      }
      const flat = typeof parsedValue === 'string' || typeof parsedValue === 'number' || typeof parsedValue === 'boolean'
        ? String(parsedValue)
        : Array.isArray(parsedValue)
        ? parsedValue.join(', ')
        : JSON.stringify(parsedValue);
      return { atomId: a.atomId, value: flat };
    })
    .filter((a) => a.value && a.value !== '' && a.value !== 'null' && a.value !== 'undefined')
    .slice(0, 12);

  if (highlights.length > 0) {
    lines.push('## Antworten (Auszug)');
    for (const h of highlights) {
      lines.push(`- **${h.atomId}:** ${h.value}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('_Automatisch erzeugt. Keine Diagnose. Für die Praxisdokumentation._');

  return lines.join('\n');
}

/**
 * Write an AI_SUMMARY EpisodeNote for the given session. Idempotent:
 * if a note with the same `session:<id>` marker already exists, nothing
 * new is written.
 */
export async function writeSessionSummary(input: SessionSummaryInput): Promise<{
  episodeNoteId: string | null;
  skipped: boolean;
  reason?: string;
}> {
  const session = await prisma.patientSession.findUnique({
    where: { id: input.sessionId },
    include: {
      answers: { orderBy: { answeredAt: 'asc' } },
      triageEvents: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!session) {
    return { episodeNoteId: null, skipped: true, reason: 'session_not_found' };
  }
  if (!session.episodeId) {
    return { episodeNoteId: null, skipped: true, reason: 'no_episode' };
  }

  const existingNote = await prisma.episodeNote.findFirst({
    where: { episodeId: session.episodeId, type: 'AI_SUMMARY' },
    orderBy: { createdAt: 'desc' },
  });

  if (existingNote) {
    try {
      const existingContent = decrypt(existingNote.content);
      if (existingContent.includes(`\`${input.sessionId}\``)) {
        return { episodeNoteId: existingNote.id, skipped: true, reason: 'already_exists' };
      }
    } catch {
      /* fall through and write a fresh note */
    }
  }

  const markdown = renderSessionMarkdown({
    sessionId: session.id,
    selectedService: session.selectedService,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    answers: session.answers.map((a) => ({
      atomId: a.atomId,
      value: a.value,
      answeredAt: a.answeredAt,
    })),
    triageEvents: session.triageEvents.map((e) => ({
      level: e.level,
      message: e.message,
      triggerValues: e.triggerValues,
      createdAt: e.createdAt,
    })),
  });

  const note = await addNote({
    episodeId: session.episodeId,
    type: 'AI_SUMMARY',
    content: markdown,
    authorId: 'system:session-summary',
    authorName: 'DiggAI Session-Summary',
    visibleToPatient: input.visibleToPatient ?? true,
  });

  return { episodeNoteId: note.id, skipped: false };
}

/**
 * Load the last `limit` AI_SUMMARY notes for the episode containing
 * `sessionId`. Useful as longitudinal context for the next session's
 * doctor-briefing or for the patient progress view.
 */
export async function loadPriorSummaries(
  sessionId: string,
  limit = 5,
): Promise<PriorSummaryContext[]> {
  const session = await prisma.patientSession.findUnique({
    where: { id: sessionId },
    select: { episodeId: true },
  });
  if (!session?.episodeId) return [];

  const notes = await prisma.episodeNote.findMany({
    where: { episodeId: session.episodeId, type: 'AI_SUMMARY' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return notes.map((n) => ({
    createdAt: n.createdAt,
    markdown: (() => {
      try {
        return decrypt(n.content);
      } catch {
        return n.content;
      }
    })(),
  }));
}
