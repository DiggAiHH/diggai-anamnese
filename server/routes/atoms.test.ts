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
    medicalAtom: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    atomDraft: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}));

import router from './atoms';
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

describe('atoms routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return atoms by ids', async () => {
      const mockAtoms = [
        { id: '0000', questionText: 'Question 1', options: null, orderIndex: 1 },
        { id: '0001', questionText: 'Question 2', options: '["a","b"]', orderIndex: 2 },
      ];
      vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue(mockAtoms as never);

      const handlers = getRouteHandlers('/', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { query: { ids: '0000,0001' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('atoms');
      expect(Array.isArray((res.body as { atoms: unknown[] }).atoms)).toBe(true);
    });

    it('should return atoms by module and section', async () => {
      vi.mocked(prisma.medicalAtom.findMany).mockResolvedValue([] as never);

      const handlers = getRouteHandlers('/', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { query: { module: 'basis', section: 'personal' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(prisma.medicalAtom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { module: 'basis', section: 'personal' },
          orderBy: { orderIndex: 'asc' },
        })
      );
    });

    it('should require auth', () => {
      const handlers = getRouteHandlers('/', 'get');
      expect(handlers).toContain(middlewareMocks.requireAuth);
    });
  });

  describe('GET /:id', () => {
    it('should return single atom', async () => {
      vi.mocked(prisma.medicalAtom.findUnique).mockResolvedValue({
        id: '0000',
        questionText: 'Test Question',
        options: '["opt1","opt2"]',
      } as never);

      const handlers = getRouteHandlers('/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: '0000' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', '0000');
    });

    it('should return 404 for non-existent atom', async () => {
      vi.mocked(prisma.medicalAtom.findUnique).mockResolvedValue(null as never);

      const handlers = getRouteHandlers('/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'non-existent' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /reorder', () => {
    it('should reorder atoms', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      const handlers = getRouteHandlers('/reorder', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          orders: [
            { id: '0000', orderIndex: 0 },
            { id: '0001', orderIndex: 1 },
          ],
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should require admin role', () => {
      const handlers = getRouteHandlers('/reorder', 'put');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
    });

    it('should reject empty orders array', async () => {
      const handlers = getRouteHandlers('/reorder', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { body: { orders: [] } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /:id/toggle', () => {
    it('should toggle atom active status', async () => {
      vi.mocked(prisma.medicalAtom.update).mockResolvedValue({
        id: '0000',
        isActive: false,
      } as never);

      const handlers = getRouteHandlers('/:id/toggle', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: '0000' },
        body: { isActive: false },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for non-existent atom', async () => {
      const error = new Error('Not found') as Error & { code: string };
      error.code = 'P2025';
      vi.mocked(prisma.medicalAtom.update).mockRejectedValue(error as never);

      const handlers = getRouteHandlers('/:id/toggle', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'non-existent' },
        body: { isActive: false },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /draft', () => {
    it('should create atom draft', async () => {
      vi.mocked(prisma.atomDraft.create).mockResolvedValue({
        id: 'draft-1',
        atomId: '0000',
        draftData: '{"questionText":"Draft Question"}',
        status: 'DRAFT',
      } as never);

      const handlers = getRouteHandlers('/draft', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          atomId: '0000',
          draftData: { questionText: 'Draft Question' },
          changeNote: 'Updated question text',
        },
        user: { userId: 'user-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should require admin role', () => {
      const handlers = getRouteHandlers('/draft', 'post');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
    });
  });

  describe('GET /drafts', () => {
    it('should list drafts by status', async () => {
      vi.mocked(prisma.atomDraft.findMany).mockResolvedValue([
        { id: 'draft-1', status: 'DRAFT', draftData: '{"q":"test"}' },
      ] as never);

      const handlers = getRouteHandlers('/drafts', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { query: { status: 'DRAFT' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('drafts');
    });

    it('should require admin role', () => {
      const handlers = getRouteHandlers('/drafts', 'get');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
    });
  });

  describe('PUT /draft/:id/publish', () => {
    it('should publish draft to atom', async () => {
      vi.mocked(prisma.atomDraft.findUnique).mockResolvedValue({
        id: 'draft-1',
        atomId: '0000',
        draftData: '{"questionText":"Published","answerType":"text"}',
      } as never);
      vi.mocked(prisma.medicalAtom.upsert).mockResolvedValue({
        id: '0000',
        questionText: 'Published',
      } as never);
      vi.mocked(prisma.atomDraft.update).mockResolvedValue({
        id: 'draft-1',
        status: 'PUBLISHED',
      } as never);

      const handlers = getRouteHandlers('/draft/:id/publish', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'draft-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('atom');
    });

    it('should return 404 for non-existent draft', async () => {
      vi.mocked(prisma.atomDraft.findUnique).mockResolvedValue(null as never);

      const handlers = getRouteHandlers('/draft/:id/publish', 'put');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'non-existent' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /draft/:id', () => {
    it('should delete draft', async () => {
      vi.mocked(prisma.atomDraft.delete).mockResolvedValue({} as never);

      const handlers = getRouteHandlers('/draft/:id', 'delete');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'draft-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should return 404 for non-existent draft', async () => {
      const error = new Error('Not found') as Error & { code: string };
      error.code = 'P2025';
      vi.mocked(prisma.atomDraft.delete).mockRejectedValue(error as never);

      const handlers = getRouteHandlers('/draft/:id', 'delete');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'non-existent' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should require admin role', () => {
      const handlers = getRouteHandlers('/draft/:id', 'delete');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
    });
  });
});
