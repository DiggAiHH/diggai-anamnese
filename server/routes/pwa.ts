// ============================================
// PWA Patient Portal Routes — /api/pwa/*
// ~36 Endpunkte: Auth, Dashboard, Diary, Measures,
//   Messages, Consents, Devices, Settings, Sync, Profile
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  registerPatient,
  loginPatient,
  loginWithPin,
  verifyToken,
  refreshToken,
  syncOfflineData,
  getChangesSince,
} from '../services/pwa';
import type { PwaJwtPayload } from '../services/pwa';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────

function getPrisma(req: Request) {
  return (req as any).prisma || (globalThis as any).__prisma;
}

function getAccountId(req: Request): string {
  return (req as any).user?.accountId || '';
}

// ─── Patient Auth Middleware ────────────────────────────────

async function requirePatientAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentifizierung erforderlich.' });
    }

    const token = header.slice(7);
    const payload: PwaJwtPayload = verifyToken(token);

    (req as any).user = {
      accountId: payload.accountId,
      patientId: payload.patientId,
      role: 'patient_portal',
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen.' });
  }
}

// ─── Zod Schemas ────────────────────────────────────────────

const registerSchema = z.object({
  patientNumber: z.string().min(1),
  birthDate: z.string().min(1),
  password: z.string().min(8),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  pin: z.string().min(4).max(8).optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const pinLoginSchema = z.object({
  patientId: z.string().uuid(),
  pin: z.string().min(4).max(8),
});

const diaryCreateSchema = z.object({
  date: z.string().optional(),
  mood: z.enum(['VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD']).optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  sleepQuality: z.number().int().min(0).max(10).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  vitalBp: z.string().optional(),
  vitalPulse: z.number().optional(),
  vitalTemp: z.number().optional(),
  vitalWeight: z.number().optional(),
  vitalBloodSugar: z.number().optional(),
  offlineCreated: z.boolean().optional(),
});

const diaryUpdateSchema = z.object({
  mood: z.enum(['VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD']).optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  sleepQuality: z.number().int().min(0).max(10).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  vitalBp: z.string().optional(),
  vitalPulse: z.number().optional(),
  vitalTemp: z.number().optional(),
  vitalWeight: z.number().optional(),
  vitalBloodSugar: z.number().optional(),
});

const measureTrackingCreateSchema = z.object({
  measureId: z.string().uuid(),
  scheduledDate: z.string().min(1),
  completedDate: z.string().optional(),
  dose: z.string().optional(),
  notes: z.string().optional(),
  sideEffects: z.array(z.string()).optional(),
  offlineCreated: z.boolean().optional(),
});

const measureTrackingUpdateSchema = z.object({
  completedDate: z.string().optional(),
  dose: z.string().optional(),
  notes: z.string().optional(),
  sideEffects: z.array(z.string()).optional(),
});

const measureCompleteSchema = z.object({
  dose: z.string().optional(),
  notes: z.string().optional(),
});

const measureSkipSchema = z.object({
  reason: z.string().min(1),
});

const messageCreateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1),
});

const consentUpdateSchema = z.array(z.object({
  type: z.enum([
    'DATA_PROCESSING',
    'EMERGENCY_CONTACT',
    'MEDICATION_REMINDER',
    'PUSH_NOTIFICATIONS',
    'DATA_SHARING',
  ]),
  granted: z.boolean(),
}));

const deviceRegisterSchema = z.object({
  deviceName: z.string().min(1),
  deviceType: z.enum(['ios', 'android', 'web']),
  pushToken: z.string().optional(),
  userAgent: z.string().optional(),
});

const settingsUpdateSchema = z.object({
  locale: z.string().optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  notifySms: z.boolean().optional(),
});

const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const pinChangeSchema = z.object({
  pin: z.string().min(4).max(8),
});

