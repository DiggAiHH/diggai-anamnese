import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('server config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('should throw when JWT_SECRET is missing', async () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('ARZT_PASSWORD', 'test-password');

    await expect(import('./config.js')).rejects.toThrow(/JWT_SECRET/);
  });

  it('should throw when JWT_SECRET is too short', async () => {
    vi.stubEnv('JWT_SECRET', 'too-short');
    vi.stubEnv('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('ARZT_PASSWORD', 'test-password');

    await expect(import('./config.js')).rejects.toThrow(/32 Zeichen/);
  });

  it('should throw when ENCRYPTION_KEY is missing', async () => {
    vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
    vi.stubEnv('ENCRYPTION_KEY', '');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('ARZT_PASSWORD', 'test-password');

    await expect(import('./config.js')).rejects.toThrow(/ENCRYPTION_KEY/);
  });

  it('should throw when ENCRYPTION_KEY is not exactly 32 chars', async () => {
    vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
    vi.stubEnv('ENCRYPTION_KEY', 'short');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('ARZT_PASSWORD', 'test-password');

    await expect(import('./config.js')).rejects.toThrow(/32/);
  });

  it('should load successfully with valid env', async () => {
    vi.stubEnv('JWT_SECRET', 'a'.repeat(32));
    vi.stubEnv('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef');
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
    vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
    vi.stubEnv('ARZT_PASSWORD', 'test-password');
    vi.stubEnv('PORT', '4000');

    const { config } = await import('./config.js');
    expect(config.port).toBe(4000);
    // Default in config.ts ist '15m' — synchron mit auth.service.test, refresh-token.service.test
    // u. a. Tests. Der frühere Wert '24h' war ein Drift-Bug, weil auth.test.ts und Backend
    // sich auf '15m' festgelegt hatten, dieser Test aber nie nachgezogen wurde.
    expect(config.jwtExpiresIn).toBe('15m');
    expect(config.encryptionIvLength).toBe(16);
  });
});
