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
    patientSession: {
      findFirst: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
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
    vi.mocked(prisma.patientSession.findFirst).mockResolvedValue({ id: 'session-1' } as never);
  });

  describe('GET /:id', () => {
    it('should return message history for session', async () => {
      const mockMessages = [
        { id: 'msg-1', sessionId: 'session-1', text: 'Hello', senderType: 'PATIENT', fromName: 'Patient', timestamp: new Date() },
        { id: 'msg-2', sessionId: 'session-1', text: 'Hi', senderType: 'ARZT', fromName: 'Praxis-Team', timestamp: new Date() },
      ];
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as never);

      const handlers = getRouteHandlers('/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'session-1' }, tenantId: 'tenant-1' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray((res.body as { messages: unknown[] }).messages)).toBe(true);
    });

    it('should return empty array when no messages exist', async () => {
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([] as never);

      const handlers = getRouteHandlers('/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      vi.mocked(prisma.patientSession.findFirst).mockResolvedValue({ id: 'session-empty' } as never);

      const req = { params: { id: 'session-empty' }, tenantId: 'tenant-1' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect((res.body as { messages: unknown[] }).messages).toHaveLength(0);
    });

    it('should require auth and session owner', () => {
      const handlers = getRouteHandlers('/:id', 'get');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireSessionOwner);
    });

    it('should order messages by timestamp ascending', async () => {
      const mockMessages = [
        { id: 'msg-1', text: 'First', senderType: 'PATIENT', fromName: 'Patient', timestamp: new Date('2026-01-01') },
        { id: 'msg-2', text: 'Second', senderType: 'ARZT', fromName: 'Praxis-Team', timestamp: new Date('2026-01-02') },
      ];
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as never);

      const handlers = getRouteHandlers('/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'session-1' }, tenantId: 'tenant-1' };
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

      const handlers = getRouteHandlers('/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: 'session-1' }, tenantId: 'tenant-1' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /:id', () => {
    it('should persist a patient chat message', async () => {
      const createdMessage = {
        id: 'msg-patient-1',
        sessionId: 'session-1',
        senderType: 'PATIENT',
        senderId: undefined,
        text: 'Ich habe noch eine Frage.',
        fromName: 'Patient',
        timestamp: new Date('2026-03-26T09:00:00.000Z'),
      };
      vi.mocked(prisma.chatMessage.create).mockResolvedValue(createdMessage as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        tenantId: 'tenant-1',
        body: { text: 'Ich habe noch eine Frage.' },
        auth: { role: 'patient', sessionId: 'session-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(prisma.chatMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-1',
          senderType: 'PATIENT',
          senderId: undefined,
          text: 'Ich habe noch eine Frage.',
          fromName: 'Patient',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({ message: createdMessage });
    });

    it('should persist a staff chat message with auth context', async () => {
      const createdMessage = {
        id: 'msg-staff-1',
        sessionId: 'session-2',
        senderType: 'ARZT',
        senderId: 'staff-7',
        text: 'Bitte kommen Sie 10 Minuten früher.',
        fromName: 'Praxis-Team',
        timestamp: new Date('2026-03-26T10:00:00.000Z'),
      };
      vi.mocked(prisma.chatMessage.create).mockResolvedValue(createdMessage as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-2' },
        tenantId: 'tenant-1',
        body: { text: 'Bitte kommen Sie 10 Minuten früher.' },
        auth: { role: 'arzt', userId: 'staff-7' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(prisma.chatMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-2',
          senderType: 'ARZT',
          senderId: 'staff-7',
          text: 'Bitte kommen Sie 10 Minuten früher.',
          fromName: 'Praxis-Team',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('should reject empty chat messages', async () => {
      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      vi.mocked(prisma.patientSession.findFirst).mockResolvedValue({ id: 'session-1' } as never);
      const req = {
        params: { id: 'session-1' },
        tenantId: 'tenant-1',
        body: { text: '   ' },
        auth: { role: 'patient', sessionId: 'session-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(prisma.chatMessage.create).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Ungültige Nachricht' });
    });

    it('should surface database errors gracefully', async () => {
      vi.mocked(prisma.chatMessage.create).mockRejectedValue(new Error('DB Error') as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-1' },
        tenantId: 'tenant-1',
        body: { text: 'Nachricht' },
        auth: { role: 'patient', sessionId: 'session-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Interner Serverfehler beim Senden der Nachricht' });
    });

    it('should require auth and session owner', () => {
      const handlers = getRouteHandlers('/:id', 'post');
      expect(handlers).toContain(middlewareMocks.requireAuth);
      expect(handlers).toContain(middlewareMocks.requireSessionOwner);
    });

    it('should reject cross-tenant session access', async () => {
      vi.mocked(prisma.patientSession.findFirst).mockResolvedValue(null as never);

      const handlers = getRouteHandlers('/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: 'session-missing' },
        tenantId: 'tenant-1',
        body: { text: 'Hallo' },
        auth: { role: 'arzt', userId: 'staff-7' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(prisma.chatMessage.create).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: 'Sitzung nicht gefunden' });
    });
  });
});
