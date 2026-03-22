// ─── Praxis Chat Routes ────────────────────────────────────
// Modul 7/8: MFA/Arzt ↔ Patient real-time messaging

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  sendMessage,
  getSessionMessages,
  markAsRead,
  broadcastMessage,
  getUnreadCount,
  getChatStats,
  getTemplates,
  deleteSessionChat,
} from '../services/praxis-chat';

const router = Router();

// All praxis-chat routes require authentication
router.use(requireAuth);

// GET /api/praxis-chat/:sessionId — Get messages for a session
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;
    const messages = await getSessionMessages(req.params.sessionId as string, limit, before);
    res.json(messages);
  } catch (err: any) {
    console.error('[PraxisChat] Get messages error:', err.message);
    res.status(500).json({ error: 'Nachrichten nicht verfügbar' });
  }
});

// POST /api/praxis-chat/send — Send a message
router.post('/send', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      sessionId: z.string().min(1),
      senderType: z.enum(['PATIENT', 'MFA', 'ARZT', 'SYSTEM']),
      senderId: z.string().optional(),
      contentType: z.enum(['TEXT', 'VOICE', 'VIDEO', 'SYSTEM_NOTIFICATION', 'IMAGE']).default('TEXT'),
      content: z.string().min(1).max(5000),
      isTemplate: z.boolean().default(false),
      templateId: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const message = await sendMessage(data);
    res.json(message);
  } catch (err: any) {
    console.error('[PraxisChat] Send error:', err.message);
    res.status(400).json({ error: err.message || 'Nachricht konnte nicht gesendet werden' });
  }
});

// POST /api/praxis-chat/broadcast — Broadcast to multiple sessions (requires auth)
router.post('/broadcast', requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      praxisId: z.string().min(1),
      senderId: z.string().min(1),
      senderType: z.enum(['MFA', 'ARZT', 'SYSTEM']),
      content: z.string().min(1).max(2000),
      target: z.enum(['waiting', 'all', 'room']),
      roomFilter: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const result = await broadcastMessage(data);
    res.json(result);
  } catch (err: any) {
    console.error('[PraxisChat] Broadcast error:', err.message);
    res.status(400).json({ error: err.message || 'Broadcast fehlgeschlagen' });
  }
});

// POST /api/praxis-chat/:sessionId/read — Mark messages as read
router.post('/:sessionId/read', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      readerId: z.string().min(1),
      readerType: z.enum(['PATIENT', 'MFA', 'ARZT']),
    });

    const data = schema.parse(req.body);
    const count = await markAsRead(req.params.sessionId as string, data.readerId, data.readerType);
    res.json({ markedAsRead: count });
  } catch (err: any) {
    console.error('[PraxisChat] Mark read error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/praxis-chat/:sessionId/unread — Get unread count
router.get('/:sessionId/unread', async (req: Request, res: Response) => {
  try {
    const viewerType = req.query.viewerType as string || 'PATIENT';
    const count = await getUnreadCount(req.params.sessionId as string, viewerType);
    res.json({ unreadCount: count });
  } catch (err: any) {
    console.error('[PraxisChat] Unread count error:', err.message);
    res.status(500).json({ error: 'Ungelesene Nachrichten nicht verfügbar' });
  }
});

// GET /api/praxis-chat/templates/list — Get available templates
router.get('/templates/list', async (_req: Request, res: Response) => {
  try {
    const templates = getTemplates();
    res.json(templates);
  } catch (err: any) {
    console.error('[PraxisChat] Templates error:', err.message);
    res.status(500).json({ error: 'Templates nicht verfügbar' });
  }
});

// GET /api/praxis-chat/stats/overview — Chat statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const praxisId = req.query.praxisId as string | undefined;
    const stats = await getChatStats(praxisId);
    res.json(stats);
  } catch (err: any) {
    console.error('[PraxisChat] Stats error:', err.message);
    res.status(500).json({ error: 'Chat-Statistiken nicht verfügbar' });
  }
});

// DELETE /api/praxis-chat/:sessionId — Delete chat history (checkout/DSGVO)
router.delete('/:sessionId', async (req: Request, res: Response) => {
  try {
    const count = await deleteSessionChat(req.params.sessionId as string);
    res.json({ deleted: count });
  } catch (err: any) {
    console.error('[PraxisChat] Delete error:', err.message);
    res.status(500).json({ error: 'Chat konnte nicht gelöscht werden' });
  }
});

// POST /api/praxis-chat/templates — Create/save a message template
router.post('/templates', requireRole('arzt', 'mfa', 'admin'), async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      praxisId: z.string().min(1),
      name: z.string().min(1).max(100),
      content: z.string().min(1).max(2000),
      category: z.string().optional(),
      flowStepType: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const prisma = (globalThis as any).__prisma;

    // Store as a PraxisChatMessage marked as template
    const template = await prisma.praxisChatMessage.create({
      data: {
        sessionId: `template:${data.praxisId}`,
        senderType: 'SYSTEM',
        contentType: 'TEXT',
        content: data.content,
        isTemplate: true,
        templateId: data.category || null,
      },
    });

    res.status(201).json({ ...template, name: data.name, flowStepType: data.flowStepType });
  } catch (err: any) {
    console.error('[PraxisChat] Template create error:', err.message);
    res.status(400).json({ error: err.message || 'Template konnte nicht erstellt werden' });
  }
});

export default router;
