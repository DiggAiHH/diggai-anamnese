/**
 * ETag Middleware - HTTP Conditional Requests Support
 * 
 * Implements ETag-based caching to reduce bandwidth and improve performance
 * for clients that have already fetched resources.
 */

import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * Generate ETag from data using MD5 hash
 * Fast and sufficient for cache validation (not cryptographic)
 */
export function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

/**
 * ETag middleware for Express
 * Automatically adds ETag headers to GET responses and handles If-None-Match
 * 
 * Usage: app.use(etagMiddleware) before route handlers
 */
export function etagMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only process GET requests
  if (req.method !== 'GET') {
    next();
    return;
  }

  // Skip ETag for certain paths (streaming, files, etc.)
  const skipPaths = ['/api/export/', '/api/upload/', '/api/webhooks/'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  // Override res.json to add ETag handling
  res.json = function(data: unknown): Response {
    // Generate ETag from response data
    const etag = generateETag(data);

    // Check If-None-Match header
    const ifNoneMatch = req.headers['if-none-match'];

    // Return 304 if content hasn't changed
    if (ifNoneMatch === etag) {
      res.status(304).end();
      return res;
    }

    // Set cache headers
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, must-revalidate');

    // Call original json method
    return originalJson(data);
  };

  next();
}

/**
 * Conditional ETag middleware - only applies to specific routes
 * Use when you want ETag support only for certain endpoints
 */
export function conditionalETag(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only apply to specific API routes that benefit from caching
  const etagRoutes = [
    '/api/atoms',
    '/api/sessions/',
    '/api/patients/',
    '/api/content',
    '/api/arzt/sessions',
  ];

  const shouldApplyEtag = etagRoutes.some(route => 
    req.path === route || req.path.startsWith(route)
  );

  if (!shouldApplyEtag) {
    next();
    return;
  }

  etagMiddleware(req, res, next);
}
