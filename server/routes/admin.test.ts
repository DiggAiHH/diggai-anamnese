import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const middlewareMocks = vi.hoisted(() => {
  const permissionHandlers = new Map<string, (req: unknown, res: unknown, next: () => void) => void>();

  return {
    requireAuth: vi.fn((_req, _res, next) => next()),
    requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
    requireRole: vi.fn((_req, _res, next) => next()),
    requirePermissionFactory: vi.fn((code: string) => {
      if (!permissionHandlers.has(code)) {
        const handler = ((
          _req: unknown,
          _res: unknown,
          next: () => void,
        ) => next()) as ((req: unknown, res: unknown, next: () => void) => void) & { __permissionCode?: string };
        handler.__permissionCode = code;
        permissionHandlers.set(code, handler);
      }

      return permissionHandlers.get(code)!;
    }),
    requirePermission: vi.fn((_req, _res, next) => next()),
  };
});

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
  requirePermission: middlewareMocks.requirePermissionFactory,
  requireStrictPermission: middlewareMocks.requirePermissionFactory,
}));

vi.mock('../db', () => ({
  prisma: {
    rolePermission: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    arztUser: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    patient: { count: vi.fn() },
    patientSession: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    triageEvent: { count: vi.fn(), findMany: vi.fn() },
    auditLog: { findMany: vi.fn(), count: vi.fn() },
    permission: { findMany: vi.fn() },
    waitingContent: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../i18n', () => ({
  t: vi.fn((_lang: string, key: string) => key),
  parseLang: vi.fn(() => 'de'),
}));

import router from './admin';
import { prisma } from '../db';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'get' | 'post' | 'put' | 'delete') {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const routeLayer = layers.find((layer) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods?.[method];
  });

  expect(routeLayer).toBeDefined();
  return routeLayer!.route!.stack.map((s) => s.handle);
}

function getPermissionCodes(path: string, method: 'get' | 'post' | 'put' | 'delete') {
  return getRouteHandlers(path, method)
    .map((handler) => (handler as { __permissionCode?: string }).__permissionCode)
    .filter((code): code is string => Boolean(code));
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('admin permission checks', () => {
  it('returns allowed true for admin role using req.auth context', async () => {
    const handlers = getRouteHandlers('/permissions/check', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { code: 'admin_users' },
      auth: {
        userId: 'u1',
        role: 'admin',
      },
    };

    const res = createMockResponse();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ allowed: true });
  });

  it('normalizes req.auth role to uppercase for role-permission lookup', async () => {
    vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue({ id: 'rp1' } as never);

    const handlers = getRouteHandlers('/permissions/check', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { code: 'admin_users' },
      auth: {
        userId: 'u2',
        role: 'arzt',
      },
    };

    const res = createMockResponse();
    await handler(req, res);

    expect(prisma.rolePermission.findFirst).toHaveBeenCalledWith({
      where: {
        role: 'ARZT',
        permission: { code: 'admin_users' },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ allowed: true });
  });

  it('treats uppercase ADMIN role as allowed without DB lookup', async () => {
    const handlers = getRouteHandlers('/permissions/check', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { code: 'admin_users' },
      auth: {
        userId: 'u3',
        role: 'ADMIN',
      },
    };

    const res = createMockResponse();
    await handler(req, res);

    expect(prisma.rolePermission.findFirst).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ allowed: true });
  });

  it('fails closed when role is missing in auth context', async () => {
    const handlers = getRouteHandlers('/permissions/check', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { code: 'admin_users' },
      auth: {
        userId: 'u4',
      },
    };

    const res = createMockResponse();
    await handler(req, res);

    expect(prisma.rolePermission.findFirst).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ allowed: false });
  });
});

