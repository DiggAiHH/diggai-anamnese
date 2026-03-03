import { Router } from 'express';
import { z } from 'zod';
import { getIO } from '../socket';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ─── In-Memory Queue ────────────────────────────────────────
export interface QueueEntry {
    id: string;
    sessionId: string;
    patientName: string;
    service: string;
    priority: 'NORMAL' | 'URGENT' | 'EMERGENCY';
    status: 'WAITING' | 'CALLED' | 'IN_TREATMENT' | 'DONE';
    position: number;
    joinedAt: string;
    calledAt?: string;
    estimatedWaitMinutes?: number;
}

const queue: QueueEntry[] = [];
let nextId = 1;

function recalcPositions() {
    const waiting = queue.filter(e => e.status === 'WAITING');
    // Emergency first, then urgent, then normal — within same priority: FIFO
    waiting.sort((a, b) => {
        const priorityOrder = { EMERGENCY: 0, URGENT: 1, NORMAL: 2 };
        const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (diff !== 0) return diff;
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
    waiting.forEach((entry, idx) => { entry.position = idx + 1; });
    // Estimate: 8 min per patient
    waiting.forEach((entry, idx) => { entry.estimatedWaitMinutes = idx * 8; });
}

function broadcastQueue() {
    const io = getIO();
    if (io) {
        io.to('arzt').emit('queue:update', getQueueState());
        // Also broadcast to individual patients
        queue.forEach(entry => {
            io.to(`session:${entry.sessionId}`).emit('queue:position', {
                position: entry.position,
                status: entry.status,
                estimatedWaitMinutes: entry.estimatedWaitMinutes,
            });
        });
    }
}

function getQueueState() {
    return {
        queue: queue.filter(e => e.status !== 'DONE'),
        stats: {
            waiting: queue.filter(e => e.status === 'WAITING').length,
            called: queue.filter(e => e.status === 'CALLED').length,
            inTreatment: queue.filter(e => e.status === 'IN_TREATMENT').length,
            total: queue.filter(e => e.status !== 'DONE').length,
        },
    };
}

// Schema
const joinSchema = z.object({
    sessionId: z.string().min(1),
    patientName: z.string().min(1),
    service: z.string().min(1),
    priority: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).default('NORMAL'),
});

// ─── POST /api/queue/join ─── K-03 FIX: requireAuth ────────
router.post('/join', requireAuth, (req, res) => {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues });
        return;
    }

    // Prevent duplicate joins
    const existing = queue.find(e => e.sessionId === parsed.data.sessionId && e.status === 'WAITING');
    if (existing) {
        res.json({ entry: existing });
        return;
    }

    const entry: QueueEntry = {
        id: `q-${nextId++}`,
        sessionId: parsed.data.sessionId,
        patientName: parsed.data.patientName,
        service: parsed.data.service,
        priority: parsed.data.priority,
        status: 'WAITING',
        position: 0,
        joinedAt: new Date().toISOString(),
    };
    queue.push(entry);
    recalcPositions();
    broadcastQueue();

    res.status(201).json({ entry });
});

// ─── GET /api/queue ──── K-03 FIX: requireAuth + requireRole
router.get('/', requireAuth, requireRole('arzt', 'admin', 'mfa'), (_req, res) => {
    recalcPositions();
    res.json(getQueueState());
});

// ─── GET /api/queue/position/:sessionId ── K-03 FIX: requireAuth
router.get('/position/:sessionId', requireAuth, (req, res) => {
    const entry = queue.find(e => e.sessionId === req.params.sessionId && e.status !== 'DONE');
    if (!entry) {
        res.json({ position: null, status: null });
        return;
    }
    res.json({
        position: entry.position,
        status: entry.status,
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
    });
});

// ─── PUT /api/queue/:id/call ────────────────────────────────
router.put('/:id/call', requireAuth, requireRole('mfa', 'admin', 'arzt'), (req, res) => {
    const entry = queue.find(e => e.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Eintrag nicht gefunden' });
        return;
    }
    entry.status = 'CALLED';
    entry.calledAt = new Date().toISOString();
    recalcPositions();
    broadcastQueue();

    // Notify patient
    const io = getIO();
    if (io) {
        io.to(`session:${entry.sessionId}`).emit('queue:called', {
            message: 'Sie werden aufgerufen! Bitte begeben Sie sich zum Behandlungszimmer.',
        });
    }

    res.json({ entry });
});

// ─── PUT /api/queue/:id/treat ───────────────────────────────
router.put('/:id/treat', requireAuth, requireRole('mfa', 'admin', 'arzt'), (req, res) => {
    const entry = queue.find(e => e.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Eintrag nicht gefunden' });
        return;
    }
    entry.status = 'IN_TREATMENT';
    recalcPositions();
    broadcastQueue();
    res.json({ entry });
});

// ─── PUT /api/queue/:id/done ────────────────────────────────
router.put('/:id/done', requireAuth, requireRole('mfa', 'admin', 'arzt'), (req, res) => {
    const entry = queue.find(e => e.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Eintrag nicht gefunden' });
        return;
    }
    entry.status = 'DONE';
    recalcPositions();
    broadcastQueue();
    res.json({ entry });
});

// ─── DELETE /api/queue/:id ──────────────────────────────────
router.delete('/:id', requireAuth, requireRole('mfa', 'admin'), (req, res) => {
    const idx = queue.findIndex(e => e.id === req.params.id);
    if (idx === -1) {
        res.status(404).json({ error: 'Eintrag nicht gefunden' });
        return;
    }
    queue.splice(idx, 1);
    recalcPositions();
    broadcastQueue();
    res.json({ success: true });
});

export default router;
