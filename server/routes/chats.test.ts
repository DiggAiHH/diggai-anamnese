import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireSessionOwner: vi.fn((_req, _res, next) => next()),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireSessionOwner: middlewareMocks.requireSessionOwner,
}));

vi.mock('../db', () => ({
  prisma: {
    chatMessage: {
      findMany: vi.fn(),
    },
  },
}));

import router from './chats';
import { prisma } from '../db';

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

describe('chats routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /:sessionId', () => {
    it('should return message history for session', async () => {
      const mockMessages = [
        { id: 'msg-1', sessionId: 'session-1', content: 'Hello', timestamp: new Date() },
        { id: 'msg-2', sessionId: 'session-1', content: 'Hi', timestamp: new Date() },
      ];
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as never);

      const handlers = getRouteHandlers('/:sessionId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { sessionId: 'session-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray((res.body as { messages: unknown[] }).messages)).toBe(true);
    });

    it('should return empty array when no messages exist', async () => {
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([] as never);

      const handlers = getRouteHandlers('/:sessionId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { sessionId: 'session-empty' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect((res.body as { messages: unknown[] }).messages).toHaveLength(0);
    });

    it('should require auth and session owner', () => {
      const handlers = getRouteHandlers('/:sessionId', 'get');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireSessionOwner);
    });

    it('should order messages by timestamp ascending', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'First', timestamp: new Date('2026-01-01') },
        { id: 'msg-2', content: 'Second', timestamp: new Date('2026-01-02') },
      ];
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as never);

      const handlers = getRouteHandlers('/:sessionId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { sessionId: 'session-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'session-1' },
          orderBy: { timestamp: 'asc' },
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.chatMessage.findMany).mockRejectedValue(new Error('DB Error') as never);

      const handlers = getRouteHandlers('/:sessionId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { sessionId: 'session-1' } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
