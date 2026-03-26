import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
}));

const epaServiceMocks = vi.hoisted(() => ({
  getOrCreateEPA: vi.fn(),
  addDocument: vi.fn(),
  getDocuments: vi.fn(),
  getDocumentScoped: vi.fn(),
  deleteDocumentScoped: vi.fn(),
  createShare: vi.fn(),
  getShares: vi.fn(),
  revokeShareScoped: vi.fn(),
  accessByToken: vi.fn(),
  createAnonymizedExport: vi.fn(),
  getExportScoped: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
}));

vi.mock('../services/epa', () => ({
  getOrCreateEPA: epaServiceMocks.getOrCreateEPA,
  addDocument: epaServiceMocks.addDocument,
  getDocuments: epaServiceMocks.getDocuments,
  getDocumentScoped: epaServiceMocks.getDocumentScoped,
  deleteDocumentScoped: epaServiceMocks.deleteDocumentScoped,
  createShare: epaServiceMocks.createShare,
  getShares: epaServiceMocks.getShares,
  revokeShareScoped: epaServiceMocks.revokeShareScoped,
  accessByToken: epaServiceMocks.accessByToken,
  createAnonymizedExport: epaServiceMocks.createAnonymizedExport,
  getExportScoped: epaServiceMocks.getExportScoped,
}));

import router from './epa';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'get' | 'post' | 'delete') {
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
    end() {
      return this;
    },
  };

  return response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(epaServiceMocks.getOrCreateEPA).mockResolvedValue({
    id: 'epa-1',
    patientId: 'patient-1',
  } as never);
});

describe('wave 1.5 RED-first: ePA tenant scope guards', () => {
  it('registers /access/:token before auth middleware to keep token access public', () => {
    const layers = (router as unknown as { stack: Array<{ route?: { path: string }; handle?: unknown }> }).stack;
    const publicRouteIndex = layers.findIndex((layer) => layer.route?.path === '/access/:token');
    const authMiddlewareIndex = layers.findIndex((layer) => !layer.route && layer.handle === middlewareMocks.requireAuth);

    expect(publicRouteIndex).toBeGreaterThanOrEqual(0);
    expect(authMiddlewareIndex).toBeGreaterThanOrEqual(0);
    expect(publicRouteIndex).toBeLessThan(authMiddlewareIndex);
  });

  it('rejects tenant mismatch between req.tenantId and req.auth.tenantId before ePA lookup', async () => {
    const handlers = getRouteHandlers('/:patientId', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { patientId: 'patient-1' },
      query: { consentVersion: '1.0' },
      tenantId: 'tenant-a',
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-b' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant scope violation',
      code: 'TENANT_SCOPE_VIOLATION',
    });
    expect(epaServiceMocks.getOrCreateEPA).not.toHaveBeenCalled();
  });

  it('requires tenant context for patient-scoped ePA read', async () => {
    const handlers = getRouteHandlers('/:patientId', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { patientId: 'patient-1' },
      query: { consentVersion: '1.0' },
      auth: { userId: 'arzt-1', role: 'arzt' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant context required',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(epaServiceMocks.getOrCreateEPA).not.toHaveBeenCalled();
  });

  it('propagates effective tenantId to ePA service calls (typing + scope contract)', async () => {
    const handlers = getRouteHandlers('/:patientId', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { patientId: 'patient-1' },
      query: { consentVersion: '1.0' },
      tenantId: 'tenant-a',
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(epaServiceMocks.getOrCreateEPA).toHaveBeenCalledWith(
      'patient-1',
      '1.0',
      { tenantId: 'tenant-a' },
    );
  });

  it('maps ePA scope violations to HTTP 403 instead of generic 500', async () => {
    vi.mocked(epaServiceMocks.getOrCreateEPA).mockRejectedValue({
      status: 403,
      code: 'EPA_SCOPE_VIOLATION',
    } as never);

    const handlers = getRouteHandlers('/:patientId', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { patientId: 'patient-1' },
      query: { consentVersion: '1.0' },
      tenantId: 'tenant-a',
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Forbidden',
      code: 'EPA_SCOPE_VIOLATION',
    });
  });
});
