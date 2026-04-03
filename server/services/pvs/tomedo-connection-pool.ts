/**
 * Tomedo Connection Pool
 * 
 * Connection Pooling für Tomedo API Verbindungen
 * 
 * @phase PHASE_8_PERFORMANCE
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../logger.js';
import { createTomedoApiClient, TomedoApiClient } from './tomedo-api.client.js';
import type { PvsConnectionData } from './types.js';

const logger = createLogger('TomedoConnectionPool');

export interface PoolOptions {
  minConnections: number;
  maxConnections: number;
  maxIdleTimeMs: number;
  connectionTimeoutMs: number;
  acquireTimeoutMs: number;
}

interface PooledConnection {
  id: string;
  client: TomedoApiClient;
  connectionData: PvsConnectionData;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  isActive: boolean;
}

export class TomedoConnectionPool extends EventEmitter {
  private connections: Map<string, PooledConnection> = new Map();
  private available: Set<string> = new Set();
  private waiting: Array<{
    resolve: (conn: PooledConnection) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  private readonly defaultOptions: PoolOptions = {
    minConnections: 2,
    maxConnections: 10,
    maxIdleTimeMs: 300000, // 5 minutes
    connectionTimeoutMs: 10000,
    acquireTimeoutMs: 5000,
  };

  constructor(private options: Partial<PoolOptions> = {}) {
    super();
    this.startMaintenance();
  }

  /**
   * Get connection from pool
   */
  async acquire(connectionData: PvsConnectionData): Promise<PooledConnection> {
    const poolKey = this.getPoolKey(connectionData);

    // Try to get existing available connection
    for (const connId of this.available) {
      const conn = this.connections.get(connId);
      if (conn && conn.connectionData.id === connectionData.id && conn.isActive) {
        this.available.delete(connId);
        conn.lastUsedAt = Date.now();
        conn.useCount++;
        
        logger.debug('[TomedoPool] Reusing connection', {
          connId: conn.id,
          useCount: conn.useCount,
        });
        
        return conn;
      }
    }

    // Create new connection if under limit
    if (this.connections.size < this.getOptions().maxConnections) {
      return this.createConnection(connectionData);
    }

    // Wait for available connection
    return this.waitForConnection(connectionData);
  }

  /**
   * Release connection back to pool
   */
  release(conn: PooledConnection): void {
    if (!this.connections.has(conn.id)) {
      return;
    }

    conn.lastUsedAt = Date.now();
    this.available.add(conn.id);

    // Process waiting requests
    this.processWaiting();

    logger.debug('[TomedoPool] Connection released', { connId: conn.id });
  }

  /**
   * Create new connection
   */
  private async createConnection(connectionData: PvsConnectionData): Promise<PooledConnection> {
    const connId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('[TomedoPool] Creating new connection', {
      connId,
      connectionId: connectionData.id,
    });

    const client = createTomedoApiClient(connectionData);
    
    // Test connection
    const testResult = await client.testConnection();
    if (!testResult.ok) {
      throw new Error(`Connection test failed: ${testResult.message}`);
    }

    const conn: PooledConnection = {
      id: connId,
      client,
      connectionData,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      useCount: 1,
      isActive: true,
    };

    this.connections.set(connId, conn);
    this.emit('connection:created', { connId, connectionId: connectionData.id });

    return conn;
  }

  /**
   * Wait for available connection
   */
  private waitForConnection(connectionData: PvsConnectionData): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove from waiting queue
        const index = this.waiting.findIndex(w => w.timeout === timeout);
        if (index > -1) {
          this.waiting.splice(index, 1);
        }
        
        reject(new Error('Connection acquire timeout'));
      }, this.getOptions().acquireTimeoutMs);

      this.waiting.push({ resolve, reject, timeout });
    });
  }

  /**
   * Process waiting requests
   */
  private processWaiting(): void {
    while (this.waiting.length > 0 && this.available.size > 0) {
      const waiter = this.waiting.shift()!;
      clearTimeout(waiter.timeout);

      const connId = this.available.values().next().value as string | undefined;
      if (!connId) {
        waiter.reject(new Error('No available connection'));
        continue;
      }
      
      const conn = this.connections.get(connId);
      
      if (conn) {
        this.available.delete(connId);
        conn.lastUsedAt = Date.now();
        conn.useCount++;
        waiter.resolve(conn);
      } else {
        waiter.reject(new Error('Connection not found'));
      }
    }
  }

  /**
   * Destroy connection
   */
  destroy(conn: PooledConnection): void {
    this.connections.delete(conn.id);
    this.available.delete(conn.id);
    conn.isActive = false;

    logger.info('[TomedoPool] Connection destroyed', {
      connId: conn.id,
      useCount: conn.useCount,
      lifetime: Date.now() - conn.createdAt,
    });

    this.emit('connection:destroyed', { connId: conn.id });
  }

  /**
   * Start maintenance tasks
   */
  private startMaintenance(): void {
    // Cleanup idle connections every 60 seconds
    setInterval(() => this.cleanup(), 60000);
    
    // Ensure minimum connections
    setInterval(() => this.ensureMinConnections(), 30000);
  }

  /**
   * Cleanup idle connections
   */
  private cleanup(): void {
    const now = Date.now();
    const maxIdleTime = this.getOptions().maxIdleTimeMs;
    const toDestroy: string[] = [];

    for (const [connId, conn] of this.connections) {
      // Skip if in use
      if (!this.available.has(connId)) {
        continue;
      }

      // Destroy if idle too long and above minimum
      const idleTime = now - conn.lastUsedAt;
      const activeCount = this.connections.size - this.available.size;
      
      if (idleTime > maxIdleTime && activeCount > this.getOptions().minConnections) {
        toDestroy.push(connId);
      }

      // Destroy if too old (max 1 hour)
      const age = now - conn.createdAt;
      if (age > 3600000) {
        toDestroy.push(connId);
      }
    }

    for (const connId of toDestroy) {
      const conn = this.connections.get(connId);
      if (conn) {
        this.destroy(conn);
      }
    }

    if (toDestroy.length > 0) {
      logger.info('[TomedoPool] Cleanup completed', {
        destroyed: toDestroy.length,
        remaining: this.connections.size,
      });
    }
  }

  /**
   * Ensure minimum connections
   */
  private ensureMinConnections(): void {
    const activeCount = Array.from(this.connections.values()).filter(c => c.isActive).length;
    const needed = this.getOptions().minConnections - activeCount;

    if (needed > 0) {
      logger.info('[TomedoPool] Ensuring minimum connections', { needed });
      // Pre-warming would require connection data - skip for now
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const total = this.connections.size;
    const available = this.available.size;
    const inUse = total - available;
    const waiting = this.waiting.length;

    let totalUseCount = 0;
    let oldestConnection = Date.now();
    
    for (const conn of this.connections.values()) {
      totalUseCount += conn.useCount;
      if (conn.createdAt < oldestConnection) {
        oldestConnection = conn.createdAt;
      }
    }

    return {
      total,
      available,
      inUse,
      waiting,
      utilization: total > 0 ? Math.round((inUse / total) * 100) : 0,
      averageUseCount: total > 0 ? Math.round(totalUseCount / total) : 0,
      oldestConnectionAge: Date.now() - oldestConnection,
    };
  }

  /**
   * Get connection data key
   */
  private getPoolKey(connectionData: PvsConnectionData): string {
    return `${connectionData.praxisId}:${connectionData.id}`;
  }

  /**
   * Get options with defaults
   */
  private getOptions(): PoolOptions {
    return { ...this.defaultOptions, ...this.options };
  }

  /**
   * Clear all connections
   */
  clear(): void {
    for (const conn of this.connections.values()) {
      conn.isActive = false;
    }
    this.connections.clear();
    this.available.clear();
    this.waiting = [];
  }
}

// Export singleton
export const tomedoConnectionPool = new TomedoConnectionPool();
