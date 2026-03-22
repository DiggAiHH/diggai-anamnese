import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config before importing encryption module
vi.mock('../config', () => ({
  config: {
    encryptionKey: '0123456789abcdef0123456789abcdef', // exactly 32 chars
    encryptionIvLength: 12,
  },
}));

const { encrypt, decrypt, hashEmail } = await import('../services/encryption');

describe('encryption', () => {
  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hallo Patient';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt German umlauts', () => {
      const plaintext = 'Müller, Straße 42, Düsseldorf';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('should encrypt and decrypt empty-ish strings', () => {
      const plaintext = ' ';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'test data';
      const enc1 = encrypt(plaintext);
      const enc2 = encrypt(plaintext);
      expect(enc1).not.toBe(enc2);
      expect(decrypt(enc1)).toBe(plaintext);
      expect(decrypt(enc2)).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });
  });

  describe('ciphertext format', () => {
    it('should produce iv:authTag:ciphertext format', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // IV = 12 bytes = 24 hex chars
      expect(parts[0]).toHaveLength(24);
      // AuthTag = 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // Ciphertext is hex
      expect(parts[2]).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('tamper detection', () => {
    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('sensitive data');
      const parts = encrypted.split(':');
      // Tamper with ciphertext
      parts[2] = 'ff' + parts[2].slice(2);
      const tampered = parts.join(':');
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw on tampered authTag', () => {
      const encrypted = encrypt('sensitive data');
      const parts = encrypted.split(':');
      parts[1] = '00'.repeat(16);
      const tampered = parts.join(':');
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw on invalid format', () => {
      expect(() => decrypt('not:valid')).toThrow('Ungültiges verschlüsseltes Format');
      expect(() => decrypt('single')).toThrow('Ungültiges verschlüsseltes Format');
    });
  });

  describe('hashEmail', () => {
    it('should produce deterministic hashes', () => {
      const hash1 = hashEmail('test@example.com');
      const hash2 = hashEmail('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should normalize case', () => {
      const hash1 = hashEmail('Test@Example.COM');
      const hash2 = hashEmail('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should normalize whitespace', () => {
      const hash1 = hashEmail('  test@example.com  ');
      const hash2 = hashEmail('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different emails', () => {
      const hash1 = hashEmail('alice@example.com');
      const hash2 = hashEmail('bob@example.com');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 64-char hex string (SHA-256)', () => {
      const hash = hashEmail('test@example.com');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
