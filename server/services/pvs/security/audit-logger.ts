// ============================================
// PVS Audit Logger
// ============================================
// DSGVO-konforme Audit-Logs für PVS-Operationen

import { createHash } from 'crypto';
import { EventEmitter } from 'events';

export type AuditOperation = 
  | 'PATIENT_IMPORT'
  | 'PATIENT_EXPORT'
  | 'SESSION_EXPORT'
  | 'CREDENTIAL_ACCESS'
  | 'CONFIG_CHANGE'
  | 'SYNC_START'
  | 'SYNC_STOP'
  | 'FILE_READ'
  | 'FILE_WRITE'
  | 'FILE_DELETE'
  | 'CONNECTION_TEST';

export type AuditLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  operation: AuditOperation;
  level: AuditLevel;
  tenantId: string;
  userId?: string;
  connectionId?: string;
  pvsType?: string;
  // Pseudonymized data
  patientHash?: string;
  sessionHash?: string;
  fileHash?: string;
  // Metadata
  success: boolean;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  sourceIp?: string;
  userAgent?: string;
}

/**
 * Audit Logger for PVS operations
 * All patient data is pseudonymized (hashed)
 */
export class PvsAuditLogger extends EventEmitter {
  private logBuffer: AuditEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 30000;

  constructor() {
    super();
    this.startFlushInterval();
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const fullEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.logBuffer.push(fullEntry);
    this.emit('audit', fullEntry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.FLUSH_SIZE) {
      await this.flush();
    }
  }

  /**
   * Log patient import
   */
  async logPatientImport(params: {
    tenantId: string;
    userId?: string;
    connectionId: string;
    pvsType: string;
    patientId: string;
    externalId: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }): Promise<void> {
    await this.log({
      operation: 'PATIENT_IMPORT',
      level: params.success ? 'INFO' : 'ERROR',
      tenantId: params.tenantId,
      userId: params.userId,
      connectionId: params.connectionId,
      pvsType: params.pvsType,
      patientHash: this.hashPatientId(params.patientId),
      success: params.success,
      durationMs: params.durationMs,
      errorMessage: params.error,
    });
  }

  /**
   * Log session export
   */
  async logSessionExport(params: {
    tenantId: string;
    userId?: string;
    connectionId: string;
    pvsType: string;
    sessionId: string;
    patientId?: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }): Promise<void> {
    await this.log({
      operation: 'SESSION_EXPORT',
      level: params.success ? 'INFO' : 'ERROR',
      tenantId: params.tenantId,
      userId: params.userId,
      connectionId: params.connectionId,
      pvsType: params.pvsType,
      sessionHash: this.hashId(params.sessionId),
      patientHash: params.patientId ? this.hashPatientId(params.patientId) : undefined,
      success: params.success,
      durationMs: params.durationMs,
      errorMessage: params.error,
    });
  }

  /**
   * Log file operation
   */
  async logFileOperation(params: {
    operation: 'FILE_READ' | 'FILE_WRITE' | 'FILE_DELETE';
    tenantId: string;
    userId?: string;
    connectionId: string;
    pvsType: string;
    filePath: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    await this.log({
      operation: params.operation,
      level: params.success ? 'DEBUG' : 'WARNING',
      tenantId: params.tenantId,
      userId: params.userId,
      connectionId: params.connectionId,
      pvsType: params.pvsType,
      fileHash: this.hashId(params.filePath),
      success: params.success,
      errorMessage: params.error,
    });
  }

  /**
   * Log credential access
   */
  async logCredentialAccess(params: {
    tenantId: string;
    userId?: string;
    connectionId: string;
    operation: 'READ' | 'WRITE' | 'ROTATE';
    success: boolean;
  }): Promise<void> {
    await this.log({
      operation: 'CREDENTIAL_ACCESS',
      level: params.success ? 'INFO' : 'CRITICAL',
      tenantId: params.tenantId,
      userId: params.userId,
      connectionId: params.connectionId,
      success: params.success,
    });
  }

  /**
   * Hash patient ID (pseudonymization)
   */
  private hashPatientId(patientId: string): string {
    return createHash('sha256')
      .update(`patient:${patientId}:${process.env.PATIENT_SALT || 'default-salt'}`)
      .digest('hex');
  }

  /**
   * Hash any ID
   */
  private hashId(id: string): string {
    return createHash('sha256').update(id).digest('hex').substring(0, 16);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Flush buffer to persistent storage
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    // TODO: Implement persistent storage (database, file, or external service)
    // For now, console output in structured format
    for (const entry of entries) {
      console.log(JSON.stringify({
        type: 'PVS_AUDIT',
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      }));
    }

    this.emit('flush', entries);
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        console.error('Failed to flush audit logs:', err);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Get buffered logs (for testing)
   */
  getBufferedLogs(): AuditEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Force flush and stop
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}

// Singleton instance
export const pvsAuditLogger = new PvsAuditLogger();

// Factory function for compatibility
export function getAuditLogger(): PvsAuditLogger {
  return pvsAuditLogger;
}
