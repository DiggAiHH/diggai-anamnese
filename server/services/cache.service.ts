/**
 * Cache Service - Redis-backed caching with graceful degradation
 * 
 * Provides caching for API responses to reduce database load
 * and improve response times for frequently accessed data.
 */

import { getRedisClient, isRedisReady } from '../redis';

const DEFAULT_TTL = 3600; // 1 hour
const SHORT_TTL = 300;    // 5 minutes (for patient data)
const LONG_TTL = 86400;   // 24 hours (for static data like atoms)

/**
 * Get cached value by key
 * @param key Cache key
 * @returns Cached value or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisReady()) return null;
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('[Cache] Get error:', err);
    return null;
  }
}

/**
 * Set value in cache with TTL
 * @param key Cache key
 * @param value Value to cache
 * @param ttl Time to live in seconds (default: 1 hour)
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  if (!isRedisReady()) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.warn('[Cache] Set error:', err);
  }
}

/**
 * Invalidate cache by exact key
 * @param key Cache key to invalidate
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!isRedisReady()) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (err) {
    console.warn('[Cache] Invalidate error:', err);
  }
}

/**
 * Invalidate cache by pattern (uses KEYS command)
 * WARNING: Use sparingly in production - KEYS is O(N)
 * @param pattern Pattern to match (e.g., "atoms:*")
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!isRedisReady()) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    console.warn('[Cache] Invalidate pattern error:', err);
  }
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  return isRedisReady();
}

/**
 * Generate cache key for atoms query
 */
export function getAtomsCacheKey(
  ids?: string[],
  module?: string,
  section?: string
): string {
  if (ids && ids.length > 0) {
    return `atoms:ids:${ids.sort().join(',')}`;
  }
  return `atoms:filter:${module || 'all'}:${section || 'all'}`;
}

/**
 * Generate cache key for patient metadata
 */
export function getPatientCacheKey(patientId: string): string {
  return `patient:meta:${patientId}`;
}

/**
 * Generate cache key for session state
 */
export function getSessionCacheKey(sessionId: string): string {
  return `session:state:${sessionId}`;
}

// Export TTL constants for use in routes
export { DEFAULT_TTL, SHORT_TTL, LONG_TTL };
