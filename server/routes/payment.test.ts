import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../db';
import router from './payment';

// Valid UUID generator for tests
const validUUID = (seed: string): string => {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pad = (n: number, len: number) => n.toString(16).padStart(len, '0');
  return `${pad(hash, 8)}-${pad(hash >> 8, 4)}-4${pad(hash >> 12, 3)}-${pad((hash >> 16) & 0x3f | 0x80, 2)}${pad(hash >> 24, 2)}-${pad(hash, 12)}`;
};

// Mock payment service
vi.mock('../services/payment', () => ({
  createPaymentIntent: vi.fn(() => Promise.resolve({
    id: 'pi-123',
    clientSecret: 'secret-123',
    amount: 5000,
    currency: 'eur',
  })),
  processNfcCharge: vi.fn(() => Promise.resolve({
    success: true,
    transactionId: 'txn-123',
    amount: 5000,
  })),
  handleWebhook: vi.fn(() => Promise.resolve({ received: true })),
  getReceipt: vi.fn(() => Promise.resolve({
    id: 'rcpt-123',
    amount: 5000,
    date: new Date(),
  })),
  getPaymentStats: vi.fn(() => Promise.resolve({
    totalTransactions: 100,
    totalAmount: 500000,
    successful: 95,
    failed: 5,
  })),
  refundTransaction: vi.fn(() => Promise.resolve({
    success: true,
    refundId: 'ref-123',
    amount: 5000,
  })),
}));

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

describe('payment routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec-test-secret';
  });

  describe('POST /intent', () => {
    it('should create payment intent', async () => {
      const handlers = getRouteHandlers('/intent', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          sessionId: validUUID('session-1'),
          patientId: validUUID('patient-1'),
          amount: 5000,
          currency: 'EUR',
          type: 'SELBSTZAHLER',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('clientSecret');
    });

    it('should reject invalid amount', async () => {
      const handlers = getRouteHandlers('/intent', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          sessionId: validUUID('session-1'),
          patientId: validUUID('patient-1'),
          amount: -100,
          type: 'SELBSTZAHLER',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should reject amount exceeding limit', async () => {
      const handlers = getRouteHandlers('/intent', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          sessionId: validUUID('session-1'),
          patientId: validUUID('patient-1'),
          amount: 50000,
          type: 'SELBSTZAHLER',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid payment type', async () => {
      const handlers = getRouteHandlers('/intent', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          sessionId: validUUID('session-1'),
          patientId: validUUID('patient-1'),
          amount: 5000,
          type: 'INVALID_TYPE',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /nfc-charge', () => {
    it('should process NFC charge', async () => {
      const handlers = getRouteHandlers('/nfc-charge', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          sessionId: validUUID('session-1'),
          patientId: validUUID('patient-1'),
          amount: 5000,
          type: 'SELBSTZAHLER',
          nfcCardToken: 'nfc-token-123',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should reject invalid NFC data', async () => {
      const handlers = getRouteHandlers('/nfc-charge', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {
          sessionId: validUUID('session-1'),
          patientId: validUUID('patient-1'),
          amount: 5000,
          type: 'SELBSTZAHLER',
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /webhook', () => {
    it('should reject missing signature', async () => {
      const handlers = getRouteHandlers('/webhook', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: '{}',
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject old timestamp (replay protection)', async () => {
      const handlers = getRouteHandlers('/webhook', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const oldTimestamp = Math.floor(Date.now() / 1000) - 400;

      const req = {
        body: '{}',
        headers: {
          'stripe-signature': `t=${oldTimestamp},v1=signature`,
        },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /receipt/:id', () => {
    it('should return receipt', async () => {
      const { getReceipt } = await import('../services/payment');
      vi.mocked(getReceipt).mockResolvedValue({
        id: validUUID('txn-123'),
        amount: 5000,
      } as any);

      const handlers = getRouteHandlers('/receipt/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: validUUID('txn-123') } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('should return 404 for non-existent receipt', async () => {
      const { getReceipt } = await import('../services/payment');
      vi.mocked(getReceipt).mockResolvedValue(null);

      const handlers = getRouteHandlers('/receipt/:id', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { id: validUUID('non-existent') } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /stats', () => {
    it('should return payment statistics', async () => {
      const handlers = getRouteHandlers('/stats', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { query: {} };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalTransactions');
      expect(res.body).toHaveProperty('totalAmount');
    });
  });

  describe('POST /refund/:id', () => {
    it('should process refund', async () => {
      const handlers = getRouteHandlers('/refund/:id', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        params: { id: validUUID('txn-123') },
        body: { reason: 'Customer request' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('GET /session/:sessionId', () => {
    it('should return payments for session', async () => {
      vi.mocked(prisma.paymentTransaction.findMany).mockResolvedValue([
        { id: validUUID('txn-1'), amount: 5000, status: 'succeeded' },
      ] as never);

      const handlers = getRouteHandlers('/session/:sessionId', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = { params: { sessionId: validUUID('session-1') } };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
