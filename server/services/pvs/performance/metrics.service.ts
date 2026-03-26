/**
 * PVS Metrics Service
 *
 * Prometheus-kompatible Metriken für PVS-Operationen:
 * - Latenz-Histogramme
 * - Throughput-Counter
 * - Fehler-Raten
 * - Health-Checks
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

// ============================================================
// Types & Configuration
// ============================================================

type MetricLabel = Record<string, string>;

interface HistogramBucket {
  le: number;
  count: number;
}

interface HistogramMetric {
  type: 'histogram';
  name: string;
  help: string;
  labelNames: string[];
  buckets: number[];
  values: Map<string, { sum: number; count: number; buckets: HistogramBucket[] }>;
}

interface CounterMetric {
  type: 'counter';
  name: string;
  help: string;
  labelNames: string[];
  values: Map<string, number>;
}

interface GaugeMetric {
  type: 'gauge';
  name: string;
  help: string;
  labelNames: string[];
  values: Map<string, number>;
}

type Metric = HistogramMetric | CounterMetric | GaugeMetric;

interface MetricsConfig {
  prefix: string;
  defaultBuckets: number[];
  maxAge: number;
  cleanupInterval: number;
  enableRuntimeMetrics: boolean;
}

interface OperationTiming {
  operation: string;
  startTime: number;
  labels: MetricLabel;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    latency?: number;
  }>;
  timestamp: number;
}

// ============================================================
// Metrics Registry
// ============================================================

class MetricsRegistry extends EventEmitter {
  private metrics = new Map<string, Metric>();
  private config: MetricsConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<MetricsConfig> = {}) {
    super();
    
    this.config = {
      prefix: config.prefix ?? 'pvs_',
      defaultBuckets: config.defaultBuckets ?? [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      maxAge: config.maxAge ?? 3600000, // 1 Stunde
      cleanupInterval: config.cleanupInterval ?? 60000, // 1 Minute
      enableRuntimeMetrics: config.enableRuntimeMetrics ?? true,
    };

    this.startCleanup();
  }

  /**
   * Histogram-Metrik erstellen oder abrufen
   */
  histogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[]
  ): HistogramMetric {
    const fullName = this.config.prefix + name;
    
    let metric = this.metrics.get(fullName) as HistogramMetric | undefined;
    
    if (!metric) {
      metric = {
        type: 'histogram',
        name: fullName,
        help,
        labelNames,
        buckets: buckets ?? this.config.defaultBuckets,
        values: new Map(),
      };
      this.metrics.set(fullName, metric);
    }
    
    return metric;
  }

  /**
   * Counter-Metrik erstellen oder abrufen
   */
  counter(name: string, help: string, labelNames: string[] = []): CounterMetric {
    const fullName = this.config.prefix + name;
    
    let metric = this.metrics.get(fullName) as CounterMetric | undefined;
    
    if (!metric) {
      metric = {
        type: 'counter',
        name: fullName,
        help,
        labelNames,
        values: new Map(),
      };
      this.metrics.set(fullName, metric);
    }
    
    return metric;
  }

  /**
   * Gauge-Metrik erstellen oder abrufen
   */
  gauge(name: string, help: string, labelNames: string[] = []): GaugeMetric {
    const fullName = this.config.prefix + name;
    
    let metric = this.metrics.get(fullName) as GaugeMetric | undefined;
    
    if (!metric) {
      metric = {
        type: 'gauge',
        name: fullName,
        help,
        labelNames,
        values: new Map(),
      };
      this.metrics.set(fullName, metric);
    }
    
    return metric;
  }

  /**
   * Prometheus-Format exportieren
   */
  export(): string {
    const lines: string[] = [];
    
    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      
      switch (metric.type) {
        case 'counter':
        case 'gauge':
          for (const [labelKey, value] of metric.values) {
            const labels = this.parseLabelKey(labelKey, metric.labelNames);
            const labelStr = Object.entries(labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',');
            lines.push(`${metric.name}${labelStr ? '{' + labelStr + '}' : ''} ${value}`);
          }
          break;
          
        case 'histogram':
          for (const [labelKey, value] of metric.values) {
            const labels = this.parseLabelKey(labelKey, metric.labelNames);
            const labelPrefix = Object.entries(labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',');
            
            // Buckets
            for (const bucket of value.buckets) {
              const bucketLabels = labelPrefix 
                ? `${labelPrefix},le="${bucket.le === Infinity ? '+Inf' : bucket.le}"`
                : `le="${bucket.le === Infinity ? '+Inf' : bucket.le}"`;
              lines.push(`${metric.name}_bucket{${bucketLabels}} ${bucket.count}`);
            }
            
            // Sum
            const sumLabels = labelPrefix ? `{${labelPrefix}}` : '';
            lines.push(`${metric.name}_sum${sumLabels} ${value.sum}`);
            lines.push(`${metric.name}_count${sumLabels} ${value.count}`);
          }
          break;
      }
      
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * JSON-Format exportieren
   */
  exportJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const metric of this.metrics.values()) {
      result[metric.name] = {
        type: metric.type,
        help: metric.help,
        values: Object.fromEntries(metric.values),
      };
    }
    
    return result;
  }

  /**
   * Metrik entfernen
   */
  remove(name: string): boolean {
    return this.metrics.delete(this.config.prefix + name);
  }

  /**
   * Alle Metriken löschen
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Cleanup beenden
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.removeAllListeners();
  }

  // ─── Private Methods ─────────────────────────────────────

  private parseLabelKey(key: string, labelNames: string[]): MetricLabel {
    if (!key) return {};
    const values = key.split('|');
    const result: MetricLabel = {};
    labelNames.forEach((name, i) => {
      if (values[i]) result[name] = values[i];
    });
    return result;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      // Alte Werte entfernen (optional - könnte auf timestamp basieren)
    }, this.config.cleanupInterval);
  }
}

// ============================================================
// PVS Metrics Service
// ============================================================

export class PVSMetricsService extends EventEmitter {
  private registry: MetricsRegistry;
  private config: MetricsConfig;
  private activeTimings = new Map<string, OperationTiming>();
  private healthChecks = new Map<string, () => Promise<HealthStatus['checks'][0]>>();

  constructor(config: Partial<MetricsConfig> = {}) {
    super();
    
    this.config = {
      prefix: 'pvs_',
      defaultBuckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      maxAge: 3600000,
      cleanupInterval: 60000,
      enableRuntimeMetrics: true,
      ...config,
    };

    this.registry = new MetricsRegistry(this.config);
    this.initializeMetrics();
    
    if (this.config.enableRuntimeMetrics) {
      this.startRuntimeMetrics();
    }
  }

  // ─── Timing Operations ───────────────────────────────────

  /**
   * Operation-Timing starten
   */
  startTiming(operation: string, labels: MetricLabel = {}): string {
    const timingId = this.generateTimingId();
    
    this.activeTimings.set(timingId, {
      operation,
      startTime: performance.now(),
      labels,
    });
    
    return timingId;
  }

  /**
   * Operation-Timing beenden
   */
  endTiming(timingId: string, additionalLabels: MetricLabel = {}): number {
    const timing = this.activeTimings.get(timingId);
    if (!timing) return 0;

    const duration = (performance.now() - timing.startTime) / 1000; // Sekunden
    
    this.activeTimings.delete(timingId);

    // Histogram aktualisieren
    const histogram = this.registry.histogram(
      'operation_duration_seconds',
      'Duration of PVS operations',
      ['operation', ...Object.keys(timing.labels), ...Object.keys(additionalLabels)]
    );
    
    this.observeHistogram(histogram, duration, { ...timing.labels, ...additionalLabels });

    this.emit('timing:recorded', { operation: timing.operation, duration, labels: timing.labels });
    
    return duration;
  }

  /**
   * Operation mit automatischem Timing
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    labels: MetricLabel = {}
  ): Promise<T> {
    const timingId = this.startTiming(operation, labels);
    
    try {
      const result = await fn();
      this.endTiming(timingId, { status: 'success' });
      return result;
    } catch (error) {
      this.endTiming(timingId, { status: 'error', error_type: error instanceof Error ? error.name : 'unknown' });
      throw error;
    }
  }

  // ─── Counters ────────────────────────────────────────────

  /**
   * Request-Zähler erhöhen
   */
  incrementRequests(method: string, path: string, status: string): void {
    const counter = this.registry.counter(
      'requests_total',
      'Total number of PVS requests',
      ['method', 'path', 'status']
    );
    
    this.incrementCounter(counter, { method, path, status });
  }

  /**
   * Export-Zähler erhöhen
   */
  incrementExports(type: string, status: 'success' | 'failed'): void {
    const counter = this.registry.counter(
      'exports_total',
      'Total number of exports',
      ['type', 'status']
    );
    
    this.incrementCounter(counter, { type, status });
  }

  /**
   * Import-Zähler erhöhen
   */
  incrementImports(source: string, status: 'success' | 'failed'): void {
    const counter = this.registry.counter(
      'imports_total',
      'Total number of imports',
      ['source', 'status']
    );
    
    this.incrementCounter(counter, { source, status });
  }

  /**
   * Fehler-Zähler erhöhen
   */
  incrementErrors(type: string, code?: string): void {
    const counter = this.registry.counter(
      'errors_total',
      'Total number of errors',
      ['type', 'code']
    );
    
    this.incrementCounter(counter, { type, code: code || 'unknown' });
  }

  // ─── Gauges ──────────────────────────────────────────────

  /**
   * Aktive Verbindungen setzen
   */
  setActiveConnections(count: number, type?: string): void {
    const gauge = this.registry.gauge(
      'active_connections',
      'Number of active connections',
      type ? ['type'] : []
    );
    
    this.setGauge(gauge, count, type ? { type } : {});
  }

  /**
   * Queue-Größe setzen
   */
  setQueueSize(size: number, queueName: string): void {
    const gauge = this.registry.gauge(
      'queue_size',
      'Current queue size',
      ['queue']
    );
    
    this.setGauge(gauge, size, { queue: queueName });
  }

  /**
   * Cache-Statistiken setzen
   */
  setCacheStats(hits: number, misses: number, cacheName: string): void {
    const hitGauge = this.registry.gauge(
      'cache_hits',
      'Cache hits',
      ['cache']
    );
    
    const missGauge = this.registry.gauge(
      'cache_misses',
      'Cache misses',
      ['cache']
    );
    
    this.setGauge(hitGauge, hits, { cache: cacheName });
    this.setGauge(missGauge, misses, { cache: cacheName });
  }

  // ─── Health Checks ───────────────────────────────────────

  /**
   * Health-Check registrieren
   */
  registerHealthCheck(name: string, check: () => Promise<HealthStatus['checks'][0]>): void {
    this.healthChecks.set(name, check);
  }

  /**
   * Health-Status prüfen
   */
  async checkHealth(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = [];
    
    for (const [name, check] of this.healthChecks) {
      const startTime = performance.now();
      try {
        const result = await check();
        result.latency = performance.now() - startTime;
        checks.push({ ...result, name });
      } catch (error) {
        checks.push({
          name,
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
          latency: performance.now() - startTime,
        });
      }
    }

    const failed = checks.filter(c => c.status === 'fail').length;
    const warned = checks.filter(c => c.status === 'warn').length;
    
    let status: HealthStatus['status'] = 'healthy';
    if (failed > 0) status = 'unhealthy';
    else if (warned > 0) status = 'degraded';

    return {
      status,
      checks,
      timestamp: Date.now(),
    };
  }

  // ─── Export ──────────────────────────────────────────────

  /**
   * Prometheus-Format
   */
  getPrometheusMetrics(): string {
    return this.registry.export();
  }

  /**
   * JSON-Format
   */
  getJSONMetrics(): Record<string, unknown> {
    return this.registry.exportJSON();
  }

  /**
   * Metriken für einen bestimmten Zeitraum
   */
  getMetricsSnapshot(): {
    timestamp: number;
    metrics: Record<string, unknown>;
    health: Promise<HealthStatus>;
  } {
    return {
      timestamp: Date.now(),
      metrics: this.registry.exportJSON(),
      health: this.checkHealth(),
    };
  }

  // ─── Cleanup ─────────────────────────────────────────────

  dispose(): void {
    this.registry.dispose();
    this.activeTimings.clear();
    this.healthChecks.clear();
    this.removeAllListeners();
  }

  // ─── Private Methods ─────────────────────────────────────

  private initializeMetrics(): void {
    // Standard-Metriken initialisieren
    this.registry.histogram(
      'operation_duration_seconds',
      'Duration of PVS operations',
      ['operation', 'status']
    );
    
    this.registry.counter(
      'requests_total',
      'Total number of PVS requests',
      ['method', 'path', 'status']
    );
    
    this.registry.counter(
      'exports_total',
      'Total number of exports',
      ['type', 'status']
    );
    
    this.registry.gauge(
      'active_connections',
      'Number of active connections'
    );
  }

  private startRuntimeMetrics(): void {
    // Speicher-Metriken alle 30 Sekunden aktualisieren
    setInterval(() => {
      const usage = process.memoryUsage();
      
      const heapGauge = this.registry.gauge('memory_heap_bytes', 'Heap memory usage');
      this.setGauge(heapGauge, usage.heapUsed, {});
      
      const rssGauge = this.registry.gauge('memory_rss_bytes', 'RSS memory usage');
      this.setGauge(rssGauge, usage.rss, {});
    }, 30000);
  }

  private observeHistogram(
    histogram: HistogramMetric,
    value: number,
    labels: MetricLabel
  ): void {
    const labelKey = this.buildLabelKey(labels, histogram.labelNames);
    let entry = histogram.values.get(labelKey);
    
    if (!entry) {
      entry = {
        sum: 0,
        count: 0,
        buckets: histogram.buckets.map(b => ({ le: b, count: 0 })),
      };
      // +Inf bucket hinzufügen
      entry.buckets.push({ le: Infinity, count: 0 });
      histogram.values.set(labelKey, entry);
    }
    
    entry.sum += value;
    entry.count++;
    
    for (const bucket of entry.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  private incrementCounter(counter: CounterMetric, labels: MetricLabel): void {
    const labelKey = this.buildLabelKey(labels, counter.labelNames);
    const current = counter.values.get(labelKey) || 0;
    counter.values.set(labelKey, current + 1);
  }

  private setGauge(gauge: GaugeMetric, value: number, labels: MetricLabel): void {
    const labelKey = this.buildLabelKey(labels, gauge.labelNames);
    gauge.values.set(labelKey, value);
  }

  private buildLabelKey(labels: MetricLabel, labelNames: string[]): string {
    return labelNames.map(name => labels[name] || '').join('|');
  }

  private generateTimingId(): string {
    return `timing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================
// Export & Factory
// ============================================================

export function createMetricsService(config?: Partial<MetricsConfig>): PVSMetricsService {
  return new PVSMetricsService(config);
}

// Singleton
let defaultService: PVSMetricsService | null = null;

export function getDefaultMetricsService(): PVSMetricsService {
  if (!defaultService) {
    defaultService = new PVSMetricsService();
  }
  return defaultService;
}

export { MetricsRegistry };
export type { 
  HealthStatus, 
  OperationTiming, 
  MetricLabel,
  MetricsConfig,
  HistogramMetric,
  CounterMetric,
  GaugeMetric,
};
