import { afterEach, describe, expect, it } from 'vitest';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import {
  decryptStoredCredentials,
  isEncryptedCredentialPayload,
  parseStoredFhirCredentials,
  type EncryptedCredentialPayload,
} from './credentials-parser';

function createEncryptedPayload(
  credentials: Record<string, string>,
  key: string,
): EncryptedCredentialPayload {
  const iv = randomBytes(16);
  const derivedKey = scryptSync(key, 'pvs-salt', 32);
  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);

  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    salt: randomBytes(32).toString('base64'),
    version: 1,
  };
}

describe('credentials-parser', () => {
  const originalKey = process.env.PVS_ENCRYPTION_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.PVS_ENCRYPTION_KEY;
      return;
    }

    process.env.PVS_ENCRYPTION_KEY = originalKey;
  });

  it('parses plain JSON credentials', () => {
    const parsed = parseStoredFhirCredentials(JSON.stringify({
      clientId: 'plain-client',
      clientSecret: 'plain-secret',
    }));

    expect(parsed.clientId).toBe('plain-client');
    expect(parsed.clientSecret).toBe('plain-secret');
  });

  it('decrypts encrypted credential payloads', () => {
    const key = '12345678901234567890123456789012';
    process.env.PVS_ENCRYPTION_KEY = key;

    const encryptedPayload = createEncryptedPayload({
      apiKey: 'secret-api-key',
      tokenUrl: 'https://example.test/oauth/token',
    }, key);

    const parsed = parseStoredFhirCredentials(JSON.stringify(encryptedPayload));

    expect(parsed.apiKey).toBe('secret-api-key');
    expect(parsed.tokenUrl).toBe('https://example.test/oauth/token');
  });

  it('throws when encrypted payload is provided without encryption key', () => {
    const key = 'abcdefghijklmnopqrstuvwxyzABCDEF';
    process.env.PVS_ENCRYPTION_KEY = key;

    const encryptedPayload = createEncryptedPayload({
      clientId: 'enc-client',
      clientSecret: 'enc-secret',
    }, key);

    delete process.env.PVS_ENCRYPTION_KEY;

    expect(() => decryptStoredCredentials(encryptedPayload)).toThrow(
      'PVS_ENCRYPTION_KEY must be set and at least 32 characters to decrypt credentials',
    );
  });

  it('detects encrypted payload shape correctly', () => {
    expect(isEncryptedCredentialPayload({
      encrypted: 'abc',
      iv: 'def',
      authTag: 'ghi',
      version: 1,
    })).toBe(true);

    expect(isEncryptedCredentialPayload({
      clientId: 'plain',
      clientSecret: 'plain',
    })).toBe(false);
  });
});