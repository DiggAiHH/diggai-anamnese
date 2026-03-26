import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from './therapy';

// Valid UUID generator for tests
const validUUID = (seed: string): string => {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pad = (n: number, len: number) => n.toString(16).padStart(len, '0');
  return `${pad(hash, 8)}-${pad(hash >> 8, 4)}-4${pad(hash >> 12, 3)}-${pad((hash >> 16) & 0x3f | 0x80, 2)}${pad(hash >> 24, 2)}-${pad(hash, 12)}`;
};

// Create mock prisma client
const mockPrisma = {
  therapyPlan: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  therapyMeasure: {
    create: vi.fn(),
    createMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  therapyTemplate: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  clinicalAlert: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  anonPatientId: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  patientSession: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn((ops) => Promise.all(ops)),
};

// Mock AI engine
vi.mock('../services/ai/ai-engine.service', () => ({
  aiEngine: {
    suggestTherapy: vi.fn(() => Promise.resolve({
      mode: 'ai',
      aiModel: 'test-model',
      aiConfidence: 0.85,
      aiPromptHash: 'abc123',
      durationMs: 100,
      suggestion: { measures: [] },
    })),
    summarizeSession: vi.fn(() => Promise.resolve({
      mode: 'ai',
      aiModel: 'test-model',
      durationMs: 100,
      summary: 'Test summary',
    })),
    suggestIcd: vi.fn(() => Promise.resolve({
      mode: 'ai',
      suggestions: [{ code: 'A01', name: 'Test' }],
    })),
    getStatus: vi.fn(() => Promise.resolve({
      available: true,
      provider: 'test',
      model: 'test-model',
      online: true,
    })),
  },
}));

// Mock therapy service
vi.mock('../services/therapy', () => ({
  evaluateAlertRules: vi.fn(() => []),
  generatePseudonym: vi.fn(() => 'PSEUDO-123'),
  anonymizeSession: vi.fn((data) => data),
}));

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

// Helper to create request with prisma
function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: { id: validUUID('user-1'), role: 'ARZT' },
    prisma: mockPrisma,
    ...overrides,
  };
}

