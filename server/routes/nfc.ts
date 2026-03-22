// ═══════════════════════════════════════════════════════════════
// Modul 7: NFC Checkpoint & Scan Routes
// ═══════════════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  processTap,
  listCheckpoints,
  createCheckpoint,
  updateCheckpoint,
  deleteCheckpoint,
  getCheckpointScans,
} from '../services/nfc';

const router = Router();

// POST /api/nfc/scan — Process NFC tap (no auth required for patient UX)
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { locationId, praxisId, timestamp, signature, sessionHint, deviceInfo } = req.body;

    if (!locationId || !praxisId || !timestamp || !signature) {
      res.status(400).json({ error: 'Fehlende Pflichtfelder: locationId, praxisId, timestamp, signature' });
      return;
    }

    const result = await processTap({
      locationId,
      praxisId,
      timestamp: Number(timestamp),
      signature,
      sessionHint,
      deviceInfo,
    });

    if (!result.accepted) {
      res.status(403).json({ error: 'NFC-Scan abgelehnt', reason: result.rejectReason, scanId: result.scanId });
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('[NFC] Scan error:', err);
    res.status(500).json({ error: 'NFC-Scan fehlgeschlagen' });
  }
});

// GET /api/nfc/checkpoints — List checkpoints (admin)
router.get('/checkpoints', requireAuth, async (req: Request, res: Response) => {
  try {
    const praxisId = req.query.praxisId as string | undefined;
    const checkpoints = await listCheckpoints(praxisId);
    res.json(checkpoints);
  } catch (err: any) {
    console.error('[NFC] List checkpoints error:', err);
    res.status(500).json({ error: 'Checkpoints konnten nicht geladen werden' });
  }
});

// POST /api/nfc/checkpoints — Create checkpoint (admin)
router.post('/checkpoints', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { locationId, praxisId, type, roomName, coordinates, nfcUid, secretRef, isActive } = req.body;

    if (!locationId || !praxisId || !type || !nfcUid) {
      res.status(400).json({ error: 'Fehlende Pflichtfelder: locationId, praxisId, type, nfcUid' });
      return;
    }

    const checkpoint = await createCheckpoint({ locationId, praxisId, type, roomName, coordinates, nfcUid, secretRef, isActive });
    res.status(201).json(checkpoint);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Checkpoint mit dieser locationId oder nfcUid existiert bereits' });
      return;
    }
    console.error('[NFC] Create checkpoint error:', err);
    res.status(500).json({ error: 'Checkpoint konnte nicht erstellt werden' });
  }
});

// PUT /api/nfc/checkpoints/:id — Update checkpoint (admin)
router.put('/checkpoints/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const checkpoint = await updateCheckpoint(req.params.id as string, req.body);
    res.json(checkpoint);
  } catch (err: any) {
    console.error('[NFC] Update checkpoint error:', err);
    res.status(500).json({ error: 'Checkpoint konnte nicht aktualisiert werden' });
  }
});

// DELETE /api/nfc/checkpoints/:id — Soft-delete checkpoint (admin)
router.delete('/checkpoints/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await deleteCheckpoint(req.params.id as string);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[NFC] Delete checkpoint error:', err);
    res.status(500).json({ error: 'Checkpoint konnte nicht deaktiviert werden' });
  }
});

// GET /api/nfc/checkpoints/:id/scans — Get scan history (admin)
router.get('/checkpoints/:id/scans', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const scans = await getCheckpointScans(req.params.id as string, limit);
    res.json(scans);
  } catch (err: any) {
    console.error('[NFC] Get scans error:', err);
    res.status(500).json({ error: 'Scan-Historie konnte nicht geladen werden' });
  }
});

export default router;
