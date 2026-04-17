import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'crypto';

const subscriptionManagerMocks = vi.hoisted(() => ({
  handleWebhook: vi.fn(),
  getSubscription: vi.fn(),
}));

const socketMocks = vi.hoisted(() => ({
  emitFhirNotification: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('../services/pvs/fhir/fhir-subscription-manager.js', () => ({
  subscriptionManager: subscriptionManagerMocks,
}));

vi.mock('../socket.js', () => ({
  emitFhirNotification: socketMocks.emitFhirNotification,
}));

vi.mock('../logger.js', () => ({
  createLogger: vi.fn(() => loggerMocks),
}));

import router, { verifySignature } from './fhir-webhook.routes';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'post') {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const routeLayer = layers.find((layer) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods?.[method];
  });

  expect(routeLayer).toBeDefined();
  return routeLayer!.route!.stack.map((stackEntry) => stackEntry.handle);
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

function signPayload(payload: unknown, secret: string): string {
  const body = JSON.stringify(payload);
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('fhir webhook routes', () => {
  const originalSecret = process.env.FHIR_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FHIR_WEBHOOK_SECRET = 'fhir-test-secret';

    vi.mocked(subscriptionManagerMocks.handleWebhook).mockResolvedValue(undefined as never);
    vi.mocked(subscriptionManagerMocks.getSubscription).mockReturnValue({
      tenantId: 'tenant-1',
    } as never);
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.FHIR_WEBHOOK_SECRET;
      return;
    }

    process.env.FHIR_WEBHOOK_SECRET = originalSecret;
  });

  it('accepts a valid signed webhook and emits realtime notification', async () => {
    const handlers = getRouteHandlers('/:subscriptionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const payload = {
      resourceType: 'Patient',
      id: 'patient-1',
      event: 'update',
      resource: { id: 'patient-1' },
    };

    const signature = signPayload(payload, process.env.FHIR_WEBHOOK_SECRET as string);

    const req = {
      params: { subscriptionId: 'sub-1' },
      body: payload,
      headers: { 'x-hub-signature-256': `sha256=${signature}` },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(subscriptionManagerMocks.handleWebhook).toHaveBeenCalledWith('sub-1', {
      resourceType: 'Patient',
      id: 'patient-1',
      event: 'update',
      resource: { id: 'patient-1' },
    });
    expect(socketMocks.emitFhirNotification).toHaveBeenCalledWith({
      subscriptionId: 'sub-1',
      tenantId: 'tenant-1',
      resourceType: 'Patient',
      event: 'update',
      resourceId: 'patient-1',
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects signed mode requests with missing signature header', async () => {
    const handlers = getRouteHandlers('/:subscriptionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { subscriptionId: 'sub-1' },
      body: { resourceType: 'Patient', id: 'patient-1' },
      headers: {},
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(subscriptionManagerMocks.handleWebhook).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Missing webhook signature' });
  });

  it('rejects invalid signatures', async () => {
    const handlers = getRouteHandlers('/:subscriptionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { subscriptionId: 'sub-1' },
      body: { resourceType: 'Patient', id: 'patient-1' },
      headers: { 'x-hub-signature': 'sha256=invalid-signature' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(subscriptionManagerMocks.handleWebhook).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid signature' });
  });

  it('accepts webhook without signature when secret is not configured', async () => {
    delete process.env.FHIR_WEBHOOK_SECRET;

    const handlers = getRouteHandlers('/:subscriptionId', 'post');
    const handler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      params: { subscriptionId: 'sub-1' },
      body: { resourceType: 'Patient', id: 'patient-1', event: 'create' },
      headers: {},
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(subscriptionManagerMocks.handleWebhook).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('verifies hex and base64 signatures', () => {
    const payload = { resourceType: 'Patient', id: 'patient-1' };
    const secret = process.env.FHIR_WEBHOOK_SECRET as string;

    const expectedHex = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    const expectedBase64 = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('base64');

    expect(verifySignature(payload, `sha256=${expectedHex}`)).toBe(true);
    expect(verifySignature(payload, `v1=${expectedHex}`)).toBe(true);
    expect(verifySignature(payload, expectedBase64)).toBe(true);
    expect(verifySignature(payload, 'sha256=deadbeef')).toBe(false);
  });
});
