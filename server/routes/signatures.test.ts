/**
 * server/routes/signatures.test.ts
 *
 * Vitest unit tests for POST /api/signatures.
 * Verifies: Zod validation errors return structured JSON (K8 fix).
 *
 * Arzt-Feedback 2026-05-03
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Hoisted mocks ───────────────────────────────────────────

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  requireRole: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

const signatureServiceMocks = vi.hoisted(() => ({
  encryptSignature: vi.fn((v: string) => `enc:${v}`),
  decryptSignature: vi.fn((v: string) => v.replace('enc:', '')),
  hashDocument: vi.fn(() => 'a'.repeat(64)),
  verifyDocumentHash: vi.fn(() => true),
  hashIp: vi.fn(() => 'hashed-ip'),
  isValidSignatureData: vi.fn(() => true),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRole,
}));

vi.mock('../services/signatureService', () => signatureServiceMocks);

vi.mock('../db', () => ({
  prisma: {
    signature: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../middleware/csrf', () => ({
  csrfProtection: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

import router from './signatures';
import { prisma } from '../db';

// ─── Helpers ─────────────────────────────────────────────────

type JsonPayload = Record<string, unknown>;

function createMockResponse() {
  const res = {
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
  return res;
}

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandler(path: string, method: 'get' | 'post') {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const layer = layers.find(
    (l) => l.route?.path === path && l.route?.methods?.[method],
  );
  expect(layer, `route ${method.toUpperCase()} ${path} not found`).toBeDefined();
  // Return the last handler (after any middleware)
  const stack = layer!.route!.stack;
  return stack[stack.length - 1].handle as (
    req: unknown,
    res: ReturnType<typeof createMockResponse>,
  ) => Promise<void>;
}

function buildRequest(body: JsonPayload, auth = { role: 'patient', userId: 'u1' }) {
  return {
    body,
    params: {},
    query: {},
    headers: { 'user-agent': 'vitest', 'x-forwarded-for': '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
    auth,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('POST /api/signatures — Zod validation (K8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 with structured details on empty body', async () => {
    const handler = getRouteHandler('/', 'post');
    const req = buildRequest({});
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const body = res.body as { error: string; details: unknown[] };
    expect(body.error).toBeTruthy();
    expect(Array.isArray(body.details)).toBe(true);
    expect((body.details as unknown[]).length).toBeGreaterThan(0);
  });

  it('returns 400 when signatureData is too short', async () => {
    const handler = getRouteHandler('/', 'post');
    const req = buildRequest({
      signatureData: 'short',
      documentHash: 'a'.repeat(64),
      formType: 'DSGVO',
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const body = res.body as { details: Array<{ path: string[]; code: string }> };
    const sigIssue = body.details.find((d) => d.path?.[0] === 'signatureData');
    expect(sigIssue).toBeDefined();
  });

  it('returns 400 when documentHash has wrong length', async () => {
    const handler = getRouteHandler('/', 'post');
    const req = buildRequest({
      signatureData: 'data:image/png;base64,' + 'A'.repeat(200),
      documentHash: 'tooshort',
      formType: 'DSGVO',
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const body = res.body as { details: Array<{ path: string[] }> };
    const hashIssue = body.details.find((d) => d.path?.[0] === 'documentHash');
    expect(hashIssue).toBeDefined();
  });

  it('returns 400 when formType is invalid', async () => {
    const handler = getRouteHandler('/', 'post');
    const req = buildRequest({
      signatureData: 'data:image/png;base64,' + 'A'.repeat(200),
      documentHash: 'a'.repeat(64),
      formType: 'UNKNOWN_TYPE',
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const body = res.body as { details: Array<{ path: string[] }> };
    const typeIssue = body.details.find((d) => d.path?.[0] === 'formType');
    expect(typeIssue).toBeDefined();
  });

  it('returns 400 when isValidSignatureData rejects payload', async () => {
    signatureServiceMocks.isValidSignatureData.mockReturnValueOnce(false);

    const handler = getRouteHandler('/', 'post');
    const req = buildRequest({
      signatureData: 'data:image/png;base64,' + 'A'.repeat(200),
      documentHash: 'a'.repeat(64),
      formType: 'DSGVO',
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const body = res.body as { error: string };
    expect(body.error).toBeTruthy();
  });

  it('returns 201 with signature id on valid payload', async () => {
    const mockSignature = {
      id: 'sig-123',
      formType: 'DSGVO',
      signerRole: 'PATIENT',
      documentVersion: '1.0',
      documentHash: 'a'.repeat(64),
      createdAt: new Date(),
    };
    (prisma.signature.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSignature);

    const handler = getRouteHandler('/', 'post');
    const req = buildRequest({
      signatureData: 'data:image/png;base64,' + 'A'.repeat(200),
      documentHash: 'a'.repeat(64),
      formType: 'DSGVO',
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    const body = res.body as { success: boolean; signature: { id: string } };
    expect(body.success).toBe(true);
    expect(body.signature.id).toBe('sig-123');
  });
});
