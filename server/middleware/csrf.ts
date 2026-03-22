/**
 * @module csrf
 * @description CSRF Protection via Double-Submit Cookie Pattern
 * 
 * @security
 * This implementation uses the Double-Submit Cookie pattern which is stateless
 * and doesn't require server-side storage. It works by:
 * 1. Setting a random token in a cookie (accessible to JS)
 * 2. Requiring the same token in a header for state-changing requests
 * 3. Both values must match for the request to proceed
 * 
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

declare global {
    namespace Express {
        interface Request {
            csrfToken?: string;
        }
    }
}

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-xsrf-token';

// Routes that don't require CSRF protection (GET requests are generally safe)
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

// Routes that are exempt from CSRF (webhooks, API tokens, etc.)
const EXEMPT_ROUTES: RegExp[] = [
    /^\/api\/webhook/,  // Webhooks have their own auth
    /^\/api\/pwa\/push/, // Push notifications
];

const BASE64URL_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

function isValidBase64UrlToken(value: string): boolean {
    return value.length > 0 && BASE64URL_TOKEN_PATTERN.test(value);
}

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Set CSRF token cookie for the client
 * Called on every request to refresh the token
 */
export function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
    // Only set if not already present (or refresh periodically)
    const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
    
    if (!existingToken) {
        const token = generateToken();
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false, // Must be accessible by JavaScript
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        // Store in request for subsequent middleware
        req.csrfToken = token;
    } else {
        req.csrfToken = existingToken;
    }
    
    next();
}

/**
 * Validate CSRF token for state-changing requests
 */
export function validateCsrf(req: Request, res: Response, next: NextFunction): void {
    // Safe methods don't need CSRF protection
    if (SAFE_METHODS.has(req.method)) {
        next();
        return;
    }
    
    // Check exempt routes
    const path = req.path;
    for (const pattern of EXEMPT_ROUTES) {
        if (pattern.test(path)) {
            next();
            return;
        }
    }
    
    // Get tokens from cookie and header
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const rawHeaderToken = req.headers[CSRF_HEADER_NAME];
    
    // Validate presence
    if (!cookieToken || !rawHeaderToken) {
        res.status(403).json({ 
            error: 'CSRF token missing',
            code: 'CSRF_MISSING'
        });
        return;
    }

    if (typeof rawHeaderToken !== 'string' || !isValidBase64UrlToken(cookieToken) || !isValidBase64UrlToken(rawHeaderToken)) {
        res.status(403).json({
            error: 'CSRF token malformed',
            code: 'CSRF_MALFORMED'
        });
        return;
    }

    const headerToken = rawHeaderToken;
    
    // Constant-time comparison to prevent timing attacks
    try {
        const cookieBuffer = Buffer.from(cookieToken, 'base64url');
        const headerBuffer = Buffer.from(headerToken, 'base64url');
        
        if (cookieBuffer.length !== headerBuffer.length || 
            !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
            res.status(403).json({ 
                error: 'CSRF token invalid',
                code: 'CSRF_INVALID'
            });
            return;
        }
    } catch {
        res.status(403).json({ 
            error: 'CSRF token malformed',
            code: 'CSRF_MALFORMED'
        });
        return;
    }
    
    next();
}

/**
 * Get current CSRF token for the request
 * Used by routes that need to return the token to the client
 */
export function getCsrfToken(req: Request): string | undefined {
    return req.csrfToken || req.cookies?.[CSRF_COOKIE_NAME];
}