describe('wave 1.6 RED-first: admin analytics tenant scoping', () => {
  it('scopes /stats queries to resolved tenant', async () => {
    vi.mocked(prisma.patient.count).mockResolvedValue(10 as never);
    vi.mocked(prisma.patientSession.count)
      .mockResolvedValueOnce(20 as never)
      .mockResolvedValueOnce(5 as never)
      .mockResolvedValueOnce(15 as never)
      .mockResolvedValueOnce(3 as never);
    vi.mocked(prisma.triageEvent.count).mockResolvedValue(2 as never);
    vi.mocked(prisma.arztUser.count).mockResolvedValue(4 as never);
    vi.mocked(prisma.patientSession.findMany).mockResolvedValue([] as never);

    const handlers = getRouteHandlers('/stats', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.patient.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a' } });
    expect(prisma.arztUser.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-a' } });
    expect(prisma.patientSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-a' }),
    }));

    const triageCountArg = vi.mocked(prisma.triageEvent.count).mock.calls[0]?.[0] as {
      where?: { session?: { tenantId?: string } };
    };
    expect(triageCountArg.where?.session?.tenantId).toBe('tenant-a');
    expect(res.statusCode).toBe(200);
  });

  it('fails closed for /stats without tenant context', async () => {
    const handlers = getRouteHandlers('/stats', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(prisma.patient.count).not.toHaveBeenCalled();
    expect(prisma.patientSession.count).not.toHaveBeenCalled();
    expect(prisma.triageEvent.count).not.toHaveBeenCalled();
    expect(prisma.arztUser.count).not.toHaveBeenCalled();
  });

  it('scopes /sessions/timeline query to resolved tenant', async () => {
    vi.mocked(prisma.patientSession.findMany).mockResolvedValue([] as never);

    const handlers = getRouteHandlers('/sessions/timeline', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { days: '30' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const callArg = vi.mocked(prisma.patientSession.findMany).mock.calls[0]?.[0] as {
      where?: { tenantId?: string };
    };
    expect(callArg.where?.tenantId).toBe('tenant-a');
    expect(res.statusCode).toBe(200);
  });

  it('scopes /analytics/services groupBy query to resolved tenant', async () => {
    vi.mocked(prisma.patientSession.groupBy as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([] as never);

    const handlers = getRouteHandlers('/analytics/services', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const groupByMock = prisma.patientSession.groupBy as unknown as ReturnType<typeof vi.fn>;
    const callArg = groupByMock.mock.calls[0]?.[0] as { where?: { tenantId?: string } };
    expect(callArg.where?.tenantId).toBe('tenant-a');
    expect(res.statusCode).toBe(200);
  });

  it('scopes /analytics/triage query through session tenant', async () => {
    vi.mocked(prisma.triageEvent.findMany).mockResolvedValue([] as never);

    const handlers = getRouteHandlers('/analytics/triage', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { days: '14' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const callArg = vi.mocked(prisma.triageEvent.findMany).mock.calls[0]?.[0] as {
      where?: { session?: { tenantId?: string } };
    };
    expect(callArg.where?.session?.tenantId).toBe('tenant-a');
    expect(res.statusCode).toBe(200);
  });
});

describe('wave 1.3 RED-first: audit resource query redaction', () => {
  it('redacts sensitive query values before using search in resource filter', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: {
        page: '1',
        limit: '25',
        search: '/api/export/sessions/s1?token=secret123&password=hunter2&foo=bar',
      },
      tenantId: 'tenant-a',
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.auditLog.findMany).toHaveBeenCalled();
    const callArg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]?.[0] as {
      where?: {
        OR?: Array<{ resource?: { contains?: string } }>;
      };
    };
    const resourceContains = callArg.where?.OR?.find((condition) => condition.resource)?.resource?.contains;

    expect(resourceContains).toBeDefined();
    expect(resourceContains).toContain('token=[REDACTED]');
    expect(resourceContains).toContain('password=[REDACTED]');
    expect(resourceContains).not.toContain('secret123');
    expect(resourceContains).not.toContain('hunter2');
  });

  it('redacts sensitive query values in returned audit entry resources', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: 'audit-1',
        action: 'EXPORT_CSV',
        resource: '/sessions/s1/export/csv?token=abc123&secret=letmein',
        userId: 'arzt-1',
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
      },
    ] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(1 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { page: '1', limit: '25' },
      tenantId: 'tenant-a',
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as {
      entries?: Array<{ resource?: string }>;
    };
    const resource = body.entries?.[0]?.resource;

    expect(resource).toBeDefined();
    expect(resource).toContain('token=[REDACTED]');
    expect(resource).toContain('secret=[REDACTED]');
    expect(resource).not.toContain('abc123');
    expect(resource).not.toContain('letmein');
  });
});

describe('wave 1.4 RED-first: audit tenant scope guards (extended conflict matrix)', () => {
  it('rejects conflicting tenant override against request tenant context', async () => {
    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: {
        page: '1',
        limit: '25',
        tenantId: 'tenant-b',
      },
      tenantId: 'tenant-a',
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.count).not.toHaveBeenCalled();
  });

  it('enforces tenantId on audit findMany/count where clauses', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { page: '1', limit: '25' },
      tenantId: 'tenant-a',
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const findManyArg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]?.[0] as { where?: Record<string, unknown> };
    const countArg = vi.mocked(prisma.auditLog.count).mock.calls[0]?.[0] as { where?: Record<string, unknown> };

    expect(findManyArg.where?.tenantId).toBe('tenant-a');
    expect(countArg.where?.tenantId).toBe('tenant-a');
  });

  it('keeps tenant scope top-level when search filter is present', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: {
        page: '1',
        limit: '25',
        search: 'export',
      },
      tenantId: 'tenant-a',
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const findManyArg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]?.[0] as {
      where?: { tenantId?: string; OR?: Array<Record<string, unknown>> };
    };

    expect(findManyArg.where?.tenantId).toBe('tenant-a');
    const orClauses = findManyArg.where?.OR || [];
    expect(orClauses.every((entry) => !('tenantId' in entry))).toBe(true);
  });
});

