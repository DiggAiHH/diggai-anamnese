// ─── Billing Routes ────────────────────────────────────────
// Stripe Integration v2 - PCI-Compliant Billing API
// Routes: Setup Intent, Subscription, Webhook, Status

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  billingService,
  createSetupIntent,
  createCustomer,
  getSubscription,
  listPaymentMethods,
  listInvoices,
  getUpcomingInvoice,
  constructWebhookEvent,
  handleWebhookEvent
} from '../services/billing.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ─── Schemas ───────────────────────────────────────────────

const setupIntentSchema = z.object({
  customerId: z.string().optional(),
  email: z.string().email().optional()
});

const createSubscriptionSchema = z.object({
  tier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  priceId: z.string().optional(), // If not provided, will use env var
  trial: z.boolean().default(true)
});

const cancelSubscriptionSchema = z.object({
  stripeSubscriptionId: z.string()
});

// ─── Setup Intent Routes ───────────────────────────────────

/**
 * POST /api/billing/setup-intent
 * Create a Setup Intent for saving payment method
 * Used by Stripe Elements to securely collect card details
 */
router.post('/setup-intent', requireAuth, async (req: Request, res: Response) => {
  try {
    const { customerId, email } = setupIntentSchema.parse(req.body);

    // Get praxisId from authenticated user
    const user = (req as any).user;
    const praxisId = user?.praxisId || user?.tenantId;

    if (!praxisId) {
      return res.status(400).json({ error: 'No praxis ID found for user' });
    }

    // Get or create customer
    let stripeCustomerId = customerId;
    if (!stripeCustomerId) {
      const customerEmail = email || user.email;
      if (!customerEmail) {
        return res.status(400).json({ error: 'Email required to create customer' });
      }
      const customer = await createCustomer({
        praxisId,
        email: customerEmail,
        name: user.name
      });
      stripeCustomerId = customer.id;
    }

    // Create setup intent
    const result = await createSetupIntent(stripeCustomerId);

    res.json({
      clientSecret: result.clientSecret,
      customerId: stripeCustomerId
    });
  } catch (error: any) {
    console.error('[Billing] Setup intent error:', error);
    res.status(500).json({
      error: 'Failed to create setup intent',
      message: error.message
    });
  }
});

// ─── Subscription Routes ───────────────────────────────────

/**
 * POST /api/billing/subscription
 * Create a new subscription
 */
router.post('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tier, priceId: customPriceId, trial } = createSubscriptionSchema.parse(req.body);

    const user = (req as any).user;
    const praxisId = user?.praxisId || user?.tenantId;

    if (!praxisId) {
      return res.status(400).json({ error: 'No praxis ID found' });
    }

    // Get tenant and check for existing customer
    const tenant = await prisma.tenant.findUnique({
      where: { id: praxisId }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get or create customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      if (!user.email) {
        return res.status(400).json({ error: 'User email required' });
      }
      const customer = await createCustomer({
        praxisId,
        email: user.email,
        name: user.name || user.email
      });
      customerId = customer.id;
    }

    // Get price ID
    const priceId = customPriceId || getPriceIdFromEnv(tier);

    // Create subscription
    let result;
    if (trial) {
      result = await billingService.createSubscriptionWithTrial({
        customerId,
        priceId,
        praxisId,
        tier
      });
    } else {
      result = await billingService.createSubscription({
        customerId,
        priceId,
        praxisId,
        tier
      });
    }

    res.status(201).json(result);
  } catch (error: any) {
    console.error('[Billing] Create subscription error:', error);
    res.status(500).json({
      error: 'Failed to create subscription',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/subscription
 * Get current subscription status
 */
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const praxisId = user?.praxisId || user?.tenantId;

    if (!praxisId) {
      return res.status(400).json({ error: 'No praxis ID found' });
    }

    // Get subscription from database
    const subscription = await prisma.subscription.findUnique({
      where: { praxisId }
    });

    if (!subscription || !subscription.stripeSubId) {
      return res.json({
        hasSubscription: false,
        subscription: null
      });
    }

    // Get fresh data from Stripe
    const stripeSubscription = await getSubscription(subscription.stripeSubId);

    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        stripeStatus: stripeSubscription.status,
        currentPeriodEnd: (stripeSubscription as unknown as Record<string, unknown>).current_period_end ?? null,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        aiQuotaUsed: subscription.aiQuotaUsed,
        aiQuotaTotal: subscription.aiQuotaTotal,
        startedAt: subscription.startedAt,
        endsAt: subscription.endsAt
      }
    });
  } catch (error: any) {
    console.error('[Billing] Get subscription error:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription',
      message: error.message
    });
  }
});