const syncPayloadSchema = z.object({
  diaryEntries: z.array(z.object({
    date: z.string().optional(),
    mood: z.enum(['VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD']).optional(),
    painLevel: z.number().optional(),
    sleepQuality: z.number().optional(),
    sleepHours: z.number().optional(),
    symptoms: z.array(z.string()).optional(),
    notes: z.string().optional(),
    vitals: z.object({
      bp: z.string().optional(),
      pulse: z.number().optional(),
      temp: z.number().optional(),
      weight: z.number().optional(),
      bloodSugar: z.number().optional(),
    }).optional(),
    offlineCreated: z.boolean().optional(),
  })).default([]),
  measureTrackings: z.array(z.object({
    measureId: z.string().uuid(),
    scheduledDate: z.string(),
    completedDate: z.string().optional(),
    dose: z.string().optional(),
    notes: z.string().optional(),
    sideEffects: z.array(z.string()).optional(),
    offlineCreated: z.boolean().optional(),
  })).default([]),
  lastSyncAt: z.string(),
});


// ═══════════════════════════════════════════════════════════════
// 1. AUTH (public — no auth required)
// ═══════════════════════════════════════════════════════════════

// POST /auth/register — Patientenkonto registrieren
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const account = await registerPatient(data);
    res.status(201).json(account);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    if (err?.message) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Registrierung fehlgeschlagen.' });
  }
});

// POST /auth/login — Login mit E-Mail/Telefon + Passwort
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginPatient(data);
    res.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    if (err?.message) return res.status(401).json({ error: err.message });
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen.' });
  }
});

// POST /auth/pin-login — Schnell-Login mit PIN
router.post('/auth/pin-login', async (req: Request, res: Response) => {
  try {
    const data = pinLoginSchema.parse(req.body);
    const result = await loginWithPin(data.patientId, data.pin);
    res.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    if (err?.message) return res.status(401).json({ error: err.message });
    res.status(500).json({ error: 'PIN-Anmeldung fehlgeschlagen.' });
  }
});

// POST /auth/refresh — Token erneuern
router.post('/auth/refresh', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    const result = await refreshToken(accountId);
    res.json(result);
  } catch (err: any) {
    if (err?.message) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Token-Erneuerung fehlgeschlagen.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 2. DASHBOARD
// ═══════════════════════════════════════════════════════════════

// GET /dashboard — Patient Dashboard
router.get('/dashboard', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);
    const patientId = (req as any).user?.patientId || '';

    // Load account with patient
    const account = await prisma.patientAccount.findUnique({
      where: { id: accountId },
      include: { patient: true },
    });

    if (!account) return res.status(404).json({ error: 'Konto nicht gefunden.' });

    // Active therapy measures count
    const activeMeasures = await prisma.therapyMeasure.count({
      where: {
        plan: {
          patientId,
          status: 'ACTIVE',
        },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
    });

    // Unread messages count
    const unreadMessages = await prisma.patientMessage.count({
      where: {
        accountId,
        isRead: false,
      },
    });

    // Last 5 diary entries
    const recentDiary = await prisma.diaryEntry.findMany({
      where: { accountId },
      orderBy: { date: 'desc' },
      take: 5,
    });

    // Recent alerts (unresolved therapy alerts for patient)
    const alertRecords = await prisma.therapyAlert.findMany({
      where: {
        plan: { patientId },
        resolvedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { message: true },
    });
    const alerts = alertRecords.map((a: any) => a.message);

    res.json({
      nextAppointment: null, // TODO: integrate appointment model when available
      activeMeasures,
      unreadMessages,
      recentDiary,
      alerts,
    });
  } catch (err: any) {
    console.error('[pwa] dashboard error:', err);
    res.status(500).json({ error: 'Dashboard konnte nicht geladen werden.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 3. DIARY
// ═══════════════════════════════════════════════════════════════

// GET /diary — Tagebuch-Einträge (paginiert)
router.get('/diary', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { accountId };
    if (req.query.from) where.date = { ...where.date, gte: new Date(req.query.from as string) };
    if (req.query.to) where.date = { ...where.date, lte: new Date(req.query.to as string) };

    const [entries, total] = await Promise.all([
      prisma.diaryEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.diaryEntry.count({ where }),
    ]);

    res.json({ entries, total, page, limit });
  } catch (err: any) {
    console.error('[pwa] diary list error:', err);
    res.status(500).json({ error: 'Tagebuch konnte nicht geladen werden.' });
  }
});

// GET /diary/:id — Einzelner Eintrag
router.get('/diary/:id', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);
    const entry = await prisma.diaryEntry.findFirst({
      where: { id: req.params.id, accountId },
    });
    if (!entry) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
    res.json(entry);
  } catch (err: any) {
    console.error('[pwa] diary get error:', err);
    res.status(500).json({ error: 'Eintrag konnte nicht geladen werden.' });
  }
});

