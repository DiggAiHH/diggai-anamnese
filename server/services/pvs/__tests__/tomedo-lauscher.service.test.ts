import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PvsConnectionData } from '../types.js';

const prismaMock = vi.hoisted(() => ({
  patientSession: {
    findMany: vi.fn(),
  },
  pvsTransferLog: {
    create: vi.fn(),
  },
  pvsPatientLink: {
    upsert: vi.fn(),
  },
}));

const pvsRouterMocks = vi.hoisted(() => ({
  getAdapter: vi.fn(),
}));

const versandMocks = vi.hoisted(() => ({
  markVersandProcessed: vi.fn(),
  completeVersand: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../../db', () => ({
  prisma: prismaMock,
}));

vi.mock('../pvs-router.service.js', () => ({
  pvsRouter: pvsRouterMocks,
}));

vi.mock('../../export/versand.service.js', () => ({
  markVersandProcessed: versandMocks.markVersandProcessed,
  completeVersand: versandMocks.completeVersand,
}));

vi.mock('../../../logger.js', () => ({
  createLogger: vi.fn(() => loggerMocks),
}));

import { TomedoLauscherService } from '../tomedo-lauscher.service.js';

function buildTomedoConnection(connectionId: string): PvsConnectionData {
  return {
    id: connectionId,
    praxisId: 'tenant-a',
    pvsType: 'TOMEDO',
    protocol: 'FHIR',
    isActive: true,
    syncIntervalSec: 30,
    retryCount: 3,
    autoMapFields: true,
    fhirBaseUrl: 'https://tomedo.example.test/fhir/R4',
  };
}

function buildTomedoAdapter() {
  return {
    type: 'TOMEDO',
    supportedProtocols: ['FHIR'],
    initialize: vi.fn(),
    testConnection: vi.fn(),
    disconnect: vi.fn(),
    importPatient: vi.fn().mockResolvedValue({ resourceType: 'Patient', id: 'PAT-EXT-1' }),
    exportPatient: vi.fn(),
    searchPatient: vi.fn(),
    exportAnamneseResult: vi.fn(),
    getCapabilities: vi.fn(),
    fetchStatusByReference: vi.fn(),
  };
}

describe('tomedo lauscher service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(prismaMock.patientSession.findMany).mockResolvedValue([] as never);
    vi.mocked(prismaMock.pvsTransferLog.create).mockResolvedValue({} as never);
    vi.mocked(prismaMock.pvsPatientLink.upsert).mockResolvedValue({} as never);
    vi.mocked(versandMocks.markVersandProcessed).mockResolvedValue({} as never);
    vi.mocked(versandMocks.completeVersand).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts and stops per tenant+connection scope idempotently', () => {
    const service = new TomedoLauscherService();
    const connection = buildTomedoConnection('conn-1');

    const startResult = service.startLauscher('tenant-a', connection);
    const startAgain = service.startLauscher('tenant-a', connection);

    expect(startResult.state).toBe('started');
    expect(startAgain.state).toBe('already_running');
    expect(service.isRunning('tenant-a', 'conn-1')).toBe(true);

    const stopResult = service.stopLauscher('tenant-a', 'conn-1');
    const stopAgain = service.stopLauscher('tenant-a', 'conn-1');

    expect(stopResult.state).toBe('stopped');
    expect(stopAgain.state).toBe('already_stopped');
    expect(service.isRunning('tenant-a', 'conn-1')).toBe(false);
  });

  it('returns skipped for non-tomedo connections', () => {
    const service = new TomedoLauscherService();
    const unsupported: PvsConnectionData = {
      ...buildTomedoConnection('conn-2'),
      pvsType: 'CGM_M1',
      protocol: 'GDT',
    };

    const result = service.startLauscher('tenant-a', unsupported);

    expect(result.state).toBe('skipped');
    expect(result.reason).toBe('unsupported_connection');
  });

  it('deduplicates registered event IDs per running scope', () => {
    const service = new TomedoLauscherService();
    const connection = buildTomedoConnection('conn-3');

    service.startLauscher('tenant-a', connection);

    expect(service.registerEventId('tenant-a', 'conn-3', 'evt-1')).toBe('accepted');
    expect(service.registerEventId('tenant-a', 'conn-3', 'evt-1')).toBe('duplicate');
    expect(service.registerEventId('tenant-a', 'conn-3', 'evt-1', true)).toBe('accepted');

    service.stopLauscher('tenant-a', 'conn-3');
  });

  it('processes webhook payload and triggers import chain once per statusEventId', async () => {
    const service = new TomedoLauscherService();
    const connection = buildTomedoConnection('conn-4');
    const adapter = buildTomedoAdapter();

    vi.mocked(pvsRouterMocks.getAdapter).mockResolvedValue(adapter as never);

    service.startLauscher('tenant-a', connection);

    const payload = {
      tenantId: 'tenant-a',
      connectionId: 'conn-4',
      sessionId: 'session-42',
      reference: 'Task/task-1',
      statusCode: 'completed',
      pvsPatientId: 'PAT-EXT-1',
      statusEventId: 'evt-42',
    };

    const firstResult = await service.handleWebhookNotification(payload);
    const secondResult = await service.handleWebhookNotification(payload);

    expect(firstResult).toEqual({ processed: true });
    expect(secondResult).toEqual({ processed: true });
    expect(adapter.importPatient).toHaveBeenCalledTimes(1);
    expect(prismaMock.pvsTransferLog.create).toHaveBeenCalledTimes(1);

    service.stopLauscher('tenant-a', 'conn-4');
  });
});
