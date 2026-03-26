/**
 * Request/Response Helpers for Route Tests
 */
import type { Request, Response } from 'express';
import { generateUUID } from './factories';

export interface MockRequestOptions {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  user?: {
    id: string;
    role: string;
    tenantId?: string;
  } | null;
  ip?: string;
  tenantId?: string;
}

export function createMockRequest(options: MockRequestOptions = {}): Partial<Request> {
  return {
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
    headers: {
      'user-agent': 'Test-Agent/1.0',
      'x-forwarded-for': '127.0.0.1',
      ...options.headers,
    },
    cookies: options.cookies ?? {},
    user: options.user ?? null,
    ip: options.ip ?? '127.0.0.1',
    socket: { remoteAddress: options.ip ?? '127.0.0.1' } as any,
    tenantId: options.tenantId ?? 'tenant-1',
  } as Partial<Request>;
}

export function createMockAuthRequest(
  role: string = 'ARZT',
  overrides: MockRequestOptions = {}
): Partial<Request> {
  return createMockRequest({
    ...overrides,
    user: {
      id: generateUUID(),
      role,
      tenantId: 'tenant-1',
      ...overrides.user,
    },
  });
}

export interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string | string[]>;
  cookies: Record<string, { value: string; options?: Record<string, unknown> }>;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
  send(payload?: unknown): MockResponse;
  cookie(name: string, value: string, options?: Record<string, unknown>): MockResponse;
  clearCookie(name: string, options?: Record<string, unknown>): MockResponse;
  setHeader(name: string, value: string | string[]): MockResponse;
}

export function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    cookies: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload?: unknown) {
      this.body = payload;
      return this;
    },
    cookie(name: string, value: string, options?: Record<string, unknown>) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name: string, options?: Record<string, unknown>) {
      delete this.cookies[name];
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

// Also export as default for compatibility
export default {
  createMockRequest,
  createMockResponse,
  createMockAuthRequest,
  getRouteHandlers,
  getFinalHandler,
};

// Type for Express route handlers
export type RouteHandler = (req: Request, res: Response) => Promise<void> | void;

// Helper to extract route handlers from Express router
export function getRouteHandlers(
  router: any,
  path: string,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
): RouteHandler[] {
  type RouterLayer = {
    route?: {
      path: string;
      methods: Record<string, boolean>;
      stack: Array<{ handle: unknown }>;
    };
  };

  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const routeLayer = layers.find((layer) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods?.[method];
  });

  if (!routeLayer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return routeLayer.route!.stack.map((s) => s.handle as RouteHandler);
}

// Helper to get the final handler (after middleware)
export function getFinalHandler(
  router: any,
  path: string,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
): RouteHandler {
  const handlers = getRouteHandlers(router, path, method);
  return handlers[handlers.length - 1];
}