// POST /diary — Neuen Eintrag erstellen
router.post('/diary', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = diaryCreateSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);
    const patientId = (req as any).user?.patientId || '';

    const entry = await prisma.diaryEntry.create({
      data: {
        accountId,
        patientId,
        date: data.date ? new Date(data.date) : new Date(),
        mood: data.mood ?? null,
        painLevel: data.painLevel ?? null,
        sleepQuality: data.sleepQuality ?? null,
        sleepHours: data.sleepHours ?? null,
        symptoms: data.symptoms ?? [],
        notes: data.notes ?? null,
        vitalBp: data.vitalBp ?? null,
        vitalPulse: data.vitalPulse ?? null,
        vitalTemp: data.vitalTemp ?? null,
        vitalWeight: data.vitalWeight ?? null,
        vitalBloodSugar: data.vitalBloodSugar ?? null,
        offlineCreated: data.offlineCreated ?? false,
      },
    });

    res.status(201).json(entry);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] diary create error:', err);
    res.status(500).json({ error: 'Eintrag konnte nicht erstellt werden.' });
  }
});

// PUT /diary/:id — Eintrag aktualisieren
router.put('/diary/:id', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = diaryUpdateSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    // Verify ownership
    const existing = await prisma.diaryEntry.findFirst({
      where: { id: req.params.id, accountId },
    });
    if (!existing) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });

    const entry = await prisma.diaryEntry.update({
      where: { id: req.params.id },
      data: {
        mood: data.mood !== undefined ? data.mood : undefined,
        painLevel: data.painLevel !== undefined ? data.painLevel : undefined,
        sleepQuality: data.sleepQuality !== undefined ? data.sleepQuality : undefined,
        sleepHours: data.sleepHours !== undefined ? data.sleepHours : undefined,
        symptoms: data.symptoms !== undefined ? data.symptoms : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        vitalBp: data.vitalBp !== undefined ? data.vitalBp : undefined,
        vitalPulse: data.vitalPulse !== undefined ? data.vitalPulse : undefined,
        vitalTemp: data.vitalTemp !== undefined ? data.vitalTemp : undefined,
        vitalWeight: data.vitalWeight !== undefined ? data.vitalWeight : undefined,
        vitalBloodSugar: data.vitalBloodSugar !== undefined ? data.vitalBloodSugar : undefined,
      },
    });

    res.json(entry);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] diary update error:', err);
    res.status(500).json({ error: 'Eintrag konnte nicht aktualisiert werden.' });
  }
});

// DELETE /diary/:id — Eintrag löschen
router.delete('/diary/:id', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    // Verify ownership
    const existing = await prisma.diaryEntry.findFirst({
      where: { id: req.params.id, accountId },
    });
    if (!existing) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });

    await prisma.diaryEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[pwa] diary delete error:', err);
    res.status(500).json({ error: 'Eintrag konnte nicht gelöscht werden.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 4. MEASURE TRACKING
// ═══════════════════════════════════════════════════════════════

// GET /measures — Aktive Maßnahmen für Patient
router.get('/measures', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const patientId = (req as any).user?.patientId || '';

    const measures = await prisma.therapyMeasure.findMany({
      where: {
        plan: {
          patientId,
          status: 'ACTIVE',
        },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      include: {
        plan: { select: { id: true, title: true, status: true } },
      },
      orderBy: { priority: 'asc' },
    });

    res.json(measures);
  } catch (err: any) {
    console.error('[pwa] measures list error:', err);
    res.status(500).json({ error: 'Maßnahmen konnten nicht geladen werden.' });
  }
});

// GET /measures/tracking — MeasureTracking-Liste (paginiert)
router.get('/measures/tracking', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { accountId };
    if (req.query.measureId) where.measureId = req.query.measureId as string;

    const [trackings, total] = await Promise.all([
      prisma.measureTracking.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
        include: {
          measure: { select: { id: true, title: true, type: true, dosage: true } },
        },
      }),
      prisma.measureTracking.count({ where }),
    ]);

    res.json({ trackings, total, page, limit });
  } catch (err: any) {
    console.error('[pwa] tracking list error:', err);
    res.status(500).json({ error: 'Trackings konnten nicht geladen werden.' });
  }
});

