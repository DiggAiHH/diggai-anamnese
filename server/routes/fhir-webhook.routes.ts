/**
 * FHIR Webhook Routes
 * 
 * Empfängt FHIR Subscription Notifications von Tomedo.
 * 
 * @phase PHASE_7_FHIR_SUBSCRIPTIONS
 */

import { Router, type Request, type Response } from 'express';
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

      // Validate signature if provided (HMAC)
      const signature = req.headers['x-hub-signature'] as string;
      if (signature && !verifySignature(req.body, signature)) {
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

/**
 * Verify webhook signature
 */
function verifySignature(payload: unknown, signature: string): boolean {
  // Implementation depends on Tomedo's signature method
  // Usually HMAC-SHA256
  
  const secret = process.env.FHIR_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('[FhirWebhook] No webhook secret configured, skipping signature verification');
    return true;
  }

  // TODO: Implement actual signature verification
  // const crypto = await import('crypto');
  // const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  // return signature === `sha256=${expected}`;
  
  return true; // Placeholder
}

export default router;
