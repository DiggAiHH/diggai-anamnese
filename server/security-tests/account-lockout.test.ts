/**
 * @file account-lockout.test.ts
 * @description Integration Tests für Account Lockout nach Brute-Force-Versuchen.
 *
 * Beweist:
 * - Konto wird nach max. N Fehlversuchen gesperrt
 * - Gesperrtes Konto gibt 429 zurück
 * - Erfolgreicher Login setzt Fehlerzähler zurück
 * - Timing Attack: Fehlermeldung unterscheidet nicht zwischen "User existiert nicht" und "Passwort falsch"
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const arztFindFirst = vi.fn();
  const arztUpdate = vi.fn(async () => ({}));
  return {
    createToken: vi.fn(() => 'jwt-token'),
    setTokenCookie: vi.fn(),
    clearTokenCookie: vi.fn(),
    requireAuth: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
    requireRoleFactory: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
    blacklistToken: vi.fn(),
    bcryptCompare: vi.fn(async () => false),
    normalizeAuthRole: vi.fn((role: string) => role?.toLowerCase() ?? null),
    logSecurityEvent: vi.fn(),
    logLoginFailure: vi.fn(),
    configLockout: { accountLockoutMaxAttempts: 5, accountLockoutDurationMs: 15 * 60 * 1000, jwtCookieMaxAgeMs: 15 * 60 * 1000 },
    arztFindFirst,
    arztUpdate,
  };
});

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

vi.mock('../services/security-audit.service', () => ({
  SecurityEvent: {
    LOGIN_SUCCESS: 'SECURITY:LOGIN_SUCCESS',
    LOGIN_FAILED: 'SECURITY:LOGIN_FAILED',
    ACCOUNT_LOCKED: 'SECURITY:ACCOUNT_LOCKED',
    LOGOUT: 'SECURITY:LOGOUT',
  },
  logSecurityEvent: mocks.logSecurityEvent,
  logLoginFailure: mocks.logLoginFailure,
}));

vi.mock('../config', () => ({
  config: {
    ...mocks.configLockout,
    jwtSecret: 'test-secret-minimum-32-chars-long!!',
    jwtExpiresIn: '15m',
    nodeEnv: 'test',
  },
}));

vi.mock('../db', () => ({
  prisma: {
    arztUser: {
      findFirst: mocks.arztFindFirst,
      update: mocks.arztUpdate,
    },
    patientSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    medicalAtom: { findMany: vi.fn() },
    answer: { findMany: vi.fn() },
    triageEvent: { findMany: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    chatMessage: { create: vi.fn() },
    refreshToken: { create: vi.fn() },
  },
}));

vi.mock('../services/ai/ai-engine.service', () => ({
  aiEngine: { summarizeSession: vi.fn() },
}));
vi.mock('../services/encryption', () => ({
  decrypt: vi.fn((v: string) => v),
  isPIIAtom: vi.fn(() => false),
}));
vi.mock('../socket', () => ({
  emitPatientMessage: vi.fn(),
  emitSessionComplete: vi.fn(),
}));

import router from '../routes/arzt';

// Shorthand aliases
const arztFindFirstMock = mocks.arztFindFirst;
const arztUpdateMock = mocks.arztUpdate;

// ─── Helper ──────────────────────────────────────────────────

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getLoginHandler() {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const routeLayer = layers.find(l => l.route?.path === '/login' && l.route?.methods?.post);
  expect(routeLayer).toBeDefined();
  const handlers = routeLayer!.route!.stack.map(s => s.handle);
  return handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;
}

function mockRes() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    cookies: {} as Record<string, unknown>,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    cookie(name: string, value: unknown) { this.cookies[name] = value; return this; },
    clearCookie() { return this; },
  };
}

function baseArzt(overrides = {}) {
  return {
    id: 'user-1',
    username: 'dr.test',
    displayName: 'Dr. Test',
    passwordHash: '$2b$12$hash',
    role: 'ARZT',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    loginCount: 0,
    ...overrides,
  };
}

/** Minimaler Request-Mock mit `headers` für arzt.ts Handler */
function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 't1',
    headers: {},
    socket: {},
    body: { username: 'dr.test', password: 'TestPass#2024!' },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('Account Lockout — Brute-Force Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bcryptCompare.mockResolvedValue(false); // Default: wrong password
  });

  it('allows login with correct credentials', async () => {
    mocks.bcryptCompare.mockResolvedValue(true);
    arztFindFirstMock.mockResolvedValue(baseArzt());
    const handler = getLoginHandler();
    const res = mockRes();
    await handler(mockReq({ body: { username: 'dr.test', password: 'Correct#Pass123' } }), res);
    expect(res.statusCode).toBe(200);
    expect(arztUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SECURITY:LOGIN_SUCCESS' }),
    );
  });

  it('increments failedLoginAttempts on wrong password', async () => {
    arztFindFirstMock.mockResolvedValue(baseArzt({ failedLoginAttempts: 2 }));
    const handler = getLoginHandler();
    const res = mockRes();
    await handler(mockReq({ body: { username: 'dr.test', password: 'Wrong' } }), res);
    expect(res.statusCode).toBe(401);
    expect(arztUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLoginAttempts: 3 }),
      }),
    );
  });

  it('locks account when failedLoginAttempts reaches max (5)', async () => {
    arztFindFirstMock.mockResolvedValue(baseArzt({ failedLoginAttempts: 4 }));
    const handler = getLoginHandler();
    const res = mockRes();
    await handler(mockReq({ body: { username: 'dr.test', password: 'Wrong' } }), res);
    expect(res.statusCode).toBe(401);
    expect(arztUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      }),
    );
    // Lockout-Event wurde geloggt
    expect(mocks.logLoginFailure).toHaveBeenCalledWith(
      expect.objectContaining({ accountLocked: true }),
    );
  });

  it('rejects login with 429 when account is locked', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    arztFindFirstMock.mockResolvedValue(baseArzt({
      failedLoginAttempts: 5,
      lockedUntil: futureDate,
    }));
    const handler = getLoginHandler();
    const res = mockRes();
    await handler(mockReq({ body: { username: 'dr.test', password: 'Any' } }), res);
    expect(res.statusCode).toBe(429);
    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('retryAfter');
    expect(mocks.createToken).not.toHaveBeenCalled();
    expect(mocks.setTokenCookie).not.toHaveBeenCalled();
  });

  it('resets failedLoginAttempts to 0 on successful login', async () => {
    mocks.bcryptCompare.mockResolvedValue(true);
    arztFindFirstMock.mockResolvedValue(baseArzt({ failedLoginAttempts: 3 }));
    const handler = getLoginHandler();
    const res = mockRes();
    await handler(mockReq({ body: { username: 'dr.test', password: 'Correct#Pass123' } }), res);
    expect(res.statusCode).toBe(200);
    expect(arztUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: expect.any(Date),
        }),
      }),
    );
  });

  it('uses same error message for wrong user and wrong password (anti-enumeration)', async () => {
    // User not found
    arztFindFirstMock.mockResolvedValue(null);
    const handler = getLoginHandler();
    const res1 = mockRes();
    await handler(mockReq({ body: { username: 'nonexistent', password: 'Any' } }), res1);

    // Wrong password
    arztFindFirstMock.mockResolvedValue(baseArzt());
    mocks.bcryptCompare.mockResolvedValue(false);
    const res2 = mockRes();
    await handler(mockReq({ body: { username: 'dr.test', password: 'WrongPass123!' } }), res2);

    expect(res1.statusCode).toBe(401);
    expect(res2.statusCode).toBe(401);
    // Beide müssen exakt dieselbe Fehlermeldung zurückgeben
    expect((res1.body as Record<string, string>).error)
      .toBe((res2.body as Record<string, string>).error);
  });

  it('does not issue token when account is inactive', async () => {
    arztFindFirstMock.mockResolvedValue(baseArzt({ isActive: false }));
    const handler = getLoginHandler();
    const res = mockRes();
    await handler(mockReq({ body: { username: 'dr.test', password: 'Correct' } }), res);
    expect(res.statusCode).toBe(401);
    expect(mocks.createToken).not.toHaveBeenCalled();
  });
});
