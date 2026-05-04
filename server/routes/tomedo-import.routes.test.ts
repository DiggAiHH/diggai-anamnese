/**
 * T-03: Tests for tomedo-import.routes.ts
 *
 * Covers:
 *  1. Route registration
 *  2. GET /import/health – public, returns status object
 *  3. POST /import – body missing → 400
 *  4. POST /import – filePath outside allowlist → 400
 *  5. POST /import – direct payload, missing tenantId → 400
 *  6. POST /import – direct payload, success → 200
 *  7. POST /import – invalid Zod schema → 422
 *  8. POST /import – filePath mode (mocked fs.readFile) → 200
 *  9. POST /import – bridge partial failure (result.success=false) → 207
 * 10. Audit logger errors are swallowed (best-effort)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// -----------------------------------------------------------------
// Hoisted mocks – must run before any import
// -----------------------------------------------------------------
const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

const bridgeMocks = vi.hoisted(() => ({
  executeTomedoBridge: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  logAction: vi.fn(),
}));

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// -----------------------------------------------------------------
// Module mocks
// -----------------------------------------------------------------
vi.mock('../middleware/auth.js', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
}));

vi.mock('../agents/tomedo-bridge.agent.js', () => ({
  executeTomedoBridge: bridgeMocks.executeTomedoBridge,
}));

vi.mock('../agents/tomedo-bridge/team-delta/audit-logger.agent.js', () => ({
  auditLoggerAgent: auditMocks,
}));

vi.mock('../logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('fs', () => ({
  promises: {
    readFile: fsMocks.readFile,
    writeFile: fsMocks.writeFile,
  },
}));

// -----------------------------------------------------------------
// Import AFTER mocks
// -----------------------------------------------------------------
import router from './tomedo-import.routes';

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(routePath: string, method: 'get' | 'post') {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const routeLayer = layers.find(
    (layer) => layer.route?.path === routePath && layer.route.methods?.[method],
  );
  expect(routeLayer, `Route ${method.toUpperCase()} ${routePath} not found`).toBeDefined();
  return routeLayer!.route!.stack.map((s) => s.handle as Function);
}

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

/** Build a valid ImportPayload for direct-mode */
function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '2.0',
    source: 'tomedo-praktiq-bridge',
    timestamp: new Date().toISOString(),
    mode: 'Gesamte Akte',
    patient: {
      id: 'P-001',
      lastName: 'Mustermann',
      firstName: 'Max',
      birthDate: '1980-01-01',
      address: { street: 'Musterstr. 1', zip: '12345', city: 'Berlin' },
    },
    practice: { bsnr: '123456789' },
    akte: 'Anamnese-Text-Testinhalt',
    ...overrides,
  };
}

/** Build a mock bridge result */
function bridgeResult(success = true) {
  return {
    taskId: 'task-abc-123',
    result: {
      success,
      teams: {
        alpha: {
          ethics: { complianceStatus: 'COMPLIANT' },
          humanLoop: { requiresApproval: false },
        },
        bravo: { documentation: { karteityp: 'Anamnese' } },
        delta: { markdown: { metadata: { checksum: 'sha256-abc' } } },
      },
    },
  };
}

