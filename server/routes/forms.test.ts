import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRole: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  createForm: vi.fn(),
  getForm: vi.fn(),
  listForms: vi.fn(),
  updateForm: vi.fn(),
  deleteForm: vi.fn(),
  aiGenerate: vi.fn(),
  publishForm: vi.fn(),
  incrementUsage: vi.fn(),
  getFormStats: vi.fn(),
  submitForm: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRole,
}));

vi.mock('../services/forms', () => serviceMocks);

import router from './forms';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'get' | 'post' | 'patch' | 'delete') {
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

describe('forms routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('derives createForm identity and tenant from request context', async () => {
    vi.mocked(serviceMocks.createForm).mockResolvedValue({ id: 'form-1' } as never);

    const handlers = getRouteHandlers('/', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-1',
      auth: { userId: 'staff-7', role: 'arzt' },
      body: {
        praxisId: 'spoofed-tenant',
        createdBy: 'spoofed-user',
        name: 'Anamnese',
        questions: [{ id: 'q1', type: 'TEXT', label: 'Beschwerden', required: true }],
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(serviceMocks.createForm).toHaveBeenCalledWith({
      name: 'Anamnese',
      questions: [{ id: 'q1', type: 'TEXT', label: 'Beschwerden', required: true }],
      praxisId: 'tenant-1',
      createdBy: 'staff-7',
    });
    expect(res.statusCode).toBe(201);
  });

  it('protects create route with auth and staff role', () => {
    const handlers = getRouteHandlers('/', 'post');

    expect(handlers[0]).toBe(middlewareMocks.requireAuth);
    expect(typeof handlers[1]).toBe('function');
    expect(handlers[1]).not.toBe(handlers[2]);
  });

  it('rejects patient submit when session id mismatches auth context', async () => {
    const handlers = getRouteHandlers('/:id/submit', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-1',
      auth: { role: 'patient', sessionId: 'session-a' },
      params: { id: 'form-1' },
      body: {
        sessionId: 'session-b',
        answers: { q1: 'Antwort' },
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(serviceMocks.submitForm).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Session mismatch' });
  });

  it('rejects patient submit when session context is missing', async () => {
    const handlers = getRouteHandlers('/:id/submit', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-1',
      auth: { role: 'patient' },
      params: { id: 'form-1' },
      body: {
        sessionId: 'session-b',
        answers: { q1: 'Antwort' },
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(serviceMocks.submitForm).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Missing patient session context' });
  });

  it('maps service validation errors to 400 on submit', async () => {
    vi.mocked(serviceMocks.submitForm).mockRejectedValue(new Error('No valid answers provided'));

    const handlers = getRouteHandlers('/:id/submit', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-1',
      auth: { role: 'arzt', userId: 'staff-1' },
      params: { id: 'form-1' },
      body: {
        sessionId: 'session-b',
        answers: { stale: 'Antwort' },
      },
    };
    const res = createMockResponse();

    await handler(req, res);
    await Promise.resolve();

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'No valid answers provided' });
  });
});
