/**
 * Query Performance Monitoring Middleware
 *
 * Monitors Prisma query execution times and logs slow queries.
 * Helps identify N+1 problems and database bottlenecks.
 */

import { Request, Response, NextFunction } from 'express';

const SLOW_QUERY_THRESHOLD = 500; // ms - queries taking longer than this are logged
// const CRITICAL_QUERY_THRESHOLD = 1000; // ms - critical slow queries

/**
 * Setup Prisma query performance monitoring
 * Call this once during server initialization
 *
 * NOTE: Prisma 6 removed the $use middleware API.
 * Query-level monitoring via $use is disabled.
 * Use Prisma Client extensions ($extends) for a future implementation.
 */
export function setupQueryPerformanceMonitoring(): void {
  // $use was removed in Prisma 6. Monitoring is disabled until migrated to $extends.
  console.log('[Query Performance] Monitoring disabled (Prisma 6 removed $use; use $extends)');
}

/**
 * Middleware to track API endpoint performance
 * Adds response time header and logs slow endpoints
 */
export function apiPerformanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Add response time header
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Log slow API responses
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(
        `[Slow API] ${req.method} ${req.path}: ${duration}ms`,
        `Status: ${res.statusCode}`
      );
    }
  });

  next();
}

// Type augmentation for Express
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}
