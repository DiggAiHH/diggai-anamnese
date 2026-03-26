/**
 * @module security-headers
 * @description Additional Security Headers Middleware
 *
 * Provides enhanced security headers beyond Helmet defaults for healthcare
 * applications requiring strict security postures (DSGVO/HIPAA compliance).
 *
 * @security
 * - Cache control for sensitive pages
 * - Certificate transparency enforcement
 * - Clear-Site-Data on logout
 * - Feature policy for sensitive APIs
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Additional security headers for sensitive healthcare data
 * Applied on top of Helmet defaults
 */
export function additionalSecurityHeaders(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // ─── Cache Control ─────────────────────────────────────────
    // Prevent caching of sensitive patient data endpoints
    const sensitivePaths = [
        '/api/patients',
        '/api/answers',
        '/api/sessions',
        '/api/therapy',
        '/api/export',
    ];

    const isSensitivePath = sensitivePaths.some(path =>
        req.path.startsWith(path)
    );

    if (isSensitivePath) {
        // Strong cache disabling for sensitive data
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }

    // ─── Feature Policy (Legacy Browser Support) ────────────────
    // Controls browser features available to the page
    res.setHeader(
        'Feature-Policy',
        'camera "self"; ' +
        'microphone "self"; ' +
        'geolocation "none"; ' +
        'payment "self"; ' +
        'usb "none"; ' +
        'magnetometer "none"; ' +
        'gyroscope "none"; ' +
        'speaker "self"'
    );

    // ─── Certificate Transparency ──────────────────────────────
    // Enforces Certificate Transparency for TLS certificates
    // Helps detect misissued certificates
    res.setHeader('Expect-CT', 'max-age=86400, enforce');

    // ─── Clear Site Data on Logout ─────────────────────────────
    // Ensures all local data is cleared when user logs out
    if (req.path === '/api/logout' || req.path === '/api/sessions/logout') {
        res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
    }

    // ─── DNS Prefetch Control ─────────────────────────────────
    // Prevent DNS prefetching for privacy
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // ─── Download Options ──────────────────────────────────────
    // Prevent MIME type sniffing on downloads
    res.setHeader('X-Download-Options', 'noopen');

    // ─── Permitted Cross-Domain Policies ───────────────────────
    // Restrict Adobe Flash/Acrobat cross-domain behavior
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // ─── Origin Isolation (COOP/COEP) ──────────────────────────
    // Additional Cross-Origin headers for sensitive contexts
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/system')) {
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }

    next();
}

/**
 * Middleware to add security headers for static file serving
 * Applies less strict headers for public assets
 */
export function staticSecurityHeaders(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Allow caching of static assets but with integrity checks
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Ensure MIME types are respected
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent framing of static resources
    res.setHeader('X-Frame-Options', 'DENY');

    next();
}

/**
 * Middleware to add API-specific security headers
 * Optimized for API responses (JSON)
 */
export function apiSecurityHeaders(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Content type for API responses
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // API-specific cache control
    res.setHeader('Cache-Control', 'no-store');

    // API versioning header (for future use)
    res.setHeader('X-API-Version', '3.0.0');

    // Request ID for tracing (if available)
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', requestId as string);

    next();
}

/**
 * Middleware to detect and block suspicious user agents
 * Adds basic bot/scanner detection
 */
export function userAgentFilter(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const userAgent = req.headers['user-agent'] || '';
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

    // Block known malicious user agents
    const blockedPatterns = [
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /masscan/i,
        /zgrab/i,
        /gobuster/i,
        /dirbuster/i,
        /wfuzz/i,
        /burp/i,
        /metasploit/i,
        /havij/i,
        /acunetix/i,
        /nessus/i,
        /openvas/i,
    ];

    const isBlocked = blockedPatterns.some(pattern => pattern.test(userAgent));

    if (isBlocked) {
        // Log the attempt
        console.warn(`[Security] Blocked scanner/bot from ${clientIP}: ${userAgent.slice(0, 100)}`);

        // Return generic error (don't reveal blocking)
        res.status(403).json({
            error: 'Access forbidden',
            requestId: crypto.randomUUID(),
        });
        return;
    }

    next();
}

/**
 * Middleware to add security-related response headers for error responses
 * Ensures security headers are present even on error pages
 */
export function errorSecurityHeaders(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Always set security headers, even on errors
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Prevent caching of error responses
    res.setHeader('Cache-Control', 'no-store');

    next(err);
}

export default {
    additionalSecurityHeaders,
    staticSecurityHeaders,
    apiSecurityHeaders,
    userAgentFilter,
    errorSecurityHeaders,
};
