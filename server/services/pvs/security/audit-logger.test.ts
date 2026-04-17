import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

const dbMocks = vi.hoisted(() => ({
  createMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../../../db.js', () => ({
  prisma: {
    auditLog: {
      createMany: dbMocks.createMany,
      create: dbMocks.create,
    },
  },
}));

import { PvsAuditLogger, pvsAuditLogger } from './audit-logger';

const hashSourceIp = (ip: string): string => createHash('sha256').update(`ip:${ip}`).digest('hex').substring(0, 16);

describe('PvsAuditLogger persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.createMany.mockResolvedValue({ count: 1 });
    dbMocks.create.mockResolvedValue({ id: 'audit-log-1' });
  });

  afterAll(async () => {
    await pvsAuditLogger.shutdown();
  });

  it('persists flushed entries with createMany', async () => {
    const logger = new PvsAuditLogger();

    await logger.log({
      operation: 'PATIENT_IMPORT',
      level: 'INFO',
      tenantId: 'tenant-1',
      userId: 'user-1',
      connectionId: 'conn-1',
      pvsType: 'FHIR',
      patientHash: 'patient-hash-1',
      success: true,
      durationMs: 42,
      sourceIp: '127.0.0.1',
      userAgent: 'Vitest Agent',
    });

    await logger.shutdown();

    expect(dbMocks.createMany).toHaveBeenCalledTimes(1);

    const args = dbMocks.createMany.mock.calls[0][0] as {
      data: Array<{
        tenantId: string;
        userId: string | null;
        action: string;
        resource: string;
        ipAddress: string | null;
        userAgent: string | null;
        metadata: string | null;
        createdAt: Date;
      }>;
    };

    expect(args.data).toHaveLength(1);
    expect(args.data[0].tenantId).toBe('tenant-1');
    expect(args.data[0].userId).toBe('user-1');
    expect(args.data[0].action).toBe('PVS_AUDIT:PATIENT_IMPORT');
    expect(args.data[0].resource).toBe('pvs/fhir/conn-1');
    expect(args.data[0].ipAddress).toBe(hashSourceIp('127.0.0.1'));
    expect(args.data[0].userAgent).toBe('Vitest Agent');
    expect(args.data[0].metadata).toContain('"patientHash":"patient-hash-1"');
    expect(args.data[0].metadata).toContain('"success":true');
    expect(logger.getBufferedLogs()).toHaveLength(0);
  });

  it('falls back to single inserts if createMany fails', async () => {
    dbMocks.createMany.mockRejectedValueOnce(new Error('createMany unavailable'));

    const logger = new PvsAuditLogger();

    await logger.log({
      operation: 'CONNECTION_TEST',
      level: 'ERROR',
      tenantId: 'tenant-2',
      connectionId: 'conn-2',
      pvsType: 'FHIR',
      success: false,
      errorCode: 'ERR_TIMEOUT',
      errorMessage: 'Timeout',
    });

    await logger.log({
      operation: 'CONNECTION_TEST',
      level: 'INFO',
      tenantId: 'tenant-2',
      connectionId: 'conn-2',
      pvsType: 'FHIR',
      success: true,
    });

    await logger.shutdown();

    expect(dbMocks.createMany).toHaveBeenCalledTimes(1);
    expect(dbMocks.create).toHaveBeenCalledTimes(2);
    expect(logger.getBufferedLogs()).toHaveLength(0);
  });

  it('requeues entries when persistence fully fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dbMocks.createMany.mockRejectedValueOnce(new Error('db unavailable'));
    dbMocks.create.mockRejectedValueOnce(new Error('db unavailable'));

    const logger = new PvsAuditLogger();

    await logger.log({
      operation: 'SESSION_EXPORT',
      level: 'ERROR',
      tenantId: 'tenant-3',
      connectionId: 'conn-3',
      pvsType: 'FHIR',
      success: false,
      sessionHash: 'session-hash-1',
      errorMessage: 'export failed',
    });

    await logger.shutdown();

    expect(logger.getBufferedLogs()).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});