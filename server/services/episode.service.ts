/**
 * @module episode.service
 * @description Behandlungsepisoden-Service — gruppiert zusammengehörige Sitzungen
 * eines Patienten zu longitudinalen Behandlungsverläufen.
 *
 * Jede Episode speichert Patientenwünsche (nur nach Absprache), Personalisierungs-
 * einstellungen und Verlaufsnotizen, damit jede weitere Sitzung auf den Patienten
 * maßgeschneidert werden kann.
 *
 * @security PII-Felder (patientGoals, patientWishes, primaryDiagnosis, customNotes,
 *   summaryArzt, EpisodeNote.content) werden mit AES-256-GCM verschlüsselt.
 */
import { prisma } from '../db';
import { encrypt, decrypt } from './encryption';
import type { EpisodeStatus, EpisodeType, PreferenceCategory, EpisodeNoteType } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────

export interface CreateEpisodeInput {
  tenantId: string;
  patientId: string;
  type: EpisodeType;
  title: string;
  description?: string;
  icdCodes?: string[];
  primaryDiagnosis?: string;
  patientGoals?: string;
  patientWishes?: string;
  communicationPref?: string;
  languagePref?: string;
  preferredArztId?: string;
}

export interface UpdateEpisodeInput {
  title?: string;
  description?: string;
  status?: EpisodeStatus;
  type?: EpisodeType;
  icdCodes?: string[];
  primaryDiagnosis?: string;
  patientGoals?: string;
  patientWishes?: string;
  communicationPref?: string;
  languagePref?: string;
  customNotes?: string;
  preferredArztId?: string;
  nextAppointment?: Date;
  summaryArzt?: string;
}

export interface AddPreferenceInput {
  episodeId: string;
  category: PreferenceCategory;
  key: string;
  value: string;
  isEncrypted?: boolean;
  setBy: string;
  setByUserId?: string;
  validUntil?: Date;
}

export interface AddNoteInput {
  episodeId: string;
  type: EpisodeNoteType;
  content: string;
  authorId?: string;
  authorName?: string;
  visibleToPatient?: boolean;
}

export interface EnsureSessionEpisodeInput {
  tenantId: string;
  sessionId: string;
  selectedService: string;
  assignedArztId?: string | null;
  createdAt?: Date;
  completedAt?: Date | null;
}

type EpisodeRecord = Record<string, unknown>;

type DecryptableEpisode = EpisodeRecord & {
  primaryDiagnosis?: string | null;
  patientGoals?: string | null;
  patientWishes?: string | null;
  customNotes?: string | null;
  summaryArzt?: string | null;
  notes?: EpisodeRecord[];
  preferences?: EpisodeRecord[];
};

// ─── Helpers ────────────────────────────────────────────────

const REUSABLE_EPISODE_STATUSES: EpisodeStatus[] = ['OPEN', 'ACTIVE', 'FOLLOW_UP', 'PAUSED'];

function encryptOptional(value: string | undefined | null): string | null {
  if (!value) return null;
  return encrypt(value);
}

function decryptOptional(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return value; // Fallback: bereits Klartext oder ungültig
  }
}

function deriveEpisodeDefaults(selectedService: string): { type: EpisodeType; title: string } {
  const normalizedService = selectedService.trim().replace(/\s+/g, ' ');
  const lowerService = normalizedService.toLowerCase();

  if (lowerService.includes('rezept') || lowerService.includes('medikation')) {
    return { type: 'REZEPT', title: 'Rezept / Medikation' };
  }

  if (lowerService.includes('au') || lowerService.includes('kranksch') || lowerService.includes('arbeitsunf')) {
    return { type: 'AU', title: 'Arbeitsunfähigkeit' };
  }

  if (lowerService.includes('überweis') || lowerService.includes('ueberweis') || lowerService.includes('referral')) {
    return { type: 'UEBERWEISUNG', title: 'Überweisung / Weiterbehandlung' };
  }

  if (lowerService.includes('vorsorge') || lowerService.includes('check-up') || lowerService.includes('checkup') || lowerService.includes('screening')) {
    return { type: 'VORSORGE', title: normalizedService || 'Vorsorge' };
  }

  if (lowerService.includes('nachsorge') || lowerService.includes('follow-up') || lowerService.includes('follow up') || lowerService.includes('kontrolle')) {
    return { type: 'NACHSORGE', title: normalizedService || 'Nachsorge' };
  }

  if (
    lowerService.includes('chron') ||
    lowerService.includes('diabet') ||
    lowerService.includes('hyperton') ||
    lowerService.includes('dialys') ||
    lowerService.includes('nephro') ||
    lowerService.includes('niere')
  ) {
    return { type: 'CHRONISCH', title: normalizedService || 'Chronische Betreuung' };
  }

  if (
    lowerService.includes('akut') ||
    lowerService.includes('notfall') ||
    lowerService.includes('schmerz') ||
    lowerService.includes('infekt') ||
    lowerService.includes('fieber')
  ) {
    return { type: 'AKUT', title: normalizedService || 'Akutbehandlung' };
  }

  if (lowerService.includes('anamnese') || lowerService.includes('termin') || lowerService === 'general') {
    return { type: 'BERATUNG', title: 'Anamnese / Beratung' };
  }

  return {
    type: 'BERATUNG',
    title: normalizedService || 'Beratung / Betreuung',
  };
}

