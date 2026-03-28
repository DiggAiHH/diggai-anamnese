import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => {
  const requirePermissionMiddleware = vi.fn((_req: unknown, _res: unknown, next: () => void) => next());

  return {
    requireAuth: vi.fn((_req, _res, next) => next()),
    requireRole: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
    requirePermissionMiddleware,
    requirePermission: vi.fn(() => requirePermissionMiddleware),
  };
});

const serviceMocks = vi.hoisted(() => ({
  processWunschboxEntry: vi.fn(),
  generateExportSpec: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRole,
  requirePermission: middlewareMocks.requirePermission,
}));

vi.mock('../services/wunschboxService', () => ({
  processWunschboxEntry: serviceMocks.processWunschboxEntry,
  generateExportSpec: serviceMocks.generateExportSpec,
}));

vi.mock('../db', () => ({
  prisma: {
    wunschboxEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import router from './wunschbox';
import { prisma } from '../db';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'get' | 'post' | 'put') {
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
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
}

describe('wunschbox routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores submittedBy and tenantId from authenticated tenant context', async () => {
    vi.mocked(prisma.wunschboxEntry.create).mockResolvedValue({
      id: 'wish-1',
      submittedBy: 'staff-11',
      tenantId: 'tenant-1',
      originalText: 'Bitte mehr Exportformate im Adminbereich anbieten.',
    } as never);

    const handlers = getRouteHandlers('/', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-1',
      auth: { userId: 'staff-11', role: 'admin', tenantId: 'tenant-1' },
      body: { text: 'Bitte mehr Exportformate im Adminbereich anbieten.' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.wunschboxEntry.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        submittedBy: 'staff-11',
        originalText: 'Bitte mehr Exportformate im Adminbereich anbieten.',
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('rejects list requests without tenant context', async () => {
    const handlers = getRouteHandlers('/', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: {},
      auth: { userId: 'staff-11', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.wunschboxEntry.findMany).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
  });

  it('rejects invalid submission bodies', async () => {
    const handlers = getRouteHandlers('/', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-1',
      auth: { userId: 'staff-11', role: 'admin', tenantId: 'tenant-1' },
      body: { text: 'zu kurz' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.wunschboxEntry.create).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Wunsch konnte nicht eingereicht werden' });
  });

  it('keeps listing working when aiParsedChanges contains malformed JSON', async () => {
    vi.mocked(prisma.wunschboxEntry.findMany).mockResolvedValue([
      {
        id: 'wish-1',
        tenantId: 'tenant-1',
        originalText: 'foo',
        aiParsedChanges: '{bad json}',
        createdAt: new Date('2026-03-26T12:00:00.000Z'),
      },
      {
        id: 'wish-2',
        tenantId: 'tenant-1',
        originalText: 'bar',
        aiParsedChanges: JSON.stringify({ changes: ['ok'] }),
        createdAt: new Date('2026-03-26T12:01:00.000Z'),
      },
    ] as never);
    vi.mocked(prisma.wunschboxEntry.count).mockResolvedValue(2 as never);

    const handlers = getRouteHandlers('/', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: {},
      tenantId: 'tenant-1',
      auth: { userId: 'staff-11', role: 'admin', tenantId: 'tenant-1' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.wunschboxEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-1' },
    }));
    expect(prisma.wunschboxEntry.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      entries: [
        expect.objectContaining({ id: 'wish-1', aiParsedChanges: null }),
        expect.objectContaining({ id: 'wish-2', aiParsedChanges: { changes: ['ok'] } }),
      ],
      pagination: {
        page: 1,
        limit: 25,
        total: 2,
        totalPages: 1,
      },
    });
  });

  it('protects export route with admin_wunschbox permission', () => {
    const handlers = getRouteHandlers('/:id/export', 'post');

    expect(handlers).toContain(middlewareMocks.requireAuth);
    expect(handlers).toContain(middlewareMocks.requirePermissionMiddleware);
  });

  it('passes the resolved tenant context into processing', async () => {
    vi.mocked(serviceMocks.processWunschboxEntry).mockResolvedValue([{ description: 'ok' }] as never);
    vi.mocked(prisma.wunschboxEntry.findUnique).mockResolvedValue({
      id: 'wish-1',
      tenantId: 'tenant-1',
      aiParsedChanges: JSON.stringify([{ description: 'ok' }]),
    } as never);

    const handlers = getRouteHandlers('/:id/process', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'wish-1' },
      tenantId: 'tenant-1',
      auth: { userId: 'staff-11', role: 'admin', tenantId: 'tenant-1' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(serviceMocks.processWunschboxEntry).toHaveBeenCalledWith('wish-1', { tenantId: 'tenant-1' });
    expect(res.statusCode).toBe(200);
  });
});
