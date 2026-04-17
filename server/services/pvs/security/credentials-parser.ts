import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import type { FhirClientConfig } from '../types.js';

export interface EncryptedCredentialPayload {
  encrypted: string;
  iv: string;
  authTag: string;
  salt?: string;
  version: number;
}

function resolveCredentialEncryptionKey(): string {
  const pvsEncryptionKey = process.env.PVS_ENCRYPTION_KEY;
  if (pvsEncryptionKey && pvsEncryptionKey.length >= 32) {
    return pvsEncryptionKey;
  }

  const generalEncryptionKey = process.env.ENCRYPTION_KEY;
  if (generalEncryptionKey && generalEncryptionKey.length >= 32) {
    return generalEncryptionKey;
  }

  throw new Error(
    'PVS_ENCRYPTION_KEY or ENCRYPTION_KEY must be set and at least 32 characters to handle encrypted credentials',
  );
}

export function isEncryptedCredentialPayload(value: unknown): value is EncryptedCredentialPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Partial<EncryptedCredentialPayload>;
  return (
    typeof payload.encrypted === 'string' &&
    typeof payload.iv === 'string' &&
    typeof payload.authTag === 'string' &&
    typeof payload.version === 'number'
  );
}

export function decryptStoredCredentials(
  payload: EncryptedCredentialPayload,
): FhirClientConfig['credentials'] {
  const encryptionKey = resolveCredentialEncryptionKey();

  const key = scryptSync(encryptionKey, 'pvs-salt', 32);
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(payload.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  const parsed = JSON.parse(decrypted) as unknown;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Decrypted credentials payload must be a JSON object');
  }

  return parsed as FhirClientConfig['credentials'];
}

export function serializeStoredFhirCredentials(
  credentials: FhirClientConfig['credentials'],
): string {
  const encryptionKey = resolveCredentialEncryptionKey();
  const key = scryptSync(encryptionKey, 'pvs-salt', 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const payload: EncryptedCredentialPayload = {
    encrypted,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    salt: randomBytes(32).toString('base64'),
    version: 1,
  };

  return JSON.stringify(payload);
}

export function parseStoredFhirCredentials(rawCredentials: string): FhirClientConfig['credentials'] {
  const parsed = JSON.parse(rawCredentials) as unknown;

  if (isEncryptedCredentialPayload(parsed)) {
    return decryptStoredCredentials(parsed);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('FHIR credentials must be a JSON object');
  }

  return parsed as FhirClientConfig['credentials'];
}