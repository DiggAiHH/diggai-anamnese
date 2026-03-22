import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ioredis before it's imported
vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    status: 'wait',
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
  }));
  return { default: MockRedis };
});

// Mock config
vi.mock('./config', () => ({
  config: {
    redisUrl: 'redis://localhost:6379',
  },
}));

describe('redis module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export initRedis, getRedisClient, isRedisReady, closeRedis', async () => {
    const redis = await import('./redis');
    expect(redis.initRedis).toBeDefined();
    expect(redis.getRedisClient).toBeDefined();
    expect(redis.isRedisReady).toBeDefined();
    expect(redis.closeRedis).toBeDefined();
  });

  it('getRedisClient should return null before init', async () => {
    const { getRedisClient } = await import('./redis');
    expect(getRedisClient()).toBeNull();
  });

  it('isRedisReady should return false before init', async () => {
    const { isRedisReady } = await import('./redis');
    expect(isRedisReady()).toBe(false);
  });
});
