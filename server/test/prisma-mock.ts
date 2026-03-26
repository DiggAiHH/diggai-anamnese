/**
 * Prisma Mock for Tests
 * Provides a deep mock of PrismaClient for unit tests
 */
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { beforeEach, vi } from 'vitest';

// Deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>();

// Mock the db module
vi.mock('../db', () => ({
  prisma: prismaMock,
}));

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

export type PrismaMock = DeepMockProxy<PrismaClient>;
