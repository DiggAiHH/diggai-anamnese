// ============================================
// PVS Metrics Service
// ============================================
// Prometheus-kompatible Metriken für Monitoring

import { EventEmitter } from 'events';

export interface MetricValue {
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

/**
 * Counter Metric (monotonically increasing)
 */
export class Counter {
  private values = new Map<string, MetricValue>();

  constructor(
    private name: string,
    private help: string,
    private labelNames: string[] = []
  ) {}

  inc(labels: Record<string, string> = {}, value = 1): void {
    const key = this.getKey(labels);
    const existing = this.values.get(key);
    
    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.values.set(key, {
        value,
        labels,
        timestamp: Date.now(),
      });
    }
  }

  get(labels: Record<string, string> = {}): number {
    const key = this.getKey(labels);
    return this.values.get(key)?.value || 0;
  }

  getAll(): MetricValue[] {
    return Array.from(this.values.values());
  }

  private getKey(labels: Record<string, string>): string {
    return this.labelNames.map(n => `${n}=${labels[n] || ''}`).join(',');
  }

  toPrometheus(): string {
    const lines = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} counter`,
    ];
    
    for (const mv of this.values.values()) {
      const labelStr = Object.entries(mv.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`${this.name}{${labelStr}} ${mv.value} ${mv.timestamp}`);
    }
    
    return lines.join('\n');
  }
}

/**
 * Gauge Metric (can go up and down)
 */
export class Gauge {
  private values = new Map<string, MetricValue>();

  constructor(
    private name: string,
    private help: string,
    private labelNames: string[] = []
  ) {}

  set(value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(labels);
    this.values.set(key, {
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  inc(labels: Record<string, string> = {}, value = 1): void {
    const key = this.getKey(labels);
    const existing = this.values.get(key);
    
    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.values.set(key, {
        value,
        labels,
        timestamp: Date.now(),
      });
    }
  }

  dec(labels: Record<string, string> = {}, value = 1): void {
    this.inc(labels, -value);
  }

  get(labels: Record<string, string> = {}): number {
    const key = this.getKey(labels);
    return this.values.get(key)?.value || 0;
  }

  private getKey(labels: Record<string, string>): string {
    return this.labelNames.map(n => `${n}=${labels[n] || ''}`).join(',');
  }
}

/**
 * Histogram Metric
 */
export class Histogram {
  private buckets: number[];
  private bucketValues = new Map<string, Map<number, number>>();
  private sums = new Map<string, number>();
  private counts = new Map<string, number>();

  constructor(
    private name: string,
    private help: string,
    private labelNames: string[] = [],
    buckets: number[] = [0.1, 0.5, 1, 2, 5, 10]
  ) {
    this.buckets = [...buckets, Infinity];
  }

  observe(value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(labels);
    
    // Update buckets
    if (!this.bucketValues.has(key)) {
      this.bucketValues.set(key, new Map());
    }
    const buckets = this.bucketValues.get(key)!;
    
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
      }
    }

    // Update sum and count
    this.sums.set(key, (this.sums.get(key) || 0) + value);
    this.counts.set(key, (this.counts.get(key) || 0) + 1);
  }

  private getKey(labels: Record<string, string>): string {
    return this.labelNames.map(n => `${n}=${labels[n] || ''}`).join(',');
  }
}

/**
 * PVS Metrics Collection
 */
export class PvsMetrics extends EventEmitter {
  // GDT Metrics
  readonly gdtFilesProcessed = new Counter(
    'pvs_gdt_files_processed_total',
    'Total number of GDT files processed',
    ['pvs_type', 'status', 'direction']
  );

  readonly gdtProcessingDuration = new Histogram(
    'pvs_gdt_processing_duration_seconds',
    'GDT file processing duration',
    ['pvs_type', 'operation'],
    [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  );

  readonly gdtFilesPending = new Gauge(
    'pvs_gdt_files_pending',
    'Number of GDT files pending processing',
    ['pvs_type']
  );

  // FHIR Metrics
  readonly fhirRequestsTotal = new Counter(
    'pvs_fhir_requests_total',
    'Total number of FHIR requests',
    ['pvs_type', 'method', 'status']
  );

  readonly fhirRequestDuration = new Histogram(
    'pvs_fhir_request_duration_seconds',
    'FHIR request duration',
    ['pvs_type', 'method'],
    [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
  );

  readonly fhirActiveConnections = new Gauge(
    'pvs_fhir_active_connections',
    'Number of active FHIR connections',
    ['pvs_type']
  );

  // Connection Metrics
  readonly pvsConnectionStatus = new Gauge(
    'pvs_connection_status',
    'PVS connection status (1=connected, 0=disconnected)',
    ['pvs_type', 'connection_id']
  );

  readonly pvsConnectionErrors = new Counter(
    'pvs_connection_errors_total',
    'Total number of PVS connection errors',
    ['pvs_type', 'error_type']
  );

  // Transfer Metrics
  readonly pvsTransfersTotal = new Counter(
    'pvs_transfers_total',
    'Total number of PVS transfers',
    ['pvs_type', 'direction', 'status']
  );

  readonly pvsTransferDuration = new Histogram(
    'pvs_transfer_duration_seconds',
    'PVS transfer duration',
    ['pvs_type', 'direction'],
    [0.1, 0.5, 1, 2, 5, 10, 30]
  );

  // Cache Metrics
  readonly cacheHits = new Counter(
    'pvs_cache_hits_total',
    'Total number of cache hits',
    ['cache_type']
  );

  readonly cacheMisses = new Counter(
    'pvs_cache_misses_total',
    'Total number of cache misses',
    ['cache_type']
  );

  // Circuit Breaker Metrics
  readonly circuitBreakerState = new Gauge(
    'pvs_circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=half-open, 2=open)',
    ['pvs_type']
  );

  /**
   * Record GDT file processing
   */
  recordGdtProcessing(
    pvsType: string,
    operation: 'import' | 'export',
    status: 'success' | 'error',
    durationMs: number
  ): void {
    this.gdtFilesProcessed.inc({ pvs_type: pvsType, status, direction: operation });
    this.gdtProcessingDuration.observe(durationMs / 1000, { pvs_type: pvsType, operation });
  }

  /**
   * Record FHIR request
   */
  recordFhirRequest(
    pvsType: string,
    method: string,
    status: number,
    durationMs: number
  ): void {
    const statusClass = `${Math.floor(status / 100)}xx`;
    this.fhirRequestsTotal.inc({ pvs_type: pvsType, method, status: statusClass });
    this.fhirRequestDuration.observe(durationMs / 1000, { pvs_type: pvsType, method });
  }

  /**
   * Record cache operation
   */
  recordCache(cacheType: string, hit: boolean): void {
    if (hit) {
      this.cacheHits.inc({ cache_type: cacheType });
    } else {
      this.cacheMisses.inc({ cache_type: cacheType });
    }
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(cacheType: string): number {
    const hits = this.cacheHits.get({ cache_type: cacheType });
    const misses = this.cacheMisses.get({ cache_type: cacheType });
    const total = hits + misses;
    return total === 0 ? 0 : Math.round((hits / total) * 100);
  }

  /**
   * Generate Prometheus exposition format
   */
  toPrometheus(): string {
    const metrics = [
      this.gdtFilesProcessed,
      // Add other metrics as needed
    ];
    
    return metrics.map(m => m.toPrometheus()).join('\n\n');
  }
}

// Export singleton
export const pvsMetrics = new PvsMetrics();
