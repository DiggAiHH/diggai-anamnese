// ============================================
// FHIR Subscription Manager
// ============================================
// Manages FHIR Subscriptions for real-time updates

import { EventEmitter } from 'events';
import type { FhirClient } from './fhir-client.js';

export interface FhirSubscription {
  id: string;
  resourceType: string;
  criteria: string;
  endpoint?: string;
  headers?: string[];
  payload?: 'empty' | 'id-only' | 'full-resource';
  status: 'active' | 'off' | 'error';
}

export interface SubscriptionNotification {
  subscriptionId: string;
  timestamp: Date;
  resourceType: string;
  resourceId: string;
  resource?: unknown;
}

/**
 * Manages FHIR R4 Subscriptions
 */
export class FhirSubscriptionManager extends EventEmitter {
  private subscriptions = new Map<string, FhirSubscription>();
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private lastChecked = new Map<string, Date>();

  constructor(
    private client: FhirClient,
    private baseUrl: string
  ) {
    super();
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    resourceType: string,
    criteria: string,
    options: {
      payload?: 'empty' | 'id-only' | 'full-resource';
      endpoint?: string;
    } = {}
  ): Promise<FhirSubscription> {
    const subscription = {
      resourceType: 'Subscription',
      status: 'active',
      reason: `Auto-generated subscription for ${resourceType}`,
      criteria,
      channel: {
        type: options.endpoint ? 'rest-hook' : 'websocket',
        endpoint: options.endpoint,
        payload: options.payload || 'id-only',
        header: options.endpoint ? ['Authorization: Bearer token'] : undefined,
      },
    };

    try {
      const result = await this.client.create(subscription as any);
      
      const sub: FhirSubscription = {
        id: (result as any).id,
        resourceType,
        criteria,
        endpoint: options.endpoint,
        payload: options.payload || 'id-only',
        status: 'active',
      };

      this.subscriptions.set(sub.id, sub);
      
      // Start polling for updates if no endpoint provided
      if (!options.endpoint) {
        this.startPolling(sub);
      }

      this.emit('subscription:created', sub);
      return sub;
    } catch (error) {
      throw new Error(`Failed to create subscription: ${(error as Error).message}`);
    }
  }

  /**
   * Start polling for subscription updates
   */
  private startPolling(subscription: FhirSubscription): void {
    const interval = setInterval(async () => {
      await this.pollSubscription(subscription);
    }, 30000); // Poll every 30 seconds

    this.pollingIntervals.set(subscription.id, interval);
  }

  /**
   * Poll subscription for updates
   */
  private async pollSubscription(subscription: FhirSubscription): Promise<void> {
    const lastCheck = this.lastChecked.get(subscription.id) || new Date(Date.now() - 30000);
    
    try {
      // Search for resources matching criteria since last check
      const since = lastCheck.toISOString();
      const criteria = `${subscription.criteria}&_lastUpdated=gt${since}`;
      
      const results = await this.client.search(subscription.resourceType, { _lastUpdated: `gt${since}` });
      
      this.lastChecked.set(subscription.id, new Date());

      const entries = (results as any).entry || [];
      
      for (const entry of entries) {
        const notification: SubscriptionNotification = {
          subscriptionId: subscription.id,
          timestamp: new Date(),
          resourceType: entry.resource.resourceType,
          resourceId: entry.resource.id,
          resource: subscription.payload === 'full-resource' ? entry.resource : undefined,
        };

        this.emit('notification', notification);
      }
    } catch (error) {
      this.emit('error', { subscriptionId: subscription.id, error });
    }
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    // Stop polling
    const interval = this.pollingIntervals.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(subscriptionId);
    }

    try {
      await (this.client as any).delete('Subscription', subscriptionId);
      this.subscriptions.delete(subscriptionId);
      this.lastChecked.delete(subscriptionId);
      
      this.emit('subscription:deleted', { subscriptionId });
    } catch (error) {
      throw new Error(`Failed to delete subscription: ${(error as Error).message}`);
    }
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): FhirSubscription[] {
    return Array.from(this.subscriptions.values()).filter(s => s.status === 'active');
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Stop polling
    const interval = this.pollingIntervals.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(subscriptionId);
    }

    subscription.status = 'off';
    this.emit('subscription:paused', subscription);
  }

  /**
   * Resume a subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.status = 'active';
    this.startPolling(subscription);
    this.emit('subscription:resumed', subscription);
  }

  /**
   * Stop all subscriptions
   */
  stopAll(): void {
    for (const [id, interval] of this.pollingIntervals) {
      clearInterval(interval);
      this.emit('subscription:stopped', { subscriptionId: id });
    }
    this.pollingIntervals.clear();
  }
}

export const createSubscriptionManager = (client: FhirClient, baseUrl: string) => {
  return new FhirSubscriptionManager(client, baseUrl);
};
