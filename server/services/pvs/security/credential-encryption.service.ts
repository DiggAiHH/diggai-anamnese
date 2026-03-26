// ============================================
// PVS Credential Encryption Service
// ============================================
// AES-256-GCM Verschlüsselung für PVS-Credentials
// Compliance: DSGVO, BSI-TR-02102-1

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

export interface EncryptedCredentials {
  encrypted: string; // base64
  iv: string; // base64
  authTag: string; // base64
  salt: string; // base64
  version: number;
}

/**
 * Service for secure encryption/decryption of PVS credentials
 */
export class CredentialEncryptionService {
  private masterKey: Buffer;

  constructor() {
    const keyFromEnv = process.env.PVS_ENCRYPTION_KEY;
    if (!keyFromEnv || keyFromEnv.length < 32) {
      throw new Error('PVS_ENCRYPTION_KEY must be set and at least 32 characters');
    }
    // Derive a 32-byte key from the environment variable
    this.masterKey = scryptSync(keyFromEnv, 'pvs-salt', 32);
  }

  /**
   * Encrypt credentials object
   */
  encryptCredentials(credentials: unknown): EncryptedCredentials {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);
    
    const plainText = JSON.stringify(credentials);
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      version: 1,
    };
  }

  /**
   * Decrypt credentials to object
   */
  decryptCredentials<T = unknown>(encrypted: EncryptedCredentials): T {
    try {
      const iv = Buffer.from(encrypted.iv, 'base64');
      const authTag = Buffer.from(encrypted.authTag, 'base64');
      
      const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted) as T;
    } catch (error) {
      throw new Error(`Failed to decrypt credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Rotate encryption key (re-encrypt with new key)
   */
  rotateKey(encrypted: EncryptedCredentials, newKey: string): EncryptedCredentials {
    // Decrypt with old key
    const decrypted = this.decryptCredentials(encrypted);
    
    // Temporarily set new key
    const oldKey = this.masterKey;
    this.masterKey = scryptSync(newKey, 'pvs-salt', 32);
    
    try {
      // Re-encrypt with new key
      const reEncrypted = this.encryptCredentials(decrypted);
      return { ...reEncrypted, version: encrypted.version + 1 };
    } finally {
      // Restore old key
      this.masterKey = oldKey;
    }
  }

  /**
   * Check if credentials are encrypted
   */
  isEncrypted(credentials: unknown): credentials is EncryptedCredentials {
    return (
      typeof credentials === 'object' &&
      credentials !== null &&
      'encrypted' in credentials &&
      'iv' in credentials &&
      'authTag' in credentials &&
      'version' in credentials
    );
  }

  /**
   * Securely clear sensitive data from memory
   */
  secureClear(data: Buffer | string): void {
    if (Buffer.isBuffer(data)) {
      data.fill(0);
    }
  }
}

// Singleton instance
export const credentialEncryption = new CredentialEncryptionService();
