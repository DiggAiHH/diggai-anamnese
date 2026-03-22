// ─── Billing Service ───────────────────────────────────────
// Stripe Integration v2 - PCI-Compliant Payment Processing
// Verwendet Stripe Elements für sicheres Card Handling

import Stripe from 'stripe';
import { stripe } from '../config/stripe.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ─────────────────────────────────────────────────

export interface CreateCustomerInput {
  praxisId: string;
  email: string;
  name?: string;
}

export interface CreateSubscriptionInput {
  customerId: string;
  priceId: string;
  praxisId: string;
  tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
}

export interface SetupIntentResponse {
  clientSecret: string;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  clientSecret: string | null;
  status: string;
}

// ─── Customer Management ───────────────────────────────────

/**
 * Create a new Stripe customer for a praxis
 */
export async function createCustomer(input: CreateCustomerInput): Promise<Stripe.Customer> {
  const { praxisId, email, name } = input;

  // Check if customer already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { id: praxisId }
  });

  if (existingTenant?.stripeCustomerId) {
    // Retrieve existing customer
    return stripe.customers.retrieve(existingTenant.stripeCustomerId) as Promise<Stripe.Customer>;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || email,
    metadata: {
      praxisId,
      source: 'diggai-anamnese-platform'
    }
  });

  // Save customer ID to tenant
  await prisma.tenant.update({
    where: { id: praxisId },
    data: { stripeCustomerId: customer.id }
  });

  return customer;
}

/**
 * Get or create customer for praxis
 */
export async function getOrCreateCustomer(praxisId: string, email: string): Promise<Stripe.Customer> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: praxisId }
  });

  if (tenant?.stripeCustomerId) {
    const customer = await stripe.customers.retrieve(tenant.stripeCustomerId);
    if (!customer.deleted) {
      return customer as Stripe.Customer;
    }
  }

  return createCustomer({ praxisId, email });
}

// ─── Setup Intent ──────────────────────────────────────────

/**
 * Create Setup Intent for saving payment method
 * Used before subscription creation to collect card details
 */
export async function createSetupIntent(customerId: string): Promise<SetupIntentResponse> {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session', // For future payments
  });

  if (!setupIntent.client_secret) {
    throw new Error('Failed to create setup intent: missing client secret');
  }

  return {
    clientSecret: setupIntent.client_secret
  };
}

// ─── Subscription Management ─────────────────────────────────

/**
 * Create a new subscription with Stripe
 * Uses Stripe Elements - payment is confirmed client-side
 */
export async function createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResponse> {
  const { customerId, priceId, praxisId, tier } = input;

  // Get price details to check if it requires payment
  const price = await stripe.prices.retrieve(priceId);

  // Create subscription with default incomplete payment
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      praxisId,
      tier,
      source: 'diggai-billing-v2'
    }
  });

  // Get client secret for client-side confirmation
  const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
  const clientSecret = latestInvoice?.confirmation_secret?.client_secret || null;

  return {
    subscriptionId: subscription.id,
    clientSecret,
    status: subscription.status
  };
}

/**
 * Create subscription with trial period
 */
export async function createSubscriptionWithTrial(
  input: CreateSubscriptionInput & { trialDays?: number }
): Promise<SubscriptionResponse> {
  const { customerId, priceId, praxisId, tier, trialDays = 14 } = input;

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel'
      }
    },
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    metadata: {
      praxisId,
      tier,
      source: 'diggai-billing-v2-trial'
    }
  });

  return {
    subscriptionId: subscription.id,
    clientSecret: null, // No immediate payment for trial
    status: subscription.status
  };
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true
  });
}

/**
 * Resume canceled subscription
 */
export async function resumeSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: false
  });
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ['latest_invoice', 'default_payment_method']
  });
}

// ─── Payment Method Management ─────────────────────────────

/**
 * List payment methods for customer
 */
export async function listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card'
  });
  return methods.data;
}

/**
 * Detach payment method
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * Set default payment method for customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });
}

// ─── Invoice Management ────────────────────────────────────

/**
 * List invoices for customer
 */
export async function listInvoices(customerId: string): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 10
  });
  return invoices.data;
}

/**
 * Get upcoming invoice
 */
export async function getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
  try {
    return await stripe.invoices.createPreview({
      customer: customerId
    }) as unknown as Stripe.UpcomingInvoice;
  } catch {
    return null;
  }
}

// ─── Webhook Handling ──────────────────────────────────────

/**
 * Verify and construct webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Handle webhook event and update database
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.parent?.subscription_details?.subscription;
      if (sub) {
        await handleInvoicePaid(typeof sub === 'string' ? sub : sub.id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.parent?.subscription_details?.subscription;
      if (sub) {
        await handleInvoicePaymentFailed(typeof sub === 'string' ? sub : sub.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription.id);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription.id, subscription.status);
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleTrialEnding(subscription.id);
      break;
    }

    default:
      console.log(`[Billing] Unhandled webhook event: ${event.type}`);
  }
}

// ─── Webhook Event Handlers ────────────────────────────────

async function handleInvoicePaid(stripeSubscriptionId: string): Promise<void> {
  const { subscriptionService } = await import('./subscription.service.js');
  await subscriptionService.handleInvoicePaid(stripeSubscriptionId);
}

async function handleInvoicePaymentFailed(stripeSubscriptionId: string): Promise<void> {
  const { subscriptionService } = await import('./subscription.service.js');
  await subscriptionService.handleInvoicePaymentFailed(stripeSubscriptionId);
}

async function handleSubscriptionDeleted(stripeSubscriptionId: string): Promise<void> {
  const { subscriptionService } = await import('./subscription.service.js');
  await subscriptionService.handleSubscriptionDeleted(stripeSubscriptionId);
}

async function handleSubscriptionUpdated(stripeSubscriptionId: string, status: string): Promise<void> {
  const { subscriptionService } = await import('./subscription.service.js');
  await subscriptionService.handleSubscriptionUpdated(stripeSubscriptionId, status);
}

async function handleTrialEnding(stripeSubscriptionId: string): Promise<void> {
  // TODO: Send notification email to customer
  console.log(`[Billing] Trial ending soon for subscription: ${stripeSubscriptionId}`);
}

// ─── Helper Functions ──────────────────────────────────────

/**
 * Get price ID from tier
 */
export function getPriceIdForTier(tier: string): string {
  const envVar = `STRIPE_PRICE_${tier.toUpperCase()}`;
  const priceId = process.env[envVar];

  if (!priceId) {
    throw new Error(`Stripe price ID not configured for tier: ${tier} (expected ${envVar})`);
  }

  return priceId;
}

/**
 * Format amount for display (cents to euros)
 */
export function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2);
}

// ─── Export Service Class ──────────────────────────────────

export class BillingService {
  async createCustomer(input: CreateCustomerInput) {
    return createCustomer(input);
  }

  async createSetupIntent(customerId: string) {
    return createSetupIntent(customerId);
  }

  async createSubscription(input: CreateSubscriptionInput) {
    return createSubscription(input);
  }

  async createSubscriptionWithTrial(input: CreateSubscriptionInput & { trialDays?: number }) {
    return createSubscriptionWithTrial(input);
  }

  async cancelSubscription(stripeSubscriptionId: string) {
    return cancelSubscription(stripeSubscriptionId);
  }

  async getSubscription(stripeSubscriptionId: string) {
    return getSubscription(stripeSubscriptionId);
  }

  async listPaymentMethods(customerId: string) {
    return listPaymentMethods(customerId);
  }

  async listInvoices(customerId: string) {
    return listInvoices(customerId);
  }
}

export const billingService = new BillingService();
