/**
 * @module fhir-rate-limiter
 * @description Token-Bucket Rate Limiter für FHIR-Requests
 *
 * @security Schützt vor:
 *   - DoS-Angriffen durch zu viele Requests
 *   - API-Quota-Überschreitungen
 *   - Server-Überlastung
 *
 * @algorithm Token Bucket
 *   - Bucket mit fester Kapazität
 *   - Tokens werden mit konstanter Rate nachgefüllt
 *   - Jeder Request konsumiert 1 Token
 *   - Bei leerem Bucket: Request wird in Queue oder abgelehnt
 *
 * @features
 *   - Konfigurierbare Limits (Requests pro Minute)
 *   - Queue für ausstehende Requests
 *   - Header-basierte Limit-Informationen (RateLimit-*)
 *   - Per-Endpoint Limits möglich
 */

export interface RateLimitConfig {
  /** Maximale Requests pro Minute (default: 60) */
  requestsPerMinute: number;
  /** Bucket-Kapazität (burst allowance, default: requestsPerMinute) */
  burstSize?: number;
  /** Maximale Queue-Größe (default: 100) */
  maxQueueSize?: number;
  /** Timeout für queued Requests in ms (default: 30000) */
  queueTimeoutMs?: number;
  /** Per-Endpoint Overrides */
  endpointLimits?: Record<string, Partial<RateLimitConfig>>;
}

export interface RateLimitStatus {
  /** Verbleibende Tokens im Bucket */
  remaining: number;
  /** Bucket-Kapazität */
  limit: number;
  /** Wann der Bucket wieder voll ist (Unix timestamp ms) */
  resetTime: number;
  /** Anzahl Requests in Queue */
  queued: number;
  /** Ob aktuell rate-limited */
  limited: boolean;
}

export interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  queuedAt: number;
  endpoint?: string;
}

/**
 * Token-Bucket Rate Limiter für FHIR-API Requests
 * 
 * @example
 * const limiter = new FhirRateLimiter({ requestsPerMinute: 120 });
 * 
 * // Mit Rate-Limiting ausführen
 * const result = await limiter.execute(() => 
 *   fhirClient.search('Patient', { name: 'Müller' })
 * );
 * 
 * // Status abfragen
 * const status = limiter.getStatus();
 * console.log(`Remaining: ${status.remaining}/${status.limit}`);
 */
