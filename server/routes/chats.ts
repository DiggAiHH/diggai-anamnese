import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireSessionOwner } from '../middleware/auth';

const router = Router();
const chatMessageSchema = z.object({
    text: z.string().trim().min(1).max(5000),
});

function resolveSenderContext(auth: Request['auth']) {
    if (!auth || auth.role === 'patient') {
        return {
            senderType: 'PATIENT',
            senderId: undefined,
            fromName: 'Patient',
        };
    }

    if (auth.role === 'mfa') {
        return {
            senderType: 'MFA',
            senderId: auth.userId,
            fromName: 'Praxis-Team',
        };
    }

    return {
        senderType: 'ARZT',
        senderId: auth.userId,
        fromName: 'Praxis-Team',
    };
}

async function ensureTenantSession(sessionId: string, tenantId: string | undefined) {
    if (!tenantId) {
        throw new Error('Missing tenant context');
    }

    const session = await prisma.patientSession.findFirst({
        where: {
            id: sessionId,
            tenantId,
        },
        select: { id: true },
    });

    if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
    }
}

/**
 * GET /api/chats/:id
 * Nachrichtenhistorie für eine Session abrufen
 */
router.get('/:id', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await ensureTenantSession(id as string, req.tenantId);

        const messages = await prisma.chatMessage.findMany({
            where: { sessionId: id as string },
            orderBy: { timestamp: 'asc' },
        });

        res.json({ messages });
    } catch (err: unknown) {
        console.error('[Chat] History-Fehler:', err);
        if (err instanceof Error && err.message.startsWith('Session not found')) {
            res.status(404).json({ error: 'Sitzung nicht gefunden' });
            return;
        }

        if (err instanceof Error && err.message === 'Missing tenant context') {
            res.status(401).json({ error: 'Mandantenkontext fehlt' });
            return;
        }

        res.status(500).json({ error: 'Interner Serverfehler beim Laden der Nachrichten' });
    }
});

/**
 * POST /api/chats/:id
 * Chat-Nachricht für eine Session persistieren
 */
router.post('/:id', requireAuth, requireSessionOwner, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await ensureTenantSession(id as string, req.tenantId);
        const { text } = chatMessageSchema.parse(req.body);
        const sender = resolveSenderContext(req.auth);

        const message = await prisma.chatMessage.create({
            data: {
                sessionId: id as string,
                senderType: sender.senderType,
                senderId: sender.senderId,
                text,
                fromName: sender.fromName,
            },
        });

        res.status(201).json({ message });
    } catch (err: unknown) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: 'Ungültige Nachricht' });
            return;
        }

        if (err instanceof Error && err.message.startsWith('Session not found')) {
            res.status(404).json({ error: 'Sitzung nicht gefunden' });
            return;
        }

        if (err instanceof Error && err.message === 'Missing tenant context') {
            res.status(401).json({ error: 'Mandantenkontext fehlt' });
            return;
        }

        console.error('[Chat] Send-Fehler:', err);
        res.status(500).json({ error: 'Interner Serverfehler beim Senden der Nachricht' });
    }
});

export default router;
