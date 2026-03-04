// Modul 6: System Management Routes — Config, Backup, Network, Deployment
import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getDeploymentInfo,
  getFeatureFlags,
  getSystemConfigs,
  updateSystemConfig,
  initializeDefaultConfigs,
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  getBackupSchedule,
  getNetworkStatus,
  startNetworkMonitor,
  getCachedNetworkStatus,
} from '../services/system';

const router = Router();

// All system routes require ADMIN authentication
router.use(requireAuth, requireRole('ADMIN'));

// ─── Deployment Info ────────────────────────────────────────

// GET /api/system/deployment — Current deployment mode + features
router.get('/deployment', async (_req: Request, res: Response) => {
  try {
    const info = await getDeploymentInfo();
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/system/features — Feature flags
router.get('/features', async (_req: Request, res: Response) => {
  try {
    const flags = getFeatureFlags();
    res.json(flags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── System Configuration ───────────────────────────────────

// GET /api/system/config — All configs (optionally filtered by category)
router.get('/config', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const configs = await getSystemConfigs(category);
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/system/config — Update a config value
router.put('/config', async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ error: 'key und value sind erforderlich' });
      return;
    }
    const userId = (req as any).userId || 'unknown';
    const updated = await updateSystemConfig(key, String(value), userId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/system/config/initialize — Initialize default configs
router.post('/config/initialize', async (_req: Request, res: Response) => {
  try {
    await initializeDefaultConfigs();
    res.json({ success: true, message: 'Standard-Konfigurationen initialisiert' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Backup Management ──────────────────────────────────────

// GET /api/system/backups — List all backups
router.get('/backups', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const backups = await listBackups({ status, limit });
    res.json(backups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/system/backups — Create new backup
router.post('/backups', async (req: Request, res: Response) => {
  try {
    const { type, tables } = req.body;
    const backup = await createBackup({ type, trigger: 'manual', tables });
    res.status(201).json(backup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/system/backups/:id/restore — Restore from backup
router.post('/backups/:id/restore', async (req: Request, res: Response) => {
  try {
    const { verifyChecksum, targetTables } = req.body;
    const result = await restoreBackup({
      backupId: req.params.id,
      verifyChecksum: verifyChecksum !== false,
      targetTables,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/system/backups/:id — Delete a backup
router.delete('/backups/:id', async (req: Request, res: Response) => {
  try {
    await deleteBackup(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/system/backups/schedule — Get backup schedule
router.get('/backups/schedule', async (_req: Request, res: Response) => {
  try {
    const schedule = await getBackupSchedule();
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Network Status ─────────────────────────────────────────

// GET /api/system/network — Full network health check
router.get('/network', async (_req: Request, res: Response) => {
  try {
    const status = await getNetworkStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/system/network/cached — Last cached network status (fast)
router.get('/network/cached', async (_req: Request, res: Response) => {
  try {
    const status = getCachedNetworkStatus();
    if (!status) {
      res.status(404).json({ error: 'Noch kein Netzwerkstatus verfügbar' });
      return;
    }
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/system/network/monitor/start — Start network monitoring
router.post('/network/monitor/start', async (req: Request, res: Response) => {
  try {
    const intervalSec = req.body.intervalSec || 60;
    startNetworkMonitor(intervalSec);
    res.json({ success: true, message: `Netzwerk-Monitoring gestartet (Intervall: ${intervalSec}s)` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── System Logs ────────────────────────────────────────────

// GET /api/system/logs — Recent system log entries (from audit log)
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const db = (globalThis as any).__prisma;
    if (!db) { res.json([]); return; }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const level = req.query.level as string | undefined;
    const service = req.query.service as string | undefined;

    const where: any = {};
    if (level) where.action = { contains: level.toUpperCase() };
    if (service) where.resource = { contains: service };

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(logs.map((l: any) => ({
      id: l.id,
      level: l.action?.includes('ERROR') ? 'error' : l.action?.includes('WARN') ? 'warn' : 'info',
      service: l.resource?.split('/')[0] || 'system',
      message: l.action,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
      timestamp: l.createdAt.toISOString(),
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── System Info ────────────────────────────────────────────

// GET /api/system/info — System overview (uptime, versions, disk, memory)
router.get('/info', async (_req: Request, res: Response) => {
  try {
    const os = await import('os');
    res.json({
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      processMemory: process.memoryUsage(),
      loadAverage: os.loadavg(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
