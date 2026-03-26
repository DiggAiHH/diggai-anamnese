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
