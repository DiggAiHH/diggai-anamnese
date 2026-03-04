import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { processWunschboxEntry, generateExportSpec } from '../services/wunschboxService';

const router = Router();
const prisma: any = new PrismaClient();

// ─── POST /api/wunschbox — Submit a wish ────────────────────

const submitSchema = z.object({
    text: z.string().min(10).max(5000),
});

router.post('/', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const { text } = submitSchema.parse(req.body);
        const userId = (req as any).user?.userId || 'unknown';

        const entry = await prisma.wunschboxEntry.create({
            data: { submittedBy: userId, originalText: text },
        });

        res.status(201).json(entry);
    } catch (err) {
        console.error('[Wunschbox] Submit error:', err);
        res.status(400).json({ error: 'Wunsch konnte nicht eingereicht werden' });
    }
});

// ─── GET /api/wunschbox — List all (admin) ──────────────────

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
        const status = req.query.status as string | undefined;

        const where: any = {};
        if (status) where.status = status;

        const [entries, total] = await Promise.all([
            prisma.wunschboxEntry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.wunschboxEntry.count({ where }),
        ]);

        res.json({
            entries: entries.map((e: any) => ({
                ...e,
                aiParsedChanges: e.aiParsedChanges ? JSON.parse(e.aiParsedChanges) : null,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('[Wunschbox] List error:', err);
        res.status(500).json({ error: 'Wünsche konnten nicht geladen werden' });
    }
});

// ─── GET /api/wunschbox/my — Own wishes ─────────────────────

router.get('/my', requireAuth, requireRole('admin', 'arzt', 'mfa'), async (req, res) => {
    try {
        const userId = (req as any).user?.userId || 'unknown';
        const entries = await prisma.wunschboxEntry.findMany({
            where: { submittedBy: userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(entries.map((e: any) => ({
            ...e,
            aiParsedChanges: e.aiParsedChanges ? JSON.parse(e.aiParsedChanges) : null,
        })));
    } catch (err) {
        console.error('[Wunschbox] My error:', err);
        res.status(500).json({ error: 'Wünsche konnten nicht geladen werden' });
    }
});

// ─── POST /api/wunschbox/:id/process — AI processing ───────

router.post('/:id/process', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const parsed = await processWunschboxEntry(req.params.id as string);
        const entry = await prisma.wunschboxEntry.findUnique({ where: { id: req.params.id } });
        res.json({ ...entry, aiParsedChanges: parsed });
    } catch (err: any) {
        if (err.message?.includes('nicht gefunden')) {
            res.status(404).json({ error: 'Wunsch nicht gefunden' });
            return;
        }
        console.error('[Wunschbox] Process error:', err);
        res.status(500).json({ error: 'KI-Verarbeitung fehlgeschlagen' });
    }
});

// ─── PUT /api/wunschbox/:id/review — Change status ─────────

const reviewSchema = z.object({
    status: z.enum(['PENDING', 'AI_PROCESSED', 'REVIEWED', 'APPROVED', 'REJECTED', 'IMPLEMENTED']),
    adminNotes: z.string().max(2000).optional(),
});

router.put('/:id/review', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const data = reviewSchema.parse(req.body);
        const userId = (req as any).user?.userId || 'unknown';

        const entry = await prisma.wunschboxEntry.update({
            where: { id: req.params.id },
            data: {
                status: data.status,
                adminNotes: data.adminNotes,
                reviewedAt: new Date(),
                reviewedBy: userId,
            },
        });
        res.json({ ...entry, aiParsedChanges: entry.aiParsedChanges ? JSON.parse(entry.aiParsedChanges) : null });
    } catch (err: any) {
        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Wunsch nicht gefunden' });
            return;
        }
        console.error('[Wunschbox] Review error:', err);
        res.status(400).json({ error: 'Review fehlgeschlagen' });
    }
});

// ─── POST /api/wunschbox/:id/export — Generate spec ────────

router.post('/:id/export', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const spec = await generateExportSpec(req.params.id as string);
        res.json({ spec: JSON.parse(spec) });
    } catch (err: any) {
        if (err.message?.includes('nicht gefunden')) {
            res.status(404).json({ error: 'Wunsch nicht gefunden' });
            return;
        }
        console.error('[Wunschbox] Export error:', err);
        res.status(500).json({ error: 'Export fehlgeschlagen' });
    }
});

export default router;
