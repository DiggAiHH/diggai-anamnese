// ─── Telemedizin Routes ────────────────────────────────────
// Modul 8: Video consultation endpoints

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createSession,
  getSession,
  joinSession,
  endSession,
  cancelSession,
  markNoShow,
  addPrescription,
  setFollowUp,
  listSessions,
  getStats,
} from '../services/telemedizin';

const router = Router();

// POST /api/telemedizin/session — Create new session
router.post('/session', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      patientSessionId: z.string().optional(),
      arztId: z.string().min(1),
      patientId: z.string().min(1),
      scheduledAt: z.string().datetime(),
      duration: z.number().min(5).max(120).optional(),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const session = await createSession(data);
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/telemedizin/session/:id — Get session details
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Sitzung nicht gefunden' });
      return;
    }
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telemedizin/session/:id/join — Join with consent
router.post('/session/:id/join', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      participantId: z.string().min(1),
      role: z.enum(['ARZT', 'PATIENT', 'MFA', 'TRANSLATOR']),
      consentGiven: z.boolean(),
    });

    const data = schema.parse(req.body);
    const result = await joinSession({
      sessionId: req.params.id as string,
      ...data,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/telemedizin/session/:id/end — End session
router.post('/session/:id/end', async (req: Request, res: Response) => {
  try {
    const notes = req.body.notes as string | undefined;
    const session = await endSession(req.params.id as string, notes);
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/telemedizin/session/:id/cancel — Cancel session
router.post('/session/:id/cancel', async (req: Request, res: Response) => {
  try {
    const reason = req.body.reason as string | undefined;
    const session = await cancelSession(req.params.id as string, reason);
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/telemedizin/session/:id/no-show — Mark as no-show
router.post('/session/:id/no-show', async (req: Request, res: Response) => {
  try {
    const session = await markNoShow(req.params.id as string);
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/telemedizin/session/:id/prescription — Add prescription
router.post('/session/:id/prescription', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      prescription: z.string().min(1).max(1000),
    });
    const { prescription } = schema.parse(req.body);
    const result = await addPrescription(req.params.id as string, prescription);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/telemedizin/session/:id/follow-up — Set follow-up date
router.post('/session/:id/follow-up', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      followUpDate: z.string().datetime(),
    });
    const { followUpDate } = schema.parse(req.body);
    const result = await setFollowUp(req.params.id as string, followUpDate);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/telemedizin/sessions — List sessions with filters
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const filters = {
      arztId: req.query.arztId as string | undefined,
      patientId: req.query.patientId as string | undefined,
      status: req.query.status as string | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
    };
    const limit = parseInt(req.query.limit as string) || 50;
    const sessions = await listSessions(filters, limit);
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/telemedizin/stats — Statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