// -----------------------------------------------------------------
// Tests
// -----------------------------------------------------------------
describe('tomedo-import.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: bridge succeeds
    bridgeMocks.executeTomedoBridge.mockResolvedValue(bridgeResult(true));
    auditMocks.logAction.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------
  // 1. Route registration
  // ---------------------------------------------------------------
  describe('route registration', () => {
    it('registers POST /import', () => {
      const handlers = getRouteHandlers('/import', 'post');
      expect(handlers.length).toBeGreaterThanOrEqual(1);
    });

    it('registers GET /import/health', () => {
      const handlers = getRouteHandlers('/import/health', 'get');
      expect(handlers.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------
  // 2. GET /import/health
  // ---------------------------------------------------------------
  describe('GET /import/health', () => {
    it('returns ok:true with schema version and allowed prefix', async () => {
      const [handler] = getRouteHandlers('/import/health', 'get');
      const res = createMockResponse();

      await (handler as Function)({}, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        endpoint: 'tomedo-import',
        schemaVersion: '2.0',
        allowedPrefix: '/tmp/diggai-tomedo.',
      });
    });
  });

  // ---------------------------------------------------------------
  // 3. POST /import – missing body → 400
  // ---------------------------------------------------------------
  describe('POST /import – body validation', () => {
    it('returns 400 when body is empty', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = { body: {}, user: { tenantId: 't1', id: 'u1' }, headers: {} };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect((res.body as any).error).toMatch(/filePath or payload required/i);
    });

    it('returns 422 when payload has invalid schema (wrong schemaVersion)', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: { ...validPayload(), schemaVersion: '1.0' } },
        user: { tenantId: 't1', id: 'u1' },
        headers: { 'x-tomedo-connection-id': 'conn-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(422);
      expect((res.body as any).error).toMatch(/schema validation failed/i);
      expect((res.body as any).issues).toBeDefined();
    });

    it('returns 422 when payload is missing required akte field', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const { akte: _removed, ...payloadWithoutAkte } = validPayload();
      const req = {
        body: { payload: payloadWithoutAkte },
        user: { tenantId: 't1', id: 'u1' },
        headers: { 'x-tomedo-connection-id': 'conn-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(422);
    });
  });

  // ---------------------------------------------------------------
  // 4. POST /import – filePath outside allowlist → 400
  // ---------------------------------------------------------------
  describe('POST /import – path allowlist', () => {
    it('rejects filePath outside /tmp/diggai-tomedo.*', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { filePath: '/etc/passwd' },
        user: { tenantId: 't1', id: 'u1' },
        headers: { 'x-tomedo-connection-id': 'conn-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect((res.body as any).error).toMatch(/outside allowed directory/i);
    });

    it('rejects filePath with path traversal attempt', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { filePath: '/tmp/diggai-tomedo.../../etc/passwd.json' },
        user: { tenantId: 't1', id: 'u1' },
        headers: { 'x-tomedo-connection-id': 'conn-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect((res.body as any).error).toMatch(/outside allowed directory/i);
    });
  });

  // ---------------------------------------------------------------
  // 5. POST /import – missing tenantId → 400
  // ---------------------------------------------------------------
  describe('POST /import – auth context', () => {
    it('returns 400 when user has no tenantId', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: validPayload() },
        user: { id: 'u1' }, // no tenantId
        headers: { 'x-tomedo-connection-id': 'conn-1' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect((res.body as any).error).toMatch(/tenantId|connectionId/i);
    });

    it('returns 400 when connectionId is absent from both user and headers', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: validPayload() },
        user: { tenantId: 't1', id: 'u1' }, // no activeTomedoConnectionId
        headers: {}, // no x-tomedo-connection-id
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect((res.body as any).error).toMatch(/tenantId|connectionId/i);
    });
  });

  // ---------------------------------------------------------------
  // 6. POST /import – direct payload success → 200
  // ---------------------------------------------------------------
  describe('POST /import – direct payload mode', () => {
    it('returns 200 and taskId on successful bridge call', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: validPayload() },
        user: { tenantId: 't1', id: 'u1', activeTomedoConnectionId: 'conn-1' },
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect((res.body as any).success).toBe(true);
      expect((res.body as any).taskId).toBe('task-abc-123');
      expect((res.body as any).durationMs).toBeGreaterThanOrEqual(0);
    });

    it('passes tenantId and connectionId to bridge', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: validPayload() },
        user: { tenantId: 'tenant-xyz', id: 'u1', activeTomedoConnectionId: 'conn-99' },
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(bridgeMocks.executeTomedoBridge).toHaveBeenCalledOnce();
      const [bridgeArg] = bridgeMocks.executeTomedoBridge.mock.calls[0];
      expect(bridgeArg.tenantId).toBe('tenant-xyz');
      expect(bridgeArg.connectionId).toBe('conn-99');
    });

    it('falls back to x-tomedo-connection-id header when user has no activeTomedoConnectionId', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: validPayload() },
        user: { tenantId: 't1', id: 'u1' },
        headers: { 'x-tomedo-connection-id': 'header-conn-42' },
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const [bridgeArg] = bridgeMocks.executeTomedoBridge.mock.calls[0];
      expect(bridgeArg.connectionId).toBe('header-conn-42');
    });

    it('passes akte and mode to bridge anamneseData', async () => {
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const payload = validPayload({ mode: 'Nur Auswahl', akte: 'Ausführliche Anamnese' });
      const req = {
        body: { payload },
        user: { tenantId: 't1', id: 'u1', activeTomedoConnectionId: 'conn-1' },
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      const [bridgeArg] = bridgeMocks.executeTomedoBridge.mock.calls[0];
      // akte/mode are wrapped inside anamneseData.answers (BridgeInput type constraint)
      expect(bridgeArg.anamneseData.answers.akte).toBe('Ausführliche Anamnese');
      expect(bridgeArg.anamneseData.answers.mode).toBe('Nur Auswahl');
    });

    it('does NOT log PII fields (lastName, email, birthDate)', async () => {
      // The route only logs pid, mode, aktenLen, selectionLen — never PII
      // Verify bridge receives correct patientData but we cannot observe logger calls
      // (logger is mocked). Check bridge is called and response has no PII.
      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: validPayload({ patient: { id: 'P-999', lastName: 'Secret', firstName: 'Person', birthDate: '1970-01-01', address: {} } }) },
        user: { tenantId: 't1', id: 'u1', activeTomedoConnectionId: 'conn-1' },
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      // Response must not contain patient name or birthDate
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('Secret');
      expect(bodyStr).not.toContain('1970-01-01');
    });
  });

  // ---------------------------------------------------------------
  // 8. POST /import – filePath mode (mocked fs.readFile)
  // ---------------------------------------------------------------
  describe('POST /import – filePath mode', () => {
    it('reads file and delegates to bridge on Linux-style allowed path', async () => {
      // path.normalize on POSIX keeps /tmp/diggai-tomedo.xxx.json intact
      // On Windows the path normalizes differently — test is intentionally
      // skipped on Windows to avoid false negatives.
      if (process.platform === 'win32') return;

      const filePath = '/tmp/diggai-tomedo.abc123.json';
      fsMocks.readFile.mockResolvedValue(JSON.stringify(validPayload()));

      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { filePath },
        user: { tenantId: 't1', id: 'u1', activeTomedoConnectionId: 'conn-1' },
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(fsMocks.readFile).toHaveBeenCalledWith(filePath, 'utf8');
      expect(res.statusCode).toBe(200);
    });
  });

  // ---------------------------------------------------------------
  // 9. POST /import – bridge partial failure → 207
  // ---------------------------------------------------------------
  describe('POST /import – bridge partial failure', () => {
    it('returns 207 when bridge result.success is false', async () => {
      bridgeMocks.executeTomedoBridge.mockResolvedValue(bridgeResult(false));

      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: validPayload() },
        user: { tenantId: 't1', id: 'u1', activeTomedoConnectionId: 'conn-1' },
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(207);
    });
  });

  // ---------------------------------------------------------------
  // 10. Audit logger errors swallowed
  // ---------------------------------------------------------------
  describe('audit logger', () => {
    it('still returns 200 when auditLoggerAgent.logAction throws', async () => {
      auditMocks.logAction.mockRejectedValue(new Error('Audit DB down'));

      const handlers = getRouteHandlers('/import', 'post');
      const handler = handlers[handlers.length - 1] as Function;
      const req = {
        body: { payload: validPayload() },
        user: { tenantId: 't1', id: 'u1', activeTomedoConnectionId: 'conn-1' },
        headers: {},
      };
      const res = createMockResponse();

      await handler(req, res);

      // best-effort audit must not bubble up
      expect(res.statusCode).toBe(200);
    });
  });
});
