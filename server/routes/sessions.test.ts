import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  createToken: vi.fn(() => 'token'),
  setTokenCookie: vi.fn(),
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
  requireSessionOwner: vi.fn((_req, _res, next) => next()),
}));

const episodeServiceMocks = vi.hoisted(() => ({
  ensureSessionStoredInEpisode: vi.fn(() => Promise.resolve()),
}));

vi.mock('../middleware/auth', () => ({
  createToken: middlewareMocks.createToken,
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
  requireSessionOwner: middlewareMocks.requireSessionOwner,
  setTokenCookie: middlewareMocks.setTokenCookie,
}));

vi.mock('../db', () => ({
  prisma: {
    patient: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    patientSession: {
      create: vi.fn(),
      update: vi.fn(),
    },
    answer: {},
    triageEvent: {},
    accidentDetails: {},
    patientMedication: {},
    patientSurgery: {},
  },
}));

vi.mock('../services/encryption', () => ({
  hashEmail: vi.fn(() => 'hash'),
  encrypt: vi.fn((v: string) => v),
}));

vi.mock('../services/episode.service', () => ({
  ensureSessionStoredInEpisode: episodeServiceMocks.ensureSessionStoredInEpisode,
}));

vi.mock('../i18n', () => ({
  t: vi.fn((_lang: string, key: string) => key),
  parseLang: vi.fn(() => 'de'),
  LocalizedError: class LocalizedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'LocalizedError';
    }
  },
}));

vi.mock('../config', () => ({
  config: {
    jwtSecret: 'test-secret',
  },
}));

import router from './sessions';
import { prisma } from '../db';

type JsonPayload = Record<string, unknown>;

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

describe('sessions route authorization hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('protects POST /qr-token with staff role authorization', () => {
    const handlers = getRouteHandlers('/qr-token', 'post');
    expect(handlers).toContain(middlewareMocks.requireAuth);
    expect(handlers).toContain(middlewareMocks.requireRole);
    expect(handlers.indexOf(middlewareMocks.requireAuth)).toBeLessThan(handlers.indexOf(middlewareMocks.requireRole));
  });

  it('protects GET /:id/accident with requireSessionOwner', () => {
    const handlers = getRouteHandlers('/:id/accident', 'get');
    expect(handlers).toContain(middlewareMocks.requireAuth);
    expect(handlers).toContain(middlewareMocks.requireSessionOwner);
    expect(handlers.indexOf(middlewareMocks.requireAuth)).toBeLessThan(handlers.indexOf(middlewareMocks.requireSessionOwner));
  });

  it('protects GET /:id/medications with requireSessionOwner', () => {
    const handlers = getRouteHandlers('/:id/medications', 'get');
    expect(handlers).toContain(middlewareMocks.requireAuth);
    expect(handlers).toContain(middlewareMocks.requireSessionOwner);
    expect(handlers.indexOf(middlewareMocks.requireAuth)).toBeLessThan(handlers.indexOf(middlewareMocks.requireSessionOwner));
  });

  it('protects GET /:id/surgeries with requireSessionOwner', () => {
    const handlers = getRouteHandlers('/:id/surgeries', 'get');
    expect(handlers).toContain(middlewareMocks.requireAuth);
    expect(handlers).toContain(middlewareMocks.requireSessionOwner);
    expect(handlers.indexOf(middlewareMocks.requireAuth)).toBeLessThan(handlers.indexOf(middlewareMocks.requireSessionOwner));
  });

  it('does not expose JWT in POST / response body (cookie-only contract)', async () => {
    middlewareMocks.createToken.mockClear();
    middlewareMocks.setTokenCookie.mockClear();
    episodeServiceMocks.ensureSessionStoredInEpisode.mockClear();
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({ id: 'p1' } as never);
    vi.mocked(prisma.patientSession.create).mockResolvedValue({
      id: 's1',
      createdAt: new Date('2026-04-15T20:58:00.000Z'),
    } as never);

    const handlers = getRouteHandlers('/', 'post');
    const createSessionHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      body: { selectedService: 'Termin / Anamnese' },
      headers: {},
      tenantId: 'tenant-public',
    };
    const res = createMockResponse();

    await createSessionHandler(req, res);

    expect(middlewareMocks.setTokenCookie).toHaveBeenCalledTimes(1);
    expect(middlewareMocks.createToken).toHaveBeenCalledWith({
      sessionId: 's1',
      tenantId: 'tenant-public',
      role: 'patient',
    });
    expect(res.statusCode).toBe(201);
    const body = res.body as JsonPayload;
    expect(body.sessionId).toBe('s1');
    expect(body).not.toHaveProperty('token');
    expect(episodeServiceMocks.ensureSessionStoredInEpisode).toHaveBeenCalledWith({
      tenantId: 'tenant-public',
      sessionId: 's1',
      selectedService: 'Termin / Anamnese',
      createdAt: new Date('2026-04-15T20:58:00.000Z'),
    });
  });

  it('stores Digital Front Door sessions in episodes automatically', async () => {
    middlewareMocks.createToken.mockClear();
    middlewareMocks.setTokenCookie.mockClear();
    episodeServiceMocks.ensureSessionStoredInEpisode.mockClear();
    process.env.JWT_SECRET = 'test-secret';

    vi.mocked(prisma.patient.create).mockResolvedValue({ id: 'p-dfd' } as never);
    vi.mocked(prisma.patientSession.create).mockResolvedValue({
      id: 's-dfd',
      createdAt: new Date('2026-04-15T20:58:00.000Z'),
    } as never);

    const handlers = getRouteHandlers('/start', 'post');
    const startHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      query: { specialty: 'general', lang: 'de' },
      tenantId: 'default',
      protocol: 'http',
      get: (name: string) => (name === 'host' ? 'localhost:5173' : undefined),
      headers: {},
    };
    const res = createMockResponse();

    await startHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(episodeServiceMocks.ensureSessionStoredInEpisode).toHaveBeenCalledWith({
      tenantId: 'default',
      sessionId: 's-dfd',
      selectedService: 'General',
      createdAt: new Date('2026-04-15T20:58:00.000Z'),
    });
  });

  it('rejects POST / without tenant context', async () => {
    const handlers = getRouteHandlers('/', 'post');
    const createSessionHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      body: { selectedService: 'Termin / Anamnese' },
      headers: {},
    };
    const res = createMockResponse();

    await createSessionHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Tenant-Kontext fehlt' });
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });

  it('rejects invalid birth dates in POST /', async () => {
    const handlers = getRouteHandlers('/', 'post');
    const createSessionHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      body: {
        selectedService: 'Termin / Anamnese',
        birthDate: 'not-a-date',
      },
      headers: {},
      tenantId: 'tenant-public',
    };
    const res = createMockResponse();

    await createSessionHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Ungültiges Geburtsdatum' });
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it('does not expose JWT in POST /refresh-token response body', async () => {
    middlewareMocks.createToken.mockClear();
    middlewareMocks.setTokenCookie.mockClear();
    const handlers = getRouteHandlers('/refresh-token', 'post');
    const refreshHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { sessionId: 's1', userId: 'u1', tenantId: 'tenant-a', role: 'patient' },
      headers: {},
    };
    const res = createMockResponse();

    await refreshHandler(req, res);

    expect(middlewareMocks.createToken).toHaveBeenCalledWith({
      sessionId: 's1',
      userId: 'u1',
      tenantId: 'tenant-a',
      role: 'patient',
    });
    expect(middlewareMocks.setTokenCookie).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    const body = res.body as JsonPayload;
    expect(body).not.toHaveProperty('token');
  });
});
