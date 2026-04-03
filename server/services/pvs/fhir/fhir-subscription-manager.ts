/**
 * FHIR Subscription Manager
 * 
 * Verwaltet FHIR Subscriptions für Echtzeit-Updates von Tomedo.
 * Empfängt Benachrichtigungen bei Änderungen an Patienten, Fallakten, etc.
 * 
 * @phase PHASE_7_FHIR_SUBSCRIPTIONS
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../../logger.js';
import { createTomedoApiClient } from '../tomedo-api.client.js';
import { tomedoLauscher } from '../tomedo-lauscher.service.js';
import type { PvsConnectionData } from '../types.js';

const logger = createLogger('FhirSubscriptionManager');

// Subscription Types
export type SubscriptionResource = 
  | 'Patient' 
  | 'Encounter' 
  | 'Observation' 
  | 'Condition' 
  | 'Procedure' 
  | 'MedicationStatement'
  | 'Composition';

export type SubscriptionEvent = 'create' | 'update' | 'delete';

export interface FhirSubscription {
  id: string;
  connectionId: string;
  tenantId: string;
  resourceType: SubscriptionResource;
  events: SubscriptionEvent[];
  criteria?: string; // FHIR search criteria
  webhookUrl: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  lastEventAt?: string;
  errorCount: number;
}

export interface SubscriptionNotification {
  subscriptionId: string;
  resourceType: SubscriptionResource;
  event: SubscriptionEvent;
  resourceId: string;
  resource?: Record<string, unknown>;
  timestamp: string;
}

// In-memory store (Redis in production)
const subscriptions = new Map<string, FhirSubscription>();
const connectionSubscriptions = new Map<string, Set<string>>();

export class FhirSubscriptionManager extends EventEmitter {
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 5000;

  /**
   * Create a new subscription
   */
  async createSubscription(
    connection: PvsConnectionData,
    tenantId: string,
    params: {
      resourceType: SubscriptionResource;
      events?: SubscriptionEvent[];
      criteria?: string;
    }
  ): Promise<FhirSubscription> {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Build webhook URL
    const webhookUrl = this.buildWebhookUrl(subscriptionId);

    const subscription: FhirSubscription = {
      id: subscriptionId,
      connectionId: connection.id,
      tenantId,
      resourceType: params.resourceType,
      events: params.events || ['create', 'update'],
      criteria: params.criteria,
      webhookUrl,
      status: 'inactive',
      createdAt: new Date().toISOString(),
      errorCount: 0,
    };

    // Register with Tomedo
    try {
      await this.registerWithTomedo(connection, subscription);
      subscription.status = 'active';
      
      logger.info('[FhirSubscription] Subscription created', {
        subscriptionId,
        resourceType: subscription.resourceType,
        connectionId: connection.id,
      });
    } catch (error) {
      logger.error('[FhirSubscription] Failed to register with Tomedo', {
        subscriptionId,
        error: (error as Error).message,
      });
      subscription.status = 'error';
    }

    // Store subscription
    subscriptions.set(subscriptionId, subscription);
    
    // Index by connection
    if (!connectionSubscriptions.has(connection.id)) {
      connectionSubscriptions.set(connection.id, new Set());
    }
    connectionSubscriptions.get(connection.id)!.add(subscriptionId);

    this.emit('subscription:created', subscription);
    return subscription;
  }

  /**
   * Register subscription with Tomedo FHIR server
   */
  private async registerWithTomedo(
    connection: PvsConnectionData,
    subscription: FhirSubscription
  ): Promise<void> {
    const client = createTomedoApiClient(connection);

    // Build FHIR Subscription resource
    const fhirSubscription = {
      resourceType: 'Subscription',
      status: 'active',
      reason: `DiggAI ${subscription.resourceType} sync`,
      criteria: subscription.criteria || `${subscription.resourceType}?_lastUpdated=gt${subscription.createdAt}`,
      channel: {
        type: 'rest-hook',
        endpoint: subscription.webhookUrl,
        payload: 'application/fhir+json',
        header: [
          'X-Subscription-Id: ' + subscription.id,
          'X-Tenant-Id: ' + subscription.tenantId,
        ],
      },
      reasonCode: [
        {
          coding: [
            {
              system: 'http://diggai.de/subscription-reason',
              code: 'sync',
              display: 'Synchronization',
            },
          ],
        },
      ],
    };

    // Create subscription via FHIR API
    // Note: Tomedo may have specific endpoint for subscriptions
    const response = await fetch(`${connection.fhirBaseUrl}/Subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        'Authorization': `Bearer ${await this.getAccessToken(client)}`,
      },
      body: JSON.stringify(fhirSubscription),
    });

    if (!response.ok) {
      throw new Error(`Failed to create subscription: ${response.statusText}`);
    }

    // Also start lauscher for polling fallback
    tomedoLauscher.startLauscher(subscription.tenantId, connection);
  }

  /**
   * Get access token for client
   */
  private async getAccessToken(client: ReturnType<typeof createTomedoApiClient>): Promise<string> {
    const auth = await client.authenticate();
    if (!auth.success || !auth.accessToken) {
      throw new Error('Authentication failed');
    }
    return auth.accessToken;
  }

  /**
   * Handle incoming webhook from Tomedo
   */
  async handleWebhook(
    subscriptionId: string,
    payload: {
      resourceType: string;
      id: string;
      event: SubscriptionEvent;
      resource?: Record<string, unknown>;
    }
  ): Promise<void> {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) {
      logger.warn('[FhirSubscription] Unknown subscription', { subscriptionId });
      throw new Error('Unknown subscription');
    }

    // Update last event
    subscription.lastEventAt = new Date().toISOString();

    const notification: SubscriptionNotification = {
      subscriptionId,
      resourceType: payload.resourceType as SubscriptionResource,
      event: payload.event,
      resourceId: payload.id,
      resource: payload.resource,
      timestamp: new Date().toISOString(),
    };

    logger.info('[FhirSubscription] Webhook received', {
      subscriptionId,
      resourceType: notification.resourceType,
      event: notification.event,
      resourceId: notification.resourceId,
    });

    // Emit event for processing
    this.emit('notification', notification);
    this.emit(`notification:${subscription.resourceType}`, notification);

    // Reset error count on success
    subscription.errorCount = 0;
  }

  /**
   * Process notification and sync to DiggAI
   */
  async processNotification(
    notification: SubscriptionNotification,
    connection: PvsConnectionData
  ): Promise<void> {
    const { resourceType, event, resourceId, resource } = notification;

    try {
      switch (resourceType) {
        case 'Patient':
          await this.syncPatient(resourceId, resource, connection);
          break;
        case 'Encounter':
          await this.syncEncounter(resourceId, resource, connection);
          break;
        case 'Observation':
          await this.syncObservation(resourceId, resource, connection);
          break;
        case 'Condition':
          await this.syncCondition(resourceId, resource, connection);
          break;
        case 'Composition':
          await this.syncComposition(resourceId, resource, connection);
          break;
        default:
          logger.debug('[FhirSubscription] Unhandled resource type', { resourceType });
      }
    } catch (error) {
      logger.error('[FhirSubscription] Failed to process notification', {
        resourceType,
        resourceId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Sync patient from Tomedo
   */
  private async syncPatient(
    patientId: string,
    resource: Record<string, unknown> | undefined,
    connection: PvsConnectionData
  ): Promise<void> {
    // Fetch full patient if resource not provided
    if (!resource) {
      const client = createTomedoApiClient(connection);
      resource = await client.getPatient(patientId) as unknown as Record<string, unknown>;
    }

    // TODO: Implement patient sync logic based on your Prisma schema
    // This is a placeholder - adjust according to your actual Patient model
    
    logger.info('[FhirSubscription] Patient sync placeholder', {
      patientId,
      hasResource: !!resource,
    });

    this.emit('patient:synced', { patientId, resource });
  }

  /**
   * Sync encounter from Tomedo
   */
  private async syncEncounter(
    encounterId: string,
    resource: Record<string, unknown> | undefined,
    connection: PvsConnectionData
  ): Promise<void> {
    // Implement encounter sync logic
    this.emit('encounter:synced', { encounterId, resource });
  }

  /**
   * Sync observation from Tomedo
   */
  private async syncObservation(
    observationId: string,
    resource: Record<string, unknown> | undefined,
    connection: PvsConnectionData
  ): Promise<void> {
    // Implement observation sync logic
    this.emit('observation:synced', { observationId, resource });
  }

  /**
   * Sync condition from Tomedo
   */
  private async syncCondition(
    conditionId: string,
    resource: Record<string, unknown> | undefined,
    connection: PvsConnectionData
  ): Promise<void> {
    // Implement condition sync logic
    this.emit('condition:synced', { conditionId, resource });
  }

  /**
   * Sync composition from Tomedo
   */
  private async syncComposition(
    compositionId: string,
    resource: Record<string, unknown> | undefined,
    connection: PvsConnectionData
  ): Promise<void> {
    // Implement composition sync logic
    this.emit('composition:synced', { compositionId, resource });
  }

  /**
   * Get subscription by ID
   */
  getSubscription(id: string): FhirSubscription | undefined {
    return subscriptions.get(id);
  }

  /**
   * Get all subscriptions for a connection
   */
  getConnectionSubscriptions(connectionId: string): FhirSubscription[] {
    const ids = connectionSubscriptions.get(connectionId);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => subscriptions.get(id))
      .filter((sub): sub is FhirSubscription => sub !== undefined);
  }

  /**
   * Get all subscriptions for a tenant
   */
  getTenantSubscriptions(tenantId: string): FhirSubscription[] {
    return Array.from(subscriptions.values())
      .filter(sub => sub.tenantId === tenantId);
  }

  /**
   * Deactivate subscription
   */
  async deactivateSubscription(id: string): Promise<boolean> {
    const subscription = subscriptions.get(id);
    if (!subscription) return false;

    subscription.status = 'inactive';
    this.emit('subscription:deactivated', subscription);
    
    return true;
  }

  /**
   * Delete subscription
   */
  async deleteSubscription(id: string): Promise<boolean> {
    const subscription = subscriptions.get(id);
    if (!subscription) return false;

    // Remove from connection index
    const connSubs = connectionSubscriptions.get(subscription.connectionId);
    if (connSubs) {
      connSubs.delete(id);
    }

    // Delete from store
    subscriptions.delete(id);
    this.emit('subscription:deleted', { id });

    return true;
  }

  /**
   * Build webhook URL
   */
  private buildWebhookUrl(subscriptionId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://api.diggai.de';
    return `${baseUrl}/api/webhooks/fhir/${subscriptionId}`;
  }

  /**
   * Get stats
   */
  getStats() {
    const allSubs = Array.from(subscriptions.values());
    return {
      total: allSubs.length,
      active: allSubs.filter(s => s.status === 'active').length,
      inactive: allSubs.filter(s => s.status === 'inactive').length,
      error: allSubs.filter(s => s.status === 'error').length,
      byResource: allSubs.reduce((acc, sub) => {
        acc[sub.resourceType] = (acc[sub.resourceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Cleanup old/error subscriptions
   */
  cleanup(): void {
    const now = Date.now();
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const toDelete: string[] = [];

    for (const [id, sub] of subscriptions) {
      // Delete old inactive subscriptions
      if (sub.status === 'inactive') {
        const createdAt = new Date(sub.createdAt).getTime();
        if (now - createdAt > maxAgeMs) {
          toDelete.push(id);
        }
      }
      
      // Delete subscriptions with too many errors
      if (sub.errorCount > this.maxRetries) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.deleteSubscription(id);
    }

    logger.info('[FhirSubscription] Cleanup completed', {
      deleted: toDelete.length,
      remaining: subscriptions.size,
    });
  }
}

// Export singleton
export const subscriptionManager = new FhirSubscriptionManager();
