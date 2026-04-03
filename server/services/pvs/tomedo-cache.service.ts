/**
 * Tomedo Cache Service
 * 
 * Multi-Tier Caching für Tomedo API Responses
 * 
 * @phase PHASE_8_PERFORMANCE
 */

import { createLogger } from '../../logger.js';
import { getRedisClient as getRedisClientFromModule } from '../../redis.js';
import type { TomedoPatient, TomedoFallakte } from './tomedo-api.client.js';
import type { PatientSearchResult } from './types.js';

const logger = createLogger('TomedoCache');

// Cache TTLs in seconds
const CACHE_TTL = {
  PATIENT: 300,        // 5 minutes
  PATIENT_SEARCH: 60,  // 1 minute
  ENCOUNTER: 300,      // 5 minutes
  FALLAKTE: 600,       // 10 minutes
  TERMIN: 120,         // 2 minutes
  REFERENZDATEN: 3600, // 1 hour (static data)
  KARTEIEINTRAG: 60,   // 1 minute
} as const;

// Helper to get redis client
function getRedis() {
  return getRedisClientFromModule();
}

// Cache keys
function patientKey(praxisId: string, patientId: string): string {
  return `tomedo:cache:${praxisId}:patient:${patientId}`;
}

function patientSearchKey(praxisId: string, query: string): string {
  return `tomedo:cache:${praxisId}:patient:search:${hashQuery(query)}`;
}

function encounterKey(praxisId: string, encounterId: string): string {
  return `tomedo:cache:${praxisId}:encounter:${encounterId}`;
}

function terminKey(praxisId: string, terminId: string): string {
  return `tomedo:cache:${praxisId}:termin:${terminId}`;
}

function referenzdatenKey(praxisId: string, type: string): string {
  return `tomedo:cache:${praxisId}:ref:${type}`;
}

// Simple hash function for query strings
function hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

