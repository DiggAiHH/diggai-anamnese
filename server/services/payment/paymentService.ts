// ─── Payment Service ───────────────────────────────────────
// Real Stripe Integration - PCI DSS Compliant
// Uses Stripe Payment Intents for secure payment processing

import type { CreatePaymentIntentInput, NfcChargeInput, PaymentWebhookEvent, PaymentReceipt, PaymentStats } from './types';
import { MAX_AMOUNT, MIN_AMOUNT } from './types';
import { stripe } from '../../config/stripe.js';
import * as crypto from 'crypto';

function getPrisma() {
  return (globalThis as any).__prisma;
}

// ─── Validation ────────────────────────────────────────────

function validateAmount(amount: number): void {
  if (amount < MIN_AMOUNT) throw new Error(`Mindestbetrag: ${MIN_AMOUNT} EUR`);
  if (amount > MAX_AMOUNT) throw new Error(`Maximalbetrag: ${MAX_AMOUNT} EUR`);
  if (!Number.isFinite(amount)) throw new Error('Ungültiger Betrag');
}

// ─── Payment Intent ────────────────────────────────────────

export async function createPaymentIntent(input: CreatePaymentIntentInput) {
  const prisma = getPrisma();
  validateAmount(input.amount);

  // Generate idempotency key for API resilience
  const idempotencyKey = `pi_${input.sessionId}_${input.patientId}_${Date.now()}`;

  try {
    // Create real PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100), // Convert to cents
      currency: input.currency?.toLowerCase() || 'eur',
      metadata: {
        sessionId: input.sessionId,
        patientId: input.patientId,
        type: input.type,
        description: input.description || '',
      },
      automatic_payment_methods: { enabled: true },
      description: input.description || `Payment for session ${input.sessionId}`,
    }, {
      idempotencyKey,
    });

    // Store in local DB for tracking
    const transaction = await prisma.paymentTransaction.create({
      data: {
        sessionId: input.sessionId,
        patientId: input.patientId,
        amount: input.amount,
        currency: input.currency || 'EUR',
        type: input.type,
        status: 'PENDING',
        paymentProvider: 'stripe',
        providerIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        description: input.description,
        metadata: input.metadata || {},
      },
    });

    return {
      id: transaction.id,
      sessionId: transaction.sessionId,
      patientId: transaction.patientId,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status,
      providerIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error: any) {
    console.error('[Payment] Stripe PaymentIntent creation failed:', error);
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
}

// ─── NFC Tap-to-Pay Charge ─────────────────────────────────

export async function processNfcCharge(input: NfcChargeInput) {
  const prisma = getPrisma();
  validateAmount(input.amount);

  // For NFC/SumUp integration, we use Stripe Terminal or create a PaymentIntent
  // that will be confirmed by the terminal
  const idempotencyKey = `nfc_${input.sessionId}_${Date.now()}`;

  try {
    // Create a PaymentIntent for terminal/reader
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(input.amount * 100),
      currency: 'eur',
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata: {
        sessionId: input.sessionId,
        patientId: input.patientId,
        type: input.type,
        nfcToken: input.nfcCardToken, // Tokenized reference
      },
    }, {
      idempotencyKey,
    });

    const transaction = await prisma.paymentTransaction.create({
      data: {
        sessionId: input.sessionId,
        patientId: input.patientId,
        amount: input.amount,
        currency: 'EUR',
        type: input.type,
        status: 'PROCESSING',
        paymentProvider: 'stripe',
        providerIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        nfcCardToken: input.nfcCardToken,
        description: input.description || 'NFC Tap-to-Pay',
      },
    });

    return {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      providerIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error: any) {
    console.error('[Payment] NFC charge creation failed:', error);
    throw new Error(`NFC charge failed: ${error.message}`);
  }
}

// ─── Webhook Handler ───────────────────────────────────────

export async function handleWebhook(event: PaymentWebhookEvent) {
  const prisma = getPrisma();

  // Find transaction by Stripe PaymentIntent ID
  const transaction = await prisma.paymentTransaction.findFirst({
    where: { providerIntentId: event.data.intentId },
  });

  if (!transaction) {
    console.warn('[Payment] Webhook for unknown intent:', event.data.intentId);
    return { received: true, matched: false };
  }

  const updateData: Record<string, unknown> = {};

  switch (event.type) {
    case 'payment_intent.succeeded':
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
      updateData.receiptUrl = event.data.receiptUrl || null;
      break;
    case 'payment_intent.payment_failed':
      updateData.status = 'FAILED';
      updateData.metadata = {
        ...(transaction.metadata as any || {}),
        failureReason: event.data.failureReason,
        failedAt: new Date().toISOString(),
      };
      break;
    case 'charge.refunded':
      updateData.status = 'REFUNDED';
      updateData.refundedAt = new Date();
      break;
    case 'payment_intent.canceled':
      updateData.status = 'CANCELLED';
      updateData.metadata = {
        ...(transaction.metadata as any || {}),
        cancelledAt: new Date().toISOString(),
      };
      break;
    default:
      console.log('[Payment] Unhandled webhook type:', event.type);
      return { received: true, matched: true, handled: false };
  }

  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: updateData,
  });

  console.log(`[Payment] Transaction ${transaction.id} updated to ${updateData.status}`);

  return { received: true, matched: true, handled: true, transactionId: transaction.id };
}

