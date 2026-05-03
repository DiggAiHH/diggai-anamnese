/**
 * Health Endpoint E2E Tests
 * Validates the /api/health endpoint introduced in server/routes/health.ts
 *
 * Coverage:
 * 1. Basic health check returns 200 with correct schema
 * 2. All required fields present in response
 * 3. Database status is reported correctly
 * 4. Redis status is reported correctly
 * 5. Disk and memory checks are present
 * 6. Response time is within acceptable bounds
 */

import { test, expect } from '@playwright/test';

test.describe('Health Endpoint', () => {

  test('returns 200 with valid health schema', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Top-level required fields
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('environment');
    expect(body).toHaveProperty('backendProfile');
    expect(body).toHaveProperty('activeDomains');
    expect(body).toHaveProperty('db');
    expect(body).toHaveProperty('databaseDomains');
    expect(body).toHaveProperty('redis');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('agents');
    expect(body).toHaveProperty('reminderWorker');
    expect(body).toHaveProperty('responseTime');
    expect(body).toHaveProperty('checks');

    // Status must be one of the allowed values
    expect(['ok', 'degraded', 'error']).toContain(body.status);

    // Version should be a semantic-version-like string
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);

    // Timestamp must be a valid ISO string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);

    // Environment should be defined
    expect(typeof body.environment).toBe('string');
    expect(body.environment.length).toBeGreaterThan(0);
  });

  test('reports database status as connected when healthy', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.db).toBe('connected');
    expect(body.checks.database).toBeDefined();
    expect(body.checks.database.status).toBe('ok');
    expect(typeof body.checks.database.responseTime).toBe('number');
    expect(body.checks.database.responseTime).toBeGreaterThanOrEqual(0);
  });

  test('reports redis status', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(['connected', 'disabled', 'error']).toContain(body.redis);
    expect(body.checks.redis).toBeDefined();
    expect(['ok', 'error', 'disabled', 'unknown']).toContain(body.checks.redis.status);
  });

  test('reports disk and memory checks', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.checks.disk).toBeDefined();
    expect(body.checks.disk.status).toBeDefined();
    expect(['ok', 'degraded', 'error', 'unknown']).toContain(body.checks.disk.status);

    expect(body.checks.memory).toBeDefined();
    expect(body.checks.memory.status).toBeDefined();
    expect(['ok', 'degraded', 'error', 'unknown']).toContain(body.checks.memory.status);
  });

  test('response time is within acceptable bounds', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/health');
    const duration = Date.now() - start;

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.responseTime).toBeDefined();
    expect(body.responseTime).toBeGreaterThanOrEqual(0);
    expect(body.responseTime).toBeLessThan(5000); // Should not take >5s

    // Total round-trip should also be reasonable
    expect(duration).toBeLessThan(10000);
  });

  test('activeDomains is an array', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    expect(Array.isArray(body.activeDomains)).toBe(true);
  });

  test('databaseDomains is an object with domain statuses', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    expect(typeof body.databaseDomains).toBe('object');
    expect(body.databaseDomains).not.toBeNull();

    // Each active domain should have a status entry
    for (const domain of body.activeDomains) {
      expect(body.databaseDomains).toHaveProperty(domain);
      expect(body.databaseDomains[domain]).toHaveProperty('status');
      expect(['ok', 'error', 'degraded', 'unknown']).toContain(body.databaseDomains[domain].status);
    }
  });

  test('agents array is present', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    expect(Array.isArray(body.agents)).toBe(true);
    // Each agent should have name, online, busy
    for (const agent of body.agents) {
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('online');
      expect(agent).toHaveProperty('busy');
    }
  });
});
