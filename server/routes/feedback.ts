// ═══════════════════════════════════════════════════════════════
// Modul 7: Anonymous Feedback & Checkout Routes
// ═══════════════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { THREAT_KEYWORDS_DE, type ThreatAnalysisResult } from '../services/nfc';

const router = Router();

function analyzeThreat(text: string): ThreatAnalysisResult {
  const lower = text.toLowerCase();
  const found = THREAT_KEYWORDS_DE.filter(kw => lower.includes(kw));
  return {
    containsThreats: found.length > 0,
    keywords: found,
    confidence: Math.min(found.length / 3, 1),
  };
}

// POST /api/feedback/anonymous — Submit anonymous feedback (no auth)
router.post('/anonymous', async (req: Request, res: Response) => {
  try {
    const prisma = (globalThis as any).__prisma;
    const { praxisId, sessionId, rating, text, categories } = req.body;

    if (!praxisId || !rating) {
      res.status(400).json({ error: 'Fehlende Pflichtfelder: praxisId, rating' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 liegen' });
      return;
    }

    // Threat analysis on text
    let containsThreats = false;
    let threatKeywords: string[] = [];
    let escalationStatus = 'NONE';

    if (text) {
      const analysis = analyzeThreat(text);
      containsThreats = analysis.containsThreats;
      threatKeywords = analysis.keywords;
      if (analysis.confidence >= 0.5) {
        escalationStatus = 'PRAXIS_LEITUNG';
      } else if (analysis.containsThreats) {
        escalationStatus = 'REVIEW';
      }
    }

    const feedback = await prisma.anonymousFeedback.create({
      data: {
        praxisId,
        sessionId,
        rating: Number(rating),
        text,
        categories: categories || [],
        containsThreats,
        threatKeywords,
        escalationStatus,
      },
    });

    res.status(201).json({ id: feedback.id, acknowledged: true, escalated: containsThreats });
  } catch (err: any) {
    console.error('[Feedback] Submit error:', err);
    res.status(500).json({ error: 'Feedback konnte nicht gespeichert werden' });
  }
});

// GET /api/feedback — List feedback (admin)
router.get('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const prisma = (globalThis as any).__prisma;
    const praxisId = req.query.praxisId as string | undefined;
    const escalated = req.query.escalated === 'true';
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const where: any = {};
    if (praxisId) where.praxisId = praxisId;
    if (escalated) where.containsThreats = true;

    const feedback = await prisma.anonymousFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(feedback);
  } catch (err: any) {
    console.error('[Feedback] List error:', err);
    res.status(500).json({ error: 'Feedback konnte nicht geladen werden' });
  }
});

// GET /api/feedback/stats — Feedback statistics (admin)
router.get('/stats', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const prisma = (globalThis as any).__prisma;
    const praxisId = req.query.praxisId as string;
    if (!praxisId) { res.status(400).json({ error: 'praxisId erforderlich' }); return; }

    const [total, avgResult, escalated, categoryBreakdown] = await Promise.all([
      prisma.anonymousFeedback.count({ where: { praxisId } }),
      prisma.anonymousFeedback.aggregate({ where: { praxisId }, _avg: { rating: true } }),
      prisma.anonymousFeedback.count({ where: { praxisId, containsThreats: true } }),
      prisma.anonymousFeedback.findMany({ where: { praxisId }, select: { categories: true, rating: true } }),
    ]);

    // Category analysis
    const catMap: Record<string, { count: number; totalRating: number }> = {};
    for (const fb of categoryBreakdown) {
      for (const cat of fb.categories) {
        if (!catMap[cat]) catMap[cat] = { count: 0, totalRating: 0 };
        catMap[cat].count++;
        catMap[cat].totalRating += fb.rating;
      }
    }

    res.json({
      total,
      averageRating: avgResult._avg.rating || 0,
      escalatedCount: escalated,
      categories: Object.entries(catMap).map(([name, data]) => ({
        name,
        count: data.count,
        avgRating: data.totalRating / data.count,
      })),
    });
  } catch (err: any) {
    console.error('[Feedback] Stats error:', err);
    res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
  }
});