// ─── Service Functions ──────────────────────────────────────

/**
 * Neue Episode erstellen.
 * PII-Felder werden vor dem Speichern verschlüsselt.
 */
export async function createEpisode(input: CreateEpisodeInput) {
  const episode = await prisma.episode.create({
    data: {
      tenantId: input.tenantId,
      patientId: input.patientId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      icdCodes: input.icdCodes ?? [],
      primaryDiagnosis: encryptOptional(input.primaryDiagnosis),
      patientGoals: encryptOptional(input.patientGoals),
      patientWishes: encryptOptional(input.patientWishes),
      communicationPref: input.communicationPref ?? null,
      languagePref: input.languagePref ?? null,
      preferredArztId: input.preferredArztId ?? null,
    },
    include: { sessions: true, preferences: true, notes: true },
  });

  return decryptEpisode(episode);
}

/**
 * Episode aktualisieren.
 * Verschlüsselt PII-Felder und aktualisiert lastActivityAt.
 */
export async function updateEpisode(episodeId: string, input: UpdateEpisodeInput) {
  const data: Record<string, unknown> = {
    lastActivityAt: new Date(),
  };

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'CLOSED' || input.status === 'CANCELLED') {
      data.closedAt = new Date();
    }
  }
  if (input.type !== undefined) data.type = input.type;
  if (input.icdCodes !== undefined) data.icdCodes = input.icdCodes;
  if (input.primaryDiagnosis !== undefined) data.primaryDiagnosis = encryptOptional(input.primaryDiagnosis);
  if (input.patientGoals !== undefined) data.patientGoals = encryptOptional(input.patientGoals);
  if (input.patientWishes !== undefined) data.patientWishes = encryptOptional(input.patientWishes);
  if (input.communicationPref !== undefined) data.communicationPref = input.communicationPref;
  if (input.languagePref !== undefined) data.languagePref = input.languagePref;
  if (input.customNotes !== undefined) data.customNotes = encryptOptional(input.customNotes);
  if (input.preferredArztId !== undefined) data.preferredArztId = input.preferredArztId;
  if (input.nextAppointment !== undefined) data.nextAppointment = input.nextAppointment;
  if (input.summaryArzt !== undefined) data.summaryArzt = encryptOptional(input.summaryArzt);

  const episode = await prisma.episode.update({
    where: { id: episodeId },
    data,
    include: {
      sessions: { orderBy: { createdAt: 'desc' } },
      preferences: { where: { isActive: true } },
      notes: { orderBy: { createdAt: 'desc' } },
    },
  });

  return decryptEpisode(episode);
}

/**
 * Episode anhand ID laden (mit allen Sitzungen, Präferenzen, Notizen).
 */
export async function getEpisodeById(episodeId: string) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' },
        include: {
          answers: { select: { atomId: true, answeredAt: true } },
          triageEvents: { select: { level: true, message: true, createdAt: true } },
        },
      },
      preferences: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
      preferredArzt: { select: { id: true, displayName: true, role: true } },
    },
  });

  if (!episode) return null;
  return decryptEpisode(episode);
}

/**
 * Alle Episoden eines Patienten laden (für Arzt-Dashboard / Patientenakte).
 */
