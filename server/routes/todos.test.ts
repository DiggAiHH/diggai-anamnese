import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRole: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRole,
}));

vi.mock('../db', () => ({
  prisma: {
    arztUser: {
      findUnique: vi.fn(),
    },
    staffTodo: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import router from './todos';
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

describe('todos routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a todo from authenticated user context', async () => {
    vi.mocked(prisma.arztUser.findUnique).mockResolvedValue({ displayName: 'Dr. Ada' } as never);
    vi.mocked(prisma.staffTodo.create).mockResolvedValue({
      id: 'todo-1',
      text: 'Patient zurückrufen',
      priority: 'high',
      category: 'followup',
      assigneeId: 'user-1',
      assignee: 'Dr. Ada',
      completed: false,
      createdAt: new Date('2026-03-26T10:00:00.000Z'),
    } as never);

    const handlers = getRouteHandlers('/', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { userId: 'user-1', role: 'arzt' },
      body: { text: 'Patient zurückrufen', priority: 'high', category: 'followup' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.arztUser.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { displayName: true },
    });
    expect(prisma.staffTodo.create).toHaveBeenCalledWith({
      data: {
        text: 'Patient zurückrufen',
        priority: 'high',
        category: 'followup',
        sessionId: undefined,
        patientName: undefined,
        assigneeId: 'user-1',
        assignee: 'Dr. Ada',
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('returns 400 for invalid create payloads', async () => {
    const handlers = getRouteHandlers('/', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { userId: 'user-1', role: 'arzt' },
      body: { text: '', priority: 'invalid' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.staffTodo.create).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Ungültige Eingabe');
  });

  it('lists todos for the authenticated user with status filter', async () => {
    vi.mocked(prisma.staffTodo.findMany).mockResolvedValue([] as never);

    const handlers = getRouteHandlers('/', 'get');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { userId: 'user-9', role: 'mfa' },
      query: { status: 'active' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.staffTodo.findMany).toHaveBeenCalledWith({
      where: { assigneeId: 'user-9', completed: false },
      orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('sets completedAt when completing a todo', async () => {
    vi.mocked(prisma.staffTodo.findUnique).mockResolvedValue({ id: 'todo-2', assigneeId: 'user-3' } as never);
    vi.mocked(prisma.staffTodo.update).mockResolvedValue({
      id: 'todo-2',
      completed: true,
      completedAt: new Date('2026-03-26T11:00:00.000Z'),
    } as never);

    const handlers = getRouteHandlers('/:id', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { userId: 'user-3', role: 'arzt' },
      params: { id: 'todo-2' },
      body: { completed: true },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.staffTodo.update).toHaveBeenCalledWith({
      where: { id: 'todo-2' },
      data: {
        completed: true,
        completedAt: expect.any(Date),
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('clears completedAt when reopening a todo', async () => {
    vi.mocked(prisma.staffTodo.findUnique).mockResolvedValue({ id: 'todo-3', assigneeId: 'user-3' } as never);
    vi.mocked(prisma.staffTodo.update).mockResolvedValue({
      id: 'todo-3',
      completed: false,
      completedAt: null,
    } as never);

    const handlers = getRouteHandlers('/:id', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { userId: 'user-3', role: 'arzt' },
      params: { id: 'todo-3' },
      body: { completed: false },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.staffTodo.update).toHaveBeenCalledWith({
      where: { id: 'todo-3' },
      data: {
        completed: false,
        completedAt: null,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('forbids updating a todo owned by another user', async () => {
    vi.mocked(prisma.staffTodo.findUnique).mockResolvedValue({ id: 'todo-4', assigneeId: 'other-user' } as never);

    const handlers = getRouteHandlers('/:id', 'put');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { userId: 'user-3', role: 'arzt' },
      params: { id: 'todo-4' },
      body: { completed: true },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.staffTodo.update).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Kein Zugriff auf diese Aufgabe' });
  });

  it('forbids deleting a todo owned by another user', async () => {
    vi.mocked(prisma.staffTodo.findUnique).mockResolvedValue({ id: 'todo-5', assigneeId: 'other-user' } as never);

    const handlers = getRouteHandlers('/:id', 'delete');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      auth: { userId: 'user-3', role: 'arzt' },
      params: { id: 'todo-5' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(prisma.staffTodo.delete).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Kein Zugriff auf diese Aufgabe' });
  });
});
