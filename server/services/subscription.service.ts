import { stripe, PLANS, getQuotaForTier, canUpgrade, getAiQuotaForTier } from '../config/stripe.js';
import { getPrismaClientForDomain } from '../db.js';

const prisma = getPrismaClientForDomain('company');

// Audit Log Types
type AuditAction = 'SUBSCRIPTION_UPGRADE' | 'SUBSCRIPTION_DOWNGRADE' | 'SUBSCRIPTION_CREATED' | 'SUBSCRIPTION_CANCELLED' | 'PRORATION_CALCULATED';

interface AuditLogData {
  subscriptionId: string;
  fromTier?: string;
  toTier?: string;
  stripeSubscriptionId?: string;
  prorationAmount?: number;
  error?: string;
  [key: string]: any;
}

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

  /**
   * Upgrade Subscription (immediate with proration)
   */
  async upgradeSubscription(
    subscriptionId: string,
    newTier: 'ESSENTIAL' | 'PROFESSIONAL' | 'ENTERPRISE'
  ) {
    const idempotencyKey = `upgrade_${subscriptionId}_${newTier}_${Date.now()}`;
    
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { tenant: true }
      });

      if (!subscription?.stripeSubId) {
        throw new Error('No active subscription found');
      }

      // Normalize tier names (handle legacy STARTER -> ESSENTIAL)
      const currentTier = this.normalizeTier(subscription.tier);
      const targetTier = this.normalizeTier(newTier);

      // Verify this is actually an upgrade
      if (!canUpgrade(currentTier, targetTier)) {
        throw new Error(`Cannot upgrade from ${currentTier} to ${targetTier}. Target tier must be higher.`);
      }

      // Retrieve current Stripe subscription
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubId);
      const priceId = this.getPriceIdForTier(targetTier);

      // Update Stripe subscription with proration
      const updatedStripeSub = await stripe.subscriptions.update(
        subscription.stripeSubId,
        {
          items: [{
            id: stripeSub.items.data[0].id,
            price: priceId
          }],
          proration_behavior: 'create_prorations',
          metadata: { 
            ...stripeSub.metadata, 
            tier: targetTier,
            upgradedAt: new Date().toISOString()
          }
        },
        { idempotencyKey }
      );

      // Get proration amount from upcoming invoice
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscription.stripeSubId
      });

      const prorationAmount = upcomingInvoice.amount_due;

      // Update local database
      const plan = PLANS[targetTier];
      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          tier: targetTier,
          aiQuotaTotal: plan.aiQuota === Infinity ? -1 : plan.aiQuota,
          // Don't reset used quota on upgrade - user keeps what they used
        }
      });

      // Audit log
      await this.auditLog('SUBSCRIPTION_UPGRADE', {
        subscriptionId,
        fromTier: currentTier,
        toTier: targetTier,
        stripeSubscriptionId: subscription.stripeSubId,
        prorationAmount,
        idempotencyKey
      });

      return { 
        subscription: updated, 
        stripeSubscription: updatedStripeSub,
        prorationAmount,
        upcomingInvoice: {
          amountDue: upcomingInvoice.amount_due,
          currency: upcomingInvoice.currency,
          periodStart: upcomingInvoice.period_start,
          periodEnd: upcomingInvoice.period_end
        }
      };
    } catch (error: any) {
      // Log failed attempt
      await this.auditLog('SUBSCRIPTION_UPGRADE', {
        subscriptionId,
        toTier: newTier,
        error: error.message,
        idempotencyKey
      });
      throw error;
    }
  }

  /**
   * Downgrade Subscription (effective at period end)
   */
  async downgradeSubscription(
    subscriptionId: string,
    newTier: 'ESSENTIAL' | 'PROFESSIONAL' | 'ENTERPRISE'
  ) {
    const idempotencyKey = `downgrade_${subscriptionId}_${newTier}_${Date.now()}`;
    
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { tenant: true }
      });

      if (!subscription?.stripeSubId) {
        throw new Error('No active subscription found');
      }

      // Normalize tier names
      const currentTier = this.normalizeTier(subscription.tier);
      const targetTier = this.normalizeTier(newTier);

      // Verify this is actually a downgrade
      if (canUpgrade(currentTier, targetTier) || currentTier === targetTier) {
        throw new Error(`Cannot downgrade from ${currentTier} to ${targetTier}. Target tier must be lower.`);
      }

      // Retrieve current Stripe subscription
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubId);
      const priceId = this.getPriceIdForTier(targetTier);

      // For downgrade: schedule change at period end
      // Strategy: Update subscription to cancel at period end, then create new one
      const updatedStripeSub = await stripe.subscriptions.update(
        subscription.stripeSubId,
        {
          cancel_at_period_end: true,
          metadata: {
            ...stripeSub.metadata,
            downgradeScheduled: 'true',
            downgradeToTier: targetTier,
            downgradeAt: stripeSub.current_period_end
          }
        },
        { idempotencyKey }
      );

      // Schedule the new subscription for next period
      // Store scheduled downgrade info in DB
      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          metadata: {
            ...(subscription.metadata as any || {}),
            scheduledDowngrade: {
              toTier: targetTier,
              effectiveAt: new Date(stripeSub.current_period_end * 1000).toISOString(),
              newPriceId: priceId
            }
          }
        }
      });

      // Calculate what the next period will cost
      const scheduledInvoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscription.stripeSubId,
        subscription_items: [{
          id: stripeSub.items.data[0].id,
          price: priceId,
          quantity: 1
        }]
      });

      // Audit log
      await this.auditLog('SUBSCRIPTION_DOWNGRADE', {
        subscriptionId,
        fromTier: currentTier,
        toTier: targetTier,
        stripeSubscriptionId: subscription.stripeSubId,
        effectiveAt: stripeSub.current_period_end,
        nextPeriodAmount: scheduledInvoice.amount_due,
        idempotencyKey
      });

      return {
        subscription: updated,
        stripeSubscription: updatedStripeSub,
        scheduledDowngrade: {
          toTier: targetTier,
          effectiveAt: new Date(stripeSub.current_period_end * 1000).toISOString(),
          nextPeriodAmount: scheduledInvoice.amount_due
        }
      };
    } catch (error: any) {
      await this.auditLog('SUBSCRIPTION_DOWNGRADE', {
        subscriptionId,
        toTier: newTier,
        error: error.message,
        idempotencyKey
      });
      throw error;
    }
  }

  /**
   * Get proration information for an upgrade
   */
  async getProrationInfo(
    subscriptionId: string,
    newTier: 'ESSENTIAL' | 'PROFESSIONAL' | 'ENTERPRISE'
  ): Promise<{
    prorationDate: Date;
    costNow: number;
    costNextPeriod: number;
    currency: string;
    currentTier: string;
    newTier: string;
  }> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription?.stripeSubId) {
      throw new Error('No active subscription found');
    }

    const targetTier = this.normalizeTier(newTier);
    const priceId = this.getPriceIdForTier(targetTier);

    // Get current Stripe subscription
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubId);

    // Calculate proration using Stripe's upcoming invoice
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      subscription: subscription.stripeSubId,
      subscription_items: [{
        id: stripeSub.items.data[0].id,
        price: priceId,
        quantity: 1
      }]
    });

    // Get next period cost (without proration)
    const nextPeriodInvoice = await stripe.invoices.retrieveUpcoming({
      subscription: subscription.stripeSubId,
      subscription_items: [{
        id: stripeSub.items.data[0].id,
        price: priceId,
        quantity: 1
      }],
      subscription_proration_date: stripeSub.current_period_end
    });

    await this.auditLog('PRORATION_CALCULATED', {
      subscriptionId,
      fromTier: subscription.tier,
      toTier: targetTier,
      prorationAmount: upcomingInvoice.amount_due,
      nextPeriodAmount: nextPeriodInvoice.amount_due
    });

    return {
      prorationDate: new Date(),
      costNow: upcomingInvoice.amount_due,
      costNextPeriod: nextPeriodInvoice.amount_due,
      currency: upcomingInvoice.currency,
      currentTier: subscription.tier,
      newTier: targetTier
    };
  }

  /**
   * Process scheduled downgrade at period end
   * This should be called by a webhook or cron job
   */
  async processScheduledDowngrade(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription?.metadata) {
      throw new Error('No scheduled downgrade found');
    }

    const metadata = subscription.metadata as any;
    if (!metadata.scheduledDowngrade) {
      throw new Error('No scheduled downgrade found');
    }

    const { toTier, newPriceId } = metadata.scheduledDowngrade;
    const idempotencyKey = `process_downgrade_${subscriptionId}_${Date.now()}`;

    // Create new subscription for the downgraded tier
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubId!);
    
    const newStripeSub = await stripe.subscriptions.create({
      customer: stripeSub.customer as string,
      items: [{ price: newPriceId }],
      metadata: { 
        praxisId: subscription.praxisId,
        tier: toTier,
        downgradedFrom: subscription.tier
      }
    }, { idempotencyKey });

    // Update local subscription
    const plan = PLANS[toTier];
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        tier: toTier,
        stripeSubId: newStripeSub.id,
        aiQuotaTotal: plan.aiQuota === Infinity ? -1 : plan.aiQuota,
        metadata: {
          ...metadata,
          scheduledDowngrade: null, // Clear scheduled downgrade
          downgradedAt: new Date().toISOString()
        }
      }
    });

    return { subscription: updated, stripeSubscription: newStripeSub };
  }

  /**
   * Cancel a scheduled downgrade
   */
  async cancelScheduledDowngrade(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription?.stripeSubId) {
      throw new Error('No active subscription found');
    }

    // Re-enable the subscription (cancel the cancellation)
    await stripe.subscriptions.update(subscription.stripeSubId, {
      cancel_at_period_end: false
    });

    // Clear scheduled downgrade from metadata
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        metadata: {
          ...(subscription.metadata as any || {}),
          scheduledDowngrade: null
        }
      }
    });

    return updated;
  }

  /**
   * Audit logging for subscription changes
   */
  private async auditLog(action: AuditAction, data: AuditLogData) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      ...data
    };

    // Log to console (structured)
    console.log(`[Subscription Audit] ${action}:`, JSON.stringify(logEntry));

    // Persist to database if audit log table exists
    try {
      await (prisma as any).auditLog.create({
        data: {
          action,
          entityType: 'SUBSCRIPTION',
          entityId: data.subscriptionId,
          details: JSON.stringify(data),
          createdAt: new Date()
        }
      });
    } catch {
      // Audit log table may not exist, continue silently
    }
  }

  /**
   * Normalize tier names (handle legacy STARTER -> ESSENTIAL)
   */
  private normalizeTier(tier: string): 'ESSENTIAL' | 'PROFESSIONAL' | 'ENTERPRISE' {
    const legacyMap: Record<string, 'ESSENTIAL' | 'PROFESSIONAL' | 'ENTERPRISE'> = {
      'STARTER': 'ESSENTIAL',
      'ESSENTIAL': 'ESSENTIAL',
      'PROFESSIONAL': 'PROFESSIONAL',
      'ENTERPRISE': 'ENTERPRISE'
    };
    return legacyMap[tier.toUpperCase()] || 'ESSENTIAL';
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