// POST /measures/tracking — Tracking erstellen
router.post('/measures/tracking', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = measureTrackingCreateSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const tracking = await prisma.measureTracking.create({
      data: {
        accountId,
        measureId: data.measureId,
        scheduledDate: new Date(data.scheduledDate),
        completedDate: data.completedDate ? new Date(data.completedDate) : null,
        dose: data.dose ?? null,
        notes: data.notes ?? null,
        sideEffects: data.sideEffects ?? [],
        offlineCreated: data.offlineCreated ?? false,
      },
    });

    res.status(201).json(tracking);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] tracking create error:', err);
    res.status(500).json({ error: 'Tracking konnte nicht erstellt werden.' });
  }
});

// PUT /measures/tracking/:id — Tracking aktualisieren
router.put('/measures/tracking/:id', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = measureTrackingUpdateSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    // Verify ownership
    const existing = await prisma.measureTracking.findFirst({
      where: { id: req.params.id, accountId },
    });
    if (!existing) return res.status(404).json({ error: 'Tracking nicht gefunden.' });

    const tracking = await prisma.measureTracking.update({
      where: { id: req.params.id },
      data: {
        completedDate: data.completedDate !== undefined ? (data.completedDate ? new Date(data.completedDate) : null) : undefined,
        dose: data.dose !== undefined ? data.dose : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        sideEffects: data.sideEffects !== undefined ? data.sideEffects : undefined,
      },
    });

    res.json(tracking);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] tracking update error:', err);
    res.status(500).json({ error: 'Tracking konnte nicht aktualisiert werden.' });
  }
});

// POST /measures/:id/complete — Schnell-Abschluss einer Maßnahme
router.post('/measures/:id/complete', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = measureCompleteSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const tracking = await prisma.measureTracking.create({
      data: {
        accountId,
        measureId: req.params.id,
        scheduledDate: new Date(),
        completedDate: new Date(),
        dose: data.dose ?? null,
        notes: data.notes ?? null,
        sideEffects: [],
        offlineCreated: false,
      },
    });

    res.status(201).json(tracking);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] measure complete error:', err);
    res.status(500).json({ error: 'Maßnahme konnte nicht abgeschlossen werden.' });
  }
});

// POST /measures/:id/skip — Maßnahme überspringen
router.post('/measures/:id/skip', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = measureSkipSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const tracking = await prisma.measureTracking.create({
      data: {
        accountId,
        measureId: req.params.id,
        scheduledDate: new Date(),
        skippedDate: new Date(),
        skippedReason: data.reason,
        sideEffects: [],
        offlineCreated: false,
      },
    });

    res.status(201).json(tracking);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] measure skip error:', err);
    res.status(500).json({ error: 'Maßnahme konnte nicht übersprungen werden.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 5. MESSAGES
// ═══════════════════════════════════════════════════════════════

// GET /messages — Nachrichten-Liste (paginiert)
router.get('/messages', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.patientMessage.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patientMessage.count({ where: { accountId } }),
    ]);

    res.json({ messages, total, page, limit });
  } catch (err: any) {
    console.error('[pwa] messages list error:', err);
    res.status(500).json({ error: 'Nachrichten konnten nicht geladen werden.' });
  }
});

// GET /messages/unread-count — Ungelesene Nachrichten zählen
router.get('/messages/unread-count', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const count = await prisma.patientMessage.count({
      where: { accountId, isRead: false },
    });

    res.json({ count });
  } catch (err: any) {
    console.error('[pwa] unread count error:', err);
    res.status(500).json({ error: 'Zählung fehlgeschlagen.' });
  }
});

