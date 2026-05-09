/**
 * @module tenant
 * @description Multi-Tenancy Middleware — Tenant Resolution & Isolation
 * 
 * @architecture
 * Strategy: Shared Database, Row-Level Isolation via tenantId
 * - Single PostgreSQL database for all tenants (cost-effective)
 * - Every query filtered by tenantId (automatic via middleware)
 * - Subdomain-based tenant resolution (praxis-name.diggai.de)
 * - Custom domain support (optional CNAME)
 * 
 * @security
 * - Tenant isolation enforced at database query level
 * - No cross-tenant data leakage possible
 * - Suspended/deleted tenants blocked at middleware layer
 * 
 * @usage
 * 1. Extract tenant from subdomain/header
 * 2. Validate tenant status
 * 3. Attach tenantId to request
 * 4. Prisma middleware auto-filters all queries
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export interface TenantContext {
    id: string;
    subdomain: string;
    name: string;
    plan: string;
    status: string;
    settings: Record<string, unknown>;
}

declare global {
    namespace Express {
        interface Request {
            tenant?: TenantContext;
            tenantId?: string;
        }
    }
}

// Cache for tenant lookups (TTL: 5 minutes)
const tenantCache = new Map<string, { tenant: TenantContext; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Extract tenant identifier from request
 * Priority: 1. BSNR header, 2. Custom X-Tenant-ID header, 3. Subdomain, 4. Query param
 */
function extractTenantIdentifier(req: Request): string | null {
    // 1. Check X-Tenant-BSNR header (BSNR-based routing: diggai.de/<bsnr>)
    const bsnrHeader = req.headers['x-tenant-bsnr'] as string;
    if (bsnrHeader && /^\d{9}$/.test(bsnrHeader)) return bsnrHeader;

    // 2. Check X-Tenant-ID header (for API clients, mobile apps)
    const headerTenant = req.headers['x-tenant-id'] as string;
    if (headerTenant) return headerTenant.toLowerCase();
    
    // 3. Extract from subdomain (praxis-name.diggai.de)
    const host = req.headers.host || '';
    const cleanHost = host.split(':')[0].toLowerCase();
    const subdomain = cleanHost.split('.')[0];
    if (subdomain && !['localhost', '127', 'www', 'app', 'api', 'dev', 'test'].includes(subdomain)) {
        return subdomain.toLowerCase();
    }
    
    // 4. Check query parameter (for development/testing)
    const queryTenant = req.query.tenant as string;
    if (queryTenant) return queryTenant.toLowerCase();
    
    // 5. Check custom domain mapping (requires DB lookup)
    // This is handled in resolveTenantFromHost
    
    return null;
}

function extractConcreteHostSubdomain(host: string): string | null {
    const cleanHost = host.split(':')[0].toLowerCase();
    const subdomain = cleanHost.split('.')[0];
    // 2026-05-08 — API-Hosts (diggai-api.fly.dev, *.fly.dev) sind keine Tenant-Subdomains.
    // Sie als "no-subdomain" zu behandeln verhindert TENANT_OVERRIDE_CONFLICT bei
    // Frontend-Calls von diggai.de mit x-tenant-id Header.
    const RESERVED_HOSTS = new Set([
        'localhost', '127', 'www', 'app', 'api', 'dev', 'test',
        'diggai-api', 'diggai-api-staging', 'staging',
    ]);
    if (!subdomain || RESERVED_HOSTS.has(subdomain)) {
        return null;
    }
    // *.fly.dev / *.up.railway.app / *.onrender.com sind Hoster-Domains, keine Tenants
    if (cleanHost.endsWith('.fly.dev') || cleanHost.endsWith('.up.railway.app') || cleanHost.endsWith('.onrender.com') || cleanHost.endsWith('.netlify.app')) {
        return null;
    }
    return subdomain;
}

/**
 * Resolve tenant from custom domain (CNAME)
 */
