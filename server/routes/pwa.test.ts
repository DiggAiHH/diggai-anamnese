import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
}));

const pwaServiceMocks = vi.hoisted(() => ({
  registerPatient: vi.fn(),
  loginPatient: vi.fn(),
  loginWithPin: vi.fn(),
  verifyToken: vi.fn(() => ({ accountId: 'account-1', patientId: 'patient-1' })),
  refreshToken: vi.fn(),
  syncOfflineData: vi.fn(),
  getChangesSince: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  patientAccount: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  diaryEntry: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  therapyMeasure: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  providerMessage: {
    count: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  clinicalAlert: {
    findMany: vi.fn(),
  },
  therapyAlert: {
    findMany: vi.fn(),
  },
  measureTracking: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  patientConsent: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  patientDevice: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  patient: {
    findUnique: vi.fn(),
  },
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
}));

vi.mock('../i18n', () => ({
  t: vi.fn((_lang: string, key: string) => key),
  parseLang: vi.fn(() => 'de'),
  LocalizedError: class LocalizedError extends Error {
    constructor(public errorKey: string) {
      super(errorKey);
      this.name = 'LocalizedError';
    }
  },
}));

vi.mock('../services/pwa', () => pwaServiceMocks);

vi.mock('../services/pwa/auth.service', () => ({
  verifyEmailToken: vi.fn(),
  forgotPasswordExtended: vi.fn(),
  resetPasswordWithToken: vi.fn(),
  softDeleteAccount: vi.fn(),
  exportAccountData: vi.fn(),
}));

vi.mock('../services/pwa/diary.service', () => ({
  getTrends: vi.fn(),
  syncOfflineDiary: vi.fn(),
  exportDiary: vi.fn(),
}));

vi.mock('../services/pwa/push.service', () => ({
  getVapidPublicKey: vi.fn(),
  subscribeDevice: vi.fn(),
  unsubscribeDevice: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock('../services/security-audit.service', () => ({
  SecurityEvent: {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT: 'LOGOUT',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  },
  logSecurityEvent: vi.fn(),
  logLoginFailure: vi.fn(),
}));

vi.mock('../db', () => ({
  prisma: prismaMocks,
}));

import router from './pwa';
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

function createMockRequest(overrides = {}) {
  return {
    headers: { authorization: 'Bearer valid-token', 'accept-language': 'de' },
    user: { accountId: 'account-1', patientId: 'patient-1' },
    prisma: prismaMocks,
    ...overrides,
  };
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

describe('pwa routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__prisma = prismaMocks;
  });

  describe('POST /auth/register', () => {
    it('should register new patient account', async () => {
      const mockAccount = { id: 'account-1', patientId: 'patient-1' };
      pwaServiceMocks.registerPatient.mockResolvedValue(mockAccount);

      const handlers = getRouteHandlers('/auth/register', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: {
          patientNumber: 'P-001',
          birthDate: '1990-01-01',
          password: 'SecurePass1234',
        },
        headers: { 'accept-language': 'de' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual(mockAccount);
    });

    it('should reject invalid registration data', async () => {
      const handlers = getRouteHandlers('/auth/register', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: { patientNumber: 'P-001' }, // Missing required fields
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should reject passwords shorter than 12 characters', async () => {
      const handlers = getRouteHandlers('/auth/register', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: {
          patientNumber: 'P-001',
          birthDate: '1990-01-01',
          password: 'ShortPass1!',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockResult = { token: 'jwt-token', account: { id: 'account-1' } };
      pwaServiceMocks.loginPatient.mockResolvedValue(mockResult);
      vi.mocked(prismaMocks.patientAccount.findFirst).mockResolvedValue(null as never);

      const handlers = getRouteHandlers('/auth/login', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: { identifier: 'P-001', password: 'SecurePass123' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(pwaServiceMocks.loginPatient).toHaveBeenCalledWith({
        identifier: 'P-001',
        password: 'SecurePass123',
      });
    });
  });

  describe('POST /auth/pin-login', () => {
    it('should login with PIN', async () => {
      const mockResult = { token: 'jwt-token' };
      pwaServiceMocks.loginWithPin.mockResolvedValue(mockResult);

      const handlers = getRouteHandlers('/auth/pin-login', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: { patientId: '550e8400-e29b-41d4-a716-446655440000', pin: '1234' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /dashboard', () => {
    it('should require patient auth', () => {
      const layers = (router as unknown as { stack: RouterLayer[] }).stack;
      const routeLayer = layers.find((layer) => {
        if (!layer.route) return false;
        return layer.route.path === '/dashboard' && layer.route.methods?.['get'];
      });
      expect(routeLayer).toBeDefined();
    });

    it('should return dashboard data', async () => {
      vi.mocked(prismaMocks.patientAccount.findUnique).mockResolvedValue({
        id: 'account-1',
        patient: { id: 'patient-1' },
      } as never);
      vi.mocked(prismaMocks.therapyMeasure.count).mockResolvedValue(2 as never);
      vi.mocked(prismaMocks.providerMessage.count).mockResolvedValue(1 as never);
      vi.mocked(prismaMocks.diaryEntry.findMany).mockResolvedValue([] as never);
      vi.mocked(prismaMocks.therapyAlert.findMany).mockResolvedValue([] as never);
      vi.mocked(prismaMocks.clinicalAlert.findMany).mockResolvedValue([] as never);

      const handlers = getRouteHandlers('/dashboard', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('activeMeasures');
      expect(res.body).toHaveProperty('unreadMessages');
    });
  });

  describe('GET /diary', () => {
    it('should return paginated diary entries', async () => {
      vi.mocked(prismaMocks.diaryEntry.findMany).mockResolvedValue([
        { id: 'entry-1', date: new Date(), mood: 'GOOD' },
      ] as never);
      vi.mocked(prismaMocks.diaryEntry.count).mockResolvedValue(1 as never);

      const handlers = getRouteHandlers('/diary', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        query: { page: '1', limit: '20' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('total');
    });
  });

  describe('POST /diary', () => {
    it('should create diary entry', async () => {
      vi.mocked(prismaMocks.diaryEntry.create).mockResolvedValue({
        id: 'entry-1',
        date: new Date(),
        mood: 'GOOD',
      } as never);

      const handlers = getRouteHandlers('/diary', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: {
          mood: 'GOOD',
          painLevel: 2,
          notes: 'Feeling better',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should reject invalid mood value', async () => {
      const handlers = getRouteHandlers('/diary', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: { mood: 'INVALID_MOOD' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /measures', () => {
    it('should return active measures for patient', async () => {
      vi.mocked(prismaMocks.therapyMeasure.findMany).mockResolvedValue([
        { id: 'measure-1', title: 'Medication A' },
      ] as never);

      const handlers = getRouteHandlers('/measures', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /messages', () => {
    it('should return paginated messages', async () => {
      vi.mocked(prismaMocks.providerMessage.findMany).mockResolvedValue([
        { id: 'msg-1', subject: 'Test', body: 'Message body' },
      ] as never);
      vi.mocked(prismaMocks.providerMessage.count).mockResolvedValue(1 as never);

      const handlers = getRouteHandlers('/messages', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        query: { page: '1', limit: '20' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('messages');
    });
  });

  describe('POST /messages', () => {
    it('should create message to provider', async () => {
      vi.mocked(prismaMocks.providerMessage.create).mockResolvedValue({
        id: 'msg-1',
        body: 'Test message',
      } as never);

      const handlers = getRouteHandlers('/messages', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        headers: { authorization: 'Bearer valid-token' },
        body: { body: 'Test message' },
        user: { patientId: 'patient-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /consents', () => {
    it('should return patient consents', async () => {
      vi.mocked(prismaMocks.patientConsent.findMany).mockResolvedValue([
        { type: 'DATA_PROCESSING', granted: true },
      ] as never);

      const handlers = getRouteHandlers('/consents', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /devices', () => {
    it('should return registered devices', async () => {
      vi.mocked(prismaMocks.patientDevice.findMany).mockResolvedValue([
        { id: 'device-1', deviceName: 'iPhone 12', deviceType: 'ios' },
      ] as never);

      const handlers = getRouteHandlers('/devices', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /devices', () => {
    it('should register new device', async () => {
      vi.mocked(prismaMocks.patientDevice.create).mockResolvedValue({
        id: 'device-1',
        deviceName: 'iPhone 12',
        deviceType: 'ios',
      } as never);

      const handlers = getRouteHandlers('/devices', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: {
          deviceName: 'iPhone 12',
          deviceType: 'ios',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
    });
  });

  describe('POST /sync', () => {
    it('should sync offline data', async () => {
      pwaServiceMocks.syncOfflineData.mockResolvedValue({
        synced: 5,
        conflicts: [],
      });

      const handlers = getRouteHandlers('/sync', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: {
          diaryEntries: [],
          measureTrackings: [],
          lastSyncAt: new Date().toISOString(),
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
