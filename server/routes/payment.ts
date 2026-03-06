// ─── Payment Routes ────────────────────────────────────────
// Modul 7/8: Kiosk + Payment processing

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import {
  createPaymentIntent,
  processNfcCharge,
  handleWebhook,
  getReceipt,
  getPaymentStats,
  refundTransaction,
} from '../services/payment';

const router = Router();

// POST /api/payment/intent — Create payment intent
router.post('/intent', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      sessionId: z.string().uuid(),
      patientId: z.string().uuid(),
      amount: z.number().positive().max(10000),
      currency: z.string().default('EUR'),
      type: z.enum(['SELBSTZAHLER', 'IGEL', 'PRIVAT', 'COPAYMENT']),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const data = schema.parse(req.body);
    const intent = await createPaymentIntent(data);
    res.json(intent);
  } catch (err: any) {
    console.error('[Payment] Intent error:', err.message);
    res.status(400).json({ error: err.message || 'Payment intent fehlgeschlagen' });
  }
});

// POST /api/payment/nfc-charge — NFC Tap-to-Pay
router.post('/nfc-charge', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      sessionId: z.string().uuid(),
      patientId: z.string().uuid(),
      amount: z.number().positive().max(10000),
      type: z.enum(['SELBSTZAHLER', 'IGEL', 'PRIVAT', 'COPAYMENT']),
      nfcCardToken: z.string().min(1),
      description: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const result = await processNfcCharge(data);
    res.json(result);
  } catch (err: any) {
    console.error('[Payment] NFC charge error:', err.message);
    res.status(400).json({ error: err.message || 'NFC-Zahlung fehlgeschlagen' });
  }
});

// POST /api/payment/webhook — Stripe/Adyen webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature (Stripe HMAC-SHA256)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'] as string | undefined;
      if (!sig) {
        console.warn('[Payment] Webhook rejected: missing stripe-signature header');
        res.status(401).json({ error: 'Missing webhook signature' });
        return;
      }

      // Parse Stripe signature header: t=timestamp,v1=signature
      const parts = sig.split(',').reduce<Record<string, string>>((acc, part) => {
        const [key, val] = part.split('=');
        acc[key] = val;
        return acc;
      }, {});

      const timestamp = parts['t'];
      const expectedSig = parts['v1'];
      if (!timestamp || !expectedSig) {
        res.status(401).json({ error: 'Invalid webhook signature format' });
        return;
      }

      // Replay attack protection: reject events older than 5 minutes
      const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
      if (isNaN(ageSeconds) || ageSeconds > 300) {
        console.warn('[Payment] Webhook rejected: timestamp too old', { ageSeconds });
        res.status(401).json({ error: 'Webhook timestamp expired' });
        return;
      }

      // Compute expected signature: HMAC-SHA256(secret, "timestamp.rawBody")
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const payload = `${timestamp}.${rawBody}`;
      const computedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Timing-safe comparison to prevent timing attacks
      if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(computedSig))) {
        console.warn('[Payment] Webhook rejected: invalid signature');
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[Payment] CRITICAL: STRIPE_WEBHOOK_SECRET not set in production!');
      res.status(500).json({ error: 'Webhook verification not configured' });
      return;
    }

    const event = req.body as { type: string; data: any };
    const result = await handleWebhook({
      type: event.type,
      data: {
        intentId: event.data?.object?.id || event.data?.intentId,
        status: event.data?.object?.status || event.data?.status,
        amount: event.data?.object?.amount,
        receiptUrl: event.data?.object?.receipt_url || event.data?.receiptUrl,
        failureReason: event.data?.object?.last_payment_error?.message || event.data?.failureReason,
      },
    });
    res.json(result);
  } catch (err: any) {
    console.error('[Payment] Webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/payment/receipt/:id — Get payment receipt
router.get('/receipt/:id', async (req: Request, res: Response) => {
  try {
    const receipt = await getReceipt(req.params.id as string);
    if (!receipt) {
      res.status(404).json({ error: 'Quittung nicht gefunden' });
      return;
    }
    res.json(receipt);
  } catch (err: any) {
    console.error('[Payment] Receipt error:', err.message);
    res.status(500).json({ error: 'Quittung konnte nicht geladen werden' });
  }
});

// GET /api/payment/stats — Payment statistics (admin)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const praxisId = req.query.praxisId as string | undefined;
    const stats = await getPaymentStats(praxisId);
    res.json(stats);
  } catch (err: any) {
    console.error('[Payment] Stats error:', err.message);
    res.status(500).json({ error: 'Statistiken nicht verfügbar' });
  }
});

// POST /api/payment/refund/:id — Refund a transaction (admin)
router.post('/refund/:id', async (req: Request, res: Response) => {
  try {
    const reason = req.body.reason as string | undefined;
    const result = await refundTransaction(req.params.id as string, reason);
    res.json(result);
  } catch (err: any) {
    console.error('[Payment] Refund error:', err.message);
    res.status(400).json({ error: err.message || 'Erstattung fehlgeschlagen' });
  }
});

// GET /api/payment/session/:sessionId — Get payments for a session
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const prisma = (globalThis as any).__prisma;
    const transactions = await prisma.paymentTransaction.findMany({
      where: { sessionId: req.params.sessionId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(transactions);
  } catch (err: any) {
    console.error('[Payment] Session payments error:', err.message);
    res.status(500).json({ error: 'Zahlungen nicht verfügbar' });
  }
});

export default router;