async function resolveTenantFromHost(host: string): Promise<TenantContext | null> {
    // Strip port if present
    const cleanHost = host.split(':')[0].toLowerCase();
    
    // Skip localhost and IP addresses
    if (cleanHost === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
        return null;
    }
    
    // Check cache first
    const cached = tenantCache.get(cleanHost);
    if (cached && cached.expires > Date.now()) {
        return cached.tenant;
    }
    
    try {
        // Look up tenant by custom domain
        const visibilityFilter = process.env.NODE_ENV === 'production'
            ? { visibility: 'PUBLIC' as const }
            : {};
        const tenant = await prisma.tenant.findFirst({
            where: {
                customDomain: cleanHost,
                status: 'ACTIVE',
                ...visibilityFilter,
            },
            select: {
                id: true,
                subdomain: true,
                name: true,
                plan: true,
                status: true,
                settings: true,
            },
        });
        
        if (tenant) {
            const context: TenantContext = {
                id: tenant.id,
                subdomain: tenant.subdomain,
                name: tenant.name,
                plan: tenant.plan,
                status: tenant.status,
                settings: (tenant.settings as Record<string, unknown>) || {},
            };
            
            // Cache the result
            tenantCache.set(cleanHost, { tenant: context, expires: Date.now() + CACHE_TTL_MS });
            return context;
        }
    } catch (err) {
        console.error('[Tenant] Error resolving custom domain:', err);
    }
    
    return null;
}