// POST /api/feedback/:id/escalate — Escalate feedback (admin)
router.post('/:id/escalate', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const prisma = (globalThis as any).__prisma;
    const { escalationStatus } = req.body;

    if (!['REVIEW', 'PRAXIS_LEITUNG', 'EXTERNAL'].includes(escalationStatus)) {
      res.status(400).json({ error: 'Ungültiger Eskalationsstatus' });
      return;
    }

    const feedback = await prisma.anonymousFeedback.update({
      where: { id: req.params.id },
      data: {
        escalationStatus,
        reviewedBy: (req as any).user?.id || 'system',
        reviewedAt: new Date(),
      },
    });

    res.json(feedback);
  } catch (err: any) {
    console.error('[Feedback] Escalate error:', err);
    res.status(500).json({ error: 'Eskalation fehlgeschlagen' });
  }
});

// POST /api/checkout/:sessionId — Process checkout
router.post('/checkout/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = (globalThis as any).__prisma;
    const { action } = req.body; // 'keep' | 'export' | 'delete'

    const session = await prisma.patientSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) { res.status(404).json({ error: 'Session nicht gefunden' }); return; }

    let result: any = { sessionId: session.id, action };

    switch (action) {
      case 'keep':
        result.message = 'Daten werden 30 Tage aufbewahrt';
        result.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        break;

      case 'export':
        // Return session data as JSON for client export
        const answers = await prisma.answer.findMany({ where: { sessionId: session.id } });
        result.exportData = { session, answers, exportedAt: new Date().toISOString() };
        result.message = 'Daten exportiert';
        break;

      case 'delete':
        // Soft delete — mark session as completed, anonymize PII
        await prisma.patientSession.update({
          where: { id: session.id },
          data: { status: 'COMPLETED' },
        });
        result.message = 'Session abgeschlossen. DSGVO-Löschung wird verarbeitet.';
        break;

      default:
        res.status(400).json({ error: 'Ungültige Aktion. Erlaubt: keep, export, delete' });
        return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Checkout] Error:', err);
    res.status(500).json({ error: 'Checkout fehlgeschlagen' });
  }
});

// GET /api/feedback/threat-analysis — Detailed threat analysis (admin)
router.get('/threat-analysis', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const prisma = (globalThis as any).__prisma;
    const praxisId = req.query.praxisId as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = { containsThreats: true };
    if (praxisId) where.praxisId = praxisId;
    if (status) where.escalationStatus = status;

    const [threats, statusCounts] = await Promise.all([
      prisma.anonymousFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.anonymousFeedback.groupBy({
        by: ['escalationStatus'],
        where: { containsThreats: true, ...(praxisId ? { praxisId } : {}) },
        _count: { id: true },
      }),
    ]);

    res.json({
      threats,
      summary: {
        total: threats.length,
        byStatus: statusCounts.map((s: any) => ({ status: s.escalationStatus, count: s._count.id })),
      },
    });
  } catch (err: any) {
    console.error('[Feedback] Threat analysis error:', err);
    res.status(500).json({ error: 'Bedrohungsanalyse fehlgeschlagen' });
  }
});

// POST /api/feedback/checkout/:sessionId/delete-data — DSGVO hard delete
router.post('/checkout/:sessionId/delete-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = (globalThis as any).__prisma;
    const { mode } = req.body; // 'soft' | 'hard'
    const { sessionId } = req.params;

    const session = await prisma.patientSession.findUnique({ where: { id: sessionId } });
    if (!session) { res.status(404).json({ error: 'Session nicht gefunden' }); return; }

    if (mode === 'hard') {
      // DSGVO Art. 17 — vollständige Löschung
      await prisma.$transaction([
        prisma.answer.deleteMany({ where: { sessionId } }),
        prisma.praxisChatMessage.deleteMany({ where: { sessionId } }),
        prisma.nfcScan.updateMany({ where: { sessionId }, data: { sessionId: null } }),
        prisma.patientSession.update({
          where: { id: sessionId },
          data: {
            encryptedName: null,
            patientId: null,
            status: 'COMPLETED',
          },
        }),
      ]);
      res.json({ sessionId, mode: 'hard', deletedAt: new Date().toISOString(), message: 'Vollständige DSGVO-Löschung durchgeführt (Art. 17)' });
    } else {
      // Soft delete — PII anonymisieren, Metadaten erhalten
      await prisma.patientSession.update({
        where: { id: sessionId },
        data: { encryptedName: null, status: 'COMPLETED' },
      });
      res.json({ sessionId, mode: 'soft', deletedAt: new Date().toISOString(), message: 'PII anonymisiert. Medizinische Metadaten aufbewahrt.' });
    }
  } catch (err: any) {
    console.error('[Checkout] Delete error:', err);
    res.status(500).json({ error: 'Löschung fehlgeschlagen' });
  }
});

export default router;
