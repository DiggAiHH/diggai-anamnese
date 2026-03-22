import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
}));

vi.mock('../db', () => ({
  prisma: {
    patientSession: {
      findUnique: vi.fn(),
    },
    medicalAtom: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../services/encryption', () => ({
  decrypt: vi.fn((value: string) => value),
  isPIIAtom: vi.fn(() => false),
}));

import router from './export';
import { prisma } from '../db';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'get') {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const routeLayer = layers.find((layer) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods?.[method];
  });

  expect(routeLayer).toBeDefined();
  return routeLayer!.route!.stack.map((s) => s.handle);
}

function createMockResponse() {
  const headers = new Map<string, string>();
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers.set(name.toLowerCase(), value);
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
}

describe('export route query-token hardening', () => {
  const guardedRoutes = [
    '/sessions/:id/export/csv',
    '/sessions/:id/export/pdf',
    '/sessions/:id/export/json',
  ] as const;

  function getQueryGuard(path: (typeof guardedRoutes)[number]) {
    const handlers = getRouteHandlers(path, 'get');
    return handlers.find((handler) => handler !== middlewareMocks.requireAuth && handler !== middlewareMocks.requireRole) as
      | ((req: unknown, res: unknown, next: () => void) => unknown)
      | undefined;
  }

  it('protects CSV export with staff auth chain', () => {
    const handlers = getRouteHandlers('/sessions/:id/export/csv', 'get');
    expect(handlers).toContain(middlewareMocks.requireAuth);
    expect(handlers).toContain(middlewareMocks.requireRole);
    expect(middlewareMocks.requireRoleFactory).toHaveBeenCalledWith('arzt', 'admin', 'mfa');
  });

  it.each(guardedRoutes)('rejects token query parameter before auth middleware on %s', async (path) => {
    const queryGuard = getQueryGuard(path);
    expect(queryGuard).toBeDefined();

    let nextCalled = false;
    const req = { query: { token: 'legacy-jwt' } };
    const res = createMockResponse();

    await queryGuard!(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Token query parameter is not allowed' });
  });

  it('rejects token query parameter array variant', async () => {
    const queryGuard = getQueryGuard('/sessions/:id/export/csv');
    expect(queryGuard).toBeDefined();

    let nextCalled = false;
    const req = { query: { token: ['jwt1', 'jwt2'] } };
    const res = createMockResponse();

    await queryGuard!(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  it('sanitizes CSV triage message formula payloads to prevent spreadsheet execution', async () => {
    vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      encryptedName: 'Max Mustermann',
      gender: 'M',
      birthDate: new Date('1990-01-01'),
      insuranceType: 'GKV',
      selectedService: 'AKUT',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-22T10:00:00.000Z'),
      answers: [],
      triageEvents: [{
        level: 'CRITICAL',
        message: '=HYPERLINK("http://evil")',
        atomId: 'a1',
        createdAt: new Date('2026-03-22T10:05:00.000Z'),
      }],
    } as never);
    vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const handlers = getRouteHandlers('/sessions/:id/export/csv', 'get');
    const csvHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 's1' },
      auth: { userId: 'u1', role: 'arzt', tenantId: 'tenant-a' },
      query: {},
    };
    const res = createMockResponse();

    await csvHandler(req, res);

    expect(res.statusCode).toBe(200);
    const body = String(res.body);
    expect(body).toContain("'=HYPERLINK");
  });

  it('sanitizes CSV triage formula payloads with leading whitespace', async () => {
    vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      encryptedName: 'Max Mustermann',
      gender: 'M',
      birthDate: new Date('1990-01-01'),
      insuranceType: 'GKV',
      selectedService: 'AKUT',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-22T10:00:00.000Z'),
      answers: [],
      triageEvents: [{
        level: 'CRITICAL',
        message: '   =SUM(1+1)',
        atomId: 'a1',
        createdAt: new Date('2026-03-22T10:05:00.000Z'),
      }],
    } as never);
    vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const handlers = getRouteHandlers('/sessions/:id/export/csv', 'get');
    const csvHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 's1' },
      auth: { userId: 'u1', role: 'arzt', tenantId: 'tenant-a' },
      query: {},
    };
    const res = createMockResponse();

    await csvHandler(req, res);

    expect(res.statusCode).toBe(200);
    const body = String(res.body);
    expect(body).toContain("'   =SUM(1+1)");
  });

  it('uses a safe Content-Disposition filename without CRLF injection vectors', async () => {
    vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      encryptedName: 'evil"\r\nX-Injected: 1',
      gender: 'M',
      birthDate: null,
      insuranceType: null,
      selectedService: 'AKUT',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-22T10:00:00.000Z'),
      answers: [],
      triageEvents: [],
    } as never);
    vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const handlers = getRouteHandlers('/sessions/:id/export/csv', 'get');
    const csvHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 's1' },
      auth: { userId: 'u1', role: 'arzt', tenantId: 'tenant-a' },
      query: {},
    };
    const res = createMockResponse();

    await csvHandler(req, res);

    const contentDisposition = res.headers.get('content-disposition');
    expect(contentDisposition).toBeDefined();
    expect(contentDisposition).not.toContain('\r');
    expect(contentDisposition).not.toContain('\n');
    expect(contentDisposition).not.toContain('; filename="Anamnese_evil"');
  });

  it('does not write patientName in export audit metadata', async () => {
    vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
      id: 's1',
      tenantId: 'tenant-a',
      encryptedName: 'Max Mustermann',
      gender: 'M',
      birthDate: null,
      insuranceType: null,
      selectedService: 'AKUT',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-22T10:00:00.000Z'),
      answers: [],
      triageEvents: [],
    } as never);
    vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const handlers = getRouteHandlers('/sessions/:id/export/csv', 'get');
    const csvHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 's1' },
      auth: { userId: 'u1', role: 'arzt', tenantId: 'tenant-a' },
      query: {},
    };
    const res = createMockResponse();

    await csvHandler(req, res);

    expect(prisma.auditLog.create).toHaveBeenCalled();
    const firstCall = vi.mocked(prisma.auditLog.create).mock.calls[0];
    const metadataRaw = firstCall?.[0]?.data?.metadata;
    const metadata = typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : metadataRaw;
    expect(metadata).not.toHaveProperty('patientName');
    expect(metadata).toMatchObject({ format: 'csv', sessionId: 's1' });
  });
});

