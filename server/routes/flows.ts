// ═══════════════════════════════════════════════════════════════
// Modul 7: TreatmentFlow Routes
// ═══════════════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  getProgress,
  startFlow,
  advanceFlow,
  delayFlow,
} from '../services/nfc';

const router = Router();

// GET /api/flows — List all treatment flows
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const praxisId = req.query.praxisId as string | undefined;
    const activeOnly = req.query.active !== 'false';
    const flows = await listFlows(praxisId, activeOnly);
    res.json(flows);
  } catch (err: any) {
    console.error('[Flow] List error:', err);
    res.status(500).json({ error: 'Flows konnten nicht geladen werden' });
  }
});

// GET /api/flows/:id — Get single flow
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const flow = await getFlow(req.params.id as string);
    if (!flow) { res.status(404).json({ error: 'Flow nicht gefunden' }); return; }
    res.json(flow);
  } catch (err: any) {
    console.error('[Flow] Get error:', err);
    res.status(500).json({ error: 'Flow konnte nicht geladen werden' });
  }
});

// POST /api/flows — Create treatment flow (admin)
router.post('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { praxisId, name, description, serviceType, steps } = req.body;

    if (!praxisId || !name || !steps || !Array.isArray(steps)) {
      res.status(400).json({ error: 'Fehlende Pflichtfelder: praxisId, name, steps[]' });
      return;
    }

    const flow = await createFlow({ praxisId, name, description, serviceType, steps });
    res.status(201).json(flow);
  } catch (err: any) {
    console.error('[Flow] Create error:', err);
    res.status(500).json({ error: 'Flow konnte nicht erstellt werden' });
  }
});

// PUT /api/flows/:id — Update flow metadata (admin)
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const flow = await updateFlow(req.params.id as string, req.body);
    res.json(flow);
  } catch (err: any) {
    console.error('[Flow] Update error:', err);
    res.status(500).json({ error: 'Flow konnte nicht aktualisiert werden' });
  }
});

// GET /api/flows/:id/progress/:sessionId — Get patient flow progress
router.get('/:id/progress/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const progress = await getProgress(req.params.sessionId as string);
    if (!progress) { res.status(404).json({ error: 'Kein aktiver Flow für diese Session' }); return; }
    res.json(progress);
  } catch (err: any) {
    console.error('[Flow] Get progress error:', err);
    res.status(500).json({ error: 'Flow-Fortschritt konnte nicht geladen werden' });
  }
});

// POST /api/flows/start — Start a flow for a session
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, flowId } = req.body;
    if (!sessionId || !flowId) {
      res.status(400).json({ error: 'Fehlende Pflichtfelder: sessionId, flowId' });
      return;
    }
    const progress = await startFlow(sessionId, flowId);
    res.status(201).json(progress);
  } catch (err: any) {
    console.error('[Flow] Start error:', err);
    res.status(500).json({ error: err.message || 'Flow konnte nicht gestartet werden' });
  }
});

// POST /api/flows/advance — Advance flow to next step
router.post('/advance', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, fromStep, toStep, reason, triggeredBy } = req.body;
    if (!sessionId || fromStep === undefined || toStep === undefined) {
      res.status(400).json({ error: 'Fehlende Pflichtfelder: sessionId, fromStep, toStep' });
      return;
    }
    const progress = await advanceFlow({ sessionId, fromStep, toStep, reason, triggeredBy: triggeredBy || 'MFA' });
    res.json(progress);
  } catch (err: any) {
    console.error('[Flow] Advance error:', err);
    res.status(500).json({ error: err.message || 'Flow konnte nicht fortgesetzt werden' });
  }
});

// POST /api/flows/delay — Report delay for a flow
router.post('/delay', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, delayMinutes, reason } = req.body;
    if (!sessionId || !delayMinutes || !reason) {
      res.status(400).json({ error: 'Fehlende Pflichtfelder: sessionId, delayMinutes, reason' });
      return;
    }
    const progress = await delayFlow({ sessionId, delayMinutes: Number(delayMinutes), reason });
    res.json(progress);
  } catch (err: any) {
    console.error('[Flow] Delay error:', err);
    res.status(500).json({ error: err.message || 'Verzögerung konnte nicht gemeldet werden' });
  }
});

export default router;
