/**
 * Content Routes — Waiting room engagement content for patients
 * GET /api/content/waiting — Personalised content feed
 * POST /api/content/waiting/:id/view — Track content view
 * POST /api/content/waiting/:id/like — Like content
 * POST /api/content/waiting/quiz/:id/answer — Track quiz answer
 * GET /api/content/waiting/analytics — Admin analytics
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma as _prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const prisma: any = _prisma;

const router = Router();

// ─── Helper: Current season ─────────────────────────────────
function getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'SPRING';
    if (month >= 6 && month <= 8) return 'SUMMER';
    if (month >= 9 && month <= 11) return 'AUTUMN';
    return 'WINTER';
}

// ─── GET /api/content/waiting ───────────────────────────────
router.get('/waiting', requireAuth, async (req, res) => {
    try {
        const lang = (req.query.lang as string) || 'de';
        const waitMin = parseInt(req.query.waitMin as string) || 0;
        const exclude = (req.query.exclude as string)?.split(',').filter(Boolean) || [];
        const category = req.query.category as string;
        const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

        const season = getCurrentSeason();

        const where: any = {
            isActive: true,
            language: lang,
            minWaitMin: { lte: waitMin },
            OR: [
                { maxWaitMin: null },
                { maxWaitMin: { gte: waitMin } },
            ],
        };

        if (exclude.length > 0) {
            where.id = { notIn: exclude };
        }

        if (category) {
            where.category = category;
        }

        // Seasonal filter: show seasonal + non-seasonal content
        where.AND = [
            {
                OR: [
                    { seasonal: null },
                    { seasonal: season },
                ],
            },
        ];

        const items = await prisma.waitingContent.findMany({
            where,
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
            take: limit,
        });

        res.json({ items });
    } catch (err: any) {
        console.error('[Content] Waiting content error:', err);
        res.status(500).json({ error: 'Content konnte nicht geladen werden' });
    }
});

// ─── POST /api/content/waiting/:id/view ─────────────────────
const viewSchema = z.object({
    sessionId: z.string().min(1),
    durationSec: z.number().int().min(0).optional(),
});

router.post('/waiting/:id/view', requireAuth, async (req, res) => {
    const parsed = viewSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues });
        return;
    }

    try {
        // Increment view count
        await prisma.waitingContent.update({
            where: { id: req.params.id },
            data: { viewCount: { increment: 1 } },
        });

        // Track analytics
        await prisma.waitingAnalytics.create({
            data: {
                sessionId: parsed.data.sessionId,
                contentId: req.params.id,
                eventType: 'CONTENT_VIEW',
                metadata: parsed.data.durationSec ? JSON.stringify({ durationSec: parsed.data.durationSec }) : null,
            },
        });

        res.json({ success: true });
    } catch (err: any) {
        console.error('[Content] View tracking error:', err);
        res.status(500).json({ error: 'View-Tracking fehlgeschlagen' });
    }
});

// ─── POST /api/content/waiting/:id/like ─────────────────────
const likeSchema = z.object({
    sessionId: z.string().min(1),
});

router.post('/waiting/:id/like', requireAuth, async (req, res) => {
    const parsed = likeSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues });
        return;
    }

    try {
        const updated = await prisma.waitingContent.update({
            where: { id: req.params.id },
            data: { likeCount: { increment: 1 } },
        });

        await prisma.waitingAnalytics.create({
            data: {
                sessionId: parsed.data.sessionId,
                contentId: req.params.id,
                eventType: 'CONTENT_LIKE',
            },
        });

        res.json({ success: true, newLikeCount: updated.likeCount });
    } catch (err: any) {
        console.error('[Content] Like error:', err);
        res.status(500).json({ error: 'Like fehlgeschlagen' });
    }
});

// ─── POST /api/content/waiting/quiz/:id/answer ──────────────
const quizAnswerSchema = z.object({
    sessionId: z.string().min(1),
    selectedOption: z.number().int().min(0),
    correct: z.boolean(),
});

router.post('/waiting/quiz/:id/answer', requireAuth, async (req, res) => {
    const parsed = quizAnswerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.issues });
        return;
    }

    try {
        await prisma.waitingAnalytics.create({
            data: {
                sessionId: parsed.data.sessionId,
                contentId: req.params.id,
                eventType: 'QUIZ_ANSWER',
                metadata: JSON.stringify({
                    selectedOption: parsed.data.selectedOption,
                    quizCorrect: parsed.data.correct,
                }),
            },
        });

        res.json({ success: true });
    } catch (err: any) {
        console.error('[Content] Quiz answer error:', err);
        res.status(500).json({ error: 'Quiz-Antwort fehlgeschlagen' });
    }
});

// ─── GET /api/content/waiting/analytics ─────────────────────
router.get('/waiting/analytics', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [totalViews, totalLikes, quizAnswers, topContent] = await Promise.all([
            prisma.waitingAnalytics.count({
                where: { eventType: 'CONTENT_VIEW', createdAt: { gte: since } },
            }),
            prisma.waitingAnalytics.count({
                where: { eventType: 'CONTENT_LIKE', createdAt: { gte: since } },
            }),
            prisma.waitingAnalytics.findMany({
                where: { eventType: 'QUIZ_ANSWER', createdAt: { gte: since } },
                select: { metadata: true },
            }),
            prisma.waitingContent.findMany({
                orderBy: { viewCount: 'desc' },
                take: 10,
                select: { id: true, title: true, type: true, viewCount: true, likeCount: true },
            }),
        ]);

        // Calculate quiz accuracy
        let quizTotal = 0;
        let quizCorrect = 0;
        for (const qa of quizAnswers) {
            if (qa.metadata) {
                try {
                    const m = JSON.parse(qa.metadata);
                    quizTotal++;
                    if (m.quizCorrect) quizCorrect++;
                } catch { /* skip bad JSON */ }
            }
        }

        res.json({
            totalViews,
            totalLikes,
            quizAccuracy: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null,
            topContent,
        });
    } catch (err: any) {
        console.error('[Content] Analytics error:', err);
        res.status(500).json({ error: 'Analytics konnten nicht geladen werden' });
    }
});

export default router;