describe('wave 1.3 RED-first: export classification and scope guard', () => {
  beforeEach(() => {
    vi.mocked(prisma.patientSession.findUnique).mockReset();
    vi.mocked(prisma.medicalAtom.findMany).mockReset();
    vi.mocked(prisma.auditLog.create).mockReset();
  });

  function buildSession(overrides: Record<string, unknown> = {}) {
    return {
      id: 's-wave13',
      tenantId: 'tenant-a',
      encryptedName: 'Max Mustermann',
      gender: 'M',
      birthDate: new Date('1990-01-01'),
      insuranceType: 'GKV',
      selectedService: 'AKUT',
      status: 'ACTIVE',
      createdAt: new Date('2026-03-22T10:00:00.000Z'),
      answers: [],
      triageEvents: [],
      assignedArztId: 'arzt-1',
      ...overrides,
    };
  }

  it('classifies missing export session as HTTP 404 (not generic 500)', async () => {
    vi.mocked(prisma.patientSession.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue([] as never);

    const handlers = getRouteHandlers('/sessions/:id/export/csv', 'get');
    const csvHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 'missing-session-id' },
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-a' },
      query: {},
    };
    const res = createMockResponse();

    await csvHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: 'Session nicht gefunden',
      code: 'EXPORT_SESSION_NOT_FOUND',
    });
  });

  it('denies export when session belongs to another tenant (cross-tenant scope guard)', async () => {
    vi.mocked(prisma.patientSession.findUnique).mockResolvedValue(
      buildSession({ tenantId: 'tenant-b', assignedArztId: 'arzt-1' }) as never,
    );
    vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const handlers = getRouteHandlers('/sessions/:id/export/csv', 'get');
    const csvHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 's-wave13' },
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-a' },
      query: {},
    };
    const res = createMockResponse();

    await csvHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Kein Zugriff auf diese Sitzung',
      code: 'EXPORT_SCOPE_VIOLATION',
    });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('denies arzt export for foreign assigned session in same tenant', async () => {
    vi.mocked(prisma.patientSession.findUnique).mockResolvedValue(
      buildSession({ tenantId: 'tenant-a', assignedArztId: 'arzt-2' }) as never,
    );
    vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const handlers = getRouteHandlers('/sessions/:id/export/csv', 'get');
    const csvHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { id: 's-wave13' },
      auth: { userId: 'arzt-1', role: 'arzt', tenantId: 'tenant-a' },
      query: {},
    };
    const res = createMockResponse();

    await csvHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Kein Zugriff auf diese Sitzung',
      code: 'EXPORT_SCOPE_VIOLATION',
    });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
