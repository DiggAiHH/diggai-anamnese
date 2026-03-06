import { Router } from 'express';
import { z } from 'zod';
import { getIO } from '../socket';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth';
import * as queueService from '../services/queueService';

const router = Router();

// ─── Helper: Broadcast queue state via Socket.IO ────────────
async function broadcastQueue() {
    const io = getIO();
    if (!io) return;

    const state = await queueService.getQueueState();
    io.to('arzt').emit('queue:update', state);

    // Also broadcast individual positions to each patient
    for (const entry of state.queue) {
        io.to(`session:${entry.sessionId}`).emit('queue:position', {
            position: entry.position,
            status: entry.status,
            estimatedWaitMin: entry.estimatedWaitMin,
            queueLength: state.stats.waiting,
        });
    }
}

// Schema
const joinSchema = z.object({
    sessionId: z.string().min(1),
    patientName: z.string().min(1),
    service: z.string().min(1),
    priority: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).default('NORMAL'),
    entertainmentMode: z.enum(['AUTO', 'GAMES', 'READING', 'QUIET']).default('AUTO'),
    deviceType: z.string().optional(),
});

const feedbackSchema = z.object({
    rating: z.number().int().min(1).max(5),
});

// ─── POST /api/queue/join ───────────────────────────────────
router.post('/join', requireAuth, async (req, res) => {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues });
        return;
    }

    try {
        const entry = await queueService.joinQueue(parsed.data);
        await broadcastQueue();
        res.status(201).json({ entry });
    } catch (err: any) {
        console.error('[Queue] Join error:', err);
        res.status(500).json({ error: 'Queue-Beitritt fehlgeschlagen' });
    }
});

// ─── GET /api/queue ─────────────────────────────────────────
router.get('/', requireAuth, requireRole('arzt', 'admin', 'mfa'), async (_req, res) => {
    try {
        const state = await queueService.getQueueState();
        res.json(state);
    } catch (err: any) {
        console.error('[Queue] List error:', err);
        res.status(500).json({ error: 'Queue konnte nicht geladen werden' });
    }
});

// ─── GET /api/queue/position/:sessionId ─────────────────────
router.get('/position/:sessionId', requireAuth, async (req, res) => {
    try {
        const data = await queueService.getPositionBySession(req.params.sessionId as string);
        res.json(data);
    } catch (err: any) {
        console.error('[Queue] Position error:', err);
        res.status(500).json({ error: 'Position konnte nicht ermittelt werden' });
    }
});

// ─── GET /api/queue/flow-config/:sessionId ──────────────────
router.get('/flow-config/:sessionId', requireAuth, async (req, res) => {
    try {
        const config = await queueService.getFlowConfig(req.params.sessionId as string);
        res.json(config);
    } catch (err: any) {
        console.error('[Queue] Flow config error:', err);
        res.status(500).json({ error: 'Flow-Config konnte nicht ermittelt werden' });
    }
});

// ─── PUT /api/queue/:id/call ────────────────────────────────
router.put('/:id/call', requireAuth, requireRole('mfa', 'admin', 'arzt'), requirePermission('queue_manage'), async (req, res) => {
    try {
        const entry = await queueService.callEntry(req.params.id as string);
        await broadcastQueue();

        // Notify patient they are being called
        const io = getIO();
        if (io) {
            io.to(`session:${entry.sessionId}`).emit('queue:called', {
                message: 'Sie werden aufgerufen! Bitte begeben Sie sich zum Behandlungszimmer.',
            });
        }

        res.json({ entry });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Eintrag nicht gefunden' });
            return;
        }
        console.error('[Queue] Call error:', err);
        res.status(500).json({ error: 'Aufruf fehlgeschlagen' });
    }
});

// ─── PUT /api/queue/:id/treat ───────────────────────────────
router.put('/:id/treat', requireAuth, requireRole('mfa', 'admin', 'arzt'), requirePermission('queue_manage'), async (req, res) => {
    try {
        const entry = await queueService.treatEntry(req.params.id as string);
        await broadcastQueue();
        res.json({ entry });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Eintrag nicht gefunden' });
            return;
        }
        console.error('[Queue] Treat error:', err);
        res.status(500).json({ error: 'Behandlungsstart fehlgeschlagen' });
    }
});

// ─── PUT /api/queue/:id/done ────────────────────────────────
router.put('/:id/done', requireAuth, requireRole('mfa', 'admin', 'arzt'), requirePermission('queue_manage'), async (req, res) => {
    try {
        const entry = await queueService.doneEntry(req.params.id as string);
        await broadcastQueue();
        res.json({ entry });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Eintrag nicht gefunden' });
            return;
        }
        console.error('[Queue] Done error:', err);
        res.status(500).json({ error: 'Abschluss fehlgeschlagen' });
    }
});

// ─── PUT /api/queue/:id/feedback ────────────────────────────
router.put('/:id/feedback', requireAuth, async (req, res) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues });
        return;
    }

    try {
        const entry = await queueService.submitFeedback(req.params.id as string, parsed.data.rating);
        res.json({ success: true, entry });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Eintrag nicht gefunden' });
            return;
        }
        console.error('[Queue] Feedback error:', err);
        res.status(500).json({ error: 'Feedback fehlgeschlagen' });
    }
});

// ─── DELETE /api/queue/:id ──────────────────────────────────
router.delete('/:id', requireAuth, requireRole('mfa', 'admin'), async (req, res) => {
    try {
        await queueService.removeEntry(req.params.id as string);
        await broadcastQueue();
        res.json({ success: true });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Eintrag nicht gefunden' });
            return;
        }
        console.error('[Queue] Remove error:', err);
        res.status(500).json({ error: 'Entfernen fehlgeschlagen' });
    }
});

export default router;
