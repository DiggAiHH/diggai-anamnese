/**
 * Optimized FHIR Client
 *
 * Performance-Optimierungen:
 * - HTTP Keep-Alive Connection Pooling
 * - Request Deduplication
 * - Response Caching
 * - Circuit Breaker Pattern
 */

import type {
  FhirClientConfig,
  FhirResource,
  FhirBundle,
  FhirPatient,
} from '../types.js';
import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';

// ============================================================
// Types & Configuration
// ============================================================

interface CacheEntry<T> {
  data: T;
  etag?: string;
  expiresAt: number;
  cachedAt: number;
}

interface InflightRequest<T> {
  promise: Promise<T>;
  abortControllers: AbortController[];
  timestamp: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt: number;
}

interface OptimizedFhirConfig extends FhirClientConfig {
  keepAlive?: boolean;
  maxSockets?: number;
  maxFreeSockets?: number;
  freeSocketTimeout?: number;
  timeout?: number;
  retryCount?: number;
  cacheTTL?: number;
  deduplicateWindow?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetTimeout?: number;
}

interface RequestMetrics {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  statusCode?: number;
  error?: string;
  cached?: boolean;
  deduplicated?: boolean;
}

// ============================================================
// Connection Pool Manager
// ============================================================

class ConnectionPoolManager {
  private pools = new Map<string, http.Agent | https.Agent>();

  getAgent(url: string, config: OptimizedFhirConfig): http.Agent | https.Agent {
    const isHttps = url.startsWith('https:');
    const key = `${isHttps ? 'https' : 'http'}_${config.maxSockets}`;

    if (!this.pools.has(key)) {
      const agentConfig: http.AgentOptions = {
        keepAlive: config.keepAlive ?? true,
        maxSockets: config.maxSockets ?? 10,
        maxFreeSockets: config.maxFreeSockets ?? 5,
        ...(config.freeSocketTimeout !== undefined && { freeSocketTimeout: config.freeSocketTimeout } as any),
      } as any;

      const agent = isHttps 
        ? new https.Agent(agentConfig)
        : new http.Agent(agentConfig);

      this.pools.set(key, agent);
    }

    return this.pools.get(key)!;
  }

  destroy(): void {
    for (const agent of this.pools.values()) {
      agent.destroy();
    }
    this.pools.clear();
  }
}

// ============================================================
// Request Deduplication
// ============================================================

class RequestDeduplicator extends EventEmitter {
  private inflight = new Map<string, InflightRequest<unknown>>();
  private window: number;

  constructor(windowMs: number = 5000) {
    super();
    this.window = windowMs;
  }

  async deduplicate<T>(
    key: string,
    execute: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    // Prüfe ob gleicher Request läuft
    const existing = this.inflight.get(key) as InflightRequest<T> | undefined;
    
    if (existing && Date.now() - existing.timestamp < this.window) {
      this.emit('deduplicated', { key });
      
      // Füge AbortController hinzu für korrektes Cleanup
      const controller = new AbortController();
      existing.abortControllers.push(controller);
      
      try {
        const result = await existing.promise;
        return result;
      } finally {
        // Entferne Controller nach Fertigstellung
        const idx = existing.abortControllers.indexOf(controller);
        if (idx !== -1) {
          existing.abortControllers.splice(idx, 1);
        }
      }
    }

    // Neuer Request
    const abortControllers: AbortController[] = [];
    const promise = execute({} as AbortSignal).finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(key, {
      promise: promise as Promise<unknown>,
      abortControllers,
      timestamp: Date.now(),
    });

    return promise;
  }

  clear(): void {
    this.inflight.clear();
  }

  getInflightCount(): number {
    return this.inflight.size;
  }
}

// ============================================================
// Response Cache
// ============================================================

