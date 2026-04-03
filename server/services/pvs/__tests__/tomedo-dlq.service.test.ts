/**
 * Tomedo DLQ Service Tests
 * 
 * @phase PHASE_5_TESTS
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TomedoDLQService, tomedoDLQ } from '../tomedo-dlq.service.js';

// Mock Redis
const mockRedis = {
  lpush: vi.fn(),
  lrange: vi.fn(),
  lrem: vi.fn(),
  lset: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
  setex: vi.fn(),
  expire: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  sismember: vi.fn(),
};

vi.mock('../../../redis.js', () => ({
  getRedisClient: vi.fn(() => mockRedis),
}));

// Mock logger
vi.mock('../../../logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock prisma
const mockPrisma = {
  pvsTransferLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  pvsConnection: {
    findFirst: vi.fn(),
  },
};

vi.mock('../../../db.js', () => ({
  prisma: mockPrisma,
}));

describe('TomedoDLQService', () => {
  let service: TomedoDLQService;

  beforeEach(() => {
    service = new TomedoDLQService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('add', () => {
    it('should add item to DLQ with Redis', async () => {
      mockRedis.lpush.mockResolvedValueOnce(1);
      mockRedis.expire.mockResolvedValueOnce(1);

      const id = await service.add({
        type: 'documentation',
        patientSessionId: 'session-123',
        tenantId: 'tenant-456',
        connectionId: 'conn-789',
        payload: {
          documentation: {
            content: 'Test content',
            karteityp: 'Anamnese',
          },
        },
        error: 'Test error',
        traceId: 'trace-abc',
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/^dlq-/);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'tomedo-bridge:dlq',
        expect.stringContaining('Test content')
      );
    });

    it('should fallback to database if Redis unavailable', async () => {
      // Temporarily make Redis unavailable
      const { getRedisClient } = await import('../../../redis.js');
      (getRedisClient as vi.Mock).mockReturnValueOnce(null);

      const id = await service.add({
        type: 'patient',
        patientSessionId: 'session-123',
        tenantId: 'tenant-456',
        connectionId: 'conn-789',
        payload: {},
        error: 'Network error',
        traceId: 'trace-abc',
      });

      expect(id).toBeDefined();
      expect(mockPrisma.pvsTransferLog.create).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all items from Redis', async () => {
      const mockItems = [
        JSON.stringify({
          id: 'dlq-1',
          type: 'documentation',
          patientSessionId: 'session-1',
          tenantId: 'tenant-1',
          connectionId: 'conn-1',
          payload: {},
          error: 'Error 1',
          traceId: 'trace-1',
          failedAt: '2026-04-03T10:00:00Z',
          retryCount: 0,
        }),
        JSON.stringify({
          id: 'dlq-2',
          type: 'patient',
          patientSessionId: 'session-2',
          tenantId: 'tenant-1',
          connectionId: 'conn-1',
          payload: {},
          error: 'Error 2',
          traceId: 'trace-2',
          failedAt: '2026-04-03T10:01:00Z',
          retryCount: 1,
        }),
      ];

      mockRedis.lrange.mockResolvedValueOnce(mockItems);

      const items = await service.getAll();

      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('dlq-1');
      expect(items[1].id).toBe('dlq-2');
    });

    it('should return empty array when no items', async () => {
      mockRedis.lrange.mockResolvedValueOnce([]);

      const items = await service.getAll();

      expect(items).toHaveLength(0);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockRedis.lrange.mockResolvedValueOnce([
        JSON.stringify({ id: 'dlq-1', type: 'documentation' }),
        'invalid-json',
        JSON.stringify({ id: 'dlq-2', type: 'patient' }),
      ]);

      const items = await service.getAll();

      expect(items).toHaveLength(2);
    });
  });

  describe('getPending', () => {
    it('should return only items with retry count < 3', async () => {
      const mockItems = [
        JSON.stringify({
          id: 'dlq-1',
          type: 'documentation',
          patientSessionId: 'session-1',
          tenantId: 'tenant-1',
          connectionId: 'conn-1',
          payload: {},
          error: 'Error 1',
          traceId: 'trace-1',
          failedAt: '2026-04-03T10:00:00Z',
          retryCount: 0,
        }),
        JSON.stringify({
          id: 'dlq-2',
          type: 'documentation',
          patientSessionId: 'session-2',
          tenantId: 'tenant-1',
          connectionId: 'conn-1',
          payload: {},
          error: 'Error 2',
          traceId: 'trace-2',
          failedAt: '2026-04-03T10:01:00Z',
          retryCount: 3, // Max retries reached
        }),
      ];

      mockRedis.lrange.mockResolvedValueOnce(mockItems);

      const items = await service.getPending();

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('dlq-1');
    });
  });

  describe('remove', () => {
    it('should remove item from Redis', async () => {
      const mockItems = [
        JSON.stringify({ id: 'dlq-1', type: 'documentation' }),
        JSON.stringify({ id: 'dlq-2', type: 'patient' }),
      ];

      mockRedis.lrange.mockResolvedValueOnce(mockItems);
      mockRedis.lrem.mockResolvedValueOnce(1);

      await service.remove('dlq-1');

      expect(mockRedis.lrem).toHaveBeenCalledWith(
        'tomedo-bridge:dlq',
        0,
        mockItems[0]
      );
    });

    it('should fallback to database if Redis unavailable', async () => {
      const { getRedisClient } = await import('../../../redis.js');
      (getRedisClient as vi.Mock).mockReturnValueOnce(null);

      await service.remove('dlq-1');

      expect(mockPrisma.pvsTransferLog.deleteMany).toHaveBeenCalledWith({
        where: {
          pvsReferenceId: 'dlq-1',
          entityType: 'DLQ',
        },
      });
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const mockItems = [
        JSON.stringify({
          id: 'dlq-1',
          type: 'documentation',
          patientSessionId: 'session-1',
          tenantId: 'tenant-1',
          connectionId: 'conn-1',
          payload: {},
          error: 'Error 1',
          traceId: 'trace-1',
          failedAt: '2026-04-03T10:00:00Z',
          retryCount: 0,
        }),
        JSON.stringify({
          id: 'dlq-2',
          type: 'patient',
          patientSessionId: 'session-2',
          tenantId: 'tenant-1',
          connectionId: 'conn-1',
          payload: {},
          error: 'Error 2',
          traceId: 'trace-2',
          failedAt: '2026-04-03T10:01:00Z',
          retryCount: 3,
        }),
        JSON.stringify({
          id: 'dlq-3',
          type: 'documentation',
          patientSessionId: 'session-3',
          tenantId: 'tenant-1',
          connectionId: 'conn-1',
          payload: {},
          error: 'Error 3',
          traceId: 'trace-3',
          failedAt: '2026-04-03T10:02:00Z',
          retryCount: 1,
        }),
      ];

      mockRedis.lrange.mockResolvedValueOnce(mockItems);

      const stats = await service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(2); // retryCount < 3
      expect(stats.failed).toBe(1); // retryCount >= 3
      expect(stats.byType).toEqual({
        documentation: 2,
        patient: 1,
      });
    });
  });

  describe('clear', () => {
    it('should clear all items from Redis', async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      await service.clear();

      expect(mockRedis.del).toHaveBeenCalledWith('tomedo-bridge:dlq');
      expect(mockRedis.del).toHaveBeenCalledWith('tomedo-bridge:dlq:processing');
    });

    it('should clear from database if Redis unavailable', async () => {
      const { getRedisClient } = await import('../../../redis.js');
      (getRedisClient as vi.Mock).mockReturnValueOnce(null);

      await service.clear();

      expect(mockPrisma.pvsTransferLog.deleteMany).toHaveBeenCalledWith({
        where: { entityType: 'DLQ' },
      });
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(tomedoDLQ).toBeInstanceOf(TomedoDLQService);
    });
  });
});