describe('therapy routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /plans', () => {
    it('should create therapy plan with valid data', async () => {
      const planData = {
        id: validUUID('plan-1'),
        sessionId: validUUID('session-1'),
        patientId: validUUID('patient-1'),
        title: 'Test Plan',
        diagnosis: 'Test Diagnosis',
        icdCodes: ['A01'],
      };
      mockPrisma.therapyPlan.create.mockResolvedValue(planData);
      mockPrisma.therapyPlan.findUnique.mockResolvedValue({
        ...planData,
        measures: [],
        alerts: [],
      });

      const handlers = getRouteHandlers('/plans', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: {
          sessionId: validUUID('session-1'),
          patientId: validUUID('patient-1'),
          title: 'Test Plan',
          diagnosis: 'Test Diagnosis',
          icdCodes: ['A01'],
        },
        user: { id: validUUID('user-1') },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body).toBeDefined();
    });

    it('should reject invalid data with 400', async () => {
      const handlers = getRouteHandlers('/plans', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: { title: 'Test' },
        user: { id: validUUID('user-1') },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /plans/:id', () => {
    it('should return plan by id', async () => {
      mockPrisma.therapyPlan.findUnique.mockResolvedValue({
        id: validUUID('plan-1'),
        title: 'Test Plan',
        measures: [],
        alerts: [],
        patient: { id: validUUID('p1'), patientNumber: 'P-001' },
        session: { id: validUUID('s1'), status: 'ACTIVE' },
      });

      const handlers = getRouteHandlers('/plans/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({ params: { id: validUUID('plan-1') } });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('should return 404 for non-existent plan', async () => {
      mockPrisma.therapyPlan.findUnique.mockResolvedValue(null);

      const handlers = getRouteHandlers('/plans/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({ params: { id: validUUID('non-existent') } });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /plans/patient/:patientId', () => {
    it('should return plans for patient', async () => {
      mockPrisma.therapyPlan.findMany.mockResolvedValue([
        { id: validUUID('plan-1'), title: 'Plan 1', measures: [], _count: { alerts: 0 } },
      ]);

      const handlers = getRouteHandlers('/plans/patient/:patientId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({ params: { patientId: validUUID('patient-1') } });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /plans/:id/status', () => {
    it('should update plan status', async () => {
      mockPrisma.therapyPlan.update.mockResolvedValue({
        id: validUUID('plan-1'),
        status: 'COMPLETED',
      });

      const handlers = getRouteHandlers('/plans/:id/status', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        params: { id: validUUID('plan-1') },
        body: { status: 'COMPLETED' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should reject invalid status', async () => {
      const handlers = getRouteHandlers('/plans/:id/status', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        params: { id: validUUID('plan-1') },
        body: { status: 'INVALID_STATUS' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /plans/:planId/measures', () => {
    it('should add measure to plan', async () => {
      mockPrisma.therapyMeasure.create.mockResolvedValue({
        id: validUUID('measure-1'),
        planId: validUUID('plan-1'),
        type: 'MEDICATION',
        title: 'Test Medication',
      });

      const handlers = getRouteHandlers('/plans/:planId/measures', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        params: { planId: validUUID('plan-1') },
        body: {
          type: 'MEDICATION',
          title: 'Test Medication',
          description: 'Test description',
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /templates', () => {
    it('should return therapy templates', async () => {
      mockPrisma.therapyTemplate.findMany.mockResolvedValue([
        { id: validUUID('template-1'), name: 'Template 1', isActive: true },
      ]);

      const handlers = getRouteHandlers('/templates', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({ query: {} });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /templates', () => {
    it('should create template with valid data', async () => {
      mockPrisma.therapyTemplate.create.mockResolvedValue({
        id: validUUID('template-1'),
        name: 'New Template',
        category: 'Test',
      });

      const handlers = getRouteHandlers('/templates', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: {
          name: 'New Template',
          category: 'Test',
          measures: [],
        },
        user: { id: validUUID('user-1') },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
    });
  });

  describe('POST /ai/suggest', () => {
    it('should return AI therapy suggestions', async () => {
      const handlers = getRouteHandlers('/ai/suggest', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: { sessionId: validUUID('session-1') },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('available', true);
      expect(res.body).toHaveProperty('suggestion');
    });

    it('should reject invalid sessionId', async () => {
      const handlers = getRouteHandlers('/ai/suggest', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        body: { sessionId: 'invalid-uuid' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /ai/status', () => {
    it('should return AI service status', async () => {
      const handlers = getRouteHandlers('/ai/status', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({});
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('available');
    });
  });

  describe('GET /alerts', () => {
    it('should return paginated alerts', async () => {
      mockPrisma.clinicalAlert.findMany.mockResolvedValue([
        { id: validUUID('alert-1'), severity: 'CRITICAL', title: 'Test Alert' },
      ]);
      mockPrisma.clinicalAlert.count.mockResolvedValue(1);

      const handlers = getRouteHandlers('/alerts', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({ query: { page: '1', limit: '25' } });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('alerts');
      expect(res.body).toHaveProperty('pagination');
    });
  });

  describe('PUT /alerts/:id/read', () => {
    it('should mark alert as read', async () => {
      mockPrisma.clinicalAlert.update.mockResolvedValue({
        id: validUUID('alert-1'),
        isRead: true,
      });

      const handlers = getRouteHandlers('/alerts/:id/read', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({
        params: { id: validUUID('alert-1') },
        user: { id: validUUID('user-1') },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /anon/:patientId', () => {
    it('should return existing pseudonym', async () => {
      mockPrisma.anonPatientId.findUnique.mockResolvedValue({
        patientId: validUUID('patient-1'),
        pseudonym: 'PSEUDO-123',
      });

      const handlers = getRouteHandlers('/anon/:patientId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({ params: { patientId: validUUID('patient-1') } });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('pseudonym');
    });

    it('should create new pseudonym if not exists', async () => {
      mockPrisma.anonPatientId.findUnique.mockResolvedValue(null);
      mockPrisma.anonPatientId.create.mockResolvedValue({
        patientId: validUUID('patient-1'),
        pseudonym: 'PSEUDO-123',
      });

      const handlers = getRouteHandlers('/anon/:patientId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = createMockRequest({ params: { patientId: validUUID('patient-1') } });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