class ResponseCache extends EventEmitter {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) {
    super();
    this.defaultTTL = defaultTTL;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.emit('expired', { key });
      return undefined;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, etag?: string, ttl?: number): void {
    this.cache.set(key, {
      data,
      etag,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
      cachedAt: Date.now(),
    });
  }

  // Conditional GET mit ETag
  async conditionalGet<T>(
    key: string,
    fetcher: (etag?: string) => Promise<{ data: T; etag?: string; notModified?: boolean }>,
    ttl?: number
  ): Promise<T> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    const result = await fetcher(entry?.etag);
    
    if (result.notModified && entry) {
      // Cache verlängern
      entry.expiresAt = Date.now() + (ttl ?? this.defaultTTL);
      this.emit('revalidated', { key, etag: entry.etag });
      return entry.data;
    }

    // Neues Ergebnis cachen
    this.set(key, result.data, result.etag, ttl);
    return result.data;
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; memoryEstimate: number } {
    let memoryEstimate = 0;
    for (const entry of this.cache.values()) {
      memoryEstimate += JSON.stringify(entry.data).length * 2 + 200;
    }
    return { size: this.cache.size, memoryEstimate };
  }
}

// ============================================================
// Circuit Breaker
// ============================================================

class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState;
  private threshold: number;
  private resetTimeout: number;

  constructor(threshold = 5, resetTimeout = 30000) {
    super();
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      nextAttempt: 0,
    };
  }

  canExecute(): boolean {
    if (this.state.state === 'closed') return true;
    
    if (this.state.state === 'open') {
      if (Date.now() >= this.state.nextAttempt) {
        this.state.state = 'half-open';
        this.emit('state:half-open');
        return true;
      }
      return false;
    }
    
    return true; // half-open
  }

  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.state = 'closed';
      this.state.failures = 0;
      this.emit('state:closed');
    }
  }

  recordFailure(): void {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    if (this.state.failures >= this.threshold) {
      this.state.state = 'open';
      this.state.nextAttempt = Date.now() + this.resetTimeout;
      this.emit('state:open', { failures: this.state.failures });
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// ============================================================
// Optimized FHIR Client
// ============================================================

export class OptimizedFhirClient extends EventEmitter {
  private config: OptimizedFhirConfig;
  private poolManager: ConnectionPoolManager;
  private deduplicator: RequestDeduplicator;
  private cache: ResponseCache;
  private circuitBreaker: CircuitBreaker;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private metrics: RequestMetrics[] = [];
  private maxMetricsSize = 1000;

  constructor(config: OptimizedFhirConfig) {
    super();
    
    this.config = {
      keepAlive: true,
      maxSockets: 10,
      maxFreeSockets: 5,
      freeSocketTimeout: 30000,
      timeout: 10000,
      retryCount: 3,
      cacheTTL: 60000,
      deduplicateWindow: 5000,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTimeout: 30000,
      ...config,
    };

    this.poolManager = new ConnectionPoolManager();
    this.deduplicator = new RequestDeduplicator(this.config.deduplicateWindow);
    this.cache = new ResponseCache(this.config.cacheTTL);
    this.circuitBreaker = new CircuitBreaker(
      this.config.circuitBreakerThreshold,
      this.config.circuitBreakerResetTimeout
    );

    this.setupEventHandlers();
  }

  // ─── CRUD Operations ─────────────────────────────────────

  async read<T extends FhirResource>(resourceType: string, id: string): Promise<T> {
    const cacheKey = `read:${resourceType}:${id}`;
    
    // Cache-Check
    const cached = this.cache.get<T>(cacheKey);
    if (cached) {
      this.emit('cache:hit', { key: cacheKey });
      return cached;
    }

    const result = await this.request<T>('GET', `/${resourceType}/${id}`);
    this.cache.set(cacheKey, result, undefined, this.config.cacheTTL);
    return result;
  }

  async search<T extends FhirResource>(
    resourceType: string,
    params: Record<string, string>
  ): Promise<FhirBundle> {
    const qs = new URLSearchParams(params).toString();
    const cacheKey = `search:${resourceType}:${qs}`;

    // Deduplication
    return this.deduplicator.deduplicate(cacheKey, async () => {
      // Cache-Check
      const cached = this.cache.get<FhirBundle>(cacheKey);
      if (cached) {
        this.emit('cache:hit', { key: cacheKey });
        return cached;
      }

      const result = await this.request<FhirBundle>('GET', `/${resourceType}?${qs}`);
      this.cache.set(cacheKey, result, undefined, this.config.cacheTTL);
      return result;
    });
  }

  async create<T extends FhirResource>(resource: T): Promise<T> {
    return this.request<T>('POST', `/${resource.resourceType}`, resource);
  }

  async update<T extends FhirResource>(resource: T): Promise<T> {
    if (!resource.id) throw new Error('Resource ID required for update');
    
    const result = await this.request<T>('PUT', `/${resource.resourceType}/${resource.id}`, resource);
    
    // Cache invalidieren
    this.cache.invalidate(`read:${resource.resourceType}:${resource.id}`);
    this.cache.invalidatePattern(new RegExp(`search:${resource.resourceType}:.*`));
    
    return result;
  }

  async delete(resourceType: string, id: string): Promise<void> {
    await this.request<void>('DELETE', `/${resourceType}/${id}`);
    
    // Cache invalidieren
    this.cache.invalidate(`read:${resourceType}:${id}`);
    this.cache.invalidatePattern(new RegExp(`search:${resourceType}:.*`));
  }

  async transaction(bundle: FhirBundle): Promise<FhirBundle> {
    return this.request<FhirBundle>('POST', '/', bundle);
  }

  // ─── Optimized Methods ────────────────────────────────────

  /**
   * Metadata/CapabilityStatement mit aggressivem Caching
   */
  async getMetadata(): Promise<FhirResource> {
    const cacheKey = 'metadata';
    
    return this.cache.conditionalGet(cacheKey, async (etag) => {
      const headers = await this.getAuthHeaders();
      if (etag) {
        headers['If-None-Match'] = etag;
      }

      const url = `${this.config.baseUrl}/metadata`;
      const response = await fetch(url, { headers });

      if (response.status === 304) {
        return { data: {} as FhirResource, notModified: true };
      }

      if (!response.ok) {
        throw new Error(`Metadata request failed: ${response.status}`);
      }

      const data = await response.json() as FhirResource;
      const responseEtag = response.headers.get('ETag') || undefined;
      
      return { data, etag: responseEtag };
    }, 3600000); // 1 Stunde Cache
  }

  /**
   * Batch-Read für multiple Resources
   */
  async batchRead<T extends FhirResource>(
    resourceType: string,
    ids: string[]
  ): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const missingIds: string[] = [];

    // Cache-Lookup
    for (const id of ids) {
      const cached = this.cache.get<T>(`read:${resourceType}:${id}`);
      if (cached) {
        results.set(id, cached);
      } else {
        missingIds.push(id);
      }
    }

    // Fehlende Resourcen parallel laden
    if (missingIds.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < missingIds.length; i += batchSize) {
        const batch = missingIds.slice(i, i + batchSize);
        const promises = batch.map(id => 
          this.read<T>(resourceType, id).catch(() => null)
        );
        
        const batchResults = await Promise.all(promises);
        batch.forEach((id, index) => {
          results.set(id, batchResults[index]);
        });
      }
    }

    return results;
  }

  /**
   * Patient mit KVNR suchen (dedupliziert)
   */
  async searchPatient(kvnr: string): Promise<FhirPatient | null> {
    const cacheKey = `patient:kvnr:${kvnr}`;
    
    return this.deduplicator.deduplicate(cacheKey, async () => {
      const bundle = await this.search<FhirPatient>('Patient', {
        identifier: `http://fhir.de/sid/gkv/kvid-10|${kvnr}`,
      });
      
      const entry = bundle.entry?.[0];
      const patient = (entry?.resource as FhirPatient) ?? null;
      
      if (patient) {
        this.cache.set(cacheKey, patient, undefined, 300000); // 5 Minuten
      }
      
      return patient;
    });
  }

  /**
   * Verbindungstest
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.circuitBreaker.canExecute()) {
      return { ok: false, message: 'Circuit breaker is open' };
    }

    try {
      const headers = await this.getAuthHeaders();
      const agent = this.poolManager.getAgent(this.config.baseUrl, this.config);
      
      const response = await fetch(`${this.config.baseUrl}/metadata`, {
        headers,
        agent,
        signal: AbortSignal.timeout(this.config.timeout!),
      } as any);

      if (response.ok) {
        this.circuitBreaker.recordSuccess();
        return { ok: true, message: 'FHIR-Server erreichbar' };
      }
      
      this.circuitBreaker.recordFailure();
      return { ok: false, message: `HTTP ${response.status}` };
    } catch (error) {
      this.circuitBreaker.recordFailure();
      return { 
        ok: false, 
        message: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // ─── Metrics & Health ────────────────────────────────────

  getMetrics(): {
    requests: RequestMetrics[];
    inflightRequests: number;
    cacheStats: ReturnType<ResponseCache['getStats']>;
    circuitBreaker: ReturnType<CircuitBreaker['getState']>;
  } {
    return {
      requests: [...this.metrics],
      inflightRequests: this.deduplicator.getInflightCount(),
      cacheStats: this.cache.getStats(),
      circuitBreaker: this.circuitBreaker.getState(),
    };
  }

  /**
   * Cache invalidieren
   */
  invalidateCache(pattern?: RegExp): number {
    if (pattern) {
      return this.cache.invalidatePattern(pattern);
    }
    this.cache.clear();
    return 0;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.poolManager.destroy();
    this.deduplicator.clear();
    this.cache.clear();
    this.removeAllListeners();
  }

  // ─── Private Methods ─────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    attempt = 1
  ): Promise<T> {
    // Circuit Breaker Check
    if (!this.circuitBreaker.canExecute()) {
      throw new Error('Circuit breaker is open');
    }

    const url = `${this.config.baseUrl}${path}`;
    const headers = await this.getAuthHeaders();
    const agent = this.poolManager.getAgent(this.config.baseUrl, this.config);

    const metric: RequestMetrics = {
      url,
      method,
      startTime: Date.now(),
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        agent,
        signal: AbortSignal.timeout(this.config.timeout!),
      } as any);

      metric.statusCode = response.status;
      metric.endTime = Date.now();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      this.circuitBreaker.recordSuccess();
      this.recordMetric(metric);

      const data = await response.json() as T;
      return data;
    } catch (error) {
      metric.error = error instanceof Error ? error.message : String(error);
      metric.endTime = Date.now();
      this.recordMetric(metric);

      this.circuitBreaker.recordFailure();

      // Retry Logik
      if (attempt < this.config.retryCount! && this.isRetryableError(error)) {
        await this.delay(1000 * attempt);
        return this.request<T>(method, path, body, attempt + 1);
      }

      throw error;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    };

    switch (this.config.authType) {
      case 'basic': {
        const { username, password } = this.config.credentials;
        if (username && password) {
          headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
        }
        break;
      }
      case 'oauth2': {
        const token = await this.getOAuth2Token();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        break;
      }
      case 'apikey': {
        const { apiKey } = this.config.credentials;
        if (apiKey) headers['X-API-Key'] = apiKey;
        break;
      }
    }

    return headers;
  }

  private async getOAuth2Token(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30000) {
      return this.accessToken;
    }

    const { clientId, clientSecret, tokenUrl } = this.config.credentials;
    if (!clientId || !clientSecret || !tokenUrl) return null;

    try {
      const agent = this.poolManager.getAgent(tokenUrl, this.config);
      
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        agent,
      } as any);

      const data = await res.json() as { access_token?: string; expires_in?: number };
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
        return this.accessToken;
      }
    } catch (err) {
      console.error('[FHIR] OAuth2 token error:', err);
    }
    
    return null;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timeout') || 
             message.includes('econnreset') ||
             message.includes('enotfound') ||
             message.includes('socket hang up');
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordMetric(metric: RequestMetrics): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  private setupEventHandlers(): void {
    this.deduplicator.on('deduplicated', ({ key }) => {
      this.emit('request:deduplicated', { key });
    });

    this.circuitBreaker.on('state:open', ({ failures }) => {
      this.emit('circuitbreaker:open', { failures });
    });

    this.circuitBreaker.on('state:closed', () => {
      this.emit('circuitbreaker:closed');
    });
  }
}

// ============================================================
// Factory
// ============================================================

export function createOptimizedFhirClient(config: OptimizedFhirConfig): OptimizedFhirClient {
  return new OptimizedFhirClient(config);
}

export { ConnectionPoolManager, RequestDeduplicator, ResponseCache, CircuitBreaker };
export type { OptimizedFhirConfig, RequestMetrics };
