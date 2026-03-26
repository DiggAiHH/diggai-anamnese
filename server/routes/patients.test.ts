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

vi.mock('../services/encryption', () => ({
  hashEmail: vi.fn((v: string) => `hash-${v}`),
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(() => Promise.resolve(true)),
  hash: vi.fn(() => Promise.resolve('bcrypt-hash')),
}));

// Valid UUID generator for tests
const validUUID = (seed: string): string => {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pad = (n: number, len: number) => n.toString(16).padStart(len, '0');
  return `${pad(hash, 8)}-${pad(hash >> 8, 4)}-4${pad(hash >> 12, 3)}-${pad((hash >> 16) & 0x3f | 0x80, 2)}${pad(hash >> 24, 2)}-${pad(hash, 12)}`;
};

vi.mock('../db', () => ({
  prisma: {
    patient: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    patientSession: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import router from './patients';
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

describe('patients routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /identify', () => {
    it('should find patient by birthDate and insuranceNumber', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue({
        id: validUUID('patient-1'),
        patientNumber: 'P-001',
        encryptedName: 'enc-Max Mustermann',
        gender: 'M',
        birthDate: new Date('1990-01-01'),
        securityPattern: null,
        verifiedAt: new Date(),
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const handlers = getRouteHandlers('/identify', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          birthDate: '1990-01-01',
          insuranceNumber: 'A123456789',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {
          'user-agent': 'Test-Agent/1.0',
        },
        tenantId: 'tenant-1',
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('found', true);
      expect(res.body).toHaveProperty('patient');
    });

    it('should return not found for unknown patient', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null as never);

      const handlers = getRouteHandlers('/identify', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          birthDate: '1990-01-01',
          insuranceNumber: 'UNKNOWN',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {
          'user-agent': 'Test-Agent/1.0',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('found', false);
      // Should not reveal if insurance number exists
      expect(res.body).not.toHaveProperty('error');
    });

    it('should reject invalid birthDate', async () => {
      const handlers = getRouteHandlers('/identify', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          birthDate: 'invalid-date',
          insuranceNumber: 'A123456789',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {
          'user-agent': 'Test-Agent/1.0',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('found', false);
    });

    it('should rate limit after 5 attempts', async () => {
      const handlers = getRouteHandlers('/identify', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        vi.mocked(prisma.patient.findFirst).mockResolvedValueOnce(null as never);
        const req = {
          body: { birthDate: '1990-01-01', insuranceNumber: `WRONG-${i}` },
          ip: '192.168.1.1',
          socket: { remoteAddress: '192.168.1.1' },
          headers: {
            'user-agent': 'Test-Agent/1.0',
          },
        };
        const res = createMockResponse();
        await handler(req, res);
      }

      // 6th attempt should be rate limited
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null as never);
      const req = {
        body: { birthDate: '1990-01-01', insuranceNumber: 'WRONG-5' },
        ip: '192.168.1.1',
        socket: { remoteAddress: '192.168.1.1' },
        headers: {
          'user-agent': 'Test-Agent/1.0',
        },
      };
      const res = createMockResponse();
      await handler(req, res);

      expect(res.statusCode).toBe(429);
    });
  });

  describe('POST /verify-pattern', () => {
    it('should verify security pattern', async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: validUUID('patient-1'),
        securityPattern: 'bcrypt-hash-of-pattern',
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const { compare } = await import('bcryptjs');
      vi.mocked(compare).mockResolvedValueOnce(true as any);

      const handlers = getRouteHandlers('/verify-pattern', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          patientId: validUUID('patient-1'),
          patternHash: 'sha256-of-pattern',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {
          'user-agent': 'Test-Agent/1.0',
        },
        tenantId: 'tenant-1',
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('verified', true);
    });

    it('should reject invalid pattern', async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: validUUID('patient-1'),
        securityPattern: 'bcrypt-hash',
      } as never);

      const { compare } = await import('bcryptjs');
      vi.mocked(compare).mockResolvedValueOnce(false as any);

      const handlers = getRouteHandlers('/verify-pattern', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          patientId: validUUID('patient-1'),
          patternHash: 'wrong-pattern',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {
          'user-agent': 'Test-Agent/1.0',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('verified', false);
    });
  });

  describe('POST /:id/pattern', () => {
    it('should set security pattern', async () => {
      vi.mocked(prisma.patient.update).mockResolvedValue({ id: validUUID('patient-1') } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const handlers = getRouteHandlers('/:id/pattern', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: validUUID('patient-1') },
        body: { patternHash: 'sha256-pattern' },
        auth: { sessionId: validUUID('session-1'), role: 'mfa' },
        tenantId: 'tenant-1',
        ip: '127.0.0.1',
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should require mfa or admin role', () => {
      const handlers = getRouteHandlers('/:id/pattern', 'post');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
      expect(middlewareMocks.requireRoleFactory).toHaveBeenCalledWith('mfa', 'admin');
    });
  });

  describe('POST /:sessionId/certify', () => {
    it('should certify patient identity', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: validUUID('session-1'),
        patientId: validUUID('patient-1'),
        gender: 'M',
        encryptedName: 'enc-name',
      } as never);
      vi.mocked(prisma.patient.findFirst).mockResolvedValue({ patientNumber: 'P-10000' } as never);
      vi.mocked(prisma.patient.update).mockResolvedValue({ id: validUUID('patient-1') } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const handlers = getRouteHandlers('/:sessionId/certify', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { sessionId: validUUID('session-1') },
        body: {
          insuranceNumber: 'A123456789',
          birthDate: '1990-01-01',
          patientName: 'Max Mustermann',
          gender: 'M',
        },
        auth: { sessionId: validUUID('session-1'), role: 'mfa', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        ip: '127.0.0.1',
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('patientNumber');
    });

    it('should return 404 for non-existent session', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue(null as never);

      const handlers = getRouteHandlers('/:sessionId/certify', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { sessionId: validUUID('non-existent') },
        body: {
          insuranceNumber: 'A123456789',
          birthDate: '1990-01-01',
        },
        auth: { sessionId: validUUID('session-1'), role: 'mfa' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should require mfa/admin/arzt role', () => {
      const handlers = getRouteHandlers('/:sessionId/certify', 'post');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
      expect(middlewareMocks.requireRoleFactory).toHaveBeenCalledWith('mfa', 'admin', 'arzt');
    });
  });

  describe('GET /:id', () => {
    it('should return patient details', async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: validUUID('patient-1'),
        patientNumber: 'P-001',
        gender: 'M',
        birthDate: new Date('1990-01-01'),
        verifiedAt: new Date(),
        verifiedBy: validUUID('mfa-1'),
        createdAt: new Date(),
        _count: { sessions: 5 },
      } as never);

      const handlers = getRouteHandlers('/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: validUUID('patient-1') } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('patientNumber');
    });

    it('should return 404 for non-existent patient', async () => {
      vi.mocked(prisma.patient.findUnique).mockResolvedValue(null as never);

      const handlers = getRouteHandlers('/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: validUUID('non-existent') } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should require mfa/admin/arzt role', () => {
      const handlers = getRouteHandlers('/:id', 'get');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
    });
  });
});