export async function getPatientEpisodes(
  tenantId: string,
  patientId: string,
  options?: { status?: EpisodeStatus; includeClosedOlderThanDays?: number }
) {
  const where: Record<string, unknown> = {
    tenantId,
    patientId,
  };

  if (options?.status) {
    where.status = options.status;
  }

  const episodes = await prisma.episode.findMany({
    where,
    orderBy: { lastActivityAt: 'desc' },
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 5, // Letzte 5 Sitzungen pro Episode
        select: {
          id: true,
          status: true,
          selectedService: true,
          createdAt: true,
          completedAt: true,
        },
      },
      preferences: { where: { isActive: true } },
      _count: { select: { sessions: true, notes: true } },
    },
  });

  return episodes.map(decryptEpisode);
}

/**
 * Stellt sicher, dass eine Patientensitzung in einer Behandlungsepisode landet.
 * Bereits verknüpfte Sessions behalten ihre Episode, ansonsten wird eine passende
 * offene Episode wiederverwendet oder eine neue erzeugt.
 */
export async function ensureSessionStoredInEpisode(input: EnsureSessionEpisodeInput) {
  const activityAt = input.completedAt ?? input.createdAt ?? new Date();
  const defaults = deriveEpisodeDefaults(input.selectedService);

  return prisma.$transaction(async (tx) => {
    const session = await tx.patientSession.findUnique({
      where: { id: input.sessionId },
      select: {
        episodeId: true,
        patientId: true,
      },
    });

    if (!session?.patientId) {
      return null;
    }

    if (session.episodeId) {
      await tx.episode.update({
        where: { id: session.episodeId },
        data: {
          lastActivityAt: activityAt,
          ...(input.completedAt ? { status: 'ACTIVE' } : {}),
        },
      });
      return session.episodeId;
    }

    const reusableEpisode = await tx.episode.findFirst({
      where: {
        tenantId: input.tenantId,
        patientId: session.patientId,
        type: defaults.type,
        title: defaults.title,
        status: { in: REUSABLE_EPISODE_STATUSES },
      },
      orderBy: [{ lastActivityAt: 'desc' }, { openedAt: 'desc' }],
      select: {
        id: true,
        status: true,
      },
    });

    let episodeId = reusableEpisode?.id;

    if (episodeId) {
      await tx.episode.update({
        where: { id: episodeId },
        data: {
          lastActivityAt: activityAt,
          ...(reusableEpisode && input.completedAt && reusableEpisode.status === 'OPEN' ? { status: 'ACTIVE' } : {}),
        },
      });
    } else {
      const createdEpisode = await tx.episode.create({
        data: {
          tenantId: input.tenantId,
          patientId: session.patientId,
          type: defaults.type,
          status: input.completedAt ? 'ACTIVE' : 'OPEN',
          title: defaults.title,
          preferredArztId: input.assignedArztId ?? null,
          lastActivityAt: activityAt,
        },
        select: { id: true },
      });
      episodeId = createdEpisode.id;
    }

    await tx.patientSession.update({
      where: { id: input.sessionId },
      data: { episodeId },
    });

    return episodeId;
  });
}

/**
 * Session einer Episode zuordnen.
 * Aktualisiert gleichzeitig lastActivityAt der Episode.
 */
export async function linkSessionToEpisode(sessionId: string, episodeId: string) {
  const [session] = await prisma.$transaction([
    prisma.patientSession.update({
      where: { id: sessionId },
      data: { episodeId },
    }),
    prisma.episode.update({
      where: { id: episodeId },
      data: { lastActivityAt: new Date() },
    }),
  ]);

  return session;
}

/**
 * Session von Episode trennen.
 */
export async function unlinkSessionFromEpisode(sessionId: string) {
  return prisma.patientSession.update({
    where: { id: sessionId },
    data: { episodeId: null },
  });
}

/**
 * Präferenz einer Episode hinzufügen / aktualisieren.
 */
