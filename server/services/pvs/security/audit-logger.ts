// ============================================
// PVS Audit Logger
// ============================================
// DSGVO-konforme Audit-Logs für PVS-Operationen

import { createHash } from 'crypto';
import { EventEmitter } from 'events';

type PrismaAuditClient = typeof import('../../../db.js').prisma;

let prismaAuditClient: PrismaAuditClient | null = null;

async function getPrismaAuditClient(): Promise<PrismaAuditClient> {
  if (!prismaAuditClient) {
    const { prisma } = await import('../../../db.js');
    prismaAuditClient = prisma;
  }

  return prismaAuditClient;
}

interface PersistedAuditLogData {
  tenantId: string;
  userId: string | null;
  action: string;
  resource: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: string | null;
  createdAt: Date;
}

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
  private flushInFlight: Promise<void> | null = null;
  private readonly FLUSH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 30000;
  private readonly MAX_BUFFER_SIZE = 5000;

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
    this.trimBuffer();
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
   * Avoid unbounded memory growth during prolonged persistence failures.
   */
  private trimBuffer(): void {
    if (this.logBuffer.length <= this.MAX_BUFFER_SIZE) {
      return;
    }

    const droppedCount = this.logBuffer.length - this.MAX_BUFFER_SIZE;
    this.logBuffer = this.logBuffer.slice(droppedCount);

    console.error('[PvsAuditLogger] Dropped audit entries due to buffer overflow', {
      droppedCount,
      retainedCount: this.logBuffer.length,
    });
  }

  private sanitizeText(value: string, maxLength: number): string {
    return value.replace(/[\r\n\t]/g, ' ').slice(0, maxLength);
  }

  private buildResource(entry: AuditEntry): string {
    const pvsType = (entry.pvsType || 'unknown').toLowerCase();
    const connectionId = entry.connectionId || 'unbound';
    return `pvs/${pvsType}/${connectionId}`;
  }

  private toPersistedAuditLog(entry: AuditEntry): PersistedAuditLogData {
    const metadata = {
      auditId: entry.id,
      level: entry.level,
      operation: entry.operation,
      success: entry.success,
      connectionId: entry.connectionId,
      pvsType: entry.pvsType,
      patientHash: entry.patientHash,
      sessionHash: entry.sessionHash,
      fileHash: entry.fileHash,
      durationMs: entry.durationMs,
      errorCode: entry.errorCode,
      errorMessage: entry.errorMessage ? this.sanitizeText(entry.errorMessage, 500) : undefined,
    };

    return {
      tenantId: entry.tenantId,
      userId: entry.userId || null,
      action: `PVS_AUDIT:${entry.operation}`,
      resource: this.buildResource(entry),
      ipAddress: entry.sourceIp ? this.hashId(`ip:${entry.sourceIp}`) : null,
      userAgent: entry.userAgent ? this.sanitizeText(entry.userAgent, 200) : null,
      metadata: JSON.stringify(metadata),
      createdAt: entry.timestamp,
    };
  }

  private async persistEntries(entries: AuditEntry[]): Promise<void> {
    const prisma = await getPrismaAuditClient();
    const records = entries.map((entry) => this.toPersistedAuditLog(entry));
    const auditLogModel = prisma.auditLog as unknown as {
      createMany?: (args: { data: PersistedAuditLogData[] }) => Promise<unknown>;
      create?: (args: { data: PersistedAuditLogData }) => Promise<unknown>;
    };

    if (typeof auditLogModel.createMany === 'function') {
      try {
        await auditLogModel.createMany({ data: records });
        return;
      } catch (error) {
        if (typeof auditLogModel.create !== 'function') {
          throw error;
        }
      }
    }

    if (typeof auditLogModel.create !== 'function') {
      throw new Error('Prisma auditLog persistence is not available');
    }

    await Promise.all(records.map((record) => auditLogModel.create!({ data: record })));
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
  private async flushInternal(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.persistEntries(entries);
      this.emit('flush', entries);
    } catch (error) {
      this.logBuffer = [...entries, ...this.logBuffer];
      this.trimBuffer();

      console.error('[PvsAuditLogger] Failed to persist audit logs', {
        count: entries.length,
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit('flush-error', {
        entries,
        error,
      });
    }
  }

  /**
   * Serializes flush execution to avoid concurrent drain/persist races.
   */
  private async flush(): Promise<void> {
    if (this.flushInFlight) {
      await this.flushInFlight;
      return;
    }

    this.flushInFlight = this.flushInternal();

    try {
      await this.flushInFlight;
    } finally {
      this.flushInFlight = null;
    }
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
