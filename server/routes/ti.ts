// Modul 6: TI (Telematik-Infrastruktur) Routes — Status, Cards, eGK, ePA stubs
import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  pingKonnektor,
  getConnectionStatus,
  updateConnectionStatus,
  readEGK,
  getTIConfig,
} from '../services/ti';
import { isFeatureEnabled } from '../services/system';

const router = Router();

// All TI routes require authentication + ADMIN or ARZT role
router.use(requireAuth);

// Middleware: Check TI feature is enabled
function requireTI(_req: Request, res: Response, next: Function) {
  if (!isFeatureEnabled('tiEnabled')) {
    res.status(403).json({
      error: 'TI-Integration ist im aktuellen Deployment-Modus nicht aktiviert',
      hint: 'Setzen Sie DEPLOYMENT_MODE=HYBRID oder LOCAL und TI_ENABLED=true',
    });
    return;
  }
  next();
}

router.use(requireTI);

// ─── Connection Status ──────────────────────────────────────

// GET /api/ti/status — Current TI connection status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await getConnectionStatus();
    if (!status) {
      res.json({
        configured: false,
        message: 'Kein TI-Konnektor konfiguriert',
        hint: 'Setzen Sie TI_KONNEKTOR_URL in den Umgebungsvariablen',
      });
      return;
    }
    res.json({ configured: true, ...status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ti/ping — Ping TI-Konnektor (refresh status)
router.post('/ping', async (_req: Request, res: Response) => {
  try {
    const result = await pingKonnektor();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ti/refresh — Full status refresh (ping + update DB)
router.post('/refresh', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const status = await updateConnectionStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Card Operations ────────────────────────────────────────

// GET /api/ti/cards — List inserted cards
router.get('/cards', async (_req: Request, res: Response) => {
  try {
    const status = await getConnectionStatus();
    if (!status) {
      res.json({ cards: [] });
      return;
    }
    res.json({ cards: status.cards });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ti/egk/read — Read eGK (Versichertenstammdaten)
router.post('/egk/read', async (_req: Request, res: Response) => {
  try {
    const result = await readEGK();
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.errorCode === 'NOT_IMPLEMENTED' ? 501 : 503).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Configuration ──────────────────────────────────────────

// GET /api/ti/config — TI connection configuration (masked)
router.get('/config', requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const config = getTIConfig();
    if (!config) {
      res.json({ configured: false });
      return;
    }
    res.json({
      configured: true,
      konnektorUrl: config.konnektorUrl,
      mandantId: config.mandantId,
      clientSystemId: config.clientSystemId,
      workplaceId: config.workplaceId,
      hasCert: !!config.clientCertPath,
      hasKey: !!config.clientKeyPath,
      hasCa: !!config.caCertPath,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── ePA Stubs ──────────────────────────────────────────────

// GET /api/ti/epa/status — ePA availability
router.get('/epa/status', async (_req: Request, res: Response) => {
  try {
    if (!isFeatureEnabled('epaEnabled')) {
      res.json({ enabled: false, message: 'ePA-Integration nicht aktiviert' });
      return;
    }
    const status = await getConnectionStatus();
    res.json({
      enabled: true,
      connected: status?.features.epa || false,
      message: status?.features.epa ? 'ePA verfügbar' : 'ePA nicht verbunden — Konnektor-Status prüfen',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ti/epa/documents — List ePA documents (stub)
router.get('/epa/documents', async (req: Request, res: Response) => {
  try {
    const db = (globalThis as any).__prisma;
    if (!db) { res.json([]); return; }

    const kvnr = req.query.kvnr as string;
    if (!kvnr) {
      res.status(400).json({ error: 'kvnr Parameter erforderlich' });
      return;
    }

    const docs = await db.ePADocument.findMany({
      where: { patientKvnr: kvnr },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── KIM Stubs ──────────────────────────────────────────────

// GET /api/ti/kim/status — KIM availability
router.get('/kim/status', async (_req: Request, res: Response) => {
  try {
    if (!isFeatureEnabled('kimEnabled')) {
      res.json({ enabled: false, message: 'KIM-Integration nicht aktiviert' });
      return;
    }
    res.json({ enabled: true, message: 'KIM-Modul verfügbar (Stub-Modus)' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ti/kim/messages — List KIM messages (stub)
router.get('/kim/messages', async (req: Request, res: Response) => {
  try {
    const db = (globalThis as any).__prisma;
    if (!db) { res.json([]); return; }

    const status = req.query.status as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const where: any = {};
    if (status) where.status = status;

    const messages = await db.kIMMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
