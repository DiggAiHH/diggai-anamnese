import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_billing123';
});

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireAdmin: vi.fn((_req, _res, next) => next()),
}));

const billingServiceMocks = vi.hoisted(() => ({
  createSetupIntent: vi.fn(() => Promise.resolve({ clientSecret: 'secret-123' })),
  createCustomer: vi.fn(() => Promise.resolve({ id: 'cus-123', email: 'test@test.com' })),
  getSubscription: vi.fn(() => Promise.resolve({
    id: 'sub-123',
    status: 'active',
    current_period_end: 1234567890,
    cancel_at_period_end: false,
  })),
  createSubscription: vi.fn(() => Promise.resolve({
    subscriptionId: 'sub-123',
    clientSecret: 'secret-123',
  })),
  createSubscriptionWithTrial: vi.fn(() => Promise.resolve({
    subscriptionId: 'sub-123',
    clientSecret: 'secret-123',
    trialEnd: 1234567890,
  })),
  cancelSubscription: vi.fn(() => Promise.resolve({
    id: 'sub-123',
    cancel_at_period_end: true,
    current_period_end: 1234567890,
  })),
  listPaymentMethods: vi.fn(() => Promise.resolve([
    { id: 'pm-1', type: 'card', card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 } },
  ])),
  listInvoices: vi.fn(() => Promise.resolve([
    { id: 'inv-1', status: 'paid', amount_due: 9900, amount_paid: 9900 },
  ])),
  getUpcomingInvoice: vi.fn(() => Promise.resolve({
    amount_due: 9900,
    currency: 'eur',
    period_start: 1234567890,
    period_end: 1234567890,
  })),
  constructWebhookEvent: vi.fn((body, sig, secret) => ({ type: 'invoice.paid', data: { object: {} } })),
  handleWebhookEvent: vi.fn(() => Promise.resolve()),
}));

const prismaDbMocks = vi.hoisted(() => {
  const tenantFindUnique = vi.fn();
  const subscriptionFindUnique = vi.fn();
  const prismaClient = {
    tenant: {
      findUnique: tenantFindUnique,
    },
    subscription: {
      findUnique: subscriptionFindUnique,
    },
  };

  return {
    tenantFindUnique,
    subscriptionFindUnique,
    prismaClient,
    getPrismaClientForDomain: vi.fn(() => prismaClient),
  };
});

vi.mock('../middleware/auth.js', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireAdmin: middlewareMocks.requireAdmin,
}));

vi.mock('../services/billing.service.js', () => ({
  billingService: billingServiceMocks,
  createSetupIntent: billingServiceMocks.createSetupIntent,
  createCustomer: billingServiceMocks.createCustomer,
  getSubscription: billingServiceMocks.getSubscription,
  listPaymentMethods: billingServiceMocks.listPaymentMethods,
  listInvoices: billingServiceMocks.listInvoices,
  getUpcomingInvoice: billingServiceMocks.getUpcomingInvoice,
  constructWebhookEvent: billingServiceMocks.constructWebhookEvent,
  handleWebhookEvent: billingServiceMocks.handleWebhookEvent,
}));

vi.mock('../db.js', () => ({
  getPrismaClientForDomain: prismaDbMocks.getPrismaClientForDomain,
}));

import router from './billing';

