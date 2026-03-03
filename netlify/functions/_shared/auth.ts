/**
 * K-09 FIX: Shared auth & CORS helpers for Netlify Functions
 * Restricts CORS to actual frontend domain, adds JWT verification
 */

// Allowed origins — restrict from '*' to actual deployment URLs
const ALLOWED_ORIGINS = [
    'https://diggai-drklaproth.netlify.app',
    'http://localhost:5173',
    'http://localhost:4173',
];

export function corsHeaders(origin?: string): Record<string, string> {
    const effectiveOrigin = origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0];

    return {
        'Access-Control-Allow-Origin': effectiveOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
    };
}

/**
 * Lightweight JWT verification for serverless functions.
 * Validates token structure and expiry without full jsonwebtoken dependency.
 * Returns decoded payload or null if invalid.
 */
export function verifyToken(authHeader?: string): { sessionId?: string; role?: string } | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice(7);
    try {
        // Decode JWT payload (base64url)
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8')
        );

        // Check expiry
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Returns a 401 response for unauthenticated requests
 */
export function unauthorizedResponse(origin?: string) {
    return {
        statusCode: 401,
        headers: corsHeaders(origin),
        body: JSON.stringify({ error: 'Authentifizierung erforderlich' }),
    };
}
