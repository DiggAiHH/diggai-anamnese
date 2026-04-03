// ─── Billing Cache Service ────────────────────────────────
// Redis-basiertes Caching für Stripe-Daten
// Reduziert API-Calls und verbessert Performance

import { getRedisClient } from '../redis.js';

const CACHE_TTL = {
  CUSTOMER: 300,      // 5 Minuten
  SUBSCRIPTION: 60,   // 1 Minute
  INVOICES: 600,      // 10 Minuten
  PAYMENT_METHODS: 300, // 5 Minuten
};

export class BillingCache {
  private getKey(type: string, id: string): string {
    return `billing:${type}:${id}`;
  }

  async get<T>(type: string, id: string): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const data = await redis.get(this.getKey(type, id));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('[BillingCache] Get error:', error);
      return null;
    }
  }

  async set(type: string, id: string, data: unknown, ttl?: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    const defaultTtl = CACHE_TTL[type.toUpperCase() as keyof typeof CACHE_TTL] || 300;

    try {
      await redis.setex(
        this.getKey(type, id),
        ttl || defaultTtl,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn('[BillingCache] Set error:', error);
    }
  }

  async invalidate(type: string, id: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.del(this.getKey(type, id));
    } catch (error) {
      console.warn('[BillingCache] Invalidate error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      const keys = await redis.keys(`billing:${pattern}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.warn('[BillingCache] Invalidate pattern error:', error);
    }
  }
}

export const billingCache = new BillingCache();