const dbDomainCallsOnImport = [...prismaDbMocks.getPrismaClientForDomain.mock.calls];

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'get' | 'post' | 'delete') {
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

describe('billing routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaDbMocks.getPrismaClientForDomain.mockReturnValue(prismaDbMocks.prismaClient);
    prismaDbMocks.tenantFindUnique.mockResolvedValue({
      id: 'tenant-1',
      stripeCustomerId: 'cus-123',
    });
    prismaDbMocks.subscriptionFindUnique.mockResolvedValue({
      id: 'sub-1',
      praxisId: 'tenant-1',
      stripeSubId: 'sub-123',
      tier: 'PROFESSIONAL',
      status: 'ACTIVE',
      aiQuotaUsed: 50,
      aiQuotaTotal: 100,
      startedAt: new Date(),
    });
    process.env.STRIPE_PRICE_STARTER = 'price_starter_123';
    process.env.STRIPE_PRICE_PROFESSIONAL = 'price_pro_123';
    process.env.STRIPE_PRICE_ENTERPRISE = 'price_ent_123';
  });

  it('uses company domain database client', () => {
    expect(dbDomainCallsOnImport).toContainEqual(['company']);
  });

  describe('POST /setup-intent', () => {
    it('should create setup intent', async () => {
      const handlers = getRouteHandlers('/setup-intent', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: { email: 'test@test.com' },
        user: { praxisId: 'tenant-1', email: 'test@test.com', name: 'Test User' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('clientSecret');
    });

    it('should require praxis ID', async () => {
      const handlers = getRouteHandlers('/setup-intent', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: {},
        user: { email: 'test@test.com' }, // No praxisId
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /subscription', () => {
    it('should create subscription with trial', async () => {
      const handlers = getRouteHandlers('/subscription', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: { tier: 'PROFESSIONAL', trial: true },
        user: { praxisId: 'tenant-1', email: 'test@test.com' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('subscriptionId');
    });

    it('should create subscription without trial', async () => {
      const handlers = getRouteHandlers('/subscription', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: { tier: 'STARTER', trial: false },
        user: { praxisId: 'tenant-1', email: 'test@test.com' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should reject invalid tier', async () => {
      const handlers = getRouteHandlers('/subscription', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: { tier: 'INVALID' },
        user: { praxisId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        error: 'Invalid subscription payload',
      });
      expect(billingServiceMocks.createSubscription).not.toHaveBeenCalled();
      expect(billingServiceMocks.createSubscriptionWithTrial).not.toHaveBeenCalled();
    });

    it('should return unknown error message for non-Error failures', async () => {
      prismaDbMocks.tenantFindUnique.mockRejectedValueOnce('db-error-string');

      const handlers = getRouteHandlers('/subscription', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        body: { tier: 'PROFESSIONAL', trial: false },
        user: { praxisId: 'tenant-1', email: 'test@test.com' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body).toMatchObject({
        error: 'Failed to create subscription',
        message: 'Unknown error',
      });
    });
  });

  describe('GET /subscription', () => {
    it('should return subscription status', async () => {
      const handlers = getRouteHandlers('/subscription', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        user: { praxisId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('hasSubscription');
    });

    it('should handle no subscription', async () => {
      prismaDbMocks.subscriptionFindUnique.mockResolvedValueOnce(null);

      const handlers = getRouteHandlers('/subscription', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        user: { praxisId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('hasSubscription', false);
    });
  });

  describe('DELETE /subscription', () => {
    it('should cancel subscription', async () => {
      const handlers = getRouteHandlers('/subscription', 'delete');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        user: { praxisId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should return 404 if no subscription', async () => {
      prismaDbMocks.subscriptionFindUnique.mockResolvedValueOnce({ stripeSubId: null });

      const handlers = getRouteHandlers('/subscription', 'delete');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        user: { praxisId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /payment-methods', () => {
    it('should return payment methods', async () => {
      const handlers = getRouteHandlers('/payment-methods', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        user: { praxisId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('methods');
      expect(Array.isArray((res.body as { methods: unknown[] }).methods)).toBe(true);
    });

    it('should return empty array if no customer', async () => {
      prismaDbMocks.tenantFindUnique.mockResolvedValueOnce({
        id: 'tenant-1',
        stripeCustomerId: null,
      });

      const handlers = getRouteHandlers('/payment-methods', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        user: { praxisId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect((res.body as { methods: unknown[] }).methods).toHaveLength(0);
    });
  });

  describe('GET /invoices', () => {
    it('should return invoices', async () => {
      const handlers = getRouteHandlers('/invoices', 'get');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      const req = {
        user: { praxisId: 'tenant-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('invoices');
      expect(res.body).toHaveProperty('upcoming');
    });
  });

  describe('POST /webhook', () => {
    it('should handle stripe webhook', async () => {
      const handlers = getRouteHandlers('/webhook', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec-test';

      const req = {
        body: JSON.stringify({ type: 'invoice.paid', data: { object: { id: 'inv-1' } } }),
        headers: { 'stripe-signature': 'sig-123' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('received', true);
    });

    it('should reject missing signature', async () => {
      const handlers = getRouteHandlers('/webhook', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec-test';

      const req = {
        body: '{}',
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should reject if secret not configured', async () => {
      const handlers = getRouteHandlers('/webhook', 'post');
      const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

      process.env.STRIPE_WEBHOOK_SECRET = '';

      const req = {
        body: '{}',
        headers: { 'stripe-signature': 'sig-123' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
