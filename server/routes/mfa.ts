import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/mfa/sessions
 * Alle Sessions abrufen (für MFA Übersicht)
 */
router.get('/sessions', requireAuth, requireRole('mfa', 'admin'), async (_req: Request, res: Response) => {
    try {
        const sessions = await prisma.patientSession.findMany({
            include: {
                assignedArzt: {
                    select: {
                        id: true,
                        displayName: true,
                    }
                },
                _count: {
                    select: { answers: true }
                },
                triageEvents: {
                    where: { level: 'CRITICAL', acknowledgedBy: null },
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        const result = sessions.map(s => ({
            id: s.id,
            selectedService: s.selectedService,
            status: s.status,
            createdAt: s.createdAt,
            totalAnswers: s._count.answers,
            unresolvedCritical: s.triageEvents.length,
            assignedArzt: s.assignedArzt,
        }));

        res.json({ sessions: result });
    } catch (err: unknown) {
        console.error('[MFA] Sessions-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * GET /api/mfa/doctors
 * Liste aller verfügbaren Ärzte abrufen
 */
router.get('/doctors', requireAuth, requireRole('mfa', 'admin'), async (_req: Request, res: Response) => {
    try {
        const doctors = await prisma.arztUser.findMany({
            where: { role: 'ARZT' },
            select: {
                id: true,
                displayName: true,
                username: true,
            }
        });
        res.json({ doctors });
    } catch (err: unknown) {
        console.error('[MFA] Doctors-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * POST /api/mfa/sessions/:id/assign
 * Einer Session einen Arzt zuweisen
 */
router.post('/sessions/:id/assign', requireAuth, requireRole('mfa', 'admin'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { arztId } = req.body;

        if (!arztId) {
            res.status(400).json({ error: 'ArztId erforderlich' });
            return;
        }

        const session = await prisma.patientSession.update({
            where: { id: id as string },
            data: { assignedArztId: arztId },
            include: { assignedArzt: true }
        });

        res.json({ success: true, session });
    } catch (err: unknown) {
        console.error('[MFA] Assignment-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

export default router;
