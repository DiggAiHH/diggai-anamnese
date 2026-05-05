import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireSessionOwner: vi.fn((_req, _res, next) => next()),
}));

const routingEngineMocks = vi.hoisted(() => ({
  evaluateForAtom: vi.fn(() => []),
  toPatientSafeView: vi.fn((r: any) => ({
    ruleId: r.ruleId,
    level: r.level,
    patientMessage: r.patientMessage,
    workflowAction: r.workflowAction,
  })),
}));

const socketMocks = vi.hoisted(() => ({
  emitRoutingHint: vi.fn(),
  emitTriageAlert: vi.fn(),
  emitAnswerSubmitted: vi.fn(),
  emitSessionProgress: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireSessionOwner: middlewareMocks.requireSessionOwner,
}));

vi.mock('../services/encryption', () => ({
  encrypt: vi.fn((v: string) => `enc-${v}`),
  decrypt: vi.fn((v: string) => v?.replace('enc-', '')),
  isPIIAtom: vi.fn(() => false),
  hashEmail: vi.fn((v: string) => `hash-${v}`),
}));

vi.mock('../engine/RoutingEngine', () => ({
  RoutingEngine: routingEngineMocks,
}));

vi.mock('../socket', () => ({
  emitRoutingHint: socketMocks.emitRoutingHint,
  emitTriageAlert: socketMocks.emitTriageAlert,
  emitAnswerSubmitted: socketMocks.emitAnswerSubmitted,
  emitSessionProgress: socketMocks.emitSessionProgress,
}));

