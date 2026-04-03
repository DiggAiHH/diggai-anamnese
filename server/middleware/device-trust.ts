/**
 * Device Trust Middleware
 * 
 * Express middleware for extracting and validating device fingerprints.
 * All operations are non-blocking - errors will not prevent request processing.
 * 
 * @module device-trust
 */

import type { Request, Response, NextFunction } from 'express';
import { generateFingerprint } from '../services/auth/device-fingerprint.service';

// Extend Express Request interface to include device fingerprint
declare global {
  namespace Express {
    interface Request {
      /** Device fingerprint hash extracted from request */
      deviceFingerprint?: string;
      /** Complete device fingerprint object */
      deviceFingerprintData?: import('../types/device-fingerprint').DeviceFingerprint;
    }
  }
}

/**
 * Middleware: Extracts device fingerprint from incoming request
 * 
 * Adds `deviceFingerprint` (hash string) and optionally `deviceFingerprintData`
 * to the request object for downstream use.
 * 
 * This middleware is non-blocking - failures will not stop the request.
 * 
 * @example
 * ```typescript
 * app.use(extractDeviceFingerprint);
 * 
 * app.post('/login', (req, res) => {
 *   console.log(req.deviceFingerprint); // SHA-256 hash
 * });
 * ```
 */
export function extractDeviceFingerprint(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const fingerprint = generateFingerprint(req);
    req.deviceFingerprint = fingerprint.hash;
    req.deviceFingerprintData = fingerprint;
    
    // Add fingerprint to response locals for logging
    res.locals.deviceFingerprint = fingerprint.hash.substring(0, 16) + '...';
  } catch (err) {
    // Non-blocking: log error but continue
    // Don't expose internal errors to client
    console.warn('Failed to extract device fingerprint:', err);
  }
  
  // Always proceed to next middleware
  next();
}

/**
 * Middleware: Validates that a device fingerprint was successfully extracted
 * 
 * Returns 400 Bad Request if fingerprint extraction failed.
 * Use this after extractDeviceFingerprint for routes that require device identification.
 * 
 * @example
 * ```typescript
 * app.post('/sensitive-action', 
 *   extractDeviceFingerprint,
 *   requireDeviceFingerprint,
 *   handler
 * );
 * ```
 */
export function requireDeviceFingerprint(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.deviceFingerprint) {
    res.status(400).json({
      error: 'Device fingerprint required',
      message: 'Unable to extract device information from request',
      code: 'DEVICE_FINGERPRINT_MISSING',
    });
    return;
  }
  next();
}

/**
 * Middleware: Attach device fingerprint to response headers (for debugging)
 * 
 * Only adds headers in development mode. Does not expose full hash in production.
 * 
 * @example
 * ```typescript
 * if (process.env.NODE_ENV === 'development') {
 *   app.use(attachFingerprintHeader);
 * }
 * ```
 */
export function attachFingerprintHeader(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.deviceFingerprint && process.env.NODE_ENV === 'development') {
    // Only expose first 8 chars in development for debugging
    res.setHeader('X-Device-Fingerprint', req.deviceFingerprint.substring(0, 8));
  }
  next();
}