describe('wave 1.8 RED-first: admin role-permission route hardening', () => {
  it('registers admin_users permission middleware on permissions administration routes', () => {
    expect(getPermissionCodes('/permissions', 'get')).toContain('admin_users');
    expect(getPermissionCodes('/roles/:role/permissions', 'get')).toContain('admin_users');
    expect(getPermissionCodes('/roles/:role/permissions', 'put')).toContain('admin_users');
  });

  it('fails closed for GET /permissions without tenant context', async () => {
    const handlers = getRouteHandlers('/permissions', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(prisma.permission.findMany).not.toHaveBeenCalled();
  });

  it('fails closed for PUT /roles/:role/permissions without tenant context', async () => {
    const handlers = getRouteHandlers('/roles/:role/permissions', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { role: 'ARZT' },
      body: { permissionIds: ['perm-1'] },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects tenant mismatch for GET /roles/:role/permissions', async () => {
    const handlers = getRouteHandlers('/roles/:role/permissions', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { role: 'ARZT' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-b' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant-Konflikt',
      code: 'TENANT_SCOPE_VIOLATION',
    });
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });
});

describe('wave 1.4 RED-first: audit tenant scope guards', () => {
  it('rejects tenant mismatch between req.tenantId and req.auth.tenantId without query override', async () => {
    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { page: '1', limit: '25' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-b' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant-Konflikt',
      code: 'TENANT_SCOPE_VIOLATION',
    });
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.count).not.toHaveBeenCalled();
  });

  it('rejects query-only tenant context when request/auth tenant is missing', async () => {
    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { page: '1', limit: '25', tenantId: 'tenant-b' },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.count).not.toHaveBeenCalled();
  });

  it('rejects conflicting tenant override against auth context', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { page: '1', limit: '25', tenantId: 'tenant-b' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.count).not.toHaveBeenCalled();
  });

  it('enforces tenantId in audit-log where clauses', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { page: '1', limit: '25' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const findManyArg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]?.[0] as { where?: { tenantId?: string } };
    const countArg = vi.mocked(prisma.auditLog.count).mock.calls[0]?.[0] as { where?: { tenantId?: string } };

    expect(findManyArg.where?.tenantId).toBe('tenant-a');
    expect(countArg.where?.tenantId).toBe('tenant-a');
  });

  it('prevents tenant bypass through search filters by keeping tenant scope outside OR search conditions', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: {
        page: '1',
        limit: '25',
        search: 'tenant-b',
      },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const findManyArg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]?.[0] as {
      where?: {
        tenantId?: string;
        OR?: Array<Record<string, unknown>>;
      };
    };

    expect(findManyArg.where?.tenantId).toBe('tenant-a');
    expect(findManyArg.where?.OR).toBeDefined();
    expect(findManyArg.where?.OR?.every((condition) => !('tenantId' in condition))).toBe(true);
  });

  it('allows audit query tenant when equal to resolved tenant', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { page: '1', limit: '25', tenantId: 'tenant-a' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const findManyArg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]?.[0] as { where?: { tenantId?: string } };
    const countArg = vi.mocked(prisma.auditLog.count).mock.calls[0]?.[0] as { where?: { tenantId?: string } };
    expect(findManyArg.where?.tenantId).toBe('tenant-a');
    expect(countArg.where?.tenantId).toBe('tenant-a');
  });

  it('uses auth tenant fallback for audit scope when request tenant is missing', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);

    const handlers = getRouteHandlers('/audit-log', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { page: '1', limit: '25' },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const findManyArg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]?.[0] as { where?: { tenantId?: string } };
    expect(findManyArg.where?.tenantId).toBe('tenant-a');
  });
});

