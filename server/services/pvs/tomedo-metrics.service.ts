/**
 * Tomedo Metrics Service
 * 
 * Prometheus-kompatible Metrics für Monitoring und Alerting
 * 
 * @phase PHASE_8_PERFORMANCE
 */

import { createLogger } from '../../logger.js';
import type { CircuitStats } from './resilience/circuit-breaker.js';

const logger = createLogger('TomedoMetrics');

// Metric types
interface Counter {
  value: number;
  labels: Record<string, string>;
}

interface Histogram {
  buckets: Map<number, number>;
  sum: number;
  count: number;
  labels: Record<string, string>;
}

interface Gauge {
  value: number;
  labels: Record<string, string>;
}

export interface TomedoMetricsSnapshot {
  timestamp: number;
  counters: Record<string, Counter[]>;
  histograms: Record<string, Histogram[]>;
  gauges: Record<string, Gauge[]>;
}

export class TomedoMetricsService {
  private counters = new Map<string, Map<string, Counter>>();
  private histograms = new Map<string, Map<string, Histogram>>();
  private gauges = new Map<string, Map<string, Gauge>>();
  private histogramBuckets = [50, 100, 250, 500, 1000, 2500, 5000, 10000];

  // Predefined metrics
  private readonly METRIC_NAMES = {
    // API calls
    API_CALLS_TOTAL: 'tomedo_api_calls_total',
    API_CALLS_FAILED: 'tomedo_api_calls_failed',
    API_CALL_DURATION: 'tomedo_api_call_duration_ms',
    
    // Patient operations
    PATIENT_SEARCHES: 'tomedo_patient_searches_total',
    PATIENTS_CREATED: 'tomedo_patients_created_total',
    PATIENTS_UPDATED: 'tomedo_patients_updated_total',
    
    // Fallakte operations
    FALLAKTEN_CREATED: 'tomedo_fallakten_created_total',
    KARTEIEINTRAEGE_CREATED: 'tomedo_karteieintraege_created_total',
    
    // Bridge operations
    BRIDGE_EXECUTIONS: 'tomedo_bridge_executions_total',
    BRIDGE_FAILURES: 'tomedo_bridge_failures_total',
    BRIDGE_DURATION: 'tomedo_bridge_duration_ms',
    
    // DLQ
    DLQ_ITEMS_ADDED: 'tomedo_dlq_items_added_total',
    DLQ_ITEMS_RETRIED: 'tomedo_dlq_items_retried_total',
    DLQ_ITEMS_REMOVED: 'tomedo_dlq_items_removed_total',
    
    // Batch operations
    BATCH_JOBS_STARTED: 'tomedo_batch_jobs_started_total',
    BATCH_JOBS_COMPLETED: 'tomedo_batch_jobs_completed_total',
    BATCH_JOBS_FAILED: 'tomedo_batch_jobs_failed_total',
    BATCH_SESSIONS_PROCESSED: 'tomedo_batch_sessions_processed_total',
    
    // Real-time sync
    SUBSCRIPTIONS_CREATED: 'tomedo_subscriptions_created_total',
    SUBSCRIPTIONS_REMOVED: 'tomedo_subscriptions_removed_total',
    NOTIFICATIONS_RECEIVED: 'tomedo_notifications_received_total',
    
    // Connection pool
    POOL_CONNECTIONS_ACTIVE: 'tomedo_pool_connections_active',
    POOL_CONNECTIONS_TOTAL: 'tomedo_pool_connections_total',
    POOL_CONNECTIONS_WAITING: 'tomedo_pool_connections_waiting',
    
    // Cache
    CACHE_HITS: 'tomedo_cache_hits_total',
    CACHE_MISSES: 'tomedo_cache_misses_total',
    
    // Circuit breaker
    CIRCUIT_STATE: 'tomedo_circuit_state',
    CIRCUIT_FAILURES: 'tomedo_circuit_failures_total',
  } as const;

  /**
   * Record API call
   */
  recordApiCall(
    endpoint: string,
    method: string,
    status: 'success' | 'error',
    durationMs: number
  ): void {
    const labels = { endpoint, method, status };
    
    // Counter
    this.incCounter(this.METRIC_NAMES.API_CALLS_TOTAL, labels);
    if (status === 'error') {
      this.incCounter(this.METRIC_NAMES.API_CALLS_FAILED, labels);
    }
    
    // Histogram
    this.observeHistogram(this.METRIC_NAMES.API_CALL_DURATION, durationMs, labels);
  }

