import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock prisma with proper hoisting
const mockFindFirst = vi.hoisted(() => vi.fn());

vi.mock('../db', () => ({
  prisma: {
    tenant: {
      findFirst: mockFindFirst,
    },
  },
}));

import {
  resolveTenant,
  requireTenant,
  requirePlan,
  clearTenantCache,
  getTenantCacheStats,
  type TenantContext,
} from './tenant';

// Helper function to create mock response
function createResponse() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    headers: new Map<string, string>(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers.set(name.toLowerCase(), value);
      return this;
    },
  };
}

// Helper to create mock request
function createRequest(options: {
  host?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  tenant?: TenantContext;
  tenantId?: string;
} = {}): Request {
  const headers: Record<string, string> = {
    host: options.host || 'localhost:3000',
    ...options.headers,
  };

  return {
    headers,
    query: options.query || {},
    path: '/api/sessions',
    tenant: options.tenant,
    tenantId: options.tenantId,
  } as unknown as Request;
}

describe('Tenant Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockReset();
    clearTenantCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Tenant Resolution Tests
  // ============================================
  describe('resolveTenant', () => {
    it('should resolve tenant from X-Tenant-ID header', async () => {
      const mockTenant = {
        id: 'tenant-123',
        subdomain: 'praxis-mueller',
        name: 'Praxis Dr. Müller',
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        settings: {},
      };
      // Localhost: no custom domain check. Single identifier lookup.
      mockFindFirst.mockResolvedValueOnce(mockTenant);

      const req = createRequest({
        headers: { 'x-tenant-id': 'praxis-mueller' },
      });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(req.tenant).toBeDefined();
      expect(req.tenant?.id).toBe('tenant-123');
      expect(next).toHaveBeenCalled();
    });

    it('should resolve Klaproth root tenant from x-tenant-id: klaproth', async () => {
      const mockKlaproth = {
        id: 'tenant-klaproth',
        subdomain: 'default',
        name: 'Praxis Dr. Klaproth',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst.mockResolvedValueOnce(mockKlaproth);

      const req = createRequest({
        headers: { 'x-tenant-id': 'klaproth' },
      });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(req.tenant).toBeDefined();
      expect(req.tenant?.name).toBe('Praxis Dr. Klaproth');
      expect(next).toHaveBeenCalled();
    });

    it('should resolve tenant from subdomain', async () => {
      const mockTenant = {
        id: 'tenant-456',
        subdomain: 'dr-schmidt',
        name: 'Praxis Dr. Schmidt',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null) // custom domain check
        .mockResolvedValueOnce(mockTenant); // identifier check

      const req = createRequest({ host: 'dr-schmidt.diggai.de' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          customDomain: 'dr-schmidt.diggai.de',
          status: 'ACTIVE',
        },
        select: expect.any(Object),
      });
      expect(req.tenant?.subdomain).toBe('dr-schmidt');
      expect(next).toHaveBeenCalled();
    });

    it('should resolve tenant from query parameter', async () => {
      const mockTenant = {
        id: 'tenant-789',
        subdomain: 'test-praxis',
        name: 'Test Praxis',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      // Localhost: no custom domain check. Single identifier lookup.
      mockFindFirst.mockResolvedValueOnce(mockTenant);

      const req = createRequest({
        query: { tenant: 'test-praxis' },
      });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(req.tenant?.id).toBe('tenant-789');
      expect(next).toHaveBeenCalled();
    });

    it('should reject conflicting tenant identifier and host subdomain', async () => {
      const req = createRequest({
        host: 'tenant-a.example.com',
        headers: { 'x-tenant-id': 'tenant-b' },
      });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.payload).toEqual({
        error: 'Tenant-Konflikt',
        code: 'TENANT_OVERRIDE_CONFLICT',
        message: 'Tenant-Override widerspricht der Host-Auflösung.',
      });
    });

    it('should return 404 for non-existent tenant', async () => {
      mockFindFirst
        .mockResolvedValueOnce(null) // custom domain check
        .mockResolvedValueOnce(null); // identifier check

      const req = createRequest({
        host: 'unknown-praxis.diggai.de',
      });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(res.statusCode).toBe(404);
      expect(res.payload).toEqual({
        error: 'Praxis nicht gefunden',
        code: 'TENANT_NOT_FOUND',
        message: 'Die angegebene Praxis existiert nicht oder ist nicht aktiv.',
      });
    });

    it('should return 403 for suspended tenant', async () => {
      const mockTenant = {
        id: 'tenant-suspended',
        subdomain: 'suspended-praxis',
        name: 'Suspended Praxis',
        plan: 'STARTER',
        status: 'SUSPENDED',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      const req = createRequest({
        host: 'suspended-praxis.diggai.de',
      });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(res.statusCode).toBe(403);
      expect(res.payload).toEqual({
        error: 'Praxis gesperrt',
        code: 'TENANT_SUSPENDED',
        message: 'Diese Praxis ist vorübergehend gesperrt. Bitte kontaktieren Sie den Support.',
      });
    });

    it('should return 403 for deleted tenant', async () => {
      const mockTenant = {
        id: 'tenant-deleted',
        subdomain: 'deleted-praxis',
        name: 'Deleted Praxis',
        plan: 'STARTER',
        status: 'DELETED',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      const req = createRequest({
        host: 'deleted-praxis.diggai.de',
      });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(res.statusCode).toBe(403);
      expect(res.payload).toEqual({
        error: 'Praxis nicht verfügbar',
        code: 'TENANT_DELETED',
        message: 'Diese Praxis wurde deaktiviert.',
      });
    });

    it('should use default tenant in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockDefaultTenant = {
        id: 'default-tenant',
        subdomain: 'default',
        name: 'Default Praxis',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      
      // Localhost: no custom domain check. Single fallback lookup.
      mockFindFirst.mockResolvedValueOnce(mockDefaultTenant);

      const req = createRequest({ host: 'localhost:3000' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(req.tenant?.subdomain).toBe('default');
      expect(next).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should resolve tenant from custom domain', async () => {
      const mockTenant = {
        id: 'tenant-custom',
        subdomain: 'dr-mueller',
        name: 'Praxis Dr. Müller',
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        customDomain: 'anamnese.dr-mueller.de',
        settings: {},
      };
      mockFindFirst.mockResolvedValueOnce(mockTenant);

      const req = createRequest({ host: 'anamnese.dr-mueller.de' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          customDomain: 'anamnese.dr-mueller.de',
          status: 'ACTIVE',
        },
        select: expect.any(Object),
      });
    });

    it('should skip custom domain resolution for localhost', async () => {
      const mockTenant = {
        id: 'tenant-local',
        subdomain: 'default',
        name: 'Default',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      const req = createRequest({ host: 'localhost:3001' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      // Should not query by customDomain for localhost
      const calls = mockFindFirst.mock.calls;
      const customDomainCalls = calls.filter((call: any) => call[0].where.customDomain);
      expect(customDomainCalls.length).toBe(0);
    });

    it('should skip custom domain resolution for IP addresses', async () => {
      const mockTenant = {
        id: 'tenant-local',
        subdomain: 'default',
        name: 'Default',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      const req = createRequest({ host: '192.168.1.100:3001' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      const calls = mockFindFirst.mock.calls;
      const customDomainCalls = calls.filter((call: any) => call[0].where.customDomain);
      expect(customDomainCalls.length).toBe(0);
    });

    it('should set tenant headers on response', async () => {
      const mockTenant = {
        id: 'tenant-123',
        subdomain: 'dr-test',
        name: 'Praxis Dr. Test',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      const req = createRequest({ host: 'dr-test.diggai.de' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(res.headers.get('x-tenant-name')).toBe('Praxis Dr. Test');
      expect(res.headers.get('x-tenant-plan')).toBe('ENTERPRISE');
    });

    it('should use cached tenant on subsequent requests', async () => {
      const mockTenant = {
        id: 'tenant-cached',
        subdomain: 'cached-praxis',
        name: 'Cached Praxis',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      const req1 = createRequest({ host: 'cached-praxis.diggai.de' });
      const res1 = createResponse();
      const next1 = vi.fn();

      await resolveTenant(req1 as unknown as Request, res1 as unknown as Response, next1);

      // Second request with same tenant
      const req2 = createRequest({ host: 'cached-praxis.diggai.de' });
      const res2 = createResponse();
      const next2 = vi.fn();

      await resolveTenant(req2 as unknown as Request, res2 as unknown as Response, next2);

      // 3 calls: custom domain miss (req1), identifier lookup (req1), custom domain miss (req2 — not cached)
      expect(mockFindFirst).toHaveBeenCalledTimes(3);
      expect(req2.tenant?.id).toBe('tenant-cached');
    });

    it('should handle database errors gracefully', async () => {
      mockFindFirst.mockRejectedValueOnce(new Error('DB Error'));

      const req = createRequest({ host: 'error-praxis.diggai.de' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================
  // requireTenant Tests
  // ============================================
  describe('requireTenant', () => {
    it('should allow request with valid tenant', () => {
      const req = createRequest({
        tenant: {
          id: 'tenant-123',
          subdomain: 'dr-test',
          name: 'Dr. Test',
          plan: 'STARTER',
          status: 'ACTIVE',
          settings: {},
        },
        tenantId: 'tenant-123',
      });
      const res = createResponse();
      const next = vi.fn();

      requireTenant(req as unknown as Request, res as unknown as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should reject request without tenant', () => {
      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      requireTenant(req as unknown as Request, res as unknown as Response, next);

      expect(res.statusCode).toBe(400);
      expect(res.payload).toEqual({
        error: 'Tenant context required',
        code: 'TENANT_REQUIRED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without tenantId', () => {
      const req = createRequest({
        tenant: {
          id: 'tenant-123',
          subdomain: 'dr-test',
          name: 'Dr. Test',
          plan: 'STARTER',
          status: 'ACTIVE',
          settings: {},
        },
      });
      const res = createResponse();
      const next = vi.fn();

      requireTenant(req as unknown as Request, res as unknown as Response, next);

      expect(res.statusCode).toBe(400);
    });
  });

  // ============================================
  // requirePlan Tests
  // ============================================
  describe('requirePlan', () => {
    it('should allow request with allowed plan', () => {
      const req = createRequest({
        tenant: {
          id: 'tenant-123',
          subdomain: 'dr-test',
          name: 'Dr. Test',
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          settings: {},
        },
      });
      const res = createResponse();
      const next = vi.fn();

      const middleware = requirePlan('STARTER', 'PROFESSIONAL', 'ENTERPRISE');
      middleware(req as unknown as Request, res as unknown as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject request with insufficient plan', () => {
      const req = createRequest({
        tenant: {
          id: 'tenant-123',
          subdomain: 'dr-test',
          name: 'Dr. Test',
          plan: 'STARTER',
          status: 'ACTIVE',
          settings: {},
        },
      });
      const res = createResponse();
      const next = vi.fn();

      const middleware = requirePlan('ENTERPRISE');
      middleware(req as unknown as Request, res as unknown as Response, next);

      expect(res.statusCode).toBe(403);
      expect(res.payload).toEqual({
        error: 'Feature not available in current plan',
        code: 'PLAN_LIMITATION',
        currentPlan: 'STARTER',
        requiredPlans: ['ENTERPRISE'],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without tenant context', () => {
      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      const middleware = requirePlan('STARTER');
      middleware(req as unknown as Request, res as unknown as Response, next);

      expect(res.statusCode).toBe(400);
      expect(res.payload).toEqual({
        error: 'Tenant context required',
      });
    });

    it('should support multiple allowed plans', () => {
      const req = createRequest({
        tenant: {
          id: 'tenant-123',
          subdomain: 'dr-test',
          name: 'Dr. Test',
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
          settings: {},
        },
      });
      const res = createResponse();
      const next = vi.fn();

      const middleware = requirePlan('PROFESSIONAL', 'ENTERPRISE');
      middleware(req as unknown as Request, res as unknown as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================
  // Tenant Cache Tests
  // ============================================
  describe('Tenant Cache', () => {
    it('should clear specific tenant from cache', async () => {
      const mockTenant = {
        id: 'tenant-123',
        subdomain: 'cache-test',
        name: 'Cache Test',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      // First request - populate cache (cache key is the full host)
      const req1 = createRequest({ host: 'cache-test.diggai.de' });
      await resolveTenant(req1 as unknown as Request, createResponse() as unknown as Response, vi.fn());

      expect(getTenantCacheStats().size).toBe(1);

      // Clear cache for specific tenant (identifier key, not full host)
      clearTenantCache('cache-test');

      expect(getTenantCacheStats().size).toBe(0);
    });

    it('should clear all tenants from cache', async () => {
      const mockTenant1 = {
        id: 'tenant-1',
        subdomain: 'praxis-a',
        name: 'Praxis A',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      const mockTenant2 = {
        id: 'tenant-2',
        subdomain: 'praxis-b',
        name: 'Praxis B',
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null).mockResolvedValueOnce(mockTenant1)
        .mockResolvedValueOnce(null).mockResolvedValueOnce(mockTenant2);

      // Populate cache
      await resolveTenant(
        createRequest({ host: 'praxis-a.diggai.de' }) as unknown as Request,
        createResponse() as unknown as Response,
        vi.fn()
      );
      await resolveTenant(
        createRequest({ host: 'praxis-b.diggai.de' }) as unknown as Request,
        createResponse() as unknown as Response,
        vi.fn()
      );

      expect(getTenantCacheStats().size).toBe(2);

      clearTenantCache();

      expect(getTenantCacheStats().size).toBe(0);
    });

    it('should return cache stats', async () => {
      const mockTenant = {
        id: 'tenant-123',
        subdomain: 'stats-test',
        name: 'Stats Test',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      await resolveTenant(
        createRequest({ host: 'stats-test.diggai.de' }) as unknown as Request,
        createResponse() as unknown as Response,
        vi.fn()
      );

      const stats = getTenantCacheStats();
      expect(stats.size).toBe(1);
      // Cache key is the identifier (subdomain), not the full host
      expect(stats.entries).toContain('stats-test');
    });
  });

  // ============================================
  // Cross-Tenant Access Tests
  // ============================================
  describe('Cross-Tenant Access Protection', () => {
    it('should not share tenant data between requests', async () => {
      const mockTenantA = {
        id: 'tenant-a',
        subdomain: 'praxis-a',
        name: 'Praxis A',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: { key: 'value-a' },
      };
      const mockTenantB = {
        id: 'tenant-b',
        subdomain: 'praxis-b',
        name: 'Praxis B',
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        settings: { key: 'value-b' },
      };
      mockFindFirst
        .mockResolvedValueOnce(null).mockResolvedValueOnce(mockTenantA)
        .mockResolvedValueOnce(null).mockResolvedValueOnce(mockTenantB);

      const reqA = createRequest({ host: 'praxis-a.diggai.de' });
      const reqB = createRequest({ host: 'praxis-b.diggai.de' });
      const res = createResponse();

      await resolveTenant(reqA as unknown as Request, res as unknown as Response, vi.fn());
      await resolveTenant(reqB as unknown as Request, res as unknown as Response, vi.fn());

      expect(reqA.tenant?.id).toBe('tenant-a');
      expect(reqB.tenant?.id).toBe('tenant-b');
      expect(reqA.tenant?.id).not.toBe(reqB.tenant?.id);
    });

    it('should isolate tenant settings', async () => {
      const mockTenant = {
        id: 'tenant-iso',
        subdomain: 'iso-test',
        name: 'Isolation Test',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: { privateKey: 'secret-123' },
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      const req = createRequest({ host: 'iso-test.diggai.de' });
      const res = createResponse();

      await resolveTenant(req as unknown as Request, res as unknown as Response, vi.fn());

      expect(req.tenant?.settings).toEqual({ privateKey: 'secret-123' });
    });
  });

  // ============================================
  // Tenant Header Validation Tests
  // ============================================
  describe('Tenant Header Validation', () => {
    it('should normalize X-Tenant-ID to lowercase', async () => {
      const mockTenant = {
        id: 'tenant-123',
        subdomain: 'mixed-case',
        name: 'Mixed Case',
        plan: 'STARTER',
        status: 'ACTIVE',
        settings: {},
      };
      mockFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTenant);

      const req = createRequest({
        headers: { 'x-tenant-id': 'MIXED-CASE' },
      });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      // Should search for lowercase version
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { subdomain: 'mixed-case' },
              { id: 'mixed-case' },
            ],
          }),
        })
      );
    });

    it('should ignore www subdomain', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = createRequest({ host: 'www.diggai.de' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      // Should not try to resolve 'www' as tenant
      const calls = mockFindFirst.mock.calls;
      const wwwCalls = calls.filter((call: any) => 
        call[0].where.OR?.some((o: any) => o.subdomain === 'www' || o.id === 'www')
      );
      expect(wwwCalls.length).toBe(0);
    });

    it('should ignore app subdomain', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = createRequest({ host: 'app.diggai.de' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      const calls = mockFindFirst.mock.calls;
      const appCalls = calls.filter((call: any) => 
        call[0].where.OR?.some((o: any) => o.subdomain === 'app' || o.id === 'app')
      );
      expect(appCalls.length).toBe(0);
    });

    it('should ignore api subdomain', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = createRequest({ host: 'api.diggai.de' });
      const res = createResponse();
      const next = vi.fn();

      await resolveTenant(req as unknown as Request, res as unknown as Response, next);

      const calls = mockFindFirst.mock.calls;
      const apiCalls = calls.filter((call: any) => 
        call[0].where.OR?.some((o: any) => o.subdomain === 'api' || o.id === 'api')
      );
      expect(apiCalls.length).toBe(0);
    });
  });
});
