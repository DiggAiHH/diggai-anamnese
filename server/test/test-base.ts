/**
 * Base setup for route tests
 * Imports common mocks and utilities
 */

// Import and setup prisma mock first
import './prisma-mock';

import { beforeEach, vi } from 'vitest';

// Common middleware mocks
export const middlewareMocks = vi.hoisted(() => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRoleFactory: vi.fn((...roles) => {
    const mockFn = vi.fn((_req, _res, next) => next());
    (mockFn as any)._roles = roles;
    return mockFn;
  }),
  requireRole: vi.fn((_req, _res, next) => next()),
  requireTenant: vi.fn((_req, _res, next) => next()),
  csrfProtection: vi.fn((_req, _res, next) => next()),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: middlewareMocks.requireAuth,
  requireRole: middlewareMocks.requireRoleFactory,
  requireTenant: middlewareMocks.requireTenant,
}));

vi.mock('../middleware/csrf', () => ({
  csrfProtection: middlewareMocks.csrfProtection,
}));

// Common service mocks
export const encryptionMocks = vi.hoisted(() => ({
  encrypt: vi.fn((v) => `enc-${v}`),
  decrypt: vi.fn((v) => v.replace('enc-', '')),
  hashEmail: vi.fn((v) => `hash-${v}`),
}));

vi.mock('../services/encryption', () => encryptionMocks);

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Re-export utilities
export { createMockRequest, createMockResponse, createMockAuthRequest, getRouteHandlers, getFinalHandler } from './request-helper';
export { Factories, Scenarios, generateUUID } from './factories';
export { prismaMock } from './prisma-mock';
