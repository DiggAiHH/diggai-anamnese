import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma as _prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const prisma: any = _prisma;

const router = Router();

/** Helper: parse JSON fields for frontend consumption */
function formatAtom(a: any) {
    return {
        ...a,
        options: a.options ? JSON.parse(a.options) : null,
        validationRules: a.validationRules ? JSON.parse(a.validationRules) : null,
        branchingLogic: a.branchingLogic ? JSON.parse(a.branchingLogic) : null,
    };
}

/**
 * GET /api/atoms
 * Batch-Loader für Fragen
 * Query: ?ids=0000,0001,RES-100&module=...&section=...
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const idsParam = req.query.ids as string;
        const moduleParam = req.query.module as string;
        const sectionParam = req.query.section as string;

        if (!idsParam) {
            const where: any = {};
            if (moduleParam) where.module = moduleParam;
            if (sectionParam) where.section = sectionParam;

            const atoms = await prisma.medicalAtom.findMany({
                where,
                orderBy: { orderIndex: 'asc' },
            });
            res.json({ atoms: atoms.map(formatAtom) });
            return;
        }

        const ids = idsParam.split(',').map(id => id.trim());
        const atoms = await prisma.medicalAtom.findMany({
            where: { id: { in: ids } },
            orderBy: { orderIndex: 'asc' },
        });

        res.json({ atoms: atoms.map(formatAtom) });
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[Atoms] Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// ─── GET /api/atoms/:id — Single atom ───────────────────────

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const atom = await prisma.medicalAtom.findUnique({ where: { id: req.params.id } });
        if (!atom) { res.status(404).json({ error: 'Atom nicht gefunden' }); return; }
        res.json(formatAtom(atom));
    } catch (err) {
        console.error('[Atoms] Get single error:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

// ─── PUT /api/atoms/reorder — Drag&Drop reorder ────────────

const reorderSchema = z.object({
    orders: z.array(z.object({
        id: z.string(),
        orderIndex: z.number().int().min(0),
    })).min(1),
});

router.put('/reorder', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
        const { orders } = reorderSchema.parse(req.body);

        await prisma.$transaction(
            orders.map(o => prisma.medicalAtom.update({
                where: { id: o.id },
                data: { orderIndex: o.orderIndex },
            }))
        );

        res.json({ success: true, updated: orders.length });
    } catch (err) {
        console.error('[Atoms] Reorder error:', err);
        res.status(400).json({ error: 'Reorder fehlgeschlagen' });
    }
});

// ─── PUT /api/atoms/:id/toggle — Activate/deactivate ───────

const toggleSchema = z.object({
    isActive: z.boolean(),
});

router.put('/:id/toggle', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
        const { isActive } = toggleSchema.parse(req.body);
        const atom = await prisma.medicalAtom.update({
            where: { id: req.params.id },
            data: { isActive },
        });
        res.json(formatAtom(atom));
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Atom nicht gefunden' }); return; }
        console.error('[Atoms] Toggle error:', err);
        res.status(400).json({ error: 'Toggle fehlgeschlagen' });
    }
});

// ─── POST /api/atoms/draft — Save draft ────────────────────

const draftSchema = z.object({
    atomId: z.string().optional(),
    draftData: z.record(z.string(), z.unknown()), // JSON object for the full atom
    changeNote: z.string().max(500).optional(),
});

router.post('/draft', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
        const data = draftSchema.parse(req.body);
        const userId = (req as any).user?.userId || 'unknown';

        const draft = await prisma.atomDraft.create({
            data: {
                atomId: data.atomId || null,
                draftData: JSON.stringify(data.draftData),
                changeNote: data.changeNote || null,
                createdBy: userId,
            },
        });

        res.status(201).json({ ...draft, draftData: JSON.parse(draft.draftData) });
    } catch (err) {
        console.error('[Atoms] Draft create error:', err);
        res.status(400).json({ error: 'Entwurf konnte nicht gespeichert werden' });
    }
});

// ─── GET /api/atoms/drafts — List drafts ────────────────────

router.get('/drafts', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
        const status = (req.query.status as string) || 'DRAFT';
        const drafts = await prisma.atomDraft.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            drafts: drafts.map((d: any) => ({
                ...d,
                draftData: JSON.parse(d.draftData),
            })),
        });
    } catch (err) {
        console.error('[Atoms] Drafts list error:', err);
        res.status(500).json({ error: 'Entwürfe konnten nicht geladen werden' });
    }
});

// ─── PUT /api/atoms/draft/:id/publish — Publish draft ──────

router.put('/draft/:id/publish', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
        const draft = await prisma.atomDraft.findUnique({ where: { id: req.params.id } });
        if (!draft) { res.status(404).json({ error: 'Entwurf nicht gefunden' }); return; }

        const draftData = JSON.parse(draft.draftData);

        // Upsert the MedicalAtom
        const atomId = draft.atomId || draftData.id;
        if (!atomId) { res.status(400).json({ error: 'Atom-ID fehlt im Entwurf' }); return; }

        const atom = await prisma.medicalAtom.upsert({
            where: { id: atomId },
            update: {
                questionText: draftData.questionText,
                answerType: draftData.answerType,
                options: draftData.options ? JSON.stringify(draftData.options) : null,
                validationRules: draftData.validationRules ? JSON.stringify(draftData.validationRules) : null,
                branchingLogic: draftData.branchingLogic ? JSON.stringify(draftData.branchingLogic) : null,
                isRequired: draftData.isRequired ?? true,
                isRedFlag: draftData.isRedFlag ?? false,
                isPII: draftData.isPII ?? false,
                isActive: draftData.isActive ?? true,
                module: draftData.module,
                section: draftData.section,
            },
            create: {
                id: atomId,
                questionText: draftData.questionText,
                answerType: draftData.answerType,
                options: draftData.options ? JSON.stringify(draftData.options) : null,
                validationRules: draftData.validationRules ? JSON.stringify(draftData.validationRules) : null,
                branchingLogic: draftData.branchingLogic ? JSON.stringify(draftData.branchingLogic) : null,
                isRequired: draftData.isRequired ?? true,
                isRedFlag: draftData.isRedFlag ?? false,
                isPII: draftData.isPII ?? false,
                isActive: draftData.isActive ?? true,
                orderIndex: draftData.orderIndex ?? 9999,
                module: draftData.module ?? 'CUSTOM',
                section: draftData.section ?? 'custom',
            },
        });

        // Mark draft as published
        const updatedDraft = await prisma.atomDraft.update({
            where: { id: req.params.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
        });

        res.json({ atom: formatAtom(atom), draft: { ...updatedDraft, draftData: JSON.parse(updatedDraft.draftData) } });
    } catch (err) {
        console.error('[Atoms] Publish error:', err);
        res.status(500).json({ error: 'Veröffentlichung fehlgeschlagen' });
    }
});

// ─── DELETE /api/atoms/draft/:id — Delete draft ─────────────

router.delete('/draft/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
        await prisma.atomDraft.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Entwurf nicht gefunden' }); return; }
        console.error('[Atoms] Draft delete error:', err);
        res.status(500).json({ error: 'Entwurf konnte nicht gelöscht werden' });
    }
});

export default router;