  /**
   * Record patient operation
   */
  recordPatientOperation(
    operation: 'search' | 'create' | 'update',
    status: 'success' | 'error'
  ): void {
    const labels = { status };
    
    switch (operation) {
      case 'search':
        this.incCounter(this.METRIC_NAMES.PATIENT_SEARCHES, labels);
        break;
      case 'create':
        this.incCounter(this.METRIC_NAMES.PATIENTS_CREATED, labels);
        break;
      case 'update':
        this.incCounter(this.METRIC_NAMES.PATIENTS_UPDATED, labels);
        break;
    }
  }

  /**
   * Record Fallakte operation
   */
  recordFallakteOperation(
    operation: 'create' | 'karteieintrag',
    status: 'success' | 'error'
  ): void {
    const labels = { status };
    
    switch (operation) {
      case 'create':
        this.incCounter(this.METRIC_NAMES.FALLAKTEN_CREATED, labels);
        break;
      case 'karteieintrag':
        this.incCounter(this.METRIC_NAMES.KARTEIEINTRAEGE_CREATED, labels);
        break;
    }
  }

  /**
   * Record bridge execution
   */
  recordBridgeExecution(
    status: 'success' | 'partial' | 'error',
    durationMs: number
  ): void {
    const labels = { status };
    
    this.incCounter(this.METRIC_NAMES.BRIDGE_EXECUTIONS, labels);
    if (status === 'error') {
      this.incCounter(this.METRIC_NAMES.BRIDGE_FAILURES, labels);
    }
    this.observeHistogram(this.METRIC_NAMES.BRIDGE_DURATION, durationMs, labels);
  }

  /**
   * Record DLQ operation
   */
  recordDLQOperation(operation: 'add' | 'retry' | 'remove'): void {
    const labels = {};
    
    switch (operation) {
      case 'add':
        this.incCounter(this.METRIC_NAMES.DLQ_ITEMS_ADDED, labels);
        break;
      case 'retry':
        this.incCounter(this.METRIC_NAMES.DLQ_ITEMS_RETRIED, labels);
        break;
      case 'remove':
        this.incCounter(this.METRIC_NAMES.DLQ_ITEMS_REMOVED, labels);
        break;
    }
  }

  /**
   * Record batch operation
   */
  recordBatchOperation(
    operation: 'start' | 'complete' | 'fail',
    sessionsCount?: number
  ): void {
    const labels = {};
    
    switch (operation) {
      case 'start':
        this.incCounter(this.METRIC_NAMES.BATCH_JOBS_STARTED, labels);
        break;
      case 'complete':
        this.incCounter(this.METRIC_NAMES.BATCH_JOBS_COMPLETED, labels);
        break;
      case 'fail':
        this.incCounter(this.METRIC_NAMES.BATCH_JOBS_FAILED, labels);
        break;
    }
    
    if (sessionsCount !== undefined) {
      this.incCounter(this.METRIC_NAMES.BATCH_SESSIONS_PROCESSED, labels, sessionsCount);
    }
  }

  /**
   * Record subscription operation
   */
  recordSubscriptionOperation(operation: 'create' | 'remove' | 'notification'): void {
    const labels = {};
    
    switch (operation) {
      case 'create':
        this.incCounter(this.METRIC_NAMES.SUBSCRIPTIONS_CREATED, labels);
        break;
      case 'remove':
        this.incCounter(this.METRIC_NAMES.SUBSCRIPTIONS_REMOVED, labels);
        break;
      case 'notification':
        this.incCounter(this.METRIC_NAMES.NOTIFICATIONS_RECEIVED, labels);
        break;
    }
  }

