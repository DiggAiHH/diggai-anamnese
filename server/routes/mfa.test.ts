import { beforeEach, describe, expect, it, vi } from 'vitest';

const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn(() => middlewareMocks.requireRole),
  requireRole: vi.fn((_req, _res, next) => next()),
}));

const MockPackageError = vi.hoisted(() => class extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
});

const serviceMocks = vi.hoisted(() => ({
  decryptEncryptedPackage: vi.fn(),
  importEncryptedPackagePayload: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
}));

vi.mock('../db', () => ({
  prisma: {
    patientSession: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    arztUser: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../services/export/package.service', () => ({
  decryptEncryptedPackage: serviceMocks.decryptEncryptedPackage,
  PackageError: MockPackageError,
}));

vi.mock('../services/export/package-import.service', () => ({
  importEncryptedPackagePayload: serviceMocks.importEncryptedPackagePayload,
}));

import router from './mfa';
import { prisma } from '../db';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

function getRouteHandlers(path: string, method: 'post') {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const routeLayer = layers.find((layer) => layer.route?.path === path && layer.route.methods?.[method]);

  expect(routeLayer).toBeDefined();
  return routeLayer!.route!.stack.map((entry) => entry.handle);
}

function createMockResponse() {
  return {
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
}

describe('mfa imports route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('protects imports with mfa/admin auth chain', () => {
    const handlers = getRouteHandlers('/imports', 'post');
    expect(handlers).toContain(middlewareMocks.requireAuth);
    expect(handlers).toContain(middlewareMocks.requireRole);
  });

  it('rejects missing file uploads', async () => {
    const handlers = getRouteHandlers('/imports', 'post');
    const importHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    const req = {
      tenantId: 'tenant-a',
      auth: { userId: 'mfa-1', tenantId: 'tenant-a' },
    };
    const res = createMockResponse();

    await importHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Es wurde keine JSON-Datei hochgeladen',
      code: 'PACKAGE_FILE_REQUIRED',
    });
  });

  it('imports decrypted packages and writes an audit log', async () => {
    const handlers = getRouteHandlers('/imports', 'post');
    const importHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    serviceMocks.decryptEncryptedPackage.mockResolvedValue({
      package: { checksum: 'checksum-1' },
      payload: { sessionId: 'session-imported' },
    });
    serviceMocks.importEncryptedPackagePayload.mockResolvedValue({
      status: 'imported',
      packageId: 'package-1',
      sessionId: 'session-imported',
      preview: {
        patient: { name: 'Max Mustermann', email: 'patient@example.com' },
        service: 'Termin / Anamnese',
        answers: [],
      },
    });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const req = {
      tenantId: 'tenant-a',
      auth: { userId: 'mfa-1', tenantId: 'tenant-a' },
      file: {
        originalname: 'secure-package.json',
        buffer: Buffer.from(JSON.stringify({ version: 'anamnese-package-v1' }), 'utf-8'),
      },
    };
    const res = createMockResponse();

    await importHandler(req, res);

    expect(serviceMocks.decryptEncryptedPackage).toHaveBeenCalledWith({ version: 'anamnese-package-v1' }, 'tenant-a');
    expect(serviceMocks.importEncryptedPackagePayload).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      checksum: 'checksum-1',
      payload: { sessionId: 'session-imported' },
      importedByUserId: 'mfa-1',
      sourceFilename: 'secure-package.json',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        userId: 'mfa-1',
        action: 'IMPORT_PACKAGE',
      }),
    }));
    expect(res.body).toMatchObject({
      status: 'imported',
      sessionId: 'session-imported',
    });
  });

  it('maps package errors to response codes', async () => {
    const handlers = getRouteHandlers('/imports', 'post');
    const importHandler = handlers[handlers.length - 1] as (req: unknown, res: unknown) => Promise<void>;

    serviceMocks.decryptEncryptedPackage.mockRejectedValue(
      new MockPackageError(410, 'PACKAGE_LINK_EXPIRED', 'Der Download-Link ist abgelaufen'),
    );

    const req = {
      tenantId: 'tenant-a',
      auth: { userId: 'mfa-1', tenantId: 'tenant-a' },
      file: {
        originalname: 'secure-package.json',
        buffer: Buffer.from(JSON.stringify({ version: 'anamnese-package-v1' }), 'utf-8'),
      },
    };
    const res = createMockResponse();

    await importHandler(req, res);

    expect(res.statusCode).toBe(410);
    expect(res.body).toEqual({
      error: 'Der Download-Link ist abgelaufen',
      code: 'PACKAGE_LINK_EXPIRED',
    });
  });
});
