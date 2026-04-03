// ─── Checkout Routes ───────────────────────────────────────
// Stripe Checkout Session for Subscription Sign-up
// Redirects to Stripe-hosted checkout page

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { stripe } from '../config/stripe.js';
import { requireAuth } from '../middleware/auth.js';
import { getPrismaClientForDomain } from '../db.js';

const router = Router();
const prisma = getPrismaClientForDomain('company');

// ─── Schemas ───────────────────────────────────────────────

const createCheckoutSchema = z.object({
  planId: z.enum(['starter', 'professional', 'enterprise']),
  praxisId: z.string().optional(), // If not provided, uses authenticated user's praxis
  email: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// ─── Helper Functions ──────────────────────────────────────

function getPriceId(planId: string): string {
  const envVar = `STRIPE_PRICE_${planId.toUpperCase()}`;
  const priceId = process.env[envVar];

  if (!priceId) {
    throw new Error(`Stripe price ID not configured for plan: ${planId} (expected ${envVar})`);
  }

  return priceId;
}

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

// ─── Routes ────────────────────────────────────────────────

/**
 * POST /api/checkout/session
 * Create a Stripe Checkout session for subscription
 * Returns URL to redirect user to Stripe-hosted checkout
 */
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { planId, praxisId: bodyPraxisId, email: bodyEmail, successUrl, cancelUrl } = createCheckoutSchema.parse(req.body);

    // Get user info from auth if available
    const user = (req as any).user;
    const praxisId = bodyPraxisId || user?.praxisId || user?.tenantId;
    const email = bodyEmail || user?.email;

    if (!praxisId) {
      return res.status(400).json({ error: 'Praxis ID is required' });
    }

    // Get price ID
    const priceId = getPriceId(planId);

    // Get or create Stripe customer
    let customerId: string;
    const tenant = await prisma.tenant.findUnique({
      where: { id: praxisId }
    });

    if (tenant?.stripeCustomerId) {
      customerId = tenant.stripeCustomerId;
    } else {
      // Create new customer
      if (!email) {
        return res.status(400).json({ error: 'Email is required to create customer' });
      }

      const customer = await stripe.customers.create({
        email,
        name: user?.name || email,
        metadata: {
          praxisId,
          source: 'diggai-checkout',
        },
      });

      customerId = customer.id;

      // Save customer ID to tenant
      await prisma.tenant.update({
        where: { id: praxisId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'sepa_debit'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
        metadata: {
          praxisId,
          planId,
          source: 'diggai-checkout',
        },
      },
      success_url: successUrl || `${getFrontendUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${getFrontendUrl()}/pricing?cancelled=true`,
      locale: 'de',
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      custom_text: {
        submit: {
          message: 'Sie erhalten 14 Tage kostenlos. Danach beginnt die reguläre Abrechnung.',
        },
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.flatten(),
      });
    }

    console.error('[Checkout] Session creation failed:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
});

/**
 * GET /api/checkout/session/:id
 * Get checkout session status
 */
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['subscription', 'customer'],
    });

    res.json({
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      subscriptionId: session.subscription,
      customerId: session.customer,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
    });
  } catch (error: any) {
    console.error('[Checkout] Failed to retrieve session:', error);
    res.status(500).json({
      error: 'Failed to retrieve session',
      message: error.message,
    });
  }
});

/**
 * POST /api/checkout/verify
 * Verify checkout completion and sync subscription to database
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve session with expanded subscription
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(400).json({
        error: 'Checkout not completed',
        status: session.status,
        paymentStatus: session.payment_status,
      });
    }

    const subscription = session.subscription as any;
    const praxisId = subscription?.metadata?.praxisId;
    const planId = subscription?.metadata?.planId;

    if (!praxisId || !planId) {
      return res.status(400).json({ error: 'Missing metadata in subscription' });
    }

    // Update or create subscription in database
    const tier = planId.toUpperCase();
    const dbSubscription = await prisma.subscription.upsert({
      where: { praxisId },
      create: {
        praxisId,
        tier,
        status: 'TRIAL',
        stripeSubId: subscription.id,
        stripeCustId: session.customer as string,
        aiQuotaTotal: tier === 'STARTER' ? 100 : tier === 'PROFESSIONAL' ? 500 : -1, // -1 = unlimited
        aiQuotaUsed: 0,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      },
      update: {
        tier,
        status: 'TRIAL',
        stripeSubId: subscription.id,
        stripeCustId: session.customer as string,
        aiQuotaTotal: tier === 'STARTER' ? 100 : tier === 'PROFESSIONAL' ? 500 : -1,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      success: true,
      subscription: {
        id: dbSubscription.id,
        tier: dbSubscription.tier,
        status: dbSubscription.status,
        trialEndsAt: dbSubscription.endsAt,
      },
      stripeSubscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      },
    });
  } catch (error: any) {
    console.error('[Checkout] Verification failed:', error);
    res.status(500).json({
      error: 'Failed to verify checkout',
      message: error.message,
    });
  }
});

/**
 * POST /api/checkout/portal
 * Create Stripe Customer Portal session for managing subscription
 */
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
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
      return res.status(404).json({ error: 'No Stripe customer found' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${getFrontendUrl()}/verwaltung/billing`,
    });

    res.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('[Checkout] Portal creation failed:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error.message,
    });
  }
});

export default router;
