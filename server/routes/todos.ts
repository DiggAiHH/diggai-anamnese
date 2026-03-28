import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

const createTodoSchema = z.object({
    text: z.string().trim().min(1).max(500),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    category: z.enum(['patient', 'admin', 'followup', 'general']).default('general'),
    sessionId: z.string().optional(),
    patientName: z.string().max(200).optional(),
});

const updateTodoSchema = z.object({
    text: z.string().trim().min(1).max(500).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    category: z.enum(['patient', 'admin', 'followup', 'general']).optional(),
    completed: z.boolean().optional(),
});

function getAuthenticatedUserId(req: { auth?: { userId?: string } }) {
    return req.auth?.userId;
}

async function getAuthenticatedDisplayName(userId: string | undefined) {
    if (!userId) {
        return '';
    }

    const user = await prisma.arztUser.findUnique({
        where: { id: userId },
        select: { displayName: true },
    });

    return user?.displayName ?? '';
}

// GET / — List todos for current user
router.get('/', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        if (!userId) {
            res.status(401).json({ error: 'Ungültiger Authentifizierungskontext' });
            return;
        }

        const status = req.query.status as string | undefined;

        const where: any = { assigneeId: userId };
        if (status === 'active') where.completed = false;
        else if (status === 'completed') where.completed = true;

        const todos = await prisma.staffTodo.findMany({
            where,
            orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
        });

        res.json(todos);
    } catch (err) {
        console.error('[TODOS] GET error:', err);
        res.status(500).json({ error: 'Fehler beim Laden der Aufgaben' });
    }
});

// POST / — Create todo
router.post('/', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        if (!userId) {
            res.status(401).json({ error: 'Ungültiger Authentifizierungskontext' });
            return;
        }

        const displayName = await getAuthenticatedDisplayName(userId);
        const data = createTodoSchema.parse(req.body);

        const todo = await prisma.staffTodo.create({
            data: {
                text: data.text,
                priority: data.priority,
                category: data.category,
                sessionId: data.sessionId,
                patientName: data.patientName,
                assigneeId: userId,
                assignee: displayName,
            },
        });

        res.status(201).json(todo);
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return res.status(400).json({ error: 'Ungültige Eingabe', details: err.errors });
        }
        console.error('[TODOS] POST error:', err);
        res.status(500).json({ error: 'Fehler beim Erstellen der Aufgabe' });
    }
});

// PUT /:id — Update todo
router.put('/:id', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        if (!userId) {
            res.status(401).json({ error: 'Ungültiger Authentifizierungskontext' });
            return;
        }

        const id = String(req.params.id);
        const data = updateTodoSchema.parse(req.body);

        const existing = await prisma.staffTodo.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
        }

        if (existing.assigneeId !== userId) {
            return res.status(403).json({ error: 'Kein Zugriff auf diese Aufgabe' });
        }

        const updateData: any = {};
        if (data.text !== undefined) updateData.text = data.text;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.completed !== undefined) {
            updateData.completed = data.completed;
            updateData.completedAt = data.completed ? new Date() : null;
        }

        const todo = await prisma.staffTodo.update({
            where: { id },
            data: updateData,
        });

        res.json(todo);
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return res.status(400).json({ error: 'Ungültige Eingabe', details: err.errors });
        }
        if (err?.code === 'P2025') {
            return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
        }
        console.error('[TODOS] PUT error:', err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Aufgabe' });
    }
});

// DELETE /:id — Delete todo
router.delete('/:id', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        if (!userId) {
            res.status(401).json({ error: 'Ungültiger Authentifizierungskontext' });
            return;
        }

        const id = String(req.params.id);

        const existing = await prisma.staffTodo.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
        }

        if (existing.assigneeId !== userId) {
            return res.status(403).json({ error: 'Kein Zugriff auf diese Aufgabe' });
        }

        await prisma.staffTodo.delete({ where: { id } });
        res.json({ success: true });
    } catch (err: any) {
        if (err?.code === 'P2025') {
            return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
        }
        console.error('[TODOS] DELETE error:', err);
        res.status(500).json({ error: 'Fehler beim Löschen der Aufgabe' });
    }
});

export default router;
