// ============================================
// PVS Rate Limiter
// ============================================
// Rate limiting for PVS operations

import { EventEmitter } from 'events';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  totalHits: number;
}

/**
 * Token Bucket Rate Limiter
 */
export class RateLimiter extends EventEmitter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    super();
    this.config = {
      maxRequests: 100,
      windowMs: 60000,
      keyPrefix: 'pvs:',
      ...config,
    };
  }

  /**
   * Check if request is allowed
   */
  check(key: string): RateLimitInfo {
    const fullKey = `${this.config.keyPrefix}${key}`;
    const now = Date.now();
    
    let bucket = this.buckets.get(fullKey);
    
    if (!bucket) {
      bucket = { tokens: this.config.maxRequests, lastRefill: now };
      this.buckets.set(fullKey, bucket);
    }

    // Refill tokens
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / (this.config.windowMs / this.config.maxRequests));
    bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const allowed = bucket.tokens > 0;
    
    if (allowed) {
      bucket.tokens--;
    }

    const resetTime = new Date(now + this.config.windowMs);
    
    this.emit(allowed ? 'allowed' : 'limited', { key: fullKey, remaining: bucket.tokens });

    return {
      allowed,
      remaining: bucket.tokens,
      resetTime,
      totalHits: this.config.maxRequests - bucket.tokens,
    };
  }

  /**
   * Reset bucket for key
   */
  reset(key: string): void {
    const fullKey = `${this.config.keyPrefix}${key}`;
    this.buckets.delete(fullKey);
    this.emit('reset', { key: fullKey });
  }

  /**
   * Get all bucket stats
   */
  getStats(): Array<{ key: string; tokens: number; lastRefill: Date }> {
    return Array.from(this.buckets.entries()).map(([key, bucket]) => ({
      key,
      tokens: bucket.tokens,
      lastRefill: new Date(bucket.lastRefill),
    }));
  }
}

// Export singletons for different use cases
export const pvsExportLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
export const pvsImportLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60000 });
export const pvsSearchLimiter = new RateLimiter({ maxRequests: 60, windowMs: 60000 });
