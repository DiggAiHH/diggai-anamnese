import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../db', () => ({
  prisma: {
    tenant: {
      findFirst: vi.fn(),
    },
  },
}));

import { resolveTenant } from './tenant';

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

describe('resolveTenant hardening', () => {
  it('rejects conflicting tenant identifier and host subdomain with 403', async () => {
    const req = {
      headers: {
        host: 'tenant-a.example.com',
        'x-tenant-id': 'tenant-b',
      },
      query: {},
    } as unknown as Request;

    const res = createResponse();
    const next = vi.fn();

    await resolveTenant(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({
      error: 'Tenant-Konflikt',
      code: 'TENANT_OVERRIDE_CONFLICT',
      message: 'Tenant-Override widerspricht der Host-Auflösung.',
    });
  });
});
