/**
 * Tomedo Health Service
 * 
 * Health Checks und Alerts für die Tomedo Bridge
 * 
 * @phase PHASE_8_PERFORMANCE
 */

import { createLogger } from '../../logger.js';
import { getRedisClient } from '../../redis.js';
import { prisma } from '../../db.js';
import { config } from '../../config.js';
import { createTomedoApiClient } from './tomedo-api.client.js';
import { tomedoMetrics } from './tomedo-metrics.service.js';
import type { PvsConnectionData } from './types.js';

const logger = createLogger('TomedoHealth');

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  component: string;
  message: string;
  responseTime: number;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: HealthCheckResult[];
  metrics: {
    apiLatencyP95: number;
    errorRate: number;
    bridgeQueueDepth: number;
    dlqSize: number;
  };
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: number;
  resolvedAt?: number;
  acknowledgedAt?: number;
}

export class TomedoHealthService {
  private alerts: Alert[] = [];
  private lastChecks: Map<string, HealthCheckResult> = new Map();
  private apiLatencies: number[] = [];
  private maxLatencies = 100;

  // Alert thresholds
  private readonly THRESHOLDS = {
    API_LATENCY_WARNING: 2000,  // 2s
    API_LATENCY_CRITICAL: 5000, // 5s
    ERROR_RATE_WARNING: 0.05,   // 5%
    ERROR_RATE_CRITICAL: 0.20,  // 20%
    DLQ_SIZE_WARNING: 10,
    DLQ_SIZE_CRITICAL: 50,
  };

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkApiConnection(),
      this.checkCircuitBreaker(),
    ]);

    // Calculate overall status
    const hasCritical = checks.some(c => c.status === 'unhealthy');
    const hasWarning = checks.some(c => c.status === 'degraded');
    const overall = hasCritical ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

    // Store results
    for (const check of checks) {
      this.lastChecks.set(check.component, check);
    }

    // Check thresholds and create alerts
    this.checkThresholds(checks);

    const metrics = await this.collectMetrics();

    const health: SystemHealth = {
      overall,
      timestamp: Date.now(),
      checks,
      metrics,
    };

    logger.info('[TomedoHealth] Health check completed', {
      overall,
      duration: Date.now() - startTime,
      checkCount: checks.length,
    });

    return health;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Quick connectivity check
      await prisma.$queryRaw`SELECT 1`;
      
      // Check for long-running queries
      const longQueries = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM pg_stat_activity
        WHERE state = 'active'
        AND query_start < NOW() - INTERVAL '30 seconds'
      ` as Array<{ count: bigint }>;

      const responseTime = Date.now() - startTime;
      const longQueryCount = Number(longQueries[0]?.count || 0);
      
      return {
        status: longQueryCount > 5 ? 'degraded' : 'healthy',
        component: 'database',
        message: longQueryCount > 5 
          ? `${longQueryCount} long-running queries detected`
          : 'Database connection healthy',
        responseTime,
        details: { longQueryCount },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        component: 'database',
        message: `Database check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const redis = getRedisClient();
    
    try {
      if (!redis) {
        return {
          status: 'degraded',
          component: 'redis',
          message: 'Redis not configured, using in-memory fallback',
          responseTime: Date.now() - startTime,
        };
      }

      await redis.ping();
      
      // Check memory usage
      const info = await redis.info('memory');
      const usedMemoryMatch = info.match(/used_memory:(\d+)/);
      const usedMemory = usedMemoryMatch ? parseInt(usedMemoryMatch[1]) : 0;
      const usedMemoryMB = usedMemory / 1024 / 1024;

      const responseTime = Date.now() - startTime;
      
      return {
        status: usedMemoryMB > 500 ? 'degraded' : 'healthy',
        component: 'redis',
        message: 'Redis connection healthy',
        responseTime,
        details: { usedMemoryMB: Math.round(usedMemoryMB * 100) / 100 },
      };
    } catch (error) {
      return {
        status: 'degraded',
        component: 'redis',
        message: `Redis check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Tomedo API connectivity
   */
  private async checkApiConnection(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Get a Tomedo connection
      const connection = await prisma.pvsConnection.findFirst({
        where: {
          pvsType: 'TOMEDO',
          isActive: true,
        },
      });

      if (!connection) {
        return {
          status: 'degraded',
          component: 'tomedo_api',
          message: 'No active Tomedo connection configured',
          responseTime: 0,
        };
      }

      const client = createTomedoApiClient(connection as PvsConnectionData);
      const result = await client.testConnection();
      
      const responseTime = Date.now() - startTime;
      
      // Track latency
      this.trackLatency(responseTime);

      return {
        status: result.ok ? 'healthy' : 'unhealthy',
        component: 'tomedo_api',
        message: result.message,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.trackLatency(responseTime);
      
      return {
        status: 'unhealthy',
        component: 'tomedo_api',
        message: `Tomedo API check failed: ${(error as Error).message}`,
        responseTime,
      };
    }
  }

  /**
   * Check circuit breaker state
   */
  private async checkCircuitBreaker(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Import circuit breaker registry
      const { circuitBreakerRegistry } = await import('./resilience/circuit-breaker.js');
      const allStats = circuitBreakerRegistry.getAllStats();

      const openCircuits = Object.entries(allStats)
        .filter(([, stats]) => stats.state === 'OPEN');
      
      const halfOpenCircuits = Object.entries(allStats)
        .filter(([, stats]) => stats.state === 'HALF_OPEN');

      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'All circuits closed';
      
      if (openCircuits.length > 0) {
        status = 'unhealthy';
        message = `${openCircuits.length} circuit(s) OPEN: ${openCircuits.map(([name]) => name).join(', ')}`;
      } else if (halfOpenCircuits.length > 0) {
        status = 'degraded';
        message = `${halfOpenCircuits.length} circuit(s) HALF_OPEN`;
      }

      return {
        status,
        component: 'circuit_breaker',
        message,
        responseTime,
        details: {
          total: Object.keys(allStats).length,
          open: openCircuits.length,
          halfOpen: halfOpenCircuits.length,
          closed: Object.keys(allStats).length - openCircuits.length - halfOpenCircuits.length,
        },
      };
    } catch (error) {
      return {
        status: 'degraded',
        component: 'circuit_breaker',
        message: `Circuit breaker check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Collect metrics
   */
  private async collectMetrics(): Promise<SystemHealth['metrics']> {
    const snapshot = tomedoMetrics.getSnapshot();

    // Calculate error rate from counters
    const apiCalls = this.getCounterTotal(snapshot, 'tomedo_api_calls_total');
    const apiFailures = this.getCounterTotal(snapshot, 'tomedo_api_calls_failed');
    const errorRate = apiCalls > 0 ? apiFailures / apiCalls : 0;

    // Get DLQ size
    const dlqSize = await this.getDLQSize();

    // Calculate P95 latency
    const p95Latency = this.calculateP95Latency();

    return {
      apiLatencyP95: p95Latency,
      errorRate,
      bridgeQueueDepth: 0, // Would need queue implementation
      dlqSize,
    };
  }

  /**
   * Get DLQ size
   */
  private async getDLQSize(): Promise<number> {
    const redisClient = getRedisClient();
    try {
      if (redisClient) {
        return await redisClient.llen('tomedo-bridge:dlq');
      }
    } catch {
      // Fallback to database
    }

    try {
      return await prisma.pvsTransferLog.count({
        where: {
          status: 'FAILED',
        },
      });
    } catch {
      return 0;
    }
  }

  /**
   * Track API latency
   */
  private trackLatency(ms: number): void {
    this.apiLatencies.push(ms);
    if (this.apiLatencies.length > this.maxLatencies) {
      this.apiLatencies.shift();
    }
  }

  /**
   * Calculate P95 latency
   */
  private calculateP95Latency(): number {
    if (this.apiLatencies.length === 0) return 0;
    
    const sorted = [...this.apiLatencies].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get counter total
   */
  private getCounterTotal(snapshot: ReturnType<typeof tomedoMetrics.getSnapshot>, name: string): number {
    const counters = snapshot.counters[name] || [];
    return counters.reduce((sum, c) => sum + c.value, 0);
  }

  /**
   * Check thresholds and create alerts
   */
  private checkThresholds(checks: HealthCheckResult[]): void {
    const apiCheck = checks.find(c => c.component === 'tomedo_api');
    
    if (apiCheck) {
      // Check latency
      if (apiCheck.responseTime > this.THRESHOLDS.API_LATENCY_CRITICAL) {
        this.createAlert('critical', 'tomedo_api', 
          `API latency critical: ${apiCheck.responseTime}ms > ${this.THRESHOLDS.API_LATENCY_CRITICAL}ms`);
      } else if (apiCheck.responseTime > this.THRESHOLDS.API_LATENCY_WARNING) {
        this.createAlert('warning', 'tomedo_api',
          `API latency elevated: ${apiCheck.responseTime}ms > ${this.THRESHOLDS.API_LATENCY_WARNING}ms`);
      }
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    severity: Alert['severity'],
    component: string,
    message: string
  ): void {
    // Check for duplicate active alert
    const existing = this.alerts.find(a => 
      a.severity === severity &&
      a.component === component &&
      a.message === message &&
      !a.resolvedAt
    );

    if (existing) {
      return;
    }

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      component,
      message,
      timestamp: Date.now(),
    };

    this.alerts.push(alert);
    
    logger.warn('[TomedoHealth] Alert created', {
      alertId: alert.id,
      severity,
      component,
      message,
    });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(severity?: Alert['severity']): Alert[] {
    let alerts = this.alerts.filter(a => !a.resolvedAt);
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.acknowledgedAt) {
      alert.acknowledgedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolvedAt) {
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get last check result
   */
  getLastCheck(component: string): HealthCheckResult | undefined {
    return this.lastChecks.get(component);
  }

  /**
   * Get health summary
   */
  getSummary(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: number;
    activeAlerts: number;
    p95Latency: number;
  } {
    const lastCheck = Array.from(this.lastChecks.values())
      .sort((a, b) => b.responseTime - a.responseTime)[0];

    const hasUnhealthy = Array.from(this.lastChecks.values())
      .some(c => c.status === 'unhealthy');
    const hasDegraded = Array.from(this.lastChecks.values())
      .some(c => c.status === 'degraded');

    return {
      overall: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      lastCheck: lastCheck ? Date.now() - lastCheck.responseTime : 0,
      activeAlerts: this.getActiveAlerts().length,
      p95Latency: this.calculateP95Latency(),
    };
  }
}

// Export singleton
export const tomedoHealth = new TomedoHealthService();
