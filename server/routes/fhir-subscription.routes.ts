/**
 * FHIR Subscription API Routes
 * 
 * @phase PHASE_7_FHIR_SUBSCRIPTIONS
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { subscriptionManager } from '../services/pvs/fhir/fhir-subscription-manager.js';
import { prisma } from '../db.js';
import { createLogger } from '../logger.js';

const logger = createLogger('FhirSubscriptionRoutes');
const router = Router();

/**
 * GET /api/tomedo-bridge/subscriptions
 * List all subscriptions for a connection
 */
router.get(
  '/subscriptions',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { connectionId, tenantId } = req.query;

      let subscriptions: ReturnType<typeof subscriptionManager.getConnectionSubscriptions> = [];
      if (connectionId) {
        subscriptions = subscriptionManager.getConnectionSubscriptions(connectionId as string);
      } else if (tenantId) {
        subscriptions = subscriptionManager.getTenantSubscriptions(tenantId as string);
      }

      const stats = subscriptionManager.getStats();

      return res.json({
        success: true,
        subscriptions,
        stats,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[FhirSubAPI] Failed to list subscriptions', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * POST /api/tomedo-bridge/subscriptions
 * Create new subscription
 */
router.post(
  '/subscriptions',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const {
        connectionId,
        tenantId,
        resourceType,
        events,
        criteria,
      } = req.body;

      if (!connectionId || !tenantId || !resourceType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: connectionId, tenantId, resourceType',
        });
      }

      // Get connection
      const connection = await prisma.pvsConnection.findFirst({
        where: {
          id: connectionId,
          pvsType: 'TOMEDO',
          isActive: true,
        },
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Tomedo connection not found',
        });
      }

      // Create subscription
      const subscription = await subscriptionManager.createSubscription(
        {
          id: connection.id,
          praxisId: connection.praxisId,
          pvsType: 'TOMEDO',
          protocol: 'FHIR',
          fhirBaseUrl: connection.fhirBaseUrl || undefined,
          fhirAuthType: connection.fhirAuthType || undefined,
          fhirCredentials: connection.fhirCredentials || undefined,
          isActive: connection.isActive,
          syncIntervalSec: connection.syncIntervalSec,
          retryCount: connection.retryCount,
          autoMapFields: connection.autoMapFields,
        },
        tenantId,
        {
          resourceType,
          events,
          criteria,
        }
      );

      return res.status(201).json({
        success: true,
        subscription,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[FhirSubAPI] Failed to create subscription', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * GET /api/tomedo-bridge/subscriptions/:id
 * Get subscription details
 */
router.get(
  '/subscriptions/:id',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscriptionId = Array.isArray(id) ? id[0] : id;

      const subscription = subscriptionManager.getSubscription(subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      return res.json({
        success: true,
        subscription,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[FhirSubAPI] Failed to get subscription', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * DELETE /api/tomedo-bridge/subscriptions/:id
 * Delete subscription
 */
router.delete(
  '/subscriptions/:id',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscriptionId = Array.isArray(id) ? id[0] : id;

      const deleted = await subscriptionManager.deleteSubscription(subscriptionId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      return res.json({
        success: true,
        message: 'Subscription deleted',
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[FhirSubAPI] Failed to delete subscription', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

/**
 * POST /api/tomedo-bridge/subscriptions/:id/deactivate
 * Deactivate subscription
 */
router.post(
  '/subscriptions/:id/deactivate',
  requireAuth,
  requireRole('arzt', 'admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscriptionId = Array.isArray(id) ? id[0] : id;

      const deactivated = await subscriptionManager.deactivateSubscription(subscriptionId);

      if (!deactivated) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      return res.json({
        success: true,
        message: 'Subscription deactivated',
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[FhirSubAPI] Failed to deactivate subscription', { error: errorMsg });
      
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  }
);

export default router;
