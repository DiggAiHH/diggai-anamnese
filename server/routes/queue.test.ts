import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
  requirePermissionFactory: vi.fn(() => middlewareMocks.requirePermission),
  requirePermission: vi.fn((_req, _res, next) => next()),
}));

const queueServiceMocks = vi.hoisted(() => ({
  joinQueue: vi.fn(),
  getQueueState: vi.fn(),
  getPositionBySession: vi.fn(),
  getFlowConfig: vi.fn(),
  callEntry: vi.fn(),
  treatEntry: vi.fn(),
  doneEntry: vi.fn(),
  submitFeedback: vi.fn(),
  removeEntry: vi.fn(),
}));

const socketMocks = vi.hoisted(() => ({
  getIO: vi.fn(() => ({
    to: vi.fn(() => ({
      emit: vi.fn(),
    })),
  })),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
  requirePermission: middlewareMocks.requirePermissionFactory,
}));

vi.mock('../services/queueService', () => queueServiceMocks);

vi.mock('../socket', () => ({
  getIO: socketMocks.getIO,
}));

import router from './queue';

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

describe('queue routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /join', () => {
    it('should create queue entry with valid data', async () => {
      const mockEntry = {
        id: 'entry-1',
        sessionId: 'session-1',
        patientName: 'Max Mustermann',
        position: 1,
      };
      queueServiceMocks.joinQueue.mockResolvedValue(mockEntry);

      const handlers = getRouteHandlers('/join', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          sessionId: 'session-1',
          patientName: 'Max Mustermann',
          service: 'Termin',
          priority: 'NORMAL',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('entry');
    });

    it('should reject invalid data with 400', async () => {
      const handlers = getRouteHandlers('/join', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: { sessionId: 'session-1' }, // Missing required fields
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should require auth', () => {
      const handlers = getRouteHandlers('/join', 'post');
      expect(handlers).toContain(middlewareMocks.requireAuth);
    });
  });

  describe('GET /', () => {
    it('should return queue state', async () => {
      const mockState = {
        queue: [
          { id: 'entry-1', position: 1, status: 'WAITING' },
        ],
        stats: { waiting: 1, inTreatment: 0 },
      };
      queueServiceMocks.getQueueState.mockResolvedValue(mockState);

      const handlers = getRouteHandlers('/', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {};
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('queue');
      expect(res.body).toHaveProperty('stats');
    });

    it('should require arzt/admin/mfa role', () => {
      const handlers = getRouteHandlers('/', 'get');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
      expect(middlewareMocks.requireRoleFactory).toHaveBeenCalledWith('arzt', 'admin', 'mfa');
    });
  });

  describe('GET /position/:sessionId', () => {
    it('should return position for session', async () => {
      queueServiceMocks.getPositionBySession.mockResolvedValue({
        position: 2,
        estimatedWaitMin: 15,
      });

      const handlers = getRouteHandlers('/position/:sessionId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { sessionId: 'session-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /flow-config/:sessionId', () => {
    it('should return flow config', async () => {
      queueServiceMocks.getFlowConfig.mockResolvedValue({
        steps: ['CHECKIN', 'WAITING', 'TREATMENT'],
      });

      const handlers = getRouteHandlers('/flow-config/:sessionId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { sessionId: 'session-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /:id/call', () => {
    it('should call entry and notify patient', async () => {
      queueServiceMocks.callEntry.mockResolvedValue({
        id: 'entry-1',
        sessionId: 'session-1',
        status: 'CALLED',
      });

      const handlers = getRouteHandlers('/:id/call', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'entry-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(socketMocks.getIO).toHaveBeenCalled();
    });

    it('should return 404 for non-existent entry', async () => {
      const error = new Error('Not found') as Error & { code: string };
      error.code = 'P2025';
      queueServiceMocks.callEntry.mockRejectedValue(error);

      const handlers = getRouteHandlers('/:id/call', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'non-existent' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should require queue_manage permission', () => {
      const handlers = getRouteHandlers('/:id/call', 'put');
      expect(handlers).toContain(middlewareMocks.requirePermission);
    });
  });

  describe('PUT /:id/treat', () => {
    it('should mark entry as in treatment', async () => {
      queueServiceMocks.treatEntry.mockResolvedValue({
        id: 'entry-1',
        status: 'IN_TREATMENT',
      });

      const handlers = getRouteHandlers('/:id/treat', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'entry-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /:id/done', () => {
    it('should mark entry as done', async () => {
      queueServiceMocks.doneEntry.mockResolvedValue({
        id: 'entry-1',
        status: 'DONE',
      });

      const handlers = getRouteHandlers('/:id/done', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'entry-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /:id/feedback', () => {
    it('should submit feedback', async () => {
      queueServiceMocks.submitFeedback.mockResolvedValue({
        id: 'entry-1',
        rating: 5,
      });

      const handlers = getRouteHandlers('/:id/feedback', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'entry-1' },
        body: { rating: 5 },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should reject invalid rating', async () => {
      const handlers = getRouteHandlers('/:id/feedback', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'entry-1' },
        body: { rating: 10 }, // Invalid: max is 5
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /:id', () => {
    it('should remove entry from queue', async () => {
      queueServiceMocks.removeEntry.mockResolvedValue(undefined);

      const handlers = getRouteHandlers('/:id', 'delete');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'entry-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should require mfa/admin role', () => {
      const handlers = getRouteHandlers('/:id', 'delete');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
    });
  });
});
