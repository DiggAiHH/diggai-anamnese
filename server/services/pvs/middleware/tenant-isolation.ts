// ============================================
// PVS Tenant Isolation Middleware
// ============================================

import { EventEmitter } from 'events';
import type { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  permissions: string[];
}

/**
 * Tenant Isolation Service
 */
export class TenantIsolationService extends EventEmitter {
  private activeTenants = new Set<string>();
  private tenantConnections = new Map<string, Set<string>>();

  /**
   * Middleware to validate tenant access
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string || 
                       req.auth?.tenantId ||
                       (req as any).tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant context required',
          code: 'TENANT_REQUIRED',
        });
      }

      // Attach tenant context to request
      (req as any).pvsContext = {
        tenantId,
        userId: req.auth?.userId,
        permissions: (req.auth as any)?.permissions || [],
      };

      this.activeTenants.add(tenantId);
      this.emit('tenant:access', { tenantId, path: req.path });

      next();
    };
  }

  /**
   * Check if connection belongs to tenant
   */
  validateConnectionAccess(tenantId: string, connectionId: string): boolean {
    const connections = this.tenantConnections.get(tenantId);
    return connections ? connections.has(connectionId) : false;
  }

  /**
   * Register connection for tenant
   */
  registerConnection(tenantId: string, connectionId: string): void {
    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, new Set());
    }
    this.tenantConnections.get(tenantId)!.add(connectionId);
    this.emit('connection:registered', { tenantId, connectionId });
  }

  /**
   * Unregister connection
   */
  unregisterConnection(tenantId: string, connectionId: string): void {
    const connections = this.tenantConnections.get(tenantId);
    if (connections) {
      connections.delete(connectionId);
      this.emit('connection:unregistered', { tenantId, connectionId });
    }
  }

  /**
   * Get tenant connection count
   */
  getConnectionCount(tenantId: string): number {
    return this.tenantConnections.get(tenantId)?.size || 0;
  }

  /**
   * Get active tenant count
   */
  getActiveTenantCount(): number {
    return this.activeTenants.size;
  }

  /**
   * Cleanup tenant data
   */
  cleanupTenant(tenantId: string): void {
    this.tenantConnections.delete(tenantId);
    this.activeTenants.delete(tenantId);
    this.emit('tenant:cleanup', { tenantId });
  }
}

export const tenantIsolation = new TenantIsolationService();