// ─── Receipt ───────────────────────────────────────────────

export async function getReceipt(transactionId: string): Promise<PaymentReceipt | null> {
  const prisma = getPrisma();

  const tx = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!tx) return null;

  // If transaction is completed and has a Stripe PaymentIntent, fetch receipt from Stripe
  if (tx.status === 'COMPLETED' && tx.providerIntentId) {
    try {
      const charges = await stripe.charges.list({
        payment_intent: tx.providerIntentId,
        limit: 1,
      });

      if (charges.data.length > 0 && charges.data[0].receipt_url) {
        tx.receiptUrl = charges.data[0].receipt_url;
      }
    } catch (error) {
      console.warn('[Payment] Could not fetch receipt from Stripe:', error);
    }
  }

  return {
    id: tx.id,
    transactionId: tx.id,
    amount: tx.amount,
    currency: tx.currency,
    type: tx.type,
    status: tx.status,
    description: tx.description,
    receiptUrl: tx.receiptUrl,
    createdAt: tx.createdAt.toISOString(),
    completedAt: tx.completedAt?.toISOString(),
  };
}

// ─── Payment Stats ─────────────────────────────────────────

export async function getPaymentStats(praxisId?: string): Promise<PaymentStats> {
  const prisma = getPrisma();

  const where = praxisId ? { session: { praxisId } } : {};

  const transactions = await prisma.paymentTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const completed = transactions.filter((t: any) => t.status === 'COMPLETED');
  const totalRevenue = completed.reduce((sum: number, t: any) => sum + t.amount, 0);

  const byType = Object.entries(
    transactions.reduce((acc: Record<string, { count: number; total: number }>, t: any) => {
      if (!acc[t.type]) acc[t.type] = { count: 0, total: 0 };
      acc[t.type].count++;
      acc[t.type].total += t.amount;
      return acc;
    }, {})
  ).map(([type, data]) => ({ type, ...(data as { count: number; total: number }) }));

  const byStatus = Object.entries(
    transactions.reduce((acc: Record<string, number>, t: any) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count: count as number }));

  return {
    totalRevenue,
    transactionCount: transactions.length,
    averageAmount: completed.length > 0 ? totalRevenue / completed.length : 0,
    byType,
    byStatus,
    recentTransactions: transactions.slice(0, 10).map((tx: any) => ({
      id: tx.id,
      transactionId: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      type: tx.type,
      status: tx.status,
      description: tx.description,
      receiptUrl: tx.receiptUrl,
      createdAt: tx.createdAt.toISOString(),
      completedAt: tx.completedAt?.toISOString(),
    })),
  };
}

// ─── Refund ────────────────────────────────────────────────

export async function refundTransaction(transactionId: string, reason?: string) {
  const prisma = getPrisma();

  const tx = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!tx) throw new Error('Transaktion nicht gefunden');
  if (tx.status !== 'COMPLETED') throw new Error('Nur abgeschlossene Transaktionen können erstattet werden');
  if (!tx.providerIntentId) throw new Error('Keine Stripe PaymentIntent ID gefunden');

  try {
    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: tx.providerIntentId,
      reason: reason ? 'requested_by_customer' : undefined,
      metadata: {
        transactionId: tx.id,
        reason: reason || 'No reason provided',
      },
    });

    // Update local record
    const updated = await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        metadata: {
          ...(tx.metadata as any || {}),
          refundReason: reason,
          stripeRefundId: refund.id,
        },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      amount: updated.amount,
      refundId: refund.id,
      refundedAt: updated.refundedAt?.toISOString(),
    };
  } catch (error: any) {
    console.error('[Payment] Refund failed:', error);
    throw new Error(`Refund failed: ${error.message}`);
  }
}

// ─── Setup Intent for Saving Cards ────────────────────────

export async function createSetupIntent(customerId: string) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit'],
      usage: 'off_session',
    });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  } catch (error: any) {
    console.error('[Payment] Setup intent creation failed:', error);
    throw new Error(`Setup intent creation failed: ${error.message}`);
  }
}

// ─── Customer Management ──────────────────────────────────

export async function createStripeCustomer(email: string, name?: string, metadata?: Record<string, string>) {
  try {
    const customer = await stripe.customers.create({
      email,
      name: name || email,
      metadata,
    });

    return {
      id: customer.id,
      email: customer.email,
    };
  } catch (error: any) {
    console.error('[Payment] Customer creation failed:', error);
    throw new Error(`Customer creation failed: ${error.message}`);
  }
}

export async function getCustomerPaymentMethods(customerId: string) {
  try {
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return methods.data.map(method => ({
      id: method.id,
      type: method.type,
      card: method.card ? {
        brand: method.card.brand,
        last4: method.card.last4,
        expMonth: method.card.exp_month,
        expYear: method.card.exp_year,
      } : null,
    }));
  } catch (error: any) {
    console.error('[Payment] Failed to fetch payment methods:', error);
    throw new Error(`Failed to fetch payment methods: ${error.message}`);
  }
}
