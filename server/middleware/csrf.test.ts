import { describe, expect, it, vi } from 'vitest';
import { validateCsrf } from './csrf';

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
  };
}

describe('validateCsrf hardening', () => {
  it('returns CSRF_MALFORMED for non-base64url header token', () => {
    const req = {
      method: 'POST',
      path: '/api/sessions',
      cookies: { 'XSRF-TOKEN': 'aGVsbG8' },
      headers: { 'x-xsrf-token': '###not-base64url###' },
    } as any;

    const res = createResponse();
    const next = vi.fn();

    validateCsrf(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({
      error: 'CSRF token malformed',
      code: 'CSRF_MALFORMED',
    });
  });

  it('returns CSRF_MALFORMED when x-xsrf-token header is an array', () => {
    const req = {
      method: 'POST',
      path: '/api/sessions',
      cookies: { 'XSRF-TOKEN': 'aGVsbG8' },
      headers: { 'x-xsrf-token': ['aGVsbG8', 'aGVsbG8'] },
    } as any;

    const res = createResponse();
    const next = vi.fn();

    validateCsrf(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({
      error: 'CSRF token malformed',
      code: 'CSRF_MALFORMED',
    });
  });
});
