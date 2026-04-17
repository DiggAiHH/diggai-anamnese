/**
 * FHIR Webhook Routes
 * 
 * Empfängt FHIR Subscription Notifications von Tomedo.
 * 
 * @phase PHASE_7_FHIR_SUBSCRIPTIONS
 */

import { Router, type Request, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { subscriptionManager } from '../services/pvs/fhir/fhir-subscription-manager.js';
import { createLogger } from '../logger.js';
import { emitFhirNotification } from '../socket.js';

const logger = createLogger('FhirWebhookRoutes');
const router = Router();

/**
 * POST /api/webhooks/fhir/:subscriptionId
 * Main webhook endpoint for FHIR subscriptions
 */
router.post(
  '/:subscriptionId',
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const id = Array.isArray(subscriptionId) ? subscriptionId[0] : subscriptionId;

      logger.info('[FhirWebhook] Received notification', {
        subscriptionId: id,
        resourceType: req.body.resourceType,
      });

      const signatureHeader = readHeaderValue(req, [
        'x-hub-signature-256',
        'x-hub-signature',
        'x-signature',
      ]);

      const webhookSecret = getWebhookSecret();
      if (webhookSecret && !signatureHeader) {
        logger.warn('[FhirWebhook] Missing signature for signed webhook endpoint', {
          subscriptionId: id,
        });
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      if (signatureHeader && !verifySignature(req.body, signatureHeader)) {
        logger.warn('[FhirWebhook] Invalid signature', { subscriptionId: id });
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Process webhook
      await subscriptionManager.handleWebhook(id, {
        resourceType: req.body.resourceType,
        id: req.body.id,
        event: req.body.event || 'update',
        resource: req.body.resource,
      });

      // Get subscription for tenant info
      const subscription = subscriptionManager.getSubscription(id);
      if (subscription) {
        // Emit real-time event
        emitFhirNotification({
          subscriptionId: id,
          tenantId: subscription.tenantId,
          resourceType: req.body.resourceType,
          event: req.body.event || 'update',
          resourceId: req.body.id,
        });
      }

      // Acknowledge receipt
      return res.status(200).json({ 
        received: true,
        subscriptionId: id,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[FhirWebhook] Failed to process notification', { error: errorMsg });
      
      return res.status(500).json({
        error: errorMsg,
      });
    }
  }
);

/**
 * POST /api/webhooks/fhir/:subscriptionId/handshake
 * Subscription handshake endpoint (required by some FHIR servers)
 */
router.post(
  '/:subscriptionId/handshake',
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const id = Array.isArray(subscriptionId) ? subscriptionId[0] : subscriptionId;

      logger.info('[FhirWebhook] Handshake received', { subscriptionId: id });

      // Verify subscription exists
      const subscription = subscriptionManager.getSubscription(id);
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Acknowledge handshake
      return res.status(200).json({
        status: 'ok',
        subscriptionId: id,
        challenge: req.body.challenge,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[FhirWebhook] Handshake failed', { error: errorMsg });
      
      return res.status(500).json({
        error: errorMsg,
      });
    }
  }
);

function getWebhookSecret(): string | null {
  const value = process.env.FHIR_WEBHOOK_SECRET?.trim();
  return value ? value : null;
}

function readHeaderValue(req: Request, names: string[]): string | null {
  for (const name of names) {
    const raw = req.headers[name.toLowerCase()];
    if (Array.isArray(raw)) {
      const first = raw.find((entry) => typeof entry === 'string' && entry.trim());
      if (first) return first.trim();
      continue;
    }

    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
  }

  return null;
}

function serializePayload(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload;
  }

  if (Buffer.isBuffer(payload)) {
    return payload.toString('utf-8');
  }

  try {
    return JSON.stringify(payload ?? {});
  } catch {
    return '';
  }
}

function timingSafeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function extractSignatureCandidates(signatureHeader: string): string[] {
  const entries = signatureHeader
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const entry of entries) {
    const prefixedMatch = entry.match(/^(sha256|v1|signature)=(.+)$/i);
    if (prefixedMatch) {
      const value = prefixedMatch[2].trim();
      if (value) {
        candidates.push(value);
      }
      continue;
    }

    // Keep raw signature values (including base64 strings with '=' padding).
    candidates.push(entry);
  }

  return [...new Set(candidates)];
}

/**
 * Verify webhook signature
 */
export function verifySignature(payload: unknown, signatureHeader: string): boolean {
  const secret = getWebhookSecret();
  if (!secret) {
    logger.warn('[FhirWebhook] No webhook secret configured, skipping signature verification');
    return true;
  }

  const payloadString = serializePayload(payload);
  if (!payloadString) {
    logger.warn('[FhirWebhook] Empty payload during signature verification');
    return false;
  }

  const expectedHex = createHmac('sha256', secret).update(payloadString).digest('hex');
  const expectedBase64 = createHmac('sha256', secret).update(payloadString).digest('base64');
  const signatureCandidates = extractSignatureCandidates(signatureHeader);

  return signatureCandidates.some((candidate) => {
    const trimmed = candidate.trim();
    if (!trimmed) {
      return false;
    }

    const hexCandidate = trimmed.toLowerCase();
    if (/^[a-f0-9]{64}$/.test(hexCandidate)) {
      return timingSafeCompare(hexCandidate, expectedHex);
    }

    return timingSafeCompare(trimmed, expectedBase64);
  });
}

export default router;
