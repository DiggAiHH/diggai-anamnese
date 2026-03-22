import { describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  createToken: vi.fn(() => 'token'),
  setTokenCookie: vi.fn(),
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
  requireSessionOwner: vi.fn((_req, _res, next) => next()),
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
    patientSession: {
      create: vi.fn(),
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

describe('sessions route authorization hardening', () => {
  it('protects POST /qr-token with staff role authorization', () => {
    const handlers = getRouteHandlers('/qr-token', 'post');
    expect(handlers).toContain(middlewareMocks.requireAuth);
    expect(handlers).toContain(middlewareMocks.requireRole);
    expect(handlers.indexOf(middlewareMocks.requireAuth)).toBeLessThan(handlers.indexOf(middlewareMocks.requireRole));
    expect(middlewareMocks.requireRoleFactory).toHaveBeenCalledWith('arzt', 'mfa', 'admin');
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
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({ id: 'p1' } as never);
    vi.mocked(prisma.patientSession.create).mockResolvedValue({ id: 's1' } as never);

    const handlers = getRouteHandlers('/', 'post');
    const createSessionHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      body: { selectedService: 'Termin / Anamnese' },
      headers: {},
    };
    const res = createMockResponse();

    await createSessionHandler(req, res);

    expect(middlewareMocks.setTokenCookie).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(201);
    const body = res.body as JsonPayload;
    expect(body.sessionId).toBe('s1');
    expect(body).not.toHaveProperty('token');
  });

  it('does not expose JWT in POST /refresh-token response body', async () => {
    middlewareMocks.createToken.mockClear();
    middlewareMocks.setTokenCookie.mockClear();
    const handlers = getRouteHandlers('/refresh-token', 'post');
    const refreshHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { sessionId: 's1', userId: 'u1', role: 'patient' },
      headers: {},
    };
    const res = createMockResponse();

    await refreshHandler(req, res);

    expect(middlewareMocks.createToken).toHaveBeenCalledTimes(1);
    expect(middlewareMocks.setTokenCookie).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    const body = res.body as JsonPayload;
    expect(body).not.toHaveProperty('token');
  });
});