class TomedoCache {
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
  };

  // In-memory fallback cache
  private memoryCache = new Map<string, {
    value: unknown;
    expiry: number;
  }>();

  private memoryLimit = 1000; // Max entries in memory cache

  /**
   * Get patient from cache
   */
  async getPatient(praxisId: string, patientId: string): Promise<TomedoPatient | null> {
    const key = patientKey(praxisId, patientId);
    return this.get<TomedoPatient>(key, CACHE_TTL.PATIENT);
  }

  /**
   * Set patient in cache
   */
  async setPatient(praxisId: string, patientId: string, patient: TomedoPatient): Promise<void> {
    const key = patientKey(praxisId, patientId);
    await this.set(key, patient, CACHE_TTL.PATIENT);
  }

  /**
   * Get patient search results
   */
  async getPatientSearch(praxisId: string, query: string): Promise<PatientSearchResult[] | null> {
    const key = patientSearchKey(praxisId, query);
    return this.get<PatientSearchResult[]>(key, CACHE_TTL.PATIENT_SEARCH);
  }

  /**
   * Set patient search results
   */
  async setPatientSearch(praxisId: string, query: string, results: PatientSearchResult[]): Promise<void> {
    const key = patientSearchKey(praxisId, query);
    await this.set(key, results, CACHE_TTL.PATIENT_SEARCH);
  }

  /**
   * Get encounter from cache
   */
  async getEncounter(praxisId: string, encounterId: string): Promise<TomedoFallakte | null> {
    const key = encounterKey(praxisId, encounterId);
    return this.get<TomedoFallakte>(key, CACHE_TTL.ENCOUNTER);
  }

  /**
   * Set encounter in cache
   */
  async setEncounter(praxisId: string, encounterId: string, encounter: TomedoFallakte): Promise<void> {
    const key = encounterKey(praxisId, encounterId);
    await this.set(key, encounter, CACHE_TTL.ENCOUNTER);
  }

  /**
   * Get termin from cache
   */
  async getTermin(praxisId: string, terminId: string): Promise<unknown | null> {
    const key = terminKey(praxisId, terminId);
    return this.get<unknown>(key, CACHE_TTL.TERMIN);
  }

  /**
   * Set termin in cache
   */
  async setTermin(praxisId: string, terminId: string, termin: unknown): Promise<void> {
    const key = terminKey(praxisId, terminId);
    await this.set(key, termin, CACHE_TTL.TERMIN);
  }

  /**
   * Get referenzdaten (Leistungskatalog, etc.)
   */
  async getReferenzdaten<T>(praxisId: string, type: string): Promise<T | null> {
    const key = referenzdatenKey(praxisId, type);
    return this.get<T>(key, CACHE_TTL.REFERENZDATEN);
  }

  /**
   * Set referenzdaten
   */
  async setReferenzdaten<T>(praxisId: string, type: string, data: T): Promise<void> {
    const key = referenzdatenKey(praxisId, type);
    await this.set(key, data, CACHE_TTL.REFERENZDATEN);
  }

  /**
   * Invalidate all cache entries for a practice
   */
  async invalidatePraxis(praxisId: string): Promise<void> {
    const pattern = `tomedo:cache:${praxisId}:*`;
    const redis = getRedis();
    
    try {
      if (redis) {
        // Find and delete matching keys in Redis
        const keys: string[] = [];
        let cursor = '0';
        
        do {
          const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = result[0];
          keys.push(...result[1]);
        } while (cursor !== '0');
        
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
      
      // Clear from memory cache too
      for (const key of this.memoryCache.keys()) {
        if (key.includes(`tomedo:cache:${praxisId}:`)) {
          this.memoryCache.delete(key);
        }
      }

      logger.info('[TomedoCache] Praxis cache invalidated', { praxisId });
    } catch (error) {
      logger.error('[TomedoCache] Failed to invalidate praxis cache', {
        praxisId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Invalidate specific patient cache
   */
  async invalidatePatient(praxisId: string, patientId: string): Promise<void> {
    const key = patientKey(praxisId, patientId);
    await this.del(key);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.totalRequests > 0
      ? Math.round((this.stats.hits / this.stats.totalRequests) * 100)
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalRequests: this.stats.totalRequests,
      hitRate,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, totalRequests: 0 };
  }

  /**
   * Generic get with fallback
   */
  private async get<T>(key: string, ttl: number): Promise<T | null> {
    this.stats.totalRequests++;

    // Try Redis first
    const redis = getRedis();
    try {
      if (redis) {
        const value = await redis.get(key);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value) as T;
        }
      }
    } catch (error) {
      logger.warn('[TomedoCache] Redis get failed, using memory fallback', {
        key,
        error: (error as Error).message,
      });
    }

    // Fallback to memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiry > Date.now()) {
      this.stats.hits++;
      return memoryEntry.value as T;
    }

    // Clean up expired memory entry
    if (memoryEntry) {
      this.memoryCache.delete(key);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Generic set with dual storage
   */
  private async set(key: string, value: unknown, ttl: number): Promise<void> {
    // Store in Redis
    const redis = getRedis();
    try {
      if (redis) {
        await redis.setex(key, ttl, JSON.stringify(value));
      }
    } catch (error) {
      logger.warn('[TomedoCache] Redis set failed', { key, error: (error as Error).message });
    }

    // Always store in memory as fallback
    this.setMemoryCache(key, value, ttl);
  }

  /**
   * Delete from both caches
   */
  private async del(key: string): Promise<void> {
    const redis = getRedis();
    try {
      if (redis) {
        await redis.del(key);
      }
    } catch (error) {
      logger.warn('[TomedoCache] Redis del failed', { key, error: (error as Error).message });
    }

    this.memoryCache.delete(key);
  }

  /**
   * Set memory cache with LRU eviction
   */
  private setMemoryCache(key: string, value: unknown, ttl: number): void {
    // Evict oldest if at limit
    if (this.memoryCache.size >= this.memoryLimit) {
      const oldest = this.memoryCache.entries().next().value;
      if (oldest) {
        this.memoryCache.delete(oldest[0]);
      }
    }

    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000),
    });
  }
}

// Export singleton
export const tomedoCache = new TomedoCache();
