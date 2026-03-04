// ─── Payment Service ───────────────────────────────────────
// Modul 7/8: Payment processing (Stripe-compatible, PCI DSS safe)

import type { CreatePaymentIntentInput, NfcChargeInput, PaymentWebhookEvent, PaymentReceipt, PaymentStats } from './types';
import { MAX_AMOUNT, MIN_AMOUNT } from './types';
import crypto from 'crypto';

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

  // In production: call Stripe/Adyen to create real intent
  // For now: create local transaction record with simulated intent
  const providerIntentId = `pi_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const clientSecret = `${providerIntentId}_secret_${crypto.randomBytes(16).toString('hex')}`;

  const transaction = await prisma.paymentTransaction.create({
    data: {
      sessionId: input.sessionId,
      patientId: input.patientId,
      amount: input.amount,
      currency: input.currency || 'EUR',
      type: input.type,
      status: 'PENDING',
      paymentProvider: 'stripe',
      providerIntentId,
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
    providerIntentId,
    clientSecret,
  };
}

// ─── NFC Tap-to-Pay Charge ─────────────────────────────────

export async function processNfcCharge(input: NfcChargeInput) {
  const prisma = getPrisma();
  validateAmount(input.amount);

  // Tokenized NFC charge — no card data stored, only token reference
  const providerIntentId = `nfc_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

  const transaction = await prisma.paymentTransaction.create({
    data: {
      sessionId: input.sessionId,
      patientId: input.patientId,
      amount: input.amount,
      currency: 'EUR',
      type: input.type,
      status: 'PROCESSING',
      paymentProvider: 'sumup',
      providerIntentId,
      nfcCardToken: input.nfcCardToken, // tokenized, NOT raw card data
      description: input.description || 'NFC Tap-to-Pay',
    },
  });

  // Simulate processing (in prod: call SumUp/Adyen terminal API)
  const completed = await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      receiptUrl: `/api/payment/receipt/${transaction.id}`,
    },
  });

  return {
    id: completed.id,
    status: completed.status,
    amount: completed.amount,
    receiptUrl: completed.receiptUrl,
  };
}

// ─── Webhook Handler ───────────────────────────────────────

export async function handleWebhook(event: PaymentWebhookEvent) {
  const prisma = getPrisma();

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
      updateData.receiptUrl = event.data.receiptUrl || `/api/payment/receipt/${transaction.id}`;
      break;
    case 'payment_intent.payment_failed':
      updateData.status = 'FAILED';
      updateData.metadata = { ...(transaction.metadata as any || {}), failureReason: event.data.failureReason };
      break;
    case 'charge.refunded':
      updateData.status = 'REFUNDED';
      updateData.refundedAt = new Date();
      break;
    default:
      console.log('[Payment] Unhandled webhook type:', event.type);
      return { received: true, matched: true, handled: false };
  }

  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: updateData,
  });

  return { received: true, matched: true, handled: true, transactionId: transaction.id };
}

// ─── Receipt ───────────────────────────────────────────────

export async function getReceipt(transactionId: string): Promise<PaymentReceipt | null> {
  const prisma = getPrisma();

  const tx = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!tx) return null;

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

  // In production: call provider refund API
  const updated = await prisma.paymentTransaction.update({
    where: { id: transactionId },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      metadata: { ...(tx.metadata as any || {}), refundReason: reason },
    },
  });

  return {
    id: updated.id,
    status: updated.status,
    amount: updated.amount,
    refundedAt: updated.refundedAt?.toISOString(),
  };
}
