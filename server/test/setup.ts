/**
 * Vitest Setup File
 * Global mocks and test configuration
 */
import { vi } from 'vitest';

// Mock the db module globally
vi.mock('../db', async () => {
  const actual = await vi.importActual<typeof import('../db')>('../db');
  return {
    ...actual,
    prisma: {
      // Patient-related
      patient: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      patientSession: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      answer: {
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      
      // Therapy-related
      therapyPlan: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      therapyMeasure: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      therapyTemplate: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      clinicalAlert: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      anonPatientId: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      
      // Payment-related
      paymentTransaction: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      
      // PWA-related
      patientAccount: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      diaryEntry: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
      },
      providerMessage: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
      },
      measureTracking: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      patientConsent: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      patientDevice: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findFirst: vi.fn(),
      },
      
      // Atom-related
      medicalAtom: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      atomDraft: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      
      // Tenant-related
      tenant: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      praxis: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      
      // Other
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      practiceEncryptionKey: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      secureExportLink: {
        create: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      packageImportLog: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      triageEvent: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      
      // Transaction helper
      $transaction: vi.fn((ops) => Promise.all(ops)),
      
      // Admin-related
      arztUser: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      rolePermission: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      permission: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      userPermission: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      waitingContent: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  compare: vi.fn(() => Promise.resolve(true)),
  hash: vi.fn(() => Promise.resolve('bcrypt-hash')),
}));

// Note: Encryption service is NOT mocked globally
// Security tests need the real implementation
// Unit tests should mock it locally if needed

// Mock auth middleware wrappers while preserving the real auth helpers.
// This keeps route tests lightweight without breaking middleware unit tests
// that need the actual token/permission implementation.
vi.mock('../middleware/auth', async () => {
  const actual = await vi.importActual<typeof import('../middleware/auth')>('../middleware/auth');
  return {
    ...actual,
    requireAuth: vi.fn((_req, _res, next) => next()),
    requireRole: vi.fn(() => vi.fn((_req, _res, next) => next())),
    requireTenant: vi.fn((_req, _res, next) => next()),
  };
});

// Mock CSRF middleware
vi.mock('../middleware/csrf', () => ({
  csrfProtection: vi.fn((_req, _res, next) => next()),
}));

// Mock i18n
vi.mock('../i18n', () => ({
  t: vi.fn((_lang: string, key: string) => key),
  parseLang: vi.fn(() => 'de'),
  LocalizedError: class LocalizedError extends Error {
    constructor(public errorKey: string) {
      super(errorKey);
      this.name = 'LocalizedError';
    }
  },
}));