export async function setPreference(input: AddPreferenceInput) {
  const value = input.isEncrypted ? encrypt(input.value) : input.value;

  return prisma.episodePreference.upsert({
    where: {
      episodeId_category_key: {
        episodeId: input.episodeId,
        category: input.category,
        key: input.key,
      },
    },
    create: {
      episodeId: input.episodeId,
      category: input.category,
      key: input.key,
      value,
      isEncrypted: input.isEncrypted ?? false,
      setBy: input.setBy,
      setByUserId: input.setByUserId ?? null,
      validUntil: input.validUntil ?? null,
    },
    update: {
      value,
      isEncrypted: input.isEncrypted ?? false,
      setBy: input.setBy,
      setByUserId: input.setByUserId ?? null,
      validUntil: input.validUntil ?? null,
      isActive: true,
    },
  });
}

/**
 * Präferenz deaktivieren.
 */
export async function deactivatePreference(preferenceId: string) {
  return prisma.episodePreference.update({
    where: { id: preferenceId },
    data: { isActive: false },
  });
}

/**
 * Verlaufsnotiz zur Episode hinzufügen.
 * Inhalt wird immer verschlüsselt gespeichert.
 */
export async function addNote(input: AddNoteInput) {
  const note = await prisma.episodeNote.create({
    data: {
      episodeId: input.episodeId,
      type: input.type,
      content: encrypt(input.content),
      authorId: input.authorId ?? null,
      authorName: input.authorName ? encrypt(input.authorName) : null,
      visibleToPatient: input.visibleToPatient ?? false,
    },
  });

  // Aktualisiere lastActivityAt
  await prisma.episode.update({
    where: { id: input.episodeId },
    data: { lastActivityAt: new Date() },
  });

  return {
    ...note,
    content: input.content, // Rückgabe als Klartext
    authorName: input.authorName ?? null,
  };
}

/**
 * Alle offenen/aktiven Episoden eines Patienten für die Personalisierung.
 * Wird beim Erstellen einer neuen Session abgefragt, damit der Fragebogen
 * auf Basis vorheriger Episoden angepasst werden kann.
 */
export async function getActiveEpisodesForPersonalization(tenantId: string, patientId: string) {
  const episodes = await prisma.episode.findMany({
    where: {
      tenantId,
      patientId,
      status: { in: ['OPEN', 'ACTIVE', 'FOLLOW_UP'] },
    },
    orderBy: { lastActivityAt: 'desc' },
    include: {
      preferences: { where: { isActive: true } },
    },
  });

  return episodes.map(ep => ({
    id: ep.id,
    type: ep.type,
    status: ep.status,
    title: ep.title,
    communicationPref: ep.communicationPref,
    languagePref: ep.languagePref,
    preferredArztId: ep.preferredArztId,
    patientGoals: decryptOptional(ep.patientGoals),
    patientWishes: decryptOptional(ep.patientWishes),
    preferences: ep.preferences.map(p => ({
      category: p.category,
      key: p.key,
      value: p.isEncrypted ? decryptOptional(p.value) : p.value,
    })),
  }));
}

// ─── Decrypt Helper ─────────────────────────────────────────

/**
 * Entschlüsselt alle PII-Felder einer Episode für die API-Ausgabe.
 */
function decryptEpisode<T extends DecryptableEpisode>(episode: T): T {
  const result: DecryptableEpisode = { ...episode };

  if (typeof result.primaryDiagnosis === 'string') {
    result.primaryDiagnosis = decryptOptional(result.primaryDiagnosis as string);
  }
  if (typeof result.patientGoals === 'string') {
    result.patientGoals = decryptOptional(result.patientGoals as string);
  }
  if (typeof result.patientWishes === 'string') {
    result.patientWishes = decryptOptional(result.patientWishes as string);
  }
  if (typeof result.customNotes === 'string') {
    result.customNotes = decryptOptional(result.customNotes as string);
  }
  if (typeof result.summaryArzt === 'string') {
    result.summaryArzt = decryptOptional(result.summaryArzt as string);
  }

  // Entschlüssele eingebettete Notizen
  if (Array.isArray(result.notes)) {
    result.notes = (result.notes as EpisodeRecord[]).map(note => ({
      ...note,
      content: decryptOptional(note.content as string),
      authorName: decryptOptional(note.authorName as string | null),
    }));
  }

  // Entschlüssele verschlüsselte Präferenzen
  if (Array.isArray(result.preferences)) {
    result.preferences = (result.preferences as EpisodeRecord[]).map(pref => ({
      ...pref,
      value: pref.isEncrypted ? decryptOptional(pref.value as string) : pref.value,
    }));
  }

  return result as T;
}
