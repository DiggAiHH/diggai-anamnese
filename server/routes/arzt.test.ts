import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createToken: vi.fn(() => 'jwt-token'),
  setTokenCookie: vi.fn(),
  clearTokenCookie: vi.fn(),
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => mocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
  blacklistToken: vi.fn(),
  bcryptCompare: vi.fn(async () => true),
  normalizeAuthRole: vi.fn((role: string) => role.toLowerCase()),
}));

vi.mock('../middleware/auth', () => ({
  createToken: mocks.createToken,
  setTokenCookie: mocks.setTokenCookie,
  clearTokenCookie: mocks.clearTokenCookie,
  requireAuth: mocks.requireAuth,
  requireRole: mocks.requireRoleFactory,
  blacklistToken: mocks.blacklistToken,
  normalizeAuthRole: mocks.normalizeAuthRole,
}));

vi.mock('bcryptjs', () => ({
  default: {},
  compare: mocks.bcryptCompare,
}));

vi.mock('../services/auth/refresh-token.service', () => ({
  createTokenPair: vi.fn(() =>
    Promise.resolve({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-token',
      expiresAt: new Date('2026-04-28T20:00:00.000Z'),
    })
  ),
}));

vi.mock('../db', () => ({
  prisma: {
    arztUser: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    patientSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    medicalAtom: {
      findMany: vi.fn(),
    },
    answer: {
      findMany: vi.fn(),
    },
    triageEvent: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../services/ai/ai-engine.service', () => ({
  aiEngine: {
    summarizeSession: vi.fn(),
  },
}));

vi.mock('../services/encryption', () => ({
  decrypt: vi.fn((v: string) => v),
  isPIIAtom: vi.fn(() => false),
}));

vi.mock('../socket', () => ({
  emitPatientMessage: vi.fn(),
  emitSessionComplete: vi.fn(),
}));

import router from './arzt';
import { prisma } from '../db';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'post' | 'get' | 'put') {
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

describe('arzt auth hardening', () => {
  beforeEach(() => {
    mocks.createToken.mockClear();
    mocks.setTokenCookie.mockClear();
    mocks.bcryptCompare.mockClear();
    vi.mocked(prisma.arztUser.findFirst).mockReset();
  });

  it('does not expose JWT in POST /login response body (cookie-only contract)', async () => {
    vi.mocked(prisma.arztUser.findFirst).mockResolvedValue({
      id: 'u1',
      username: 'dr.klaproth',
      displayName: 'Dr. Klapproth',
      passwordHash: 'hash',
      role: 'ARZT',
    } as never);

    const handlers = getRouteHandlers('/login', 'post');
    const loginHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-a',
      headers: {},
      body: {
        username: 'dr.klaproth',
        password: 'secret123',
      },
    };

    const res = createMockResponse();
    await loginHandler(req, res);

    expect(mocks.setTokenCookie).toHaveBeenCalledTimes(1);
    expect(prisma.arztUser.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a',
        username: 'dr.klaproth',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user).toMatchObject({ role: 'arzt' });
  });

  it('rejects inactive user login with 401 and without token/cookie issuance', async () => {
    vi.mocked(prisma.arztUser.findFirst).mockResolvedValue({
      id: 'u1',
      username: 'dr.klaproth',
      displayName: 'Dr. Klapproth',
      passwordHash: 'hash',
      role: 'ARZT',
      isActive: false,
    } as never);

    const handlers = getRouteHandlers('/login', 'post');
    const loginHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-a',
      headers: {},
      body: {
        username: 'dr.klaproth',
        password: 'secret123',
      },
    };

    const res = createMockResponse();
    await loginHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(mocks.setTokenCookie).not.toHaveBeenCalled();
  });

  it('returns 400 for schema-invalid login payload', async () => {
    const handlers = getRouteHandlers('/login', 'post');
    const loginHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-a',
      headers: {},
      body: {
        username: 'dr.klaproth',
      },
    };

    const res = createMockResponse();
    await loginHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(mocks.setTokenCookie).not.toHaveBeenCalled();
  });
});
