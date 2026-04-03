// ─── Billing Analytics Routes ─────────────────────────────
// Dashboard-Daten für Billing-Metriken
// MRR, Churn, Conversion Rates, etc.

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getPrismaClientForDomain } from '../db.js';
import { billingMonitor } from '../services/billingMonitor.js';

const router = Router();
const prisma = getPrismaClientForDomain('company');

/**
 * GET /api/billing-analytics/overview
 * Übersicht der wichtigsten Billing-Metriken
 */
router.get('/overview', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries für bessere Performance
    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      mrrData,
      recentPayments,
      stripeData,
    ] = await Promise.all([
      // Gesamtzahl Subscriptions
      (prisma as any).subscription.count(),

      // Aktive Subscriptions
      (prisma as any).subscription.count({
        where: { status: 'ACTIVE' },
      }),

      // Trial Subscriptions
      (prisma as any).subscription.count({
        where: { status: 'TRIAL' },
      }),

      // Kürzlich gekündigte (letzte 30 Tage)
      (prisma as any).subscription.count({
        where: {
          status: 'CANCELLED',
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),

      // MRR berechnen
      (prisma as any).subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        select: { tier: true },
      }),

      // Letzte Zahlungen
      billingMonitor.getPaymentMetrics(30),

      // Stripe Daten
      getStripeMetrics(),
    ]);

    // MRR berechnen (Monthly Recurring Revenue)
    const tierPrices: Record<string, number> = {
      'STARTER': 79,
      'PROFESSIONAL': 179,
      'ENTERPRISE': 399,
    };

    const mrr = mrrData.reduce((sum: number, sub: any) => {
      return sum + (tierPrices[sub.tier] || 0);
    }, 0);

    // ARPU (Average Revenue Per User)
    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

    // Churn Rate (letzte 30 Tage)
    const totalActiveLastMonth = activeSubscriptions + cancelledSubscriptions;
    const churnRate = totalActiveLastMonth > 0
      ? (cancelledSubscriptions / totalActiveLastMonth)
      : 0;

    res.json({
      summary: {
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        mrr: Math.round(mrr),
        arpu: Math.round(arpu),
        churnRate: Math.round(churnRate * 100) / 100,
        churnRatePercent: `${(churnRate * 100).toFixed(1)}%`,
      },
      payments: {
        totalRevenue30d: recentPayments.totalRevenue,
        successRate: recentPayments.successRate,
        totalTransactions: recentPayments.totalTransactions,
        byType: recentPayments.byType,
      },
      stripe: stripeData,
      trends: {
        // Hier könnten historische Daten für Charts kommen
        mrrGrowth: 0, // TODO: Vergleich mit Vorperiode
        subscriberGrowth: 0,
      },
    });
  } catch (error: any) {
    console.error('[BillingAnalytics] Overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/billing-analytics/subscriptions
 * Detaillierte Subscription-Daten
 */
router.get('/subscriptions', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, tier, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (tier) where.tier = tier;

    const [subscriptions, total] = await Promise.all([
      (prisma as any).subscription.findMany({
        where,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              name: true,
              subdomain: true,
              stripeCustomerId: true,
            },
          },
        },
      }),
      (prisma as any).subscription.count({ where }),
    ]);

    res.json({
      subscriptions: subscriptions.map((sub: any) => ({
        id: sub.id,
        tier: sub.tier,
        status: sub.status,
        praxisName: sub.tenant?.name,
        subdomain: sub.tenant?.subdomain,
        aiQuotaUsed: sub.aiQuotaUsed,
        aiQuotaTotal: sub.aiQuotaTotal,
        startedAt: sub.startedAt,
        endsAt: sub.endsAt,
        createdAt: sub.createdAt,
      })),
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    console.error('[BillingAnalytics] Subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * GET /api/billing-analytics/revenue
 * Revenue-Daten für Charts
 */
router.get('/revenue', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // Tägliche Revenue aggregieren
    const transactions = await (prisma as any).paymentTransaction.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: since },
      },
      select: {
        amount: true,
        completedAt: true,
      },
    });

    // Nach Datum gruppieren
    const dailyRevenue: Record<string, number> = {};
    transactions.forEach((tx: any) => {
      const date = new Date(tx.completedAt).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + tx.amount;
    });

    // Für alle Tage im Zeitraum Daten aufbereiten
    const result = [];
    for (let i = 0; i < daysNum; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      result.unshift({
        date: dateStr,
        revenue: dailyRevenue[dateStr] || 0,
      });
    }

    res.json({
      dailyRevenue: result,
      total: transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0),
      averagePerDay: result.reduce((sum, day) => sum + day.revenue, 0) / daysNum,
    });
  } catch (error: any) {
    console.error('[BillingAnalytics] Revenue error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

/**
 * GET /api/billing-analytics/health
 * Health Status des Billing Systems
 */
router.get('/health', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const health = await billingMonitor.healthCheck();
    const metrics = await billingMonitor.getPaymentMetrics(24);

    res.json({
      healthy: health.healthy,
      checks: health.checks,
      last24h: {
        totalTransactions: metrics.totalTransactions,
        successRate: metrics.successRate,
        failedPayments: metrics.failedPayments,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[BillingAnalytics] Health error:', error);
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

// Helper: Stripe Metriken abrufen
async function getStripeMetrics() {
  try {
    const { stripe } = await import('../config/stripe.js');

    // Letzte 30 Tage
    const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

    const [charges, refunds, disputes] = await Promise.all([
      stripe.charges.list({
        created: { gte: since },
        limit: 100,
      }),
      stripe.refunds.list({
        created: { gte: since },
        limit: 100,
      }),
      stripe.disputes.list({
        created: { gte: since },
        limit: 100,
      }),
    ]);

    const successfulCharges = charges.data.filter(c => c.status === 'succeeded');
    const totalVolume = successfulCharges.reduce((sum, c) => sum + c.amount, 0);

    return {
      charges: charges.data.length,
      successfulCharges: successfulCharges.length,
      refunds: refunds.data.length,
      disputes: disputes.data.length,
      totalVolume: totalVolume / 100, // Cent zu Euro
      averageCharge: successfulCharges.length > 0
        ? (totalVolume / successfulCharges.length / 100)
        : 0,
    };
  } catch (error) {
    console.error('[BillingAnalytics] Stripe metrics error:', error);
    return null;
  }
}

export default router;
