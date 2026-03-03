import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/atoms
 * Batch-Loader für Fragen
 * Query: ?ids=0000,0001,RES-100
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const idsParam = req.query.ids as string;

        if (!idsParam) {
            // Alle Atome laden (für initiales Laden)
            const atoms = await prisma.medicalAtom.findMany({
                orderBy: { orderIndex: 'asc' },
            });
            // Parse JSON-Felder für Frontend
            res.json({
                atoms: atoms.map(a => ({
                    ...a,
                    options: a.options ? JSON.parse(a.options) : null,
                    validationRules: a.validationRules ? JSON.parse(a.validationRules) : null,
                    branchingLogic: a.branchingLogic ? JSON.parse(a.branchingLogic) : null,
                })),
            });
            return;
        }

        const ids = idsParam.split(',').map(id => id.trim());

        const atoms = await prisma.medicalAtom.findMany({
            where: { id: { in: ids } },
            orderBy: { orderIndex: 'asc' },
        });

        res.json({
            atoms: atoms.map(a => ({
                ...a,
                options: a.options ? JSON.parse(a.options) : null,
                validationRules: a.validationRules ? JSON.parse(a.validationRules) : null,
                branchingLogic: a.branchingLogic ? JSON.parse(a.branchingLogic) : null,
            })),
        });
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[Atoms] Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

export default router;
