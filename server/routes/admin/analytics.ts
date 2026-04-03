import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { getSecurityMetrics, getUserLoginStats } from '../../services/auth/analytics.service';
import { prisma } from '../../db';
import type { Request, Response } from 'express';

const router = Router();

// All routes require admin
router.use(requireAuth, requireRole('admin'));

/**
 * GET /api/admin/analytics/security
 * Get system-wide security metrics
 */
router.get('/security', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const metrics = await getSecurityMetrics(since);

    res.json({
      ...metrics,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('[Analytics] Security metrics error:', error);
    res.status(500).json({ error: 'Metrics could not be loaded' });
  }
});

/**
 * GET /api/admin/analytics/users/:userId
 * Get user-specific login statistics
 */
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const stats = await getUserLoginStats(userId);

    res.json(stats);
  } catch (error) {
    console.error('[Analytics] User stats error:', error);
    res.status(500).json({ error: 'User stats could not be loaded' });
  }
});

/**
 * GET /api/admin/analytics/suspicious
 * Get list of suspicious activities
 */
router.get('/suspicious', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'SECURITY:SUSPICIOUS_ACTIVITY',
            'SECURITY:IMPOSSIBLE_TRAVEL',
            'SECURITY:ACCOUNT_LOCKED',
          ],
        },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        userId: true,
        action: true,
        resource: true,
        ipAddress: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
      },
    });

    res.json({ activities });
  } catch (error) {
    console.error('[Analytics] Suspicious activities error:', error);
    res.status(500).json({ error: 'Activities could not be loaded' });
  }
});

/**
 * GET /api/admin/analytics/login-trends
 * Get login trends over time
 */
router.get('/login-trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get daily login counts
    const loginData = await prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        action: 'SECURITY:LOGIN_SUCCESS',
        createdAt: { gte: since },
      },
      _count: {
        _all: true,
      },
    });

    // Get daily failed login counts
    const failedData = await prisma.auditLog.groupBy({
      by: ['createdAt'],
      where: {
        action: 'SECURITY:LOGIN_FAILED',
        createdAt: { gte: since },
      },
      _count: {
        _all: true,
      },
    });

    // Aggregate by date
    const trends = new Map<
      string,
      { date: string; successful: number; failed: number }
    >();

    for (const entry of loginData) {
      const date = entry.createdAt.toISOString().split('T')[0];
      const existing = trends.get(date);
      if (existing) {
        existing.successful += entry._count._all;
      } else {
        trends.set(date, { date, successful: entry._count._all, failed: 0 });
      }
    }

    for (const entry of failedData) {
      const date = entry.createdAt.toISOString().split('T')[0];
      const existing = trends.get(date);
      if (existing) {
        existing.failed += entry._count._all;
      } else {
        trends.set(date, { date, successful: 0, failed: entry._count._all });
      }
    }

    res.json({
      trends: Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date)),
      period: `${days} days`,
    });
  } catch (error) {
    console.error('[Analytics] Login trends error:', error);
    res.status(500).json({ error: 'Login trends could not be loaded' });
  }
});

/**
 * GET /api/admin/analytics/risk-distribution
 * Get distribution of risk scores
 */
router.get('/risk-distribution', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Count suspicious activities by severity (based on metadata riskScore)
    const suspiciousActivities = await prisma.auditLog.findMany({
      where: {
        action: 'SECURITY:SUSPICIOUS_ACTIVITY',
        createdAt: { gte: since },
      },
      select: {
        metadata: true,
      },
    });

    const distribution = {
      low: 0, // 0-30
      medium: 0, // 31-50
      high: 0, // 51-75
      critical: 0, // 76-100
    };

    for (const activity of suspiciousActivities) {
      if (activity.metadata) {
        try {
          const metadata = JSON.parse(activity.metadata) as { riskScore?: number };
          const score = metadata.riskScore ?? 0;
          if (score <= 30) {
            distribution.low++;
          } else if (score <= 50) {
            distribution.medium++;
          } else if (score <= 75) {
            distribution.high++;
          } else {
            distribution.critical++;
          }
        } catch {
          // Invalid JSON, skip
          distribution.low++;
        }
      }
    }

    res.json({
      distribution,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('[Analytics] Risk distribution error:', error);
    res.status(500).json({ error: 'Risk distribution could not be loaded' });
  }
});

export default router;
