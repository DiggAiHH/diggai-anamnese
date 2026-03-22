/**
 * @module tenant-context
 * @description AsyncLocalStorage-based Tenant Context for Prisma
 * 
 * @architecture
 * Uses Node.js AsyncLocalStorage to maintain tenant context across async operations.
 * This allows automatic tenant filtering in Prisma middleware without passing
 * tenantId manually through every function call.
 * 
 * @example
 * ```typescript
 * // In request handler
 * await runWithTenant(tenantId, async () => {
 *   // All Prisma queries here are automatically filtered by tenantId
 *   const patients = await prisma.patient.findMany();
 * });
 * ```
 */

import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
    tenantId: string;
    plan: string;
}

// AsyncLocalStorage for tenant context propagation
const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Run function within a tenant context
 * All Prisma operations inside will automatically filter by tenantId
 */
export async function runWithTenant<T>(
    tenantId: string,
    plan: string,
    fn: () => Promise<T>
): Promise<T> {
    return tenantStorage.run({ tenantId, plan }, fn);
}

/**
 * Get current tenant context
 * Returns null if not within a tenant context
 */
export function getCurrentTenant(): TenantContext | null {
    return tenantStorage.getStore() || null;
}

/**
 * Get current tenant ID
 * Throws if not within a tenant context (for required contexts)
 */
export function getCurrentTenantId(): string {
    const ctx = getCurrentTenant();
    if (!ctx) {
        throw new Error('No tenant context available - runWithTenant() not called');
    }
    return ctx.tenantId;
}

/**
 * Check if currently within a tenant context
 */
export function hasTenantContext(): boolean {
    return tenantStorage.getStore() !== undefined;
}

/**
 * Prisma Middleware for automatic tenant filtering
 * Add this to your Prisma client initialization
 * 
 * @example
 * ```typescript
 * const prisma = new PrismaClient();
 * prisma.$use(tenantPrismaMiddleware);
 * ```
 */
export function tenantPrismaMiddleware(params: {
    model?: string;
    action: string;
    args: any;
    query: (args: any) => Promise<any>;
}): Promise<any> {
    const tenant = getCurrentTenant();
    
    // Skip if no tenant context (e.g., during migrations, seeds)
    if (!tenant) {
        return params.query(params.args);
    }
    
    // Skip for models that don't have tenant isolation
    const tenantAwareModels = [
        'Patient',
        'PatientSession',
        'ArztUser',
        'Answer',
        'TriageEvent',
        'ChatMessage',
        'AuditLog',
        'QueueEntry',
        'Signature',
        'PatientMedication',
        'PatientSurgery',
        'TherapyPlan',
        'ClinicalAlert',
    ];
    
    if (!params.model || !tenantAwareModels.includes(params.model)) {
        return params.query(params.args);
    }
    
    // Skip for raw queries (developer responsibility)
    if (params.action === '$queryRaw' || params.action === '$executeRaw') {
        return params.query(params.args);
    }
    
    // Add tenantId filter to query
    const modifiedArgs = {
        ...params.args,
        where: {
            ...params.args?.where,
            tenantId: tenant.tenantId,
        },
    };
    
    return params.query(modifiedArgs);
}