export class FhirRateLimiter {
  private config: Required<RateLimitConfig>;
  private tokens: number;
  private lastRefill: number;
  private queue: QueuedRequest<unknown>[] = [];
  private processingQueue = false;
  private endpointConfigs: Map<string, Required<RateLimitConfig>> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute,
      burstSize: config.burstSize ?? config.requestsPerMinute,
      maxQueueSize: config.maxQueueSize ?? 100,
      queueTimeoutMs: config.queueTimeoutMs ?? 30000,
      endpointLimits: config.endpointLimits ?? {},
    };

    this.tokens = this.config.burstSize;
    this.lastRefill = Date.now();

    // Endpoint-spezifische Konfigurationen aufbauen
    for (const [endpoint, endpointConfig] of Object.entries(this.config.endpointLimits)) {
      this.endpointConfigs.set(endpoint, {
        ...this.config,
        ...endpointConfig,
        burstSize: endpointConfig.burstSize ?? endpointConfig.requestsPerMinute ?? this.config.requestsPerMinute,
      });
    }
  }

  /**
   * Führt eine Funktion mit Rate-Limiting aus
   * 
   * @param fn - Auszuführende Funktion
   * @param endpoint - Optional: Endpoint für spezifische Limits
   * @returns Promise mit dem Ergebnis der Funktion
   * @throws Error bei Queue-Überlauf oder Timeout
   */
  async execute<T>(fn: () => Promise<T>, endpoint?: string): Promise<T> {
    const effectiveConfig = endpoint ? this.endpointConfigs.get(endpoint) ?? this.config : this.config;

    // Versuche Token zu konsumieren
    if (this.tryConsumeToken(effectiveConfig)) {
      return fn();
    }

    // Kein Token verfügbar → Queue
    if (this.queue.length >= effectiveConfig.maxQueueSize) {
      throw new Error(
        `Rate limit queue overflow: ${this.queue.length}/${effectiveConfig.maxQueueSize} ` +
        `(endpoint: ${endpoint ?? 'default'})`
      );
    }

    return this.enqueueRequest(fn, endpoint);
  }

  /**
   * Führt eine Funktion aus oder wirft sofort Error wenn limitiert
   * (kein Queuing)
   * 
   * @param fn - Auszuführende Funktion
   * @param endpoint - Optional: Endpoint für spezifische Limits
   * @returns Promise mit dem Ergebnis oder Error
   */
  async executeOrFail<T>(fn: () => Promise<T>, endpoint?: string): Promise<T> {
    const effectiveConfig = endpoint ? this.endpointConfigs.get(endpoint) ?? this.config : this.config;

    if (!this.tryConsumeToken(effectiveConfig)) {
      throw new Error(
        `Rate limit exceeded: ${this.getStatus().remaining}/${this.getStatus().limit} ` +
        `(endpoint: ${endpoint ?? 'default'})`
      );
    }

    return fn();
  }

  /**
   * Gibt aktuellen Rate-Limit-Status zurück
   */
  getStatus(): RateLimitStatus {
    this.refillTokens();
    
    const tokensPerMs = this.config.requestsPerMinute / 60000;
    const tokensNeededForFull = this.config.burstSize - this.tokens;
    const msUntilFull = tokensNeededForFull / tokensPerMs;
    
    return {
      remaining: Math.floor(this.tokens),
      limit: this.config.burstSize,
      resetTime: Date.now() + msUntilFull,
      queued: this.queue.length,
      limited: this.tokens < 1,
    };
  }

  /**
   * Gibt Rate-Limit-Headers für HTTP-Responses zurück
   * (RFC 6585 / RateLimit draft)
   */
  getRateLimitHeaders(): Record<string, string> {
    const status = this.getStatus();
    
    return {
      'RateLimit-Limit': status.limit.toString(),
      'RateLimit-Remaining': Math.max(0, status.remaining).toString(),
      'RateLimit-Reset': Math.ceil(status.resetTime / 1000).toString(),
      'X-RateLimit-Queue': status.queued.toString(),
    };
  }

  /**
   * Leert die Queue und lehnt alle pending Requests ab
   */
  clearQueue(): void {
    const error = new Error('Rate limiter queue cleared');
    
    while (this.queue.length > 0) {
      const req = this.queue.shift();
      if (req) {
        req.reject(error);
      }
    }
  }

  /**
   * Aktualisiert die Konfiguration (z.B. dynamische Anpassung)
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      burstSize: newConfig.burstSize ?? newConfig.requestsPerMinute ?? this.config.burstSize,
    };

    // Clamp tokens to new burst size
    this.tokens = Math.min(this.tokens, this.config.burstSize);
  }

  // ─── Private Methods ─────────────────────────────────────

  private tryConsumeToken(config: Required<RateLimitConfig>): boolean {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    
    // Tokens per millisecond
    const refillRate = this.config.requestsPerMinute / 60000;
    const tokensToAdd = elapsedMs * refillRate;
    
    this.tokens = Math.min(this.config.burstSize, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private enqueueRequest<T>(fn: () => Promise<T>, endpoint?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        execute: fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        queuedAt: Date.now(),
        endpoint,
      };

      this.queue.push(request as QueuedRequest<unknown>);

      // Timeout für diesen Request
      const effectiveConfig = endpoint ? this.endpointConfigs.get(endpoint) ?? this.config : this.config;
      setTimeout(() => {
        const index = this.queue.findIndex(r => r.id === request.id);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error(`Rate limit queue timeout after ${effectiveConfig.queueTimeoutMs}ms`));
        }
      }, effectiveConfig.queueTimeoutMs);

      // Starte Queue-Verarbeitung
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    this.processingQueue = true;

    while (this.queue.length > 0) {
      this.refillTokens();

      if (this.tokens < 1) {
        // Warte bis Token verfügbar
        const tokensPerMs = this.config.requestsPerMinute / 60000;
        const msToWait = Math.ceil(1 / tokensPerMs);
        await this.delay(msToWait);
        continue;
      }

      const request = this.queue.shift();
      if (!request) continue;

      // Prüfe Timeout
      const effectiveConfig = request.endpoint 
        ? this.endpointConfigs.get(request.endpoint) ?? this.config 
        : this.config;
        
      if (Date.now() - request.queuedAt > effectiveConfig.queueTimeoutMs) {
        request.reject(new Error('Request timed out in rate limit queue'));
        continue;
      }

      // Führe Request aus
      this.tokens -= 1;
      
      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error as Error);
      }
    }

    this.processingQueue = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory für standardmäßige PVS-Rate-Limiter
 */
export function createPvsRateLimiter(pvsType: string): FhirRateLimiter {
  // PVS-spezifische Defaults
  const configs: Record<string, RateLimitConfig> = {
    // CGM: Konservatives Limit
    CGM_M1: {
      requestsPerMinute: 60,
      burstSize: 10,
      maxQueueSize: 50,
    },
    // T2Med: Moderates Limit
    T2MED: {
      requestsPerMinute: 120,
      burstSize: 20,
      maxQueueSize: 100,
    },
    // Tomedo: Höheres Limit
    TOMEDO: {
      requestsPerMinute: 180,
      burstSize: 30,
      maxQueueSize: 150,
    },
    // Default
    default: {
      requestsPerMinute: 60,
      burstSize: 10,
      maxQueueSize: 100,
    },
  };

  const config = configs[pvsType] ?? configs.default;
  return new FhirRateLimiter(config);
}

/**
 * Decorator für automatisches Rate-Limiting von FHIR-Methoden
 * (für Klassen die einen `rateLimiter` Property haben)
 */
export function RateLimited<T extends (...args: unknown[]) => Promise<unknown>>(
  endpoint?: string
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: { rateLimiter?: FhirRateLimiter }, ...args: unknown[]) {
      if (!this.rateLimiter) {
        // Kein Rate Limiter konfiguriert → direkt ausführen
        return originalMethod.apply(this, args);
      }

      return this.rateLimiter.execute(() => originalMethod.apply(this, args), endpoint);
    } as T;

    return descriptor;
  };
}
