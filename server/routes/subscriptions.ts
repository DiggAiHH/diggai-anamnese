import { Router, Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

/** Extract a route param as a guaranteed string (Express 5 compat) */
function param(req: Request, key: string): string {
    const v = req.params[key];
    return Array.isArray(v) ? v[0] : v;
}

const router = Router();

/**
 * GET /api/subscriptions/plans
 * Get all available plans (public)
 */
router.get('/plans', (_req: Request, res: Response) => {
  const plans = [
    {
      id: 'STARTER',
      name: 'Starter',
      price: 4900,
      priceFormatted: '€49.00',
      quota: 100,
      maxDoctors: 1,
      features: [
        '1 Arzt',
        '100 Anamnesen/Monat',
        '2 Sprachen (DE/EN)',
        'PDF-Export',
        'E-Mail Support'
      ]
    },
    {
      id: 'PROFESSIONAL',
      name: 'Professional',
      price: 9900,
      priceFormatted: '€99.00',
      quota: 500,
      maxDoctors: 3,
      features: [
        '3 Ärzte',
        'Unlimitierte Anamnesen',
        '5 Sprachen',
        '500 KI-Auswertungen inkl.',
        'PVS-Export',
        'Priority Support'
      ],
      recommended: true
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: 19900,
      priceFormatted: '€199.00',
      quota: -1, // unlimited
      maxDoctors: -1, // unlimited
      features: [
        'Unlimitierte Ärzte',
        'Alle 10 Sprachen',
        'Unlimitierte KI-Auswertungen',
        'API-Zugang',
        'Dedizierter Account Manager',
        'Custom Integration'
      ]
    }
  ];

  res.json({ plans });
});

/**
 * POST /api/subscriptions
 * Create a new subscription (admin only)
 */
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { praxisId, tier, paymentMethodId } = req.body;

    if (!praxisId || !tier) {
      return res.status(400).json({ error: 'praxisId and tier are required' });
    }

    const result = await subscriptionService.createSubscription({
      praxisId,
      tier,
      paymentMethodId
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/subscriptions/praxis/:praxisId
 * Get subscription for a specific praxis
 */
router.get('/praxis/:praxisId', requireAuth, async (req: Request, res: Response) => {
  try {
    const praxisId = param(req, 'praxisId');
    const prisma = (await import('@prisma/client')).PrismaClient;
    const client = new prisma();

    const subscription = await client.subscription.findUnique({
      where: { praxisId }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Get usage stats
    const usage = await subscriptionService.getUsage(praxisId);

    res.json({ subscription, usage });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * GET /api/subscriptions/:id
 * Get subscription details
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const prisma = (await import('@prisma/client')).PrismaClient;
    const client = new prisma();

    const subscription = await client.subscription.findUnique({
      where: { id }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * PATCH /api/subscriptions/:id
 * Update subscription tier
 */
router.patch('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const { tier } = req.body;

    if (!tier) {
      return res.status(400).json({ error: 'tier is required' });
    }

    const result = await subscriptionService.updateSubscription(id, tier);
    res.json(result);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to update subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Cancel subscription
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const result = await subscriptionService.cancelSubscription(id);
    res.json(result);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ 
      error: 'Failed to cancel subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/subscriptions/:id/usage
 * Get usage statistics
 */
router.get('/:id/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const prisma = (await import('@prisma/client')).PrismaClient;
    const client = new prisma();

    const subscription = await client.subscription.findUnique({
      where: { id }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const usage = await subscriptionService.getUsage(subscription.praxisId);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

/**
 * POST /api/subscriptions/:id/reset-quota
 * Reset AI quota (admin only)
 */
router.post('/:id/reset-quota', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const prisma = (await import('@prisma/client')).PrismaClient;
    const client = new prisma();

    const subscription = await client.subscription.update({
      where: { id },
      data: { aiQuotaUsed: 0 }
    });

    res.json({ subscription });
  } catch (error) {
    console.error('Error resetting quota:', error);
    res.status(500).json({ error: 'Failed to reset quota' });
  }
});

/**
 * GET /api/subscriptions/check-quota/:praxisId
 * Check if praxis has available quota
 */
router.get('/check-quota/:praxisId', requireAuth, async (req: Request, res: Response) => {
  try {
    const praxisId = param(req, 'praxisId');
    const { amount } = req.query;
    const requestedAmount = parseInt(amount as string) || 1;

    const hasQuota = await subscriptionService.hasQuota(praxisId, requestedAmount);
    const usage = await subscriptionService.getUsage(praxisId);

    res.json({ 
      hasQuota, 
      usage,
      requestedAmount
    });
  } catch (error) {
    console.error('Error checking quota:', error);
    res.status(500).json({ error: 'Failed to check quota' });
  }
});

export default router;
