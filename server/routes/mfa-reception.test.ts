import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  listReceptionInbox: vi.fn(),
  getReceptionInboxDetail: vi.fn(),
  markReceptionInboxRead: vi.fn(),
  markReceptionInboxProcessed: vi.fn(),
  markReceptionInboxCompleted: vi.fn(),
  sendPracticeInboxCopy: vi.fn(),
  sendReceptionResponse: vi.fn(),
  confirmReceptionDispatch: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
}));

vi.mock('../services/mfa/receptionInbox.service', () => ({
  listReceptionInbox: serviceMocks.listReceptionInbox,
  getReceptionInboxDetail: serviceMocks.getReceptionInboxDetail,
  markReceptionInboxRead: serviceMocks.markReceptionInboxRead,
  markReceptionInboxProcessed: serviceMocks.markReceptionInboxProcessed,
  markReceptionInboxCompleted: serviceMocks.markReceptionInboxCompleted,
  sendPracticeInboxCopy: serviceMocks.sendPracticeInboxCopy,
  sendReceptionResponse: serviceMocks.sendReceptionResponse,
  confirmReceptionDispatch: serviceMocks.confirmReceptionDispatch,
}));

import router from './mfa-reception';

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

describe('mfa-reception routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the MFA/Admin role guard once for the router', () => {
    const layerHandles = (router as unknown as { stack: Array<{ handle: unknown }> }).stack.map((layer) => layer.handle);
    expect(layerHandles).toContain(middlewareMocks.requireAuth);
    expect(layerHandles).toContain(middlewareMocks.requireRole);
  });

  it('returns 400 when tenant context is missing', async () => {
    const handlers = getRouteHandlers('/inbox', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;
    const req = { auth: { userId: 'mfa-1' } };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(serviceMocks.listReceptionInbox).not.toHaveBeenCalled();
  });

  it('returns 403 when auth and request tenant differ', async () => {
    const handlers = getRouteHandlers('/inbox', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;
    const req = {
      tenantId: 'tenant-a',
      auth: { tenantId: 'tenant-b', userId: 'mfa-1' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant-Konflikt',
      code: 'TENANT_SCOPE_VIOLATION',
    });
    expect(serviceMocks.listReceptionInbox).not.toHaveBeenCalled();
  });

  it('lists inbox entries within the resolved tenant scope', async () => {
    serviceMocks.listReceptionInbox.mockResolvedValue({ items: [], stats: { openCount: 0 } });

    const handlers = getRouteHandlers('/inbox', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;
    const req = {
      tenantId: 'tenant-a',
      auth: { tenantId: 'tenant-a', userId: 'mfa-1' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(serviceMocks.listReceptionInbox).toHaveBeenCalledWith('tenant-a');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ items: [], stats: { openCount: 0 } });
  });

  it('validates structured response payloads', async () => {
    const handlers = getRouteHandlers('/inbox/:sessionId/respond', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;
    const req = {
      params: { sessionId: 'session-1' },
      tenantId: 'tenant-a',
      auth: { tenantId: 'tenant-a', userId: 'mfa-1' },
      body: { templateKey: 'invalid-template', mode: 'manual' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: 'Ungültige Antwortdaten' });
    expect(serviceMocks.sendReceptionResponse).not.toHaveBeenCalled();
  });
});