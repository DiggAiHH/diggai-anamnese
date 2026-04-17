/**
 * @module routes/episodes
 * @description API-Routen für Behandlungsepisoden.
 *
 * Autorisierung:
 *   - Episoden erstellen/lesen/aktualisieren: Arzt, MFA, Admin
 *   - Notizen (Patienten-Feedback): Patient (eigene Episode)
 *   - Präferenzen setzen: Arzt, MFA, Admin + Patient (eigene)
 *
 * Alle Routen sind Tenant-isoliert.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createEpisode,
  updateEpisode,
  getEpisodeById,
  getPatientEpisodes,
  linkSessionToEpisode,
  unlinkSessionFromEpisode,
  setPreference,
  deactivatePreference,
  addNote,
  getActiveEpisodesForPersonalization,
} from '../services/episode.service';

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────

const episodeTypeEnum = z.enum([
  'AKUT', 'CHRONISCH', 'VORSORGE', 'NACHSORGE',
  'REZEPT', 'AU', 'UEBERWEISUNG', 'BERATUNG',
]);

const episodeStatusEnum = z.enum([
  'OPEN', 'ACTIVE', 'FOLLOW_UP', 'PAUSED', 'CLOSED', 'CANCELLED',
]);

const preferenceCategoryEnum = z.enum([
  'BEHANDLUNG', 'KOMMUNIKATION', 'TERMINPLANUNG',
  'MEDIKATION', 'LEBENSSTIL', 'SONSTIGES',
]);

const noteTypeEnum = z.enum([
  'ARZT_NOTIZ', 'MFA_NOTIZ', 'PATIENT_FEEDBACK', 'SYSTEM', 'AI_SUMMARY',
]);

const createEpisodeSchema = z.object({
  patientId: z.string().uuid(),
  type: episodeTypeEnum,
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  icdCodes: z.array(z.string().max(20)).optional(),
  primaryDiagnosis: z.string().max(500).optional(),
  patientGoals: z.string().max(2000).optional(),
  patientWishes: z.string().max(2000).optional(),
  communicationPref: z.enum(['app', 'telefon', 'email', 'persoenlich']).optional(),
  languagePref: z.string().max(5).optional(),
  preferredArztId: z.string().uuid().optional(),
});

const updateEpisodeSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  status: episodeStatusEnum.optional(),
  type: episodeTypeEnum.optional(),
  icdCodes: z.array(z.string().max(20)).optional(),
  primaryDiagnosis: z.string().max(500).optional(),
  patientGoals: z.string().max(2000).optional(),
  patientWishes: z.string().max(2000).optional(),
  communicationPref: z.enum(['app', 'telefon', 'email', 'persoenlich']).optional(),
  languagePref: z.string().max(5).optional(),
  customNotes: z.string().max(5000).optional(),
  preferredArztId: z.string().uuid().optional(),
  nextAppointment: z.string().datetime().optional(),
  summaryArzt: z.string().max(5000).optional(),
});

const setPreferenceSchema = z.object({
  category: preferenceCategoryEnum,
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(2000),
  isEncrypted: z.boolean().optional(),
  validUntil: z.string().datetime().optional(),
});

const addNoteSchema = z.object({
  type: noteTypeEnum,
  content: z.string().min(1).max(10000),
  visibleToPatient: z.boolean().optional(),
});

const linkSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

// ─── Helper ─────────────────────────────────────────────────

function getTenantId(req: Request): string {
  return (req as any).tenantId || (req as any).auth?.tenantId || 'default';
}

function getUserId(req: Request): string {
  return (req as any).auth?.userId || (req as any).user?.id || '';
}

function getUserRole(req: Request): string {
  return (req as any).auth?.role || '';
}

function getRouteParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

// ═══════════════════════════════════════════════════════════════
// EPISODE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * POST / — Neue Episode erstellen
 * Rollen: arzt, mfa, admin
 */
router.post('/', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const data = createEpisodeSchema.parse(req.body);
    const tenantId = getTenantId(req);

    const episode = await createEpisode({
      tenantId,
      patientId: data.patientId,
      type: data.type,
      title: data.title,
      description: data.description,
      icdCodes: data.icdCodes,
      primaryDiagnosis: data.primaryDiagnosis,
      patientGoals: data.patientGoals,
      patientWishes: data.patientWishes,
      communicationPref: data.communicationPref,
      languagePref: data.languagePref,
      preferredArztId: data.preferredArztId,
    });

    res.status(201).json(episode);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
      return;
    }
    console.error('[Episodes] Erstellen fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Episode konnte nicht erstellt werden.' });
  }
});

/**
 * GET /patient/:patientId — Alle Episoden eines Patienten
 * Rollen: arzt, mfa, admin
 */
router.get('/patient/:patientId', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const patientId = getRouteParam(req.params.patientId);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    if (!patientId) {
      res.status(400).json({ error: 'Ungültige patientId.' });
      return;
    }

    const parsedStatus = status ? episodeStatusEnum.safeParse(status) : null;
    if (status && !parsedStatus?.success) {
      res.status(400).json({ error: 'Ungültiger Episodenstatus.' });
      return;
    }

    const episodes = await getPatientEpisodes(tenantId, patientId, {
      status: parsedStatus?.data,
    });

    res.json({ episodes });
  } catch (err: unknown) {
    console.error('[Episodes] Laden fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Episoden konnten nicht geladen werden.' });
  }
});

/**
 * GET /patient/:patientId/active — Aktive Episoden für Personalisierung
 * Wird bei Session-Erstellung abgefragt.
 * Rollen: arzt, mfa, admin, patient
 */