  /**
   * Update connection pool metrics
   */
  updatePoolMetrics(
    active: number,
    total: number,
    waiting: number
  ): void {
    this.setGauge(this.METRIC_NAMES.POOL_CONNECTIONS_ACTIVE, active, {});
    this.setGauge(this.METRIC_NAMES.POOL_CONNECTIONS_TOTAL, total, {});
    this.setGauge(this.METRIC_NAMES.POOL_CONNECTIONS_WAITING, waiting, {});
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(hits: number, misses: number): void {
    this.incCounter(this.METRIC_NAMES.CACHE_HITS, {}, hits);
    this.incCounter(this.METRIC_NAMES.CACHE_MISSES, {}, misses);
  }

  /**
   * Update circuit breaker metrics
   */
  updateCircuitMetrics(name: string, stats: CircuitStats): void {
    const labels = { name };
    
    // State as gauge (0=closed, 1=half_open, 2=open)
    const stateValue = stats.state === 'CLOSED' ? 0 : stats.state === 'HALF_OPEN' ? 1 : 2;
    this.setGauge(this.METRIC_NAMES.CIRCUIT_STATE, stateValue, labels);
    
    // Failures counter
    this.incCounter(this.METRIC_NAMES.CIRCUIT_FAILURES, labels, stats.failures);
  }

  /**
   * Get metrics snapshot
   */
  getSnapshot(): TomedoMetricsSnapshot {
    const snapshot: TomedoMetricsSnapshot = {
      timestamp: Date.now(),
      counters: {},
      histograms: {},
      gauges: {},
    };

    for (const [name, counters] of this.counters) {
      snapshot.counters[name] = Array.from(counters.values());
    }

    for (const [name, histograms] of this.histograms) {
      snapshot.histograms[name] = Array.from(histograms.values()).map(h => ({
        ...h,
        buckets: new Map(h.buckets),
      }));
    }

    for (const [name, gauges] of this.gauges) {
      snapshot.gauges[name] = Array.from(gauges.values());
    }

    return snapshot;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    
    // Counters
    for (const [name, counters] of this.counters) {
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      for (const counter of counters.values()) {
        const labelStr = this.formatLabels(counter.labels);
        lines.push(`${name}${labelStr} ${counter.value}`);
      }
    }

    // Gauges
    for (const [name, gauges] of this.gauges) {
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);
      for (const gauge of gauges.values()) {
        const labelStr = this.formatLabels(gauge.labels);
        lines.push(`${name}${labelStr} ${gauge.value}`);
      }
    }

    // Histograms
    for (const [name, histograms] of this.histograms) {
      lines.push(`# HELP ${name} Histogram metric`);
      lines.push(`# TYPE ${name} histogram`);
      for (const hist of histograms.values()) {
        const labelStr = this.formatLabels(hist.labels);
        
        // Buckets
        for (const [bucket, count] of hist.buckets) {
          lines.push(`${name}_bucket{le="${bucket}"${hist.labels ? ',' + this.labelString(hist.labels).slice(1, -1) : ''}} ${count}`);
        }
        // +Inf bucket
        lines.push(`${name}_bucket{le="+Inf"${hist.labels ? ',' + this.labelString(hist.labels).slice(1, -1) : ''}} ${hist.count}`);
        lines.push(`${name}_sum${labelStr} ${hist.sum}`);
        lines.push(`${name}_count${labelStr} ${hist.count}`);
      }
    }

    return lines.join('\n');
  }

  // Private helpers
  private incCounter(name: string, labels: Record<string, string>, value = 1): void {
    const key = this.labelKey(labels);
    
    if (!this.counters.has(name)) {
      this.counters.set(name, new Map());
    }
    
    const counters = this.counters.get(name)!;
    
    if (!counters.has(key)) {
      counters.set(key, { value: 0, labels });
    }
    
    counters.get(key)!.value += value;
  }

  private setGauge(name: string, value: number, labels: Record<string, string>): void {
    const key = this.labelKey(labels);
    
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Map());
    }
    
    const gauges = this.gauges.get(name)!;
    gauges.set(key, { value, labels });
  }

  private observeHistogram(name: string, value: number, labels: Record<string, string>): void {
    const key = this.labelKey(labels);
    
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Map());
    }
    
    const histograms = this.histograms.get(name)!;
    
    if (!histograms.has(key)) {
      const buckets = new Map<number, number>();
      for (const bucket of this.histogramBuckets) {
        buckets.set(bucket, 0);
      }
      histograms.set(key, {
        buckets,
        sum: 0,
        count: 0,
        labels,
      });
    }
    
    const hist = histograms.get(key)!;
    hist.sum += value;
    hist.count++;
    
    for (const [bucket, count] of hist.buckets) {
      if (value <= bucket) {
        hist.buckets.set(bucket, count + 1);
      }
    }
  }

  private labelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }

  private labelString(labels: Record<string, string>): string {
    const parts = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
    return parts.join(',');
  }

  private formatLabels(labels: Record<string, string>): string {
    const str = this.labelString(labels);
    return str ? `{${str}}` : '';
  }
}

// Export singleton
export const tomedoMetrics = new TomedoMetricsService();
