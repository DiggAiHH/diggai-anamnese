// ============================================
// PVS Analytics Service
// ============================================

import { EventEmitter } from 'events';

export interface PvsUsageMetrics {
  tenantId: string;
  connectionId: string;
  pvsType: string;
  date: Date;
  exports: number;
  imports: number;
  errors: number;
  avgResponseTime: number;
  dataVolume: number; // bytes
}

export interface PvsTrend {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  metrics: {
    totalTransfers: number;
    successRate: number;
    avgResponseTime: number;
    topErrors: Array<{ code: string; count: number }>;
  };
}

export class PvsAnalytics extends EventEmitter {
  private dailyMetrics = new Map<string, PvsUsageMetrics>();
  private hourlyStats = new Map<string, Map<number, number>>(); // connectionId -> hour -> count

  recordEvent(event: {
    tenantId: string;
    connectionId: string;
    pvsType: string;
    type: 'export' | 'import' | 'error';
    responseTime?: number;
    dataSize?: number;
    errorCode?: string;
  }): void {
    const date = new Date();
    const key = `${event.connectionId}:${date.toISOString().split('T')[0]}`;
    
    let metrics = this.dailyMetrics.get(key);
    if (!metrics) {
      metrics = {
        tenantId: event.tenantId,
        connectionId: event.connectionId,
        pvsType: event.pvsType,
        date,
        exports: 0,
        imports: 0,
        errors: 0,
        avgResponseTime: 0,
        dataVolume: 0,
      };
      this.dailyMetrics.set(key, metrics);
    }

    if (event.type === 'export') metrics.exports++;
    if (event.type === 'import') metrics.imports++;
    if (event.type === 'error') metrics.errors++;
    
    if (event.responseTime) {
      metrics.avgResponseTime = (metrics.avgResponseTime + event.responseTime) / 2;
    }
    if (event.dataSize) {
      metrics.dataVolume += event.dataSize;
    }

    // Track hourly stats
    let hourly = this.hourlyStats.get(event.connectionId);
    if (!hourly) {
      hourly = new Map();
      this.hourlyStats.set(event.connectionId, hourly);
    }
    const hour = date.getHours();
    hourly.set(hour, (hourly.get(hour) || 0) + 1);

    this.emit('metric:recorded', metrics);
  }

  getDailyMetrics(connectionId: string, date: Date): PvsUsageMetrics | undefined {
    const key = `${connectionId}:${date.toISOString().split('T')[0]}`;
    return this.dailyMetrics.get(key);
  }

  getTrends(connectionId: string, days = 7): PvsTrend {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics: PvsUsageMetrics[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const m = this.getDailyMetrics(connectionId, new Date(d));
      if (m) metrics.push(m);
    }

    const totalTransfers = metrics.reduce((sum, m) => sum + m.exports + m.imports, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0);
    const avgResponseTime = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length 
      : 0;

    return {
      period: 'day',
      startDate,
      endDate,
      metrics: {
        totalTransfers,
        successRate: totalTransfers > 0 ? ((totalTransfers - totalErrors) / totalTransfers) * 100 : 100,
        avgResponseTime,
        topErrors: [], // Would need error tracking
      },
    };
  }

  getPeakHours(connectionId: string): Array<{ hour: number; count: number }> {
    const hourly = this.hourlyStats.get(connectionId);
    if (!hourly) return [];

    return Array.from(hourly.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  getTopPvsByVolume(tenantId: string, limit = 5): Array<{ pvsType: string; dataVolume: number }> {
    const byPvs = new Map<string, number>();

    for (const metrics of this.dailyMetrics.values()) {
      if (metrics.tenantId === tenantId) {
        byPvs.set(metrics.pvsType, (byPvs.get(metrics.pvsType) || 0) + metrics.dataVolume);
      }
    }

    return Array.from(byPvs.entries())
      .map(([pvsType, dataVolume]) => ({ pvsType, dataVolume }))
      .sort((a, b) => b.dataVolume - a.dataVolume)
      .slice(0, limit);
  }

  generateReport(tenantId: string, startDate: Date, endDate: Date): {
    summary: {
      totalTransfers: number;
      totalExports: number;
      totalImports: number;
      totalErrors: number;
      avgSuccessRate: number;
    };
    byConnection: Array<{ connectionId: string; pvsType: string; transfers: number }>;
    peakHours: Array<{ hour: number; count: number }>;
  } {
    const relevant = Array.from(this.dailyMetrics.values()).filter(
      m => m.tenantId === tenantId && m.date >= startDate && m.date <= endDate
    );

    const totalExports = relevant.reduce((sum, m) => sum + m.exports, 0);
    const totalImports = relevant.reduce((sum, m) => sum + m.imports, 0);
    const totalErrors = relevant.reduce((sum, m) => sum + m.errors, 0);
    const totalTransfers = totalExports + totalImports;

    const byConnection = new Map<string, { connectionId: string; pvsType: string; transfers: number }>();
    for (const m of relevant) {
      const existing = byConnection.get(m.connectionId);
      if (existing) {
        existing.transfers += m.exports + m.imports;
      } else {
        byConnection.set(m.connectionId, {
          connectionId: m.connectionId,
          pvsType: m.pvsType,
          transfers: m.exports + m.imports,
        });
      }
    }

    return {
      summary: {
        totalTransfers,
        totalExports,
        totalImports,
        totalErrors,
        avgSuccessRate: totalTransfers > 0 ? ((totalTransfers - totalErrors) / totalTransfers) * 100 : 100,
      },
      byConnection: Array.from(byConnection.values()).sort((a, b) => b.transfers - a.transfers),
      peakHours: [], // Simplified for now
    };
  }
}

export const pvsAnalytics = new PvsAnalytics();
