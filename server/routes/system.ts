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

// ─── Public System Routes ──────────────────────────────────

// POST /api/system/error-report — Frontend error fallback reporting
router.post('/error-report', async (req: Request, res: Response) => {
  try {
    const { errorId, routeType, message, stack, componentStack, url, timestamp } = req.body;
    
    // Log to console/audit log even if it's public (rate limited by global middleware)
    console.error(`[FrontendError:${routeType}] ID: ${errorId} | ${message}`);
    
    // Optional: save to database if we want to track them
    const db = (globalThis as any).__prisma;
    if (db) {
      await db.auditLog.create({
        data: {
          action: `FRONTEND_ERROR_${routeType.toUpperCase()}`,
          resource: url || 'unknown',
          metadata: JSON.stringify({ errorId, message, stack, componentStack, timestamp }),
          userId: 'client-report',
        }
      }).catch(() => {});
    }

    res.status(202).json({ success: true, id: errorId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// All following system routes require ADMIN authentication
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
      backupId: req.params.id as string,
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
    await deleteBackup(req.params.id as string);
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

// GET /api/system/backup-status — Backup health check
import { handleBackupHealthCheck } from '../jobs/backupMonitor';

router.get('/backup-status', async (_req: Request, res: Response) => {
  try {
    const status = await handleBackupHealthCheck();
    res.json(status);
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

// ─── Web Vitals & Performance Metrics ─────────────────────────

import { getRedisClient } from '../redis';

// POST /api/system/metrics/web-vitals - Frontend Web Vitals
router.post('/metrics/web-vitals', async (req: Request, res: Response) => {
  const { name, value, rating } = req.body;
  
  // Store in Redis for aggregation
  const redis = getRedisClient();
  if (redis) {
    const key = `metrics:webvitals:${name}`;
    await redis.lpush(key, JSON.stringify({ value, rating, ts: Date.now() }));
    await redis.ltrim(key, 0, 999); // Keep last 1000
    await redis.expire(key, 86400); // 24h TTL
  }
  
  res.status(204).send();
});

// POST /api/system/metrics/api-timing - API Performance
router.post('/metrics/api-timing', async (req: Request, res: Response) => {
  const { endpoint, duration } = req.body;
  
  const redis = getRedisClient();
  if (redis) {
    const key = `metrics:api:${endpoint}`;
    await redis.lpush(key, JSON.stringify({ duration, ts: Date.now() }));
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, 3600); // 1h TTL
  }
  
  res.status(204).send();
});

// GET /api/system/metrics/web-vitals - Get aggregated Web Vitals (admin only)
router.get('/metrics/web-vitals', async (_req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      res.json({ message: 'Redis not available' });
      return;
    }
    
    const metrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'];
    const result: Record<string, any> = {};
    
    for (const metric of metrics) {
      const key = `metrics:webvitals:${metric}`;
      const data = await redis.lrange(key, 0, 99);
      const parsed = data.map(d => JSON.parse(d));
      
      if (parsed.length > 0) {
        const values = parsed.map(p => p.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        result[metric] = {
          count: parsed.length,
          avg: Math.round(avg * 1000) / 1000,
          recent: parsed.slice(0, 10),
        };
      }
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
