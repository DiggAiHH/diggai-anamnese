// ============================================
// PVS Health Monitor
// ============================================

import { EventEmitter } from 'events';
import { pvsRouter } from '../pvs-router.service.js';
import type { PvsConnectionData } from '../types.js';

export interface HealthStatus {
  connectionId: string;
  pvsType: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTimeMs: number;
  error?: string;
  details: {
    importDirAccessible?: boolean;
    exportDirAccessible?: boolean;
    apiReachable?: boolean;
    authValid?: boolean;
  };
}

export class PvsHealthMonitor extends EventEmitter {
  private healthStatus = new Map<string, HealthStatus>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();
  private readonly DEFAULT_INTERVAL = 60000; // 1 minute

  startMonitoring(connection: PvsConnectionData, intervalMs = this.DEFAULT_INTERVAL): void {
    this.stopMonitoring(connection.id);

    const check = async () => {
      await this.checkHealth(connection);
    };

    // Initial check
    check();

    // Scheduled checks
    const interval = setInterval(check, intervalMs);
    this.checkIntervals.set(connection.id, interval);
  }

  stopMonitoring(connectionId: string): void {
    const interval = this.checkIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(connectionId);
    }
  }

  async checkHealth(connection: PvsConnectionData): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const adapter = await pvsRouter.getAdapter(connection);
      const result = await adapter.testConnection();
      
      const responseTimeMs = Date.now() - startTime;
      
      const status: HealthStatus = {
        connectionId: connection.id,
        pvsType: connection.pvsType,
        status: result.ok ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTimeMs,
        error: result.ok ? undefined : result.message,
        details: this.parseHealthDetails(result.message),
      };

      this.healthStatus.set(connection.id, status);
      this.emit('health:check', status);
      
      if (status.status === 'unhealthy') {
        this.emit('health:alert', status);
      }

      return status;
    } catch (error) {
      const status: HealthStatus = {
        connectionId: connection.id,
        pvsType: connection.pvsType,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTimeMs: Date.now() - startTime,
        error: (error as Error).message,
        details: {},
      };
      
      this.healthStatus.set(connection.id, status);
      this.emit('health:alert', status);
      return status;
    }
  }

  private parseHealthDetails(message: string): HealthStatus['details'] {
    const details: HealthStatus['details'] = {};
    
    if (message.includes('Import-Verzeichnis')) {
      details.importDirAccessible = !message.includes('❌');
    }
    if (message.includes('Export-Verzeichnis')) {
      details.exportDirAccessible = !message.includes('❌');
    }
    
    return details;
  }

  getHealthStatus(connectionId: string): HealthStatus | undefined {
    return this.healthStatus.get(connectionId);
  }

  getAllHealthStatuses(): HealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  getHealthyConnections(): HealthStatus[] {
    return this.getAllHealthStatuses().filter(h => h.status === 'healthy');
  }

  getUnhealthyConnections(): HealthStatus[] {
    return this.getAllHealthStatuses().filter(h => h.status === 'unhealthy');
  }

  getOverallHealth(): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  } {
    const all = this.getAllHealthStatuses();
    return {
      total: all.length,
      healthy: all.filter(h => h.status === 'healthy').length,
      degraded: all.filter(h => h.status === 'degraded').length,
      unhealthy: all.filter(h => h.status === 'unhealthy').length,
      unknown: all.filter(h => h.status === 'unknown').length,
    };
  }

  stopAll(): void {
    for (const [id, interval] of this.checkIntervals) {
      clearInterval(interval);
      this.emit('health:stopped', { connectionId: id });
    }
    this.checkIntervals.clear();
  }
}

export const pvsHealthMonitor = new PvsHealthMonitor();
