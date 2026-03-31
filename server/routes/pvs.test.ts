import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
}));

const pvsRouterMocks = vi.hoisted(() => ({
  testConnection: vi.fn(),
  removeAdapter: vi.fn(),
  getCapabilities: vi.fn(),
  exportAnamnese: vi.fn(),
  getAdapter: vi.fn(),
}));

const versandMocks = vi.hoisted(() => ({
  processVersand: vi.fn(),
}));

const smartSyncMocks = vi.hoisted(() => ({
  startWatching: vi.fn(),
  stopWatching: vi.fn(),
  getStats: vi.fn(),
  isWatching: vi.fn(),
}));

const tomedoLauscherMocks = vi.hoisted(() => ({
  startLauscher: vi.fn(),
  stopLauscher: vi.fn(),
  getStats: vi.fn(),
  isRunning: vi.fn(),
  registerEventId: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  pvsConnection: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  patientSession: {
    findUniqueOrThrow: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  pvsTransferLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  pvsPatientLink: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  pvsFieldMapping: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
}));

vi.mock('../services/pvs/pvs-router.service.js', () => ({
  pvsRouter: pvsRouterMocks,
}));

vi.mock('../services/pvs/mapping-engine.js', () => ({
  countExportFields: vi.fn(() => 0),
}));

vi.mock('../services/export/versand.service.js', () => ({
  processVersand: versandMocks.processVersand,
}));

vi.mock('../services/pvs/sync/index.js', () => ({
  smartSyncService: smartSyncMocks,
}));

vi.mock('../services/pvs/tomedo-lauscher.service.js', () => ({
  tomedoLauscher: tomedoLauscherMocks,
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {
    constructor() {
      return prismaMock;
    }
  },
}));

import router from './pvs';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'get' | 'post') {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const routeLayer = layers.find((layer) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods?.[method];
  });

  expect(routeLayer).toBeDefined();
  return routeLayer!.route!.stack.map((s) => s.handle);
}

function createMockResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string | string[]>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers[name] = value;
      return this;
    },
  };

  return response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(versandMocks.processVersand).mockResolvedValue({
    sessionId: 'session-1',
    priority: 'NORMAL',
    status: 'ZUGESTELLT',
    channelResults: [
      {
        channel: 'PVS',
        success: true,
      },
    ],
  } as never);
  vi.mocked(smartSyncMocks.isWatching).mockReturnValue(false as never);
  vi.mocked(smartSyncMocks.startWatching).mockResolvedValue(undefined as never);
  vi.mocked(smartSyncMocks.stopWatching).mockResolvedValue(undefined as never);
  vi.mocked(smartSyncMocks.getStats).mockReturnValue(undefined as never);
  vi.mocked(tomedoLauscherMocks.startLauscher).mockReturnValue({
    state: 'skipped',
    stats: null,
    reason: 'unsupported_connection',
  } as never);
  vi.mocked(tomedoLauscherMocks.stopLauscher).mockReturnValue({
    state: 'already_stopped',
    stats: null,
  } as never);
  vi.mocked(tomedoLauscherMocks.getStats).mockReturnValue(null as never);
  vi.mocked(tomedoLauscherMocks.isRunning).mockReturnValue(false as never);
  vi.mocked(tomedoLauscherMocks.registerEventId).mockReturnValue('accepted' as never);
});

