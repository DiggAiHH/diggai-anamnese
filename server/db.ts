import { PrismaClient } from '@prisma/client';
import { config, type BackendDomain, type BackendProfile } from './config';

/**
 * Multi-Domain Prisma Client Registry
 *
 * - monolith/profile default remains backward compatible via `prisma`
 * - explicit domain access is available via `getPrismaClientForDomain(...)`
 */
const globalForPrisma = globalThis as unknown as {
    prismaByDomain: Partial<Record<BackendDomain, PrismaClient>> | undefined;
};

const localPrismaStore: Partial<Record<BackendDomain, PrismaClient>> = {};

const getPrismaStore = (): Partial<Record<BackendDomain, PrismaClient>> => {
    if (process.env.NODE_ENV === 'production') {
        return localPrismaStore;
    }

    if (!globalForPrisma.prismaByDomain) {
        globalForPrisma.prismaByDomain = {};
    }

    return globalForPrisma.prismaByDomain;
};

const createPrismaClient = (databaseUrl: string): PrismaClient => {
    const options = {
        datasources: {
            db: { url: databaseUrl },
        },
    };

    const PrismaClientCtor = PrismaClient as unknown as {
        new(options?: unknown): PrismaClient;
        (options?: unknown): PrismaClient;
    };

    try {
        return new PrismaClientCtor(options);
    } catch {
        // Vitest mocks sometimes provide function-style factories without constructor support.
        return PrismaClientCtor(options);
    }
};

const resolveDomainForCurrentProfile = (domain: BackendDomain): BackendDomain => {
    if (config.backendProfile !== 'monolith') {
        return domain;
    }

    if (config.strictDomainDatabaseRouting || config.enforceRouteDomainIsolation) {
        return domain;
    }

    // Backward compatibility: legacy monolith keeps all access in practice DB
    return 'practice';
};

export const getPrismaClientForDomain = (domain: BackendDomain): PrismaClient => {
    const resolvedDomain = resolveDomainForCurrentProfile(domain);
    const store = getPrismaStore();
    const existingClient = store[resolvedDomain];
    if (existingClient) {
        return existingClient;
    }

    const databaseUrl = config.databaseUrlsByDomain[resolvedDomain];
    const client = createPrismaClient(databaseUrl);
    store[resolvedDomain] = client;
    return client;
};

export const getBackendDomainsForProfile = (profile: BackendProfile = config.backendProfile): BackendDomain[] => {
    if (profile === 'monolith') {
        return [...config.enabledDatabaseDomains];
    }
    return [profile];
};

const getDefaultDomain = (): BackendDomain => {
    const [defaultDomain] = getBackendDomainsForProfile(config.backendProfile);
    return defaultDomain || 'practice';
};

export const prisma = getPrismaClientForDomain(getDefaultDomain());

export interface DatabaseHealthCheckResult {
    status: 'ok' | 'error';
    responseTime: number;
    error?: string;
}

export const checkDatabaseHealthByDomain = async (
    domains: BackendDomain[],
): Promise<Partial<Record<BackendDomain, DatabaseHealthCheckResult>>> => {
    const checks = await Promise.all(domains.map(async (domain) => {
        const startedAt = Date.now();
        const client = getPrismaClientForDomain(domain);
        try {
            await client.$queryRaw`SELECT 1`;
            return [domain, { status: 'ok', responseTime: Date.now() - startedAt } satisfies DatabaseHealthCheckResult] as const;
        } catch (error) {
            return [
                domain,
                {
                    status: 'error',
                    responseTime: Date.now() - startedAt,
                    error: error instanceof Error ? error.message : 'Database health check failed',
                } satisfies DatabaseHealthCheckResult,
            ] as const;
        }
    }));

    return checks.reduce((acc, [domain, result]) => {
        acc[domain] = result;
        return acc;
    }, {} as Partial<Record<BackendDomain, DatabaseHealthCheckResult>>);
};