/**
 * DELETE /api/billing/subscription
 * Cancel subscription at period end
 */
router.delete('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const praxisId = user?.praxisId || user?.tenantId;

    if (!praxisId) {
      return res.status(400).json({ error: 'No praxis ID found' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { praxisId }
    });

    if (!subscription?.stripeSubId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const result = await billingService.cancelSubscription(subscription.stripeSubId);

    res.json({
      success: true,
      cancelAtPeriodEnd: result.cancel_at_period_end,
      currentPeriodEnd: (result as unknown as Record<string, unknown>).current_period_end ?? null
    });
  } catch (error: any) {
    console.error('[Billing] Cancel subscription error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error.message
    });
  }
});

// ─── Payment Method Routes ─────────────────────────────────

/**
 * GET /api/billing/payment-methods
 * List saved payment methods
 */
router.get('/payment-methods', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const praxisId = user?.praxisId || user?.tenantId;

    if (!praxisId) {
      return res.status(400).json({ error: 'No praxis ID found' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: praxisId }
    });

    if (!tenant?.stripeCustomerId) {
      return res.json({ methods: [] });
    }

    const methods = await listPaymentMethods(tenant.stripeCustomerId);

    res.json({
      methods: methods.map(m => ({
        id: m.id,
        type: m.type,
        card: m.card ? {
          brand: m.card.brand,
          last4: m.card.last4,
          expMonth: m.card.exp_month,
          expYear: m.card.exp_year
        } : null
      }))
    });
  } catch (error: any) {
    console.error('[Billing] List payment methods error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment methods',
      message: error.message
    });
  }
});

// ─── Invoice Routes ────────────────────────────────────────

/**
 * GET /api/billing/invoices
 * List invoices for current tenant
 */
router.get('/invoices', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const praxisId = user?.praxisId || user?.tenantId;

    if (!praxisId) {
      return res.status(400).json({ error: 'No praxis ID found' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: praxisId }
    });

    if (!tenant?.stripeCustomerId) {
      return res.json({ invoices: [], upcoming: null });
    }

    const [invoices, upcoming] = await Promise.all([
      listInvoices(tenant.stripeCustomerId),
      getUpcomingInvoice(tenant.stripeCustomerId)
    ]);

    res.json({
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        periodStart: inv.period_start,
        periodEnd: inv.period_end,
        pdfUrl: inv.invoice_pdf,
        subscription: inv.parent?.subscription_details?.subscription ?? null
      })),
      upcoming: upcoming ? {
        amountDue: upcoming.amount_due,
        currency: upcoming.currency,
        periodStart: upcoming.period_start,
        periodEnd: upcoming.period_end
      } : null
    });
  } catch (error: any) {
    console.error('[Billing] List invoices error:', error);
    res.status(500).json({
      error: 'Failed to fetch invoices',
      message: error.message
    });
  }
});

// ─── Webhook Handler ───────────────────────────────────────

/**
 * POST /api/billing/webhook
 * Handle Stripe webhooks with signature verification
 * Note: This is mounted separately in index.ts with raw body parsing
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    console.error('[Billing] Webhook missing signature');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  if (!endpointSecret) {
    console.error('[Billing] Webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    // Verify webhook signature
    const event = constructWebhookEvent(
      req.body as string | Buffer,
      sig,
      endpointSecret
    );

    console.log(`[Billing] Webhook received: ${event.type}`);

    // Process the event
    await handleWebhookEvent(event);

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Billing] Webhook error:', error.message);
    res.status(400).json({
      error: 'Webhook verification failed',
      message: error.message
    });
  }
});

// ─── Helper Functions ──────────────────────────────────────

function getPriceIdFromEnv(tier: string): string {
  const envVar = `STRIPE_PRICE_${tier}`;
  const priceId = process.env[envVar];

  if (!priceId) {
    throw new Error(`Price ID not configured. Set ${envVar} environment variable.`);
  }

  return priceId;
}

export default router;
