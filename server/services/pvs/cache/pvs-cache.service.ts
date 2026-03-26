// ============================================
// PVS Cache Service
// ============================================
// LRU Caching für Patienten-Indizes und Adapter-Instanzen

import { EventEmitter } from 'events';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
  accessCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  memoryUsage: number;
}

/**
 * LRU Cache with TTL support
 */
export class PvsCache<T> extends EventEmitter {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    memoryUsage: 0,
  };

  constructor(
    private maxSize: number = 1000,
    private defaultTtlMs: number = 300000 // 5 minutes
  ) {
    super();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.emit('expired', key);
      return undefined;
    }

    // Update access stats
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      lastAccessed: Date.now(),
      accessCount: 0,
    };

    this.cache.set(key, entry);
    this.updateMemoryUsage();
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMemoryUsage();
    }
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get or compute value
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.emit('evicted', oldestKey);
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.updateMemoryUsage();
    this.emit('cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      memoryUsage: this.stats.memoryUsage,
    };
  }

  /**
   * Get hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : Math.round((this.stats.hits / total) * 100);
  }

  /**
   * Update memory usage estimate
   */
  private updateMemoryUsage(): void {
    // Rough estimation based on entry count
    this.stats.memoryUsage = this.cache.size * 1024; // Assume ~1KB per entry
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateMemoryUsage();
      this.emit('cleanup', cleaned);
    }

    return cleaned;
  }
}

/**
 * Patient Index Cache
 * Maps patient identifiers to GDT file paths
 */
export class PatientIndexCache extends PvsCache<string> {
  constructor() {
    super(10000, 600000); // 10k entries, 10 min TTL
  }

  /**
   * Index patient by KVNR
   */
  indexByKvnr(kvnr: string, filePath: string): void {
    this.set(`kvnr:${kvnr}`, filePath);
  }

  /**
   * Index patient by name
   */
  indexByName(name: string, filePath: string): void {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    this.set(`name:${normalizedName}`, filePath);
  }

  /**
   * Find by KVNR
   */
  findByKvnr(kvnr: string): string | undefined {
    return this.get(`kvnr:${kvnr}`);
  }

  /**
   * Find by name (fuzzy)
   */
  findByName(name: string): string | undefined {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    return this.get(`name:${normalizedName}`);
  }
}

/**
 * Adapter Instance Cache
 * Caches initialized adapter instances
 */
export class AdapterCache extends PvsCache<unknown> {
  constructor() {
    super(50, 1800000); // 50 adapters, 30 min TTL
  }

  getAdapter(connectionId: string): unknown | undefined {
    return this.get(`adapter:${connectionId}`);
  }

  setAdapter(connectionId: string, adapter: unknown): void {
    this.set(`adapter:${connectionId}`, adapter, 1800000);
  }

  removeAdapter(connectionId: string): void {
    this.delete(`adapter:${connectionId}`);
  }
}

// Export singleton instances
export const patientIndexCache = new PatientIndexCache();
export const adapterCache = new AdapterCache();
export const gdtFileCache = new PvsCache<Buffer>(500, 60000); // 500 files, 1 min TTL

// Compatibility exports
export interface PatientIndexEntry {
  patNr: string;
  lastName: string;
  firstName: string;
  birthDate?: string;
  insuranceNr?: string;
  filePath: string;
  fileHash?: string;
  indexedAt: Date;
}

export const pvsCacheService = {
  patientIndex: patientIndexCache,
  adapters: adapterCache,
  gdtFiles: gdtFileCache,
};
