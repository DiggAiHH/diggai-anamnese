import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma: any = new PrismaClient();

const createTodoSchema = z.object({
    text: z.string().min(1).max(500),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    category: z.enum(['patient', 'admin', 'followup', 'general']).default('general'),
    sessionId: z.string().optional(),
    patientName: z.string().max(200).optional(),
});

const updateTodoSchema = z.object({
    text: z.string().min(1).max(500).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    category: z.enum(['patient', 'admin', 'followup', 'general']).optional(),
    completed: z.boolean().optional(),
});

// GET / — List todos for current user
router.get('/', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
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
        const userId = (req as any).user?.userId;
        const displayName = (req as any).user?.displayName || '';
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
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const data = updateTodoSchema.parse(req.body);

        const existing = await prisma.staffTodo.findUnique({ where: { id } });
        if (!existing || existing.assigneeId !== userId) {
            return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
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
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        const existing = await prisma.staffTodo.findUnique({ where: { id } });
        if (!existing || existing.assigneeId !== userId) {
            return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
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