/**
 * Main tenant resolution middleware
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Bypass tenant resolution for public endpoints
    if (
        req.path === '/api/health' ||
        req.path?.startsWith('/api/health?') ||
        // Public BSNR lookup — tenant context is the query parameter itself
        req.path?.startsWith('/api/tenants/by-bsnr/')
    ) {
        return next();
    }

    const identifier = extractTenantIdentifier(req);
    const host = req.headers.host || '';
    const hostSubdomain = extractConcreteHostSubdomain(host);

    if (identifier && hostSubdomain && identifier !== hostSubdomain) {
        res.status(403).json({
            error: 'Tenant-Konflikt',
            code: 'TENANT_OVERRIDE_CONFLICT',
            message: 'Tenant-Override widerspricht der Host-Auflösung.',
        });
        return;
    }
    
    // Try custom domain resolution first
    let tenant = await resolveTenantFromHost(host);

    // Klaproth Root Binding: explicit mapping for diggai.de root (no BSNR).
    // The frontend sends x-tenant-id: klaproth; we resolve it to the Klaproth
    // tenant by its canonical BSNR. This avoids fragile name heuristics.
    if (!tenant && identifier === 'klaproth') {
        try {
            const klaprothTenant = await prisma.tenant.findFirst({
                where: {
                    bsnr: '999999999',
                    status: 'ACTIVE',
                    ...(process.env.NODE_ENV === 'production' ? { visibility: 'PUBLIC' } : {}),
                },
                select: {
                    id: true,
                    subdomain: true,
                    name: true,
                    plan: true,
                    status: true,
                    settings: true,
                },
            });
            if (klaprothTenant) {
                tenant = {
                    id: klaprothTenant.id,
                    subdomain: klaprothTenant.subdomain,
                    name: klaprothTenant.name,
                    plan: klaprothTenant.plan,
                    status: klaprothTenant.status,
                    settings: (klaprothTenant.settings as Record<string, unknown>) || {},
                };
                tenantCache.set(identifier, { tenant, expires: Date.now() + CACHE_TTL_MS });
            }
        } catch (err) {
            console.error('[Tenant] Error resolving Klaproth root tenant:', err);
        }
    }

    // If no custom domain match, try subdomain/header identifier
    if (!tenant && identifier) {
        // Check cache
        const cached = tenantCache.get(identifier);
        if (cached && cached.expires > Date.now()) {
            tenant = cached.tenant;
        } else {
            try {
                // Check if identifier is a 9-digit BSNR
                const isBsnr = /^\d{9}$/.test(identifier);
                const visibilityFilter = process.env.NODE_ENV === 'production'
                    ? { visibility: 'PUBLIC' as const }
                    : {};
                const dbTenant = await prisma.tenant.findFirst({
                    where: {
                        OR: [
                            ...(isBsnr ? [{ bsnr: identifier }] : []),
                            { subdomain: identifier },
                            { id: identifier },
                        ],
                        status: 'ACTIVE',
                        ...visibilityFilter,
                    },
                    select: {
                        id: true,
                        subdomain: true,
                        name: true,
                        plan: true,
                        status: true,
                        settings: true,
                    },
                });
                
                if (dbTenant) {
                    tenant = {
                        id: dbTenant.id,
                        subdomain: dbTenant.subdomain,
                        name: dbTenant.name,
                        plan: dbTenant.plan,
                        status: dbTenant.status,
                        settings: (dbTenant.settings as Record<string, unknown>) || {},
                    };
                    
                    tenantCache.set(identifier, { tenant, expires: Date.now() + CACHE_TTL_MS });
                }
            } catch (err) {
                console.error('[Tenant] Error resolving tenant:', err);
            }
        }
    }
    
    // In development mode, allow fallback to default tenant
    if (!tenant && process.env.NODE_ENV === 'development') {
        try {
            const defaultTenant = await prisma.tenant.findFirst({
                where: { subdomain: 'default' },
                select: {
                    id: true,
                    subdomain: true,
                    name: true,
                    plan: true,
                    status: true,
                    settings: true,
                },
            });
            
            if (defaultTenant) {
                tenant = {
                    id: defaultTenant.id,
                    subdomain: defaultTenant.subdomain,
                    name: defaultTenant.name,
                    plan: defaultTenant.plan,
                    status: defaultTenant.status,
                    settings: (defaultTenant.settings as Record<string, unknown>) || {},
                };
            }
        } catch (err) {
            console.error('[Tenant] Error resolving default tenant:', err);
        }
    }
    
    // If still no tenant, return error
    if (!tenant) {
        res.status(404).json({
            error: 'Praxis nicht gefunden',
            code: 'TENANT_NOT_FOUND',
            message: 'Die angegebene Praxis existiert nicht oder ist nicht aktiv.',
        });
        return;
    }
    
    // Check tenant status
    if (tenant.status === 'SUSPENDED') {
        res.status(403).json({
            error: 'Praxis gesperrt',
            code: 'TENANT_SUSPENDED',
            message: 'Diese Praxis ist vorübergehend gesperrt. Bitte kontaktieren Sie den Support.',
        });
        return;
    }
    
    if (tenant.status === 'DELETED') {
        res.status(403).json({
            error: 'Praxis nicht verfügbar',
            code: 'TENANT_DELETED',
            message: 'Diese Praxis wurde deaktiviert.',
        });
        return;
    }
    
    // Attach tenant context to request
    req.tenant = tenant;
    req.tenantId = tenant.id;
    
    // Expose tenant info to frontend (non-sensitive only)
    res.setHeader('X-Tenant-Name', tenant.name);
    res.setHeader('X-Tenant-Plan', tenant.plan);
    
    next();
}

/**
 * Middleware to require a valid tenant
 * Use this after resolveTenant for routes that require tenant context
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
    if (!req.tenant || !req.tenantId) {
        res.status(400).json({
            error: 'Tenant context required',
            code: 'TENANT_REQUIRED',
        });
        return;
    }
    next();
}

/**
 * Check if tenant has feature enabled based on plan
 */
export function requirePlan(...allowedPlans: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.tenant) {
            res.status(400).json({ error: 'Tenant context required' });
            return;
        }
        
        if (!allowedPlans.includes(req.tenant.plan)) {
            res.status(403).json({
                error: 'Feature not available in current plan',
                code: 'PLAN_LIMITATION',
                currentPlan: req.tenant.plan,
                requiredPlans: allowedPlans,
            });
            return;
        }
        
        next();
    };
}

/**
 * Clear tenant cache (useful after tenant updates)
 */
export function clearTenantCache(identifier?: string): void {
    if (identifier) {
        tenantCache.delete(identifier);
    } else {
        tenantCache.clear();
    }
}

/**
 * Get tenant count from cache stats
 */
export function getTenantCacheStats(): { size: number; entries: string[] } {
    return {
        size: tenantCache.size,
        entries: Array.from(tenantCache.keys()),
    };
}