describe('wave 1.6 RED-first: admin users tenant scoping', () => {
  it('enforces tenantId in /users list query', async () => {
    vi.mocked(prisma.arztUser.findMany).mockResolvedValue([] as never);

    const handlers = getRouteHandlers('/users', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const callArg = vi.mocked(prisma.arztUser.findMany).mock.calls[0]?.[0] as { where?: { tenantId?: string } };
    expect(callArg.where?.tenantId).toBe('tenant-a');
    expect(res.statusCode).toBe(200);
  });

  it('injects tenantId when creating users', async () => {
    vi.mocked(prisma.arztUser.create).mockResolvedValue({
      id: 'u-1',
      username: 'alice',
      displayName: 'Alice',
      role: 'ARZT',
      createdAt: new Date('2026-03-22T10:00:00.000Z'),
    } as never);

    const handlers = getRouteHandlers('/users', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
      body: {
        username: 'alice',
        password: 'SuperSecret123',
        displayName: 'Alice',
        role: 'ARZT',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    const callArg = vi.mocked(prisma.arztUser.create).mock.calls[0]?.[0] as {
      data?: { tenantId?: string; username?: string };
    };
    expect(callArg.data?.tenantId).toBe('tenant-a');
    expect(callArg.data?.username).toBe('alice');
    expect(res.statusCode).toBe(201);
  });

  it('ignores payload tenant injection and enforces resolved tenant on create', async () => {
    vi.mocked(prisma.arztUser.create).mockResolvedValue({
      id: 'u-2',
      username: 'bob',
      displayName: 'Bob',
      role: 'MFA',
      createdAt: new Date('2026-03-22T11:00:00.000Z'),
    } as never);

    const handlers = getRouteHandlers('/users', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
      body: {
        username: 'bob',
        password: 'AnotherSecret123',
        displayName: 'Bob',
        role: 'MFA',
        tenantId: 'tenant-b',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    const callArg = vi.mocked(prisma.arztUser.create).mock.calls[0]?.[0] as {
      data?: { tenantId?: string };
    };
    expect(callArg.data?.tenantId).toBe('tenant-a');
    expect(callArg.data?.tenantId).not.toBe('tenant-b');
    expect(res.statusCode).toBe(201);
  });

  it('rejects tenant mismatch for PUT /users/:id', async () => {
    const handlers = getRouteHandlers('/users/:id', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      body: { displayName: 'Alice Updated' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-b' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant-Konflikt',
      code: 'TENANT_SCOPE_VIOLATION',
    });
    expect(prisma.arztUser.update).not.toHaveBeenCalled();
  });

  it('fails closed for PUT /users/:id without tenant context', async () => {
    const handlers = getRouteHandlers('/users/:id', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      body: { displayName: 'Alice Updated' },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(prisma.arztUser.update).not.toHaveBeenCalled();
  });

  it('uses auth tenant fallback for PUT /users/:id scope', async () => {
    vi.mocked(prisma.arztUser.update).mockResolvedValue({
      id: 'u-1',
      username: 'alice',
      displayName: 'Alice Updated',
      role: 'ARZT',
      isActive: true,
    } as never);

    const handlers = getRouteHandlers('/users/:id', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      body: { displayName: 'Alice Updated' },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    const callArg = vi.mocked(prisma.arztUser.update).mock.calls[0]?.[0] as {
      where?: { id_tenantId?: { id?: string; tenantId?: string } };
    };
    expect(callArg.where?.id_tenantId?.id).toBe('u-1');
    expect(callArg.where?.id_tenantId?.tenantId).toBe('tenant-a');
    expect(res.statusCode).toBe(200);
  });

  it('rejects tenant mismatch for DELETE /users/:id', async () => {
    const handlers = getRouteHandlers('/users/:id', 'delete');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-b' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant-Konflikt',
      code: 'TENANT_SCOPE_VIOLATION',
    });
    expect(prisma.arztUser.update).not.toHaveBeenCalled();
  });

  it('fails closed for DELETE /users/:id without tenant context', async () => {
    const handlers = getRouteHandlers('/users/:id', 'delete');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(prisma.arztUser.update).not.toHaveBeenCalled();
  });

  it('uses auth tenant fallback for DELETE /users/:id scope', async () => {
    vi.mocked(prisma.arztUser.update).mockResolvedValue({
      id: 'u-1',
      username: 'alice',
      displayName: 'Alice',
      role: 'ARZT',
      isActive: false,
    } as never);

    const handlers = getRouteHandlers('/users/:id', 'delete');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.arztUser.update).toHaveBeenCalledWith({
      where: {
        id_tenantId: {
          id: 'u-1',
          tenantId: 'tenant-a',
        },
      },
      data: { isActive: false },
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects tenant mismatch for PUT /users/:id/permissions', async () => {
    const handlers = getRouteHandlers('/users/:id/permissions', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      body: { permissionCodes: ['admin_audit'] },
      headers: {},
      tenantId: 'tenant-a',
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-b' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Tenant-Konflikt',
      code: 'TENANT_SCOPE_VIOLATION',
    });
    expect(prisma.arztUser.update).not.toHaveBeenCalled();
  });

  it('fails closed for PUT /users/:id/permissions without tenant context', async () => {
    const handlers = getRouteHandlers('/users/:id/permissions', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      body: { permissionCodes: ['admin_audit'] },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Tenant-Kontext fehlt',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
    expect(prisma.arztUser.update).not.toHaveBeenCalled();
  });

  it('uses auth tenant fallback for PUT /users/:id/permissions scope', async () => {
    vi.mocked(prisma.arztUser.update).mockResolvedValue({
      id: 'u-1',
      username: 'alice',
      displayName: 'Alice',
      role: 'ARZT',
      isActive: true,
    } as never);

    const handlers = getRouteHandlers('/users/:id/permissions', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'u-1' },
      body: { permissionCodes: ['admin_audit'] },
      headers: {},
      auth: { userId: 'admin-1', role: 'admin', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.arztUser.update).toHaveBeenCalledWith({
      where: {
        id_tenantId: {
          id: 'u-1',
          tenantId: 'tenant-a',
        },
      },
      data: { customPermissions: JSON.stringify(['admin_audit']) },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('wave 1.7 RED-first: content mutation permission consistency', () => {
  it('registers admin_content permission middleware on content mutation routes', () => {
    const postHandlers = getRouteHandlers('/content', 'post');
    const putHandlers = getRouteHandlers('/content/:id', 'put');
    const deleteHandlers = getRouteHandlers('/content/:id', 'delete');
    const seedHandlers = getRouteHandlers('/content/seed', 'post');

    const hasPermissionCode = (handlers: unknown[], code: string) =>
      handlers.some((handler) => (handler as { __permissionCode?: string }).__permissionCode === code);

    expect(hasPermissionCode(postHandlers, 'admin_content')).toBe(true);
    expect(hasPermissionCode(putHandlers, 'admin_content')).toBe(true);
    expect(hasPermissionCode(deleteHandlers, 'admin_content')).toBe(true);
    expect(hasPermissionCode(seedHandlers, 'admin_content')).toBe(true);
  });
});

describe('wave 1.8 RED-first: role-permission guard tightening', () => {
  it('registers admin_users permission middleware on permissions administration routes', () => {
    expect(getPermissionCodes('/permissions', 'get')).toContain('admin_users');
    expect(getPermissionCodes('/roles/:role/permissions', 'get')).toContain('admin_users');
    expect(getPermissionCodes('/roles/:role/permissions', 'put')).toContain('admin_users');
  });

  it('keeps permission middleware singular and explicit on role-permission routes', () => {
    expect(getPermissionCodes('/permissions', 'get')).toEqual(['admin_users']);
    expect(getPermissionCodes('/roles/:role/permissions', 'get')).toEqual(['admin_users']);
    expect(getPermissionCodes('/roles/:role/permissions', 'put')).toEqual(['admin_users']);
  });
});

describe('wave 1.8 RED-first: duplicate audit describe consolidation safety checks', () => {
  it('keeps the wave 1.4 audit tenant-scope describe block unique after consolidation', () => {
    const source = readFileSync(new URL('./admin.test.ts', import.meta.url), 'utf8');
    const occurrences = (source.match(/describe\('wave 1\.4 RED-first: audit tenant scope guards'/g) || []).length;

    expect(occurrences).toBe(1);
  });
});

describe('wave 1.8 RED-first: middleware code-assertion robustness', () => {
  it('asserts guard order and terminal handler shape for GET /permissions', () => {
    const handlers = getRouteHandlers('/permissions', 'get');
    const permissionCodes = handlers
      .map((handler) => (handler as { __permissionCode?: string }).__permissionCode)
      .filter((code): code is string => Boolean(code));

    expect(handlers.length).toBe(3);
    expect(handlers[0]).toBe(middlewareMocks.requireRole);
    expect(permissionCodes).toEqual(['admin_users']);
    expect(handlers[handlers.length - 1]).not.toBe(middlewareMocks.requireRole);
    expect((handlers[handlers.length - 1] as { __permissionCode?: string }).__permissionCode).toBeUndefined();
  });

  it('asserts guard order and terminal handler shape for PUT /roles/:role/permissions', () => {
    const handlers = getRouteHandlers('/roles/:role/permissions', 'put');
    const permissionCodes = handlers
      .map((handler) => (handler as { __permissionCode?: string }).__permissionCode)
      .filter((code): code is string => Boolean(code));

    expect(handlers.length).toBe(3);
    expect(handlers[0]).toBe(middlewareMocks.requireRole);
    expect(permissionCodes).toEqual(['admin_users']);
    expect(handlers[handlers.length - 1]).not.toBe(middlewareMocks.requireRole);
    expect((handlers[handlers.length - 1] as { __permissionCode?: string }).__permissionCode).toBeUndefined();
  });
});
