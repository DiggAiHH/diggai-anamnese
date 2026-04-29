import { Router } from 'express';
import { config } from '../config';
import { checkDatabaseHealthByDomain } from '../db';
import { getRedisClient, isRedisReady } from '../redis';

const router = Router();

type HealthStatus = 'ok' | 'error' | 'degraded' | 'disabled' | 'unknown';

router.get('/', async (_req, res) => {
    const startTime = Date.now();
    const redis = getRedisClient();
    const activeDomains = config.enabledDatabaseDomains;

    const checks: {
        database: { status: HealthStatus; responseTime: number };
        redis: { status: HealthStatus; responseTime: number };
        disk: { status: HealthStatus; freePercent: number };
        memory: { status: HealthStatus; usedPercent: number };
    } = {
        database: { status: 'unknown', responseTime: 0 },
        redis: { status: 'unknown', responseTime: 0 },
        disk: { status: 'unknown', freePercent: 0 },
        memory: { status: 'unknown', usedPercent: 0 },
    };

    // Check DB connectivity (multi-domain aware)
    const domainChecks = await checkDatabaseHealthByDomain(activeDomains);
    const databaseErrors = activeDomains.filter((domain) => domainChecks[domain]?.status !== 'ok');
    const maxDomainResponseTime = activeDomains.reduce((max, domain) => {
        const responseTime = domainChecks[domain]?.responseTime || 0;
        return Math.max(max, responseTime);
    }, 0);

    checks.database = {
        status: databaseErrors.length === 0
            ? 'ok'
            : databaseErrors.length === activeDomains.length
                ? 'error'
                : 'degraded',
        responseTime: maxDomainResponseTime,
    };

    // Check Redis connectivity
    if (redis && isRedisReady()) {
        try {
            const redisStart = Date.now();
            await redis.ping();
            checks.redis = {
                status: 'ok',
                responseTime: Date.now() - redisStart
            };
        } catch {
            checks.redis.status = 'error';
        }
    } else {
        checks.redis.status = 'disabled';
    }

    // Check Disk Space (if available)
    try {
        const os = await import('os');
        const fs = await import('fs');
        const tmpDir = os.tmpdir();
        const stats = fs.statfsSync(tmpDir);
        const freePercent = (stats.bavail / stats.blocks) * 100;
        checks.disk = {
            status: freePercent > 10 ? 'ok' : freePercent > 5 ? 'degraded' : 'error',
            freePercent: Math.round(freePercent * 100) / 100
        };
    } catch {
        checks.disk.status = 'unknown';
    }

    // Check Memory
    try {
        const totalMem = process.memoryUsage().heapTotal;
        const usedMem = process.memoryUsage().heapUsed;
        const usedPercent = (usedMem / totalMem) * 100;
        checks.memory = {
            status: usedPercent < 85 ? 'ok' : usedPercent < 95 ? 'degraded' : 'error',
            usedPercent: Math.round(usedPercent * 100) / 100
        };
    } catch {
        checks.memory.status = 'unknown';
    }

    const { agentService } = await import('../services/agent/agent.service');
    const agentList = agentService.listAgents().map(a => ({ name: a.name, online: a.online, busy: a.busy }));

    const responseTime = Date.now() - startTime;
    const databaseIsCritical = checks.database.status === 'error';
    const isDegraded = checks.database.status === 'degraded' ||
        checks.redis.status === 'error' ||
        checks.disk.status === 'degraded' ||
        checks.memory.status === 'degraded';

    const overallStatus = databaseIsCritical
        ? 'error'
        : isDegraded
            ? 'degraded'
            : 'ok';

    res.status(databaseIsCritical ? 503 : 200).json({
        status: overallStatus,
        version: process.env.npm_package_version || '3.0.0',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        backendProfile: config.backendProfile,
        activeDomains,
        db: checks.database.status === 'ok' ? 'connected' : checks.database.status,
        databaseDomains: domainChecks,
        redis: checks.redis.status === 'ok' ? 'connected' : checks.redis.status === 'disabled' ? 'disabled' : 'error',
        uptime: Math.floor(process.uptime()),
        agents: agentList,
        reminderWorker: 'running',
        responseTime,
        checks
    });
});

export default router;