describe('wave 1.5 RED-first: PVS tenant scope guards', () => {
  it('registers /transfers/stats before /transfers/:id to avoid dynamic route shadowing', () => {
    const layers = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack;
    const statsIndex = layers.findIndex((layer) => layer.route?.path === '/transfers/stats' && layer.route.methods?.get);
    const dynamicIndex = layers.findIndex((layer) => layer.route?.path === '/transfers/:id' && layer.route.methods?.get);

    expect(statsIndex).toBeGreaterThanOrEqual(0);
    expect(dynamicIndex).toBeGreaterThanOrEqual(0);
    expect(statsIndex).toBeLessThan(dynamicIndex);
  });

  it('enforces tenantId in active PVS connection lookup', async () => {
    vi.mocked(prismaMock.pvsConnection.findMany).mockResolvedValue([] as never);

    const handlers = getRouteHandlers('/connection', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const callArg = vi.mocked(prismaMock.pvsConnection.findMany).mock.calls[0]?.[0] as {
      where?: Record<string, unknown>;
    };

    expect(callArg.where?.praxisId).toBe('tenant-a');
    expect(callArg.where?.isActive).toBe(true);
  });

  it('rejects tenant mismatch on /connection before touching the database', async () => {
    const handlers = getRouteHandlers('/connection', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-b' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant scope violation',
      code: 'PVS_SCOPE_VIOLATION',
    });
    expect(prismaMock.pvsConnection.findMany).not.toHaveBeenCalled();
  });

  it('requires tenant context on /export/session/:sessionId before any lookup', async () => {
    const handlers = getRouteHandlers('/export/session/:sessionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { sessionId: 'session-1' },
      auth: { userId: 'arzt-1', role: 'arzt' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant context required',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(prismaMock.patientSession.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(pvsRouterMocks.exportAnamnese).not.toHaveBeenCalled();
  });

  it('blocks cross-tenant export/session access before adapter export', async () => {
    vi.mocked(prismaMock.patientSession.findUniqueOrThrow).mockResolvedValue({
      id: 'session-1',
      tenantId: 'tenant-b',
      patientId: 'patient-1',
      patient: null,
      status: 'ACTIVE',
      selectedService: 'AKUT',
      insuranceType: 'GKV',
      createdAt: new Date('2026-03-22T10:00:00.000Z'),
      completedAt: null,
      answers: [],
      triageEvents: [],
    } as never);
    vi.mocked(prismaMock.pvsConnection.findFirst).mockResolvedValue({
      id: 'conn-1',
      protocol: 'GDT',
      pvsType: 'CGM_M1',
      isActive: true,
    } as never);
    vi.mocked(pvsRouterMocks.exportAnamnese).mockResolvedValue({
      success: true,
      pvsReferenceId: 'ref-1',
      warnings: [],
    } as never);
    vi.mocked(prismaMock.pvsTransferLog.create).mockResolvedValue({} as never);

    const handlers = getRouteHandlers('/export/session/:sessionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { sessionId: 'session-1' },
      tenantId: 'tenant-a',
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant scope violation',
      code: 'PVS_SCOPE_VIOLATION',
    });
    expect(pvsRouterMocks.exportAnamnese).not.toHaveBeenCalled();
  });
});

describe('tomedo hybrid export: FHIR + GDT + versand', () => {
  function buildSession(sessionId: string) {
    return {
      id: sessionId,
      tenantId: 'tenant-a',
      patientId: 'patient-1',
      patient: {
        id: 'patient-1',
        encryptedName: 'enc-name',
        birthDate: new Date('1990-01-01'),
        gender: 'M',
        versichertenNr: 'A12345',
        versichertenArt: 'GKV',
        kassenname: 'AOK',
        kassennummer: '123',
        patientNumber: 'P-100',
      },
      status: 'ACTIVE',
      selectedService: 'AKUT',
      insuranceType: 'GKV',
      createdAt: new Date('2026-03-30T09:00:00.000Z'),
      completedAt: null,
      answers: [],
      triageEvents: [
        {
          id: 'triage-1',
          level: 'WARNING',
          atomId: '1002',
          triggerValues: '[]',
          message: 'Bitte zeitnah prüfen',
        },
      ],
    };
  }

  function buildConnection(connectionId: string, gdtConfigured: boolean) {
    return {
      id: connectionId,
      praxisId: 'tenant-a',
      protocol: 'FHIR',
      pvsType: 'TOMEDO',
      isActive: true,
      retryCount: 3,
      fhirBaseUrl: 'https://tomedo.example.test/fhir/R4',
      gdtExportDir: gdtConfigured ? 'C:/tmp/gdt-export' : null,
      gdtImportDir: gdtConfigured ? 'C:/tmp/gdt-import' : null,
    };
  }

  it('executes parallel FHIR+GDT export and returns protocol-level result details', async () => {
    vi.mocked(prismaMock.patientSession.findUniqueOrThrow).mockResolvedValue(buildSession('session-hybrid-1') as never);
    vi.mocked(prismaMock.pvsConnection.findFirst).mockResolvedValue(buildConnection('conn-hybrid-1', true) as never);
    vi.mocked(prismaMock.pvsTransferLog.create).mockResolvedValue({} as never);
    vi.mocked(prismaMock.patientSession.update).mockResolvedValue({} as never);

    vi.mocked(pvsRouterMocks.exportAnamnese).mockImplementation(async (connection) => {
      const protocol = (connection as { protocol: string }).protocol;
      if (protocol === 'FHIR') {
        return {
          success: true,
          transferLogId: 'transfer-fhir-1',
          pvsReferenceId: 'FHIR-REF-1',
          warnings: [],
        } as never;
      }

      return {
        success: true,
        transferLogId: 'transfer-gdt-1',
        pvsReferenceId: 'GDT-REF-1',
        warnings: [],
      } as never;
    });

    const handlers = getRouteHandlers('/export/session/:sessionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { sessionId: 'session-hybrid-1' },
      tenantId: 'tenant-a',
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-a' },
      body: {
        mode: 'HYBRID',
        channels: ['PVS', 'FHIR', 'GDT'],
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as {
      status: string;
      hybrid: boolean;
      protocolResults: Array<{ protocol: string; success: boolean }>;
      pvsReferenceIds: Array<{ protocol: string; reference: string }>;
      versand: { status: string } | null;
    };

    expect(body.hybrid).toBe(true);
    expect(body.status).toBe('COMPLETED');
    expect(body.protocolResults).toHaveLength(2);
    expect(body.protocolResults.map((entry) => entry.protocol)).toEqual(['FHIR', 'GDT']);
    expect(body.pvsReferenceIds).toEqual([
      { protocol: 'FHIR', reference: 'FHIR-REF-1' },
      { protocol: 'GDT', reference: 'GDT-REF-1' },
    ]);
    expect(body.versand?.status).toBe('ZUGESTELLT');

    expect(prismaMock.pvsTransferLog.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.patientSession.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.patientSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-hybrid-1' },
        data: expect.objectContaining({
          pvsExported: true,
          pvsExportRef: 'FHIR:FHIR-REF-1 | GDT:GDT-REF-1',
        }),
      }),
    );
    expect(versandMocks.processVersand).toHaveBeenCalledTimes(1);
    expect(versandMocks.processVersand).toHaveBeenCalledWith(
      'session-hybrid-1',
      expect.arrayContaining(['PVS', 'FHIR', 'GDT']),
    );
    expect(pvsRouterMocks.removeAdapter).toHaveBeenCalledWith('conn-hybrid-1-hybrid-gdt');
  });

  it('excludes failed protocol channel from versand routing during partial hybrid export', async () => {
    vi.mocked(prismaMock.patientSession.findUniqueOrThrow).mockResolvedValue(buildSession('session-hybrid-partial') as never);
    vi.mocked(prismaMock.pvsConnection.findFirst).mockResolvedValue(buildConnection('conn-hybrid-partial', true) as never);
    vi.mocked(prismaMock.pvsTransferLog.create).mockResolvedValue({} as never);
    vi.mocked(prismaMock.patientSession.update).mockResolvedValue({} as never);

    vi.mocked(pvsRouterMocks.exportAnamnese).mockImplementation(async (connection) => {
      const protocol = (connection as { protocol: string }).protocol;
      if (protocol === 'FHIR') {
        return {
          success: true,
          transferLogId: 'transfer-fhir-partial',
          pvsReferenceId: 'FHIR-REF-PARTIAL',
          warnings: [],
        } as never;
      }

      return {
        success: false,
        transferLogId: 'transfer-gdt-partial',
        pvsReferenceId: undefined,
        warnings: [],
        error: 'GDT export failed',
      } as never;
    });

    const handlers = getRouteHandlers('/export/session/:sessionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { sessionId: 'session-hybrid-partial' },
      tenantId: 'tenant-a',
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-a' },
      body: {
        mode: 'HYBRID',
        channels: ['PVS', 'FHIR', 'GDT'],
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as {
      status: string;
      warnings: string[];
    };

    expect(body.status).toBe('PARTIAL');
    expect(body.warnings).toContain('Versandkanal GDT übersprungen, da Export fehlgeschlagen.');
    expect(versandMocks.processVersand).toHaveBeenCalledTimes(1);

    const channels = vi.mocked(versandMocks.processVersand).mock.calls[0]?.[1] as string[];
    expect(channels).toContain('PVS');
    expect(channels).toContain('FHIR');
    expect(channels).not.toContain('GDT');
  });

  it('sanitizes versand failure warning while keeping export result successful', async () => {
    vi.mocked(prismaMock.patientSession.findUniqueOrThrow).mockResolvedValue(buildSession('session-versand-error') as never);
    vi.mocked(prismaMock.pvsConnection.findFirst).mockResolvedValue(buildConnection('conn-versand-error', false) as never);
    vi.mocked(prismaMock.pvsTransferLog.create).mockResolvedValue({} as never);
    vi.mocked(prismaMock.patientSession.update).mockResolvedValue({} as never);

    vi.mocked(pvsRouterMocks.exportAnamnese).mockResolvedValue({
      success: true,
      transferLogId: 'transfer-fhir-success',
      pvsReferenceId: 'FHIR-REF-SUCCESS',
      warnings: [],
    } as never);

    vi.mocked(versandMocks.processVersand).mockRejectedValueOnce(new Error('DB connection secret=leak'));

    const handlers = getRouteHandlers('/export/session/:sessionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { sessionId: 'session-versand-error' },
      tenantId: 'tenant-a',
      auth: { userId: 'arzt-2', role: 'arzt', tenantId: 'tenant-a' },
      body: { channels: ['PVS', 'FHIR'] },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { status: string; warnings: string[] };
    expect(body.status).toBe('COMPLETED');
    expect(body.warnings).toContain('Versandprotokoll fehlgeschlagen');
    expect(body.warnings.join(' ')).not.toContain('secret=leak');
  });

  const flowScenarios = Array.from({ length: 33 }, (_, idx) => {
    const flowId = idx + 1;
    const hybridRequested = flowId % 3 !== 0;
    const gdtConfigured = flowId % 5 !== 0;
    const fhirSuccess = flowId % 7 !== 0;
    const gdtSuccess = flowId % 4 !== 0;

    const protocolCount = hybridRequested && gdtConfigured ? 2 : 1;
    const gdtParticipates = hybridRequested && gdtConfigured;
    const successfulCount = Number(fhirSuccess) + Number(gdtParticipates && gdtSuccess);

    const expectedStatus = successfulCount === protocolCount
      ? 'COMPLETED'
      : successfulCount > 0
        ? 'PARTIAL'
        : 'FAILED';

    return {
      flowId,
      hybridRequested,
      gdtConfigured,
      fhirSuccess,
      gdtSuccess,
      expectedStatus,
      expectedProtocolCount: protocolCount,
      expectedAnySuccess: successfulCount > 0,
      expectShadowCleanup: gdtParticipates,
    };
  });

  it.each(flowScenarios)(
    'validates patient flow #$flowId (hybrid=$hybridRequested, gdtConfigured=$gdtConfigured)',
    async (scenario) => {
      const sessionId = `session-flow-${scenario.flowId}`;
      const connectionId = `conn-flow-${scenario.flowId}`;

      vi.mocked(prismaMock.patientSession.findUniqueOrThrow).mockResolvedValue(buildSession(sessionId) as never);
      vi.mocked(prismaMock.pvsConnection.findFirst).mockResolvedValue(
        buildConnection(connectionId, scenario.gdtConfigured) as never,
      );
      vi.mocked(prismaMock.pvsTransferLog.create).mockResolvedValue({} as never);
      vi.mocked(prismaMock.patientSession.update).mockResolvedValue({} as never);

      vi.mocked(pvsRouterMocks.exportAnamnese).mockImplementation(async (connection) => {
        const protocol = (connection as { protocol: string }).protocol;
        if (protocol === 'FHIR') {
          return {
            success: scenario.fhirSuccess,
            transferLogId: `transfer-${scenario.flowId}-fhir`,
            pvsReferenceId: scenario.fhirSuccess ? `FHIR-${scenario.flowId}` : undefined,
            warnings: [],
            error: scenario.fhirSuccess ? undefined : `FHIR export failed for flow ${scenario.flowId}`,
          } as never;
        }

        return {
          success: scenario.gdtSuccess,
          transferLogId: `transfer-${scenario.flowId}-gdt`,
          pvsReferenceId: scenario.gdtSuccess ? `GDT-${scenario.flowId}` : undefined,
          warnings: [],
          error: scenario.gdtSuccess ? undefined : `GDT export failed for flow ${scenario.flowId}`,
        } as never;
      });

      const handlers = getRouteHandlers('/export/session/:sessionId', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { sessionId },
        tenantId: 'tenant-a',
        auth: { userId: `arzt-${scenario.flowId}`, role: 'arzt', tenantId: 'tenant-a' },
        body: scenario.hybridRequested
          ? { mode: 'HYBRID', channels: ['PVS', 'FHIR', 'GDT'] }
          : { channels: ['FHIR'] },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);

      const body = res.body as {
        status: string;
        protocolResults: Array<{ protocol: string }>;
        hybrid: boolean;
      };

      expect(body.status).toBe(scenario.expectedStatus);
      expect(body.protocolResults).toHaveLength(scenario.expectedProtocolCount);
      expect(body.hybrid).toBe(scenario.hybridRequested || scenario.expectedProtocolCount > 1);

      expect(prismaMock.pvsTransferLog.create).toHaveBeenCalledTimes(scenario.expectedProtocolCount);
      expect(prismaMock.patientSession.update).toHaveBeenCalledTimes(scenario.expectedAnySuccess ? 1 : 0);
      expect(versandMocks.processVersand).toHaveBeenCalledTimes(scenario.expectedAnySuccess ? 1 : 0);

      if (scenario.expectShadowCleanup) {
        expect(pvsRouterMocks.removeAdapter).toHaveBeenCalledWith(`${connectionId}-hybrid-gdt`);
      } else {
        expect(pvsRouterMocks.removeAdapter).not.toHaveBeenCalledWith(`${connectionId}-hybrid-gdt`);
      }
    },
  );
});

describe('tomedo status sync + import chain', () => {
  function buildTomedoConnection(connectionId: string) {
    return {
      id: connectionId,
      praxisId: 'tenant-a',
      protocol: 'FHIR',
      pvsType: 'TOMEDO',
      isActive: true,
      retryCount: 3,
      syncIntervalSec: 30,
      autoMapFields: true,
      fhirBaseUrl: 'https://tomedo.example.test/fhir/R4',
    };
  }

  it('starts sync with component status details for Tomedo connection', async () => {
    vi.mocked(prismaMock.pvsConnection.findFirst).mockResolvedValue(buildTomedoConnection('conn-sync-1') as never);
    vi.mocked(tomedoLauscherMocks.startLauscher).mockReturnValue({
      state: 'started',
      stats: {
        running: true,
      },
    } as never);
    vi.mocked(tomedoLauscherMocks.isRunning).mockReturnValue(true as never);

    const handlers = getRouteHandlers('/connection/:id/sync/start', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'conn-sync-1' },
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
      body: {},
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(smartSyncMocks.startWatching).toHaveBeenCalledTimes(1);
    expect(tomedoLauscherMocks.startLauscher).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ id: 'conn-sync-1', pvsType: 'TOMEDO' }),
    );

    expect(res.body).toEqual(expect.objectContaining({
      success: true,
      status: 'watching',
      components: expect.objectContaining({
        tomedoLauscher: expect.objectContaining({ state: 'started' }),
      }),
    }));
  });

  it('returns merged sync stats when only Tomedo lauscher is active', async () => {
    vi.mocked(prismaMock.pvsConnection.findFirst).mockResolvedValue(buildTomedoConnection('conn-sync-stats') as never);
    vi.mocked(tomedoLauscherMocks.getStats).mockReturnValue({
      running: true,
      intervalMs: 30000,
      startedAt: new Date('2026-03-30T03:00:00.000Z'),
      lastPollAt: new Date('2026-03-30T03:01:00.000Z'),
      lastEventAt: null,
      lastImportAt: null,
      processedEvents: 2,
      triggeredImports: 1,
      skippedEvents: 0,
      duplicateEvents: 0,
      failedEvents: 0,
      lastErrorCode: null,
    } as never);

    const handlers = getRouteHandlers('/connection/:id/sync/stats', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'conn-sync-stats' },
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
      query: {},
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      status: 'watching',
      stats: expect.objectContaining({
        componentStats: expect.objectContaining({
          smartSync: null,
          tomedoLauscher: expect.objectContaining({ processedEvents: 2 }),
        }),
      }),
    }));
  });

  it('rejects tomedo-status import without statusEventId', async () => {
    const handlers = getRouteHandlers('/import/patient', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-a',
      auth: { userId: 'mfa-1', role: 'mfa', tenantId: 'tenant-a' },
      body: {
        source: 'tomedo-status',
        pvsPatientId: 'PAT-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ error: 'Validierungsfehler' }));
    expect(pvsRouterMocks.getAdapter).not.toHaveBeenCalled();
  });

  it('returns duplicate response for repeated tomedo status events', async () => {
    vi.mocked(prismaMock.pvsConnection.findFirst).mockResolvedValue(buildTomedoConnection('conn-import-1') as never);
    vi.mocked(tomedoLauscherMocks.registerEventId).mockReturnValue('duplicate' as never);

    const handlers = getRouteHandlers('/import/patient', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-a',
      auth: { userId: 'mfa-1', role: 'mfa', tenantId: 'tenant-a' },
      body: {
        source: 'tomedo-status',
        statusEventId: 'evt-1',
        pvsPatientId: 'PAT-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual(expect.objectContaining({
      duplicate: true,
      reason: 'duplicate_status_event',
    }));
    expect(pvsRouterMocks.getAdapter).not.toHaveBeenCalled();
  });
});
