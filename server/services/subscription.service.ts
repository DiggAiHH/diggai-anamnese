import { PrismaClient } from '@prisma/client';
import { stripe, PLANS, getQuotaForTier } from '../config/stripe.js';

const prisma = new PrismaClient();

export interface SubscriptionData {
  praxisId: string;
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  paymentMethodId?: string;
}

export class SubscriptionService {
  /**
   * Create a new subscription with Stripe
   */
  async createSubscription(data: SubscriptionData) {
    const { praxisId, tier, paymentMethodId } = data;
    const plan = PLANS[tier];
    
    if (!plan) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    // Get or create Stripe customer
    let customerId: string;
    const existingSub = await prisma.subscription.findUnique({
      where: { praxisId }
    });

    if (existingSub?.stripeCustId) {
      customerId = existingSub.stripeCustId;
      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId }
        });
      }
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        metadata: { praxisId }
      });
      customerId = customer.id;

      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId }
        });
      }
    }

    // Get Stripe Price ID from environment
    const priceId = this.getPriceIdForTier(tier);
    
    // Create Stripe subscription with trial
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 14,
      trial_settings: {
        end_behavior: { missing_payment_method: 'cancel' }
      },
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      metadata: { praxisId, tier }
    });

    // Create or update local subscription
    const subscription = await prisma.subscription.upsert({
      where: { praxisId },
      create: {
        praxisId,
        tier,
        status: 'TRIAL',
        stripeSubId: stripeSubscription.id,
        stripeCustId: customerId,
        aiQuotaTotal: plan.quota,
        aiQuotaUsed: 0,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
      },
      update: {
        tier,
        status: 'TRIAL',
        stripeSubId: stripeSubscription.id,
        stripeCustId: customerId,
        aiQuotaTotal: plan.quota,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    });

    return { subscription, stripeSubscription };
  }

  /**
   * Update subscription tier (upgrade/downgrade)
   */
  async updateSubscription(subscriptionId: string, newTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE') {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription || !subscription.stripeSubId) {
      throw new Error('Subscription not found');
    }

    const priceId = this.getPriceIdForTier(newTier);
    const plan = PLANS[newTier];

    // Retrieve current Stripe subscription
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubId);
    
    // Update Stripe subscription
    const updatedStripeSub = await stripe.subscriptions.update(subscription.stripeSubId, {
      items: [{
        id: stripeSub.items.data[0].id,
        price: priceId
      }],
      proration_behavior: 'create_prorations',
      metadata: { ...stripeSub.metadata, tier: newTier }
    });

    // Update local subscription
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        tier: newTier,
        aiQuotaTotal: plan.quota === Infinity ? -1 : plan.quota
      }
    });

    return { subscription: updated, stripeSubscription: updatedStripeSub };
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription || !subscription.stripeSubId) {
      throw new Error('Subscription not found');
    }

    // Cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripeSubId, {
      cancel_at_period_end: true
    });

    // Update local status
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { 
        status: 'CANCELLED',
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days grace period
      }
    });

    return updated;
  }

  /**
   * Get usage statistics for a praxis
   */
  async getUsage(praxisId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { praxisId }
    });

    if (!subscription) {
      return null;
    }

    const total = subscription.aiQuotaTotal === -1 ? Infinity : subscription.aiQuotaTotal;
    const used = subscription.aiQuotaUsed;
    const remaining = total === Infinity ? Infinity : Math.max(0, total - used);
    const percentage = total === Infinity ? 0 : Math.min(100, (used / total) * 100);

    return {
      used,
      total,
      remaining,
      percentage,
      tier: subscription.tier,
      status: subscription.status
    };
  }

  /**
   * Increment AI usage for a praxis
   */
  async incrementUsage(praxisId: string, amount: number = 1) {
    const subscription = await prisma.subscription.findUnique({
      where: { praxisId }
    });

    if (!subscription) {
      throw new Error('No subscription found');
    }

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
      throw new Error('Subscription not active');
    }

    const newUsed = subscription.aiQuotaUsed + amount;
    
    // Check if over quota
    if (subscription.aiQuotaTotal !== -1 && newUsed > subscription.aiQuotaTotal) {
      throw new Error('Quota exceeded');
    }

    const updated = await prisma.subscription.update({
      where: { praxisId },
      data: { aiQuotaUsed: newUsed }
    });

    return updated;
  }

  /**
   * Check if praxis has enough quota
   */
  async hasQuota(praxisId: string, amount: number = 1): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { praxisId }
    });

    if (!subscription || (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL')) {
      return false;
    }

    if (subscription.aiQuotaTotal === -1) {
      return true; // Unlimited
    }

    return (subscription.aiQuotaUsed + amount) <= subscription.aiQuotaTotal;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleInvoicePaid(stripeSubId: string) {
    await prisma.subscription.updateMany({
      where: { stripeSubId },
      data: { 
        status: 'ACTIVE',
        aiQuotaUsed: 0 // Reset quota on successful payment
      }
    });
  }

  async handleInvoicePaymentFailed(stripeSubId: string) {
    await prisma.subscription.updateMany({
      where: { stripeSubId },
      data: { status: 'PAST_DUE' }
    });
  }

  async handleSubscriptionDeleted(stripeSubId: string) {
    await prisma.subscription.updateMany({
      where: { stripeSubId },
      data: { 
        status: 'CANCELLED',
        endsAt: new Date()
      }
    });
  }

  async handleSubscriptionUpdated(stripeSubId: string, status: string) {
    const statusMap: Record<string, any> = {
      'active': 'ACTIVE',
      'canceled': 'CANCELLED',
      'incomplete': 'PAST_DUE',
      'past_due': 'PAST_DUE',
      'trialing': 'TRIAL'
    };

    if (statusMap[status]) {
      await prisma.subscription.updateMany({
        where: { stripeSubId },
        data: { status: statusMap[status] }
      });
    }
  }

  private getPriceIdForTier(tier: string): string {
    const priceId = process.env[`STRIPE_PRICE_${tier}`];
    if (!priceId) {
      throw new Error(`Stripe price ID not configured for tier: ${tier}`);
    }
    return priceId;
  }
}

export const subscriptionService = new SubscriptionService();