// GET /messages/:id — Einzelne Nachricht (als gelesen markieren)
router.get('/messages/:id', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const message = await prisma.patientMessage.findFirst({
      where: { id: req.params.id, accountId },
    });
    if (!message) return res.status(404).json({ error: 'Nachricht nicht gefunden.' });

    // Mark as read if currently unread
    if (!message.isRead) {
      await prisma.patientMessage.update({
        where: { id: message.id },
        data: { isRead: true, readAt: new Date() },
      });
      message.isRead = true;
      message.readAt = new Date();
    }

    res.json(message);
  } catch (err: any) {
    console.error('[pwa] message get error:', err);
    res.status(500).json({ error: 'Nachricht konnte nicht geladen werden.' });
  }
});

// POST /messages — Nachricht senden
router.post('/messages', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = messageCreateSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);
    const patientId = (req as any).user?.patientId || '';

    const message = await prisma.patientMessage.create({
      data: {
        accountId,
        patientId,
        direction: 'PATIENT_TO_PROVIDER',
        subject: data.subject ?? null,
        body: data.body,
        senderName: null,
        senderRole: 'patient',
        isRead: false,
      },
    });

    res.status(201).json(message);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] message create error:', err);
    res.status(500).json({ error: 'Nachricht konnte nicht gesendet werden.' });
  }
});

// PUT /messages/:id/read — Nachricht als gelesen markieren
router.put('/messages/:id/read', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const existing = await prisma.patientMessage.findFirst({
      where: { id: req.params.id, accountId },
    });
    if (!existing) return res.status(404).json({ error: 'Nachricht nicht gefunden.' });

    const message = await prisma.patientMessage.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json(message);
  } catch (err: any) {
    console.error('[pwa] message read error:', err);
    res.status(500).json({ error: 'Nachricht konnte nicht aktualisiert werden.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 6. CONSENTS
// ═══════════════════════════════════════════════════════════════

// GET /consents — Alle Einwilligungen abrufen
router.get('/consents', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const consents = await prisma.patientConsent.findMany({
      where: { accountId },
      orderBy: { type: 'asc' },
    });

    res.json(consents);
  } catch (err: any) {
    console.error('[pwa] consents list error:', err);
    res.status(500).json({ error: 'Einwilligungen konnten nicht geladen werden.' });
  }
});

// PUT /consents — Einwilligungen aktualisieren
router.put('/consents', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const updates = consentUpdateSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);
    const now = new Date();

    const results = [];
    for (const update of updates) {
      const consent = await prisma.patientConsent.upsert({
        where: {
          accountId_type: { accountId, type: update.type },
        },
        update: {
          granted: update.granted,
          grantedAt: update.granted ? now : undefined,
          revokedAt: !update.granted ? now : undefined,
        },
        create: {
          accountId,
          type: update.type,
          granted: update.granted,
          grantedAt: update.granted ? now : null,
          revokedAt: !update.granted ? now : null,
        },
      });
      results.push(consent);
    }

    res.json(results);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] consents update error:', err);
    res.status(500).json({ error: 'Einwilligungen konnten nicht aktualisiert werden.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 7. DEVICES
// ═══════════════════════════════════════════════════════════════

// GET /devices — Geräte-Liste
router.get('/devices', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const devices = await prisma.patientDevice.findMany({
      where: { accountId },
      orderBy: { lastSeenAt: 'desc' },
    });

    res.json(devices);
  } catch (err: any) {
    console.error('[pwa] devices list error:', err);
    res.status(500).json({ error: 'Geräte konnten nicht geladen werden.' });
  }
});

// POST /devices — Gerät registrieren
router.post('/devices', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = deviceRegisterSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const device = await prisma.patientDevice.create({
      data: {
        accountId,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        pushToken: data.pushToken ?? null,
        userAgent: data.userAgent ?? null,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });

    res.status(201).json(device);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] device register error:', err);
    res.status(500).json({ error: 'Gerät konnte nicht registriert werden.' });
  }
});

// DELETE /devices/:id — Gerät entfernen
router.delete('/devices/:id', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    // Verify ownership
    const existing = await prisma.patientDevice.findFirst({
      where: { id: req.params.id, accountId },
    });
    if (!existing) return res.status(404).json({ error: 'Gerät nicht gefunden.' });

    await prisma.patientDevice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[pwa] device delete error:', err);
    res.status(500).json({ error: 'Gerät konnte nicht entfernt werden.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 8. SETTINGS
// ═══════════════════════════════════════════════════════════════

// GET /settings — Kontoeinstellungen abrufen
router.get('/settings', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const account = await prisma.patientAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        locale: true,
        notifyEmail: true,
        notifyPush: true,
        notifySms: true,
      },
    });

    if (!account) return res.status(404).json({ error: 'Konto nicht gefunden.' });
    res.json(account);
  } catch (err: any) {
    console.error('[pwa] settings get error:', err);
    res.status(500).json({ error: 'Einstellungen konnten nicht geladen werden.' });
  }
});