vi.mock('../db', () => ({
  prisma: {
    patientSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    answer: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    triageEvent: {
      create: vi.fn(),
    },
    patient: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import router from './answers';
import { prisma } from '../db';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'post') {
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

describe('answers routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /:id', () => {
    it('should submit answer and return success', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        status: 'ACTIVE',
        gender: 'M',
        birthDate: new Date('1990-01-01'),
        isNewPatient: true,
      } as never);
      vi.mocked(prisma.answer.upsert).mockResolvedValue({ id: 'answer-1' } as never);
      vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);
      routingEngineMocks.evaluateForAtom.mockReturnValue([]);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: 'atom-1', value: 'test answer' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('answerId');
    });

    it('should return 404 for non-existent session', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue(null as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'non-existent' },
        body: { atomId: 'atom-1', value: 'test' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should reject answer for completed session', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'COMPLETED',
      } as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: 'atom-1', value: 'test' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject invalid birth dates with 400', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
      } as never);
      vi.mocked(prisma.answer.upsert).mockResolvedValue({ id: 'answer-1' } as never);
      vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: '0003', value: 'definitely-not-a-date' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Ungültiges Geburtsdatum' });
      expect(prisma.patientSession.update).not.toHaveBeenCalled();
    });

    it('should encrypt PII values', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
      } as never);
      vi.mocked(prisma.answer.upsert).mockResolvedValue({ id: 'answer-1' } as never);
      vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);
      const { isPIIAtom } = await import('../services/encryption');
      vi.mocked(isPIIAtom).mockReturnValueOnce(true);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: 'pii-atom', value: 'sensitive data' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(prisma.answer.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({
          value: JSON.stringify({ type: 'text', data: '[encrypted]', redacted: true }),
          encryptedValue: 'enc-sensitive data',
        }),
      }));
    });

    it('should reject plaintext alongside a client-encrypted payload', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
      } as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: {
          atomId: '3000',
          value: 'Musterstrasse 1',
          encrypted: {
            iv: 'aa',
            ciphertext: 'bb',
            alg: 'AES-256-GCM',
            encryptedAt: new Date().toISOString(),
          },
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: 'Client-verschlüsselte Antworten dürfen keinen Klartext enthalten',
      });
      expect(prisma.answer.upsert).not.toHaveBeenCalled();
    });

    it('should require encrypted transport for protected client-side atoms', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
      } as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: '3000', value: 'Musterstrasse 1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: 'Dieses Feld muss clientseitig verschlüsselt übertragen werden',
      });
      expect(prisma.answer.upsert).not.toHaveBeenCalled();
    });

    it('should evaluate triage and create events', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        gender: 'M',
        birthDate: new Date('1990-01-01'),
        isNewPatient: true,
      } as never);
      vi.mocked(prisma.answer.upsert).mockResolvedValue({ id: 'answer-1' } as never);
      vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);
      routingEngineMocks.evaluateForAtom.mockReturnValue([
        {
          ruleId: 'INFO_TEST',
          level: 'INFO',
          atomId: 'atom-1',
          patientMessage: 'Bitte sprechen Sie das Praxispersonal an.',
          staffMessage: 'Check needed',
          triggerValues: {},
          workflowAction: 'mark_for_review',
        },
      ] as any);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: 'atom-1', value: 'risk value' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(prisma.triageEvent.create).toHaveBeenCalled();
      expect(res.body).toHaveProperty('redFlags');
    });

    it('should emit critical triage alert', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        gender: 'M',
        isNewPatient: true,
      } as never);
      vi.mocked(prisma.answer.upsert).mockResolvedValue({ id: 'answer-1' } as never);
      vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);
      routingEngineMocks.evaluateForAtom.mockReturnValue([
        {
          ruleId: 'PRIORITY_TEST',
          level: 'PRIORITY',
          atomId: 'atom-1',
          patientMessage: 'Bitte wenden Sie sich umgehend an das Praxispersonal.',
          staffMessage: 'Emergency!',
          triggerValues: {},
          workflowAction: 'inform_staff_now',
        },
      ] as any);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: 'atom-1', value: 'critical value' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(socketMocks.emitRoutingHint).toHaveBeenCalled();
    });

    it('should link patient by email when email atom submitted', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        gender: 'M',
        isNewPatient: true,
        patientId: null,
      } as never);
      vi.mocked(prisma.answer.upsert).mockResolvedValue({ id: 'answer-1' } as never);
      vi.mocked(prisma.answer.findMany).mockResolvedValue([
        { atomId: '9010', value: '{"type":"text","data":"test@example.com"}' },
      ] as never);
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.patient.create).mockResolvedValue({ id: 'patient-1' } as never);
      vi.mocked(prisma.patientSession.update).mockResolvedValue({ id: 'session-1', patientId: 'patient-1' } as never);
      routingEngineMocks.evaluateForAtom.mockReturnValue([]);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: '9010', value: 'test@example.com' },
        tenantId: 'tenant-1',
        auth: { tenantId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { hashedEmail: 'hash-test@example.com', tenantId: 'tenant-1' },
      });
    });

    it('should reject reassigning a session to a different persisted patient hash', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        patientId: 'patient-locked',
      } as never);
      vi.mocked(prisma.answer.upsert).mockResolvedValue({ id: 'answer-1' } as never);
      vi.mocked(prisma.answer.findMany).mockResolvedValue([
        { atomId: '9010', value: '{"type":"text","data":"other@example.com"}' },
      ] as never);
      vi.mocked(prisma.patient.findUnique).mockResolvedValue({
        id: 'patient-locked',
        hashedEmail: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      } as never);
      routingEngineMocks.evaluateForAtom.mockReturnValue([]);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: '9010', value: 'other@example.com' },
        tenantId: 'tenant-1',
        auth: { tenantId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.body).toEqual({
        error: 'Session ist bereits einem anderen Patienten zugeordnet',
      });
      expect(prisma.patientSession.update).not.toHaveBeenCalled();
    });

    it('should reject staff requests without matching tenant context', async () => {
      vi.mocked(prisma.patientSession.findUnique).mockResolvedValue({
        id: 'session-1',
        tenantId: 'tenant-a',
        status: 'ACTIVE',
      } as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        body: { atomId: 'atom-1', value: 'test' },
        auth: { role: 'arzt', tenantId: 'tenant-b' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
      expect(prisma.answer.upsert).not.toHaveBeenCalled();
    });

    it('should require auth and session owner', () => {
      const handlers = getRouteHandlers('/:id', 'post');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireSessionOwner);
    });
  });
});