router.get('/patient/:patientId/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const patientId = getRouteParam(req.params.patientId);

    if (!patientId) {
      res.status(400).json({ error: 'Ungültige patientId.' });
      return;
    }

    const episodes = await getActiveEpisodesForPersonalization(tenantId, patientId);
    res.json({ episodes });
  } catch (err: unknown) {
    console.error('[Episodes] Aktive Episoden laden fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Aktive Episoden konnten nicht geladen werden.' });
  }
});

/**
 * GET /:id — Episode nach ID laden (mit Sitzungen, Präferenzen, Notizen)
 * Rollen: arzt, mfa, admin
 */
router.get('/:id', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const episodeId = getRouteParam(req.params.id);
    if (!episodeId) {
      res.status(400).json({ error: 'Ungültige episodeId.' });
      return;
    }

    const episode = await getEpisodeById(episodeId);

    if (!episode) {
      res.status(404).json({ error: 'Episode nicht gefunden.' });
      return;
    }

    res.json(episode);
  } catch (err: unknown) {
    console.error('[Episodes] Laden fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Episode konnte nicht geladen werden.' });
  }
});

/**
 * PATCH /:id — Episode aktualisieren
 * Rollen: arzt, mfa, admin
 */
router.patch('/:id', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const episodeId = getRouteParam(req.params.id);
    if (!episodeId) {
      res.status(400).json({ error: 'Ungültige episodeId.' });
      return;
    }

    const data = updateEpisodeSchema.parse(req.body);
    const episode = await updateEpisode(episodeId, {
      ...data,
      nextAppointment: data.nextAppointment ? new Date(data.nextAppointment) : undefined,
    });

    res.json(episode);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
      return;
    }
    console.error('[Episodes] Aktualisieren fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Episode konnte nicht aktualisiert werden.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SESSION ↔ EPISODE ZUORDNUNG
// ═══════════════════════════════════════════════════════════════

/**
 * POST /:id/sessions — Session einer Episode zuordnen
 * Rollen: arzt, mfa, admin
 */
router.post('/:id/sessions', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const episodeId = getRouteParam(req.params.id);
    if (!episodeId) {
      res.status(400).json({ error: 'Ungültige episodeId.' });
      return;
    }

    const { sessionId } = linkSessionSchema.parse(req.body);
    const session = await linkSessionToEpisode(sessionId, episodeId);
    res.json({ message: 'Session zugeordnet.', session });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
      return;
    }
    console.error('[Episodes] Session-Zuordnung fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Session konnte nicht zugeordnet werden.' });
  }
});

/**
 * DELETE /:id/sessions/:sessionId — Session von Episode trennen
 * Rollen: arzt, mfa, admin
 */
router.delete('/:id/sessions/:sessionId', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const sessionId = getRouteParam(req.params.sessionId);
    if (!sessionId) {
      res.status(400).json({ error: 'Ungültige sessionId.' });
      return;
    }

    await unlinkSessionFromEpisode(sessionId);
    res.json({ message: 'Session-Zuordnung aufgehoben.' });
  } catch (err: unknown) {
    console.error('[Episodes] Session-Trennung fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Session-Zuordnung konnte nicht aufgehoben werden.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PRÄFERENZEN
// ═══════════════════════════════════════════════════════════════

/**
 * POST /:id/preferences — Präferenz setzen/aktualisieren
 * Rollen: arzt, mfa, admin
 */
router.post('/:id/preferences', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const episodeId = getRouteParam(req.params.id);
    if (!episodeId) {
      res.status(400).json({ error: 'Ungültige episodeId.' });
      return;
    }

    const data = setPreferenceSchema.parse(req.body);
    const preference = await setPreference({
      episodeId,
      category: data.category,
      key: data.key,
      value: data.value,
      isEncrypted: data.isEncrypted,
      setBy: getUserRole(req),
      setByUserId: getUserId(req),
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    });

    res.status(201).json(preference);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
      return;
    }
    console.error('[Episodes] Präferenz setzen fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Präferenz konnte nicht gesetzt werden.' });
  }
});

/**
 * DELETE /:id/preferences/:preferenceId — Präferenz deaktivieren
 * Rollen: arzt, mfa, admin
 */
router.delete('/:id/preferences/:preferenceId', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const preferenceId = getRouteParam(req.params.preferenceId);
    if (!preferenceId) {
      res.status(400).json({ error: 'Ungültige preferenceId.' });
      return;
    }

    await deactivatePreference(preferenceId);
    res.json({ message: 'Präferenz deaktiviert.' });
  } catch (err: unknown) {
    console.error('[Episodes] Präferenz deaktivieren fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Präferenz konnte nicht deaktiviert werden.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// VERLAUFSNOTIZEN
// ═══════════════════════════════════════════════════════════════

/**
 * POST /:id/notes — Verlaufsnotiz hinzufügen
 * Rollen: arzt, mfa, admin
 */
router.post('/:id/notes', requireAuth, requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const episodeId = getRouteParam(req.params.id);
    if (!episodeId) {
      res.status(400).json({ error: 'Ungültige episodeId.' });
      return;
    }

    const data = addNoteSchema.parse(req.body);
    const userId = getUserId(req);

    const note = await addNote({
      episodeId,
      type: data.type,
      content: data.content,
      authorId: userId,
      authorName: (req as any).auth?.displayName,
      visibleToPatient: data.visibleToPatient,
    });

    res.status(201).json(note);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
      return;
    }
    console.error('[Episodes] Notiz hinzufügen fehlgeschlagen:', (err as Error).message);
    res.status(500).json({ error: 'Notiz konnte nicht hinzugefügt werden.' });
  }
});

export default router;