// PUT /settings — Einstellungen aktualisieren
router.put('/settings', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = settingsUpdateSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const account = await prisma.patientAccount.update({
      where: { id: accountId },
      data: {
        locale: data.locale !== undefined ? data.locale : undefined,
        notifyEmail: data.notifyEmail !== undefined ? data.notifyEmail : undefined,
        notifyPush: data.notifyPush !== undefined ? data.notifyPush : undefined,
        notifySms: data.notifySms !== undefined ? data.notifySms : undefined,
      },
      select: {
        id: true,
        locale: true,
        notifyEmail: true,
        notifyPush: true,
        notifySms: true,
      },
    });

    res.json(account);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] settings update error:', err);
    res.status(500).json({ error: 'Einstellungen konnten nicht aktualisiert werden.' });
  }
});

// PUT /settings/password — Passwort ändern
router.put('/settings/password', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = passwordChangeSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const account = await prisma.patientAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) return res.status(404).json({ error: 'Konto nicht gefunden.' });

    // Verify old password
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(data.oldPassword, account.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Altes Passwort ist falsch.' });

    // Hash new password
    const newHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.patientAccount.update({
      where: { id: accountId },
      data: { passwordHash: newHash },
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] password change error:', err);
    res.status(500).json({ error: 'Passwort konnte nicht geändert werden.' });
  }
});

// PUT /settings/pin — PIN setzen/ändern
router.put('/settings/pin', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const data = pinChangeSchema.parse(req.body);
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const bcrypt = await import('bcryptjs');
    const pinHash = await bcrypt.hash(data.pin, 12);

    await prisma.patientAccount.update({
      where: { id: accountId },
      data: { pinHash },
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] pin change error:', err);
    res.status(500).json({ error: 'PIN konnte nicht geändert werden.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 9. SYNC
// ═══════════════════════════════════════════════════════════════

// POST /sync — Offline-Daten synchronisieren
router.post('/sync', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const payload = syncPayloadSchema.parse(req.body);
    const accountId = getAccountId(req);

    const result = await syncOfflineData(accountId, payload);
    res.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validierungsfehler', details: err.issues });
    console.error('[pwa] sync error:', err);
    res.status(500).json({ error: 'Synchronisation fehlgeschlagen.' });
  }
});

// GET /sync/changes — Änderungen seit Timestamp abrufen
router.get('/sync/changes', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    const since = req.query.since as string;

    if (!since) return res.status(400).json({ error: 'Parameter "since" ist erforderlich.' });

    const result = await getChangesSince(accountId, since);
    res.json(result);
  } catch (err: any) {
    console.error('[pwa] sync changes error:', err);
    res.status(500).json({ error: 'Änderungen konnten nicht geladen werden.' });
  }
});


// ═══════════════════════════════════════════════════════════════
// 10. PROFILE
// ═══════════════════════════════════════════════════════════════

// GET /profile — Patientenprofil abrufen
router.get('/profile', requirePatientAuth, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const accountId = getAccountId(req);

    const account = await prisma.patientAccount.findUnique({
      where: { id: accountId },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            gender: true,
            birthDate: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!account) return res.status(404).json({ error: 'Profil nicht gefunden.' });

    res.json({
      id: account.id,
      email: account.email,
      phone: account.phone,
      locale: account.locale,
      isVerified: account.isVerified,
      notifyEmail: account.notifyEmail,
      notifyPush: account.notifyPush,
      notifySms: account.notifySms,
      patient: account.patient,
      createdAt: account.createdAt,
    });
  } catch (err: any) {
    console.error('[pwa] profile error:', err);
    res.status(500).json({ error: 'Profil konnte nicht geladen werden.' });
  }
});


export default router;
