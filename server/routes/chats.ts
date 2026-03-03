import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth, requireSessionOwner } from '../middleware/auth';

const router = Router();

/**
 * GET /api/chats/:sessionId
 * Nachrichtenhistorie für eine Session abrufen
 */
router.get('/:sessionId', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const messages = await prisma.chatMessage.findMany({
            where: { sessionId: sessionId as string },
            orderBy: { timestamp: 'asc' },
        });

        res.json({ messages });
    } catch (err: unknown) {
        console.error('[Chat] History-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler beim Laden der Nachrichten' });
    }
});

export default router;
