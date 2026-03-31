import { describe, expect, it, vi } from 'vitest';
import { setCsrfCookie, validateCsrf } from './csrf';

vi.unmock('../middleware/csrf');

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    headers: {} as Record<string, string>,
    cookie: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };
}

describe('setCsrfCookie', () => {
  it('sets a csrf cookie and mirrors the token in the response header', () => {
    const req = { cookies: {} } as any;
    const res = createResponse();
    const next = vi.fn();

    setCsrfCookie(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(typeof req.csrfToken).toBe('string');
    expect(req.csrfToken).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(res.headers['X-CSRF-Token']).toBe(req.csrfToken);
    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      req.csrfToken,
      expect.objectContaining({
        httpOnly: false,
        path: '/',
      })
    );
  });

  it('reuses an existing csrf cookie and still exposes the response header', () => {
    const req = { cookies: { 'XSRF-TOKEN': 'existing-token_123' } } as any;
    const res = createResponse();
    const next = vi.fn();

    setCsrfCookie(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(req.csrfToken).toBe('existing-token_123');
    expect(res.headers['X-CSRF-Token']).toBe('existing-token_123');
    expect(res.cookie).not.toHaveBeenCalled();
  });
});

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
