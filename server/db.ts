import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma Client
 * Verhindert mehrfache Instanzen beim Hot-Reload in Entwicklung
 */
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
