import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
}));

const agentServiceMocks = vi.hoisted(() => ({
  listAgents: vi.fn(() => [
    { name: 'orchestrator', online: true, busy: false, tasksCompleted: 10, tasksFailed: 0 },
    { name: 'triage', online: true, busy: false, tasksCompleted: 5, tasksFailed: 1 },
  ]),
  get: vi.fn((name: string) => ({ name, online: true, busy: false })),
  dispatch: vi.fn(() => Promise.resolve({ result: 'success' })),
}));

const taskQueueMocks = vi.hoisted(() => ({
  metrics: vi.fn(() => ({ pending: 0, processing: 0, completed: 10, failed: 1 })),
  list: vi.fn(() => []),
  get: vi.fn(() => null),
  enqueue: vi.fn((task) => ({ ...task, id: 'task-1', status: 'pending' })),
}));

const messageBrokerMocks = vi.hoisted(() => ({
  isConnected: true,
  publishTask: vi.fn(() => Promise.resolve()),
}));

const agentCoreMocks = vi.hoisted(() => ({
  isAvailable: vi.fn(() => false),
  executeTask: vi.fn(() => Promise.resolve({ result: 'success' })),
}));

const auditServiceMocks = vi.hoisted(() => ({
  getStats: vi.fn(() => Promise.resolve({ total: 100, errors: 2 })),
  getLogsForAgent: vi.fn(() => Promise.resolve([])),
  log: vi.fn(() => Promise.resolve()),
}));

const orchestratorMocks = vi.hoisted(() => ({
  createTask: vi.fn((data) => ({ ...data, id: 'task-mem-1', status: 'pending', agentName: 'orchestrator' })),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
}));

vi.mock('../db', () => ({
  prisma: {
    agent: {
      findMany: vi.fn(() => Promise.resolve([
        { id: 'agent-1', name: 'orchestrator', type: 'SYSTEM', status: 'ACTIVE', totalTasks: 10 },
      ])),
      findUnique: vi.fn(() => Promise.resolve({ id: 'agent-1', name: 'orchestrator' })),
    },
    agentTask: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn((data) => Promise.resolve({ ...data.data, id: 'task-db-1' })),
    },
  },
}));

vi.mock('../services/agent/agent.service', () => ({
  agentService: agentServiceMocks,
}));

vi.mock('../services/agent/task.queue', () => ({
  taskQueue: taskQueueMocks,
}));

vi.mock('../services/messagebroker.service', () => ({
  messageBroker: messageBrokerMocks,
}));

vi.mock('../services/agentcore.client', () => ({
  agentCoreClient: agentCoreMocks,
}));

vi.mock('../services/audit.service', () => ({
  auditService: auditServiceMocks,
}));

vi.mock('../agents/orchestrator.agent', () => ({
  createTask: orchestratorMocks.createTask,
}));

import router from './agents';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'get' | 'post') {
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

describe('agents routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return list of agents', async () => {
      const handlers = getRouteHandlers('/', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {};
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('agents');
      expect(res.body).toHaveProperty('dbAgents');
      expect(Array.isArray((res.body as { agents: unknown[] }).agents)).toBe(true);
    });

    it('should require auth and arzt/admin role', () => {
      const handlers = getRouteHandlers('/', 'get');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireRole);
      expect(middlewareMocks.requireRoleFactory).toHaveBeenCalledWith('admin', 'arzt');
    });
  });

  describe('GET /metrics', () => {
    it('should return agent metrics', async () => {
      const handlers = getRouteHandlers('/metrics', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {};
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('queue');
      expect(res.body).toHaveProperty('agents');
      expect(res.body).toHaveProperty('broker');
    });
  });

  describe('GET /tasks', () => {
    it('should return list of tasks', async () => {
      const handlers = getRouteHandlers('/tasks', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { query: {} };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('tasks');
    });

    it('should filter by status', async () => {
      const handlers = getRouteHandlers('/tasks', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { query: { status: 'PENDING' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return task by id', async () => {
      const handlers = getRouteHandlers('/tasks/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'task-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /task', () => {
    it('should create and queue a task', async () => {
      const handlers = getRouteHandlers('/task', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          taskType: 'process_anamnese',
          description: 'Process patient anamnese',
          payload: { sessionId: 'session-1' },
        },
        user: { id: 'user-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(202);
      expect(res.body).toHaveProperty('taskId');
      expect(res.body).toHaveProperty('status');
    });

    it('should reject task without type or description', async () => {
      const handlers = getRouteHandlers('/task', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: { payload: {} },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should prefer agent-core when available', async () => {
      agentCoreMocks.isAvailable.mockReturnValueOnce(true);

      const handlers = getRouteHandlers('/task', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          taskType: 'test',
          description: 'Test task',
        },
        user: { id: 'user-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(202);
      expect(res.body).toHaveProperty('source', 'agent-core');
    });

    it('should use RabbitMQ when connected and agent-core unavailable', async () => {
      agentCoreMocks.isAvailable.mockReturnValueOnce(false);
      messageBrokerMocks.isConnected = true;

      const handlers = getRouteHandlers('/task', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          taskType: 'test',
          description: 'Test task',
        },
        user: { id: 'user-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(202);
      expect(res.body).toHaveProperty('source', 'rabbitmq');
    });

    it('should fallback to in-memory when other options unavailable', async () => {
      agentCoreMocks.isAvailable.mockReturnValueOnce(false);
      messageBrokerMocks.isConnected = false;

      const handlers = getRouteHandlers('/task', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          taskType: 'test',
          description: 'Test task',
        },
        user: { id: 'user-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(202);
      expect(res.body).toHaveProperty('source', 'in-memory');
    });
  });

  describe('POST /:name/execute', () => {
    it('should execute specific agent', async () => {
      const handlers = getRouteHandlers('/:name/execute', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { name: 'orchestrator' },
        body: {
          description: 'Execute orchestrator task',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(202);
    });

    it('should return 404 for non-existent agent', async () => {
      agentServiceMocks.get.mockReturnValueOnce(null as any);

      const handlers = getRouteHandlers('/:name/execute', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { name: 'non-existent' },
        body: { description: 'Test' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should reject without description or payload.question', async () => {
      const handlers = getRouteHandlers('/:name/execute', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { name: 'orchestrator' },
        body: { payload: {} },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /audit/:agentId', () => {
    it('should return audit logs for agent', async () => {
      auditServiceMocks.getLogsForAgent.mockResolvedValue([
        { id: 'log-1', action: 'task_created', timestamp: new Date() },
      ] as any);

      const handlers = getRouteHandlers('/audit/:agentId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { agentId: 'agent-1' },
        query: { limit: '50' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('logs');
    });
  });
});
