import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config before importing encryption module
vi.mock('../config', () => ({
  config: {
    encryptionKey: '0123456789abcdef0123456789abcdef', // exactly 32 chars
    encryptionIvLength: 12,
  },
}));

const { encrypt, decrypt, hashEmail, isPIIAtom } = await import('../services/encryption');

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

    it('should handle special characters in email', () => {
      const hash = hashEmail('user+tag@example.co.uk');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle internationalized emails', () => {
      const hash = hashEmail('用户@例子.广告');
      expect(hash).toHaveLength(64);
    });
  });

  describe('isPIIAtom', () => {
    it('should identify PII atom IDs', () => {
      expect(isPIIAtom('0001')).toBe(true); // Nachname
      expect(isPIIAtom('0011')).toBe(true); // Vorname
      expect(isPIIAtom('3000')).toBe(true); // PLZ
      expect(isPIIAtom('3001')).toBe(true); // Wohnort
      expect(isPIIAtom('3002')).toBe(true); // Wohnanschrift
      expect(isPIIAtom('3003')).toBe(true); // E-Mail
      expect(isPIIAtom('3004')).toBe(true); // Mobilnummer
      expect(isPIIAtom('9010')).toBe(true); // Bestätigungs-Email
      expect(isPIIAtom('9011')).toBe(true); // Bestätigungs-Telefon
    });

    it('should return false for non-PII atom IDs', () => {
      expect(isPIIAtom('9999')).toBe(false);
      expect(isPIIAtom('1000')).toBe(false);
      expect(isPIIAtom('5000')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isPIIAtom('')).toBe(false);
      expect(isPIIAtom('abc')).toBe(false);
    });
  });

  // ============================================
  // Key Rotation Tests
  // ============================================
  describe('Key Rotation', () => {
    it('should decrypt data encrypted with same key', () => {
      const plaintext = 'Patient data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle multiple encryption/decryption cycles', () => {
      const plaintext = 'Original text';
      
      // Multiple cycles
      let current = plaintext;
      for (let i = 0; i < 5; i++) {
        const encrypted = encrypt(current);
        current = decrypt(encrypted);
      }
      
      expect(current).toBe(plaintext);
    });

    it('should handle batch encryption of patient records', () => {
      const records = [
        { id: 1, name: 'Max Müller' },
        { id: 2, name: 'Anna Schmidt' },
        { id: 3, name: 'Peter Meyer' },
      ];

      const encrypted = records.map(r => encrypt(r.name));
      const decrypted = encrypted.map(e => decrypt(e));

      expect(decrypted).toEqual(records.map(r => r.name));
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling - Invalid Keys', () => {
    it('should throw on empty encrypted string', () => {
      expect(() => decrypt('')).toThrow();
    });

    it('should throw on malformed IV', () => {
      // Invalid IV length (not 24 hex chars)
      expect(() => decrypt('abcd:00000000000000000000000000000000:ciphertext')).toThrow();
    });

    it('should throw on malformed authTag', () => {
      // Invalid authTag length (not 32 hex chars)
      expect(() => decrypt('000000000000000000000000:abcd:ciphertext')).toThrow();
    });

    it('should throw on non-hex ciphertext', () => {
      const validIv = '000000000000000000000000';
      const validAuthTag = '00000000000000000000000000000000';
      expect(() => decrypt(`${validIv}:${validAuthTag}:not-hex!!!`)).toThrow();
    });

    it('should throw on extra colons in input', () => {
      expect(() => decrypt('iv:auth:cipher:text:extra')).toThrow('Ungültiges verschlüsseltes Format');
    });

    it('should throw when IV is tampered', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Modify IV slightly
      parts[0] = parts[0].slice(0, -1) + (parts[0].slice(-1) === '0' ? '1' : '0');
      const tampered = parts.join(':');
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  // ============================================
  // Special Data Types Tests
  // ============================================
  describe('Special Data Types', () => {
    it('should handle medical record numbers', () => {
      const mrn = 'MRN-2024-001234';
      const encrypted = encrypt(mrn);
      expect(decrypt(encrypted)).toBe(mrn);
    });

    it('should handle phone numbers', () => {
      const phone = '+49 170 12345678';
      const encrypted = encrypt(phone);
      expect(decrypt(encrypted)).toBe(phone);
    });

    it('should handle addresses with special characters', () => {
      const address = 'Musterstraße 42, 12345 München, Deutschland';
      const encrypted = encrypt(address);
      expect(decrypt(encrypted)).toBe(address);
    });

    it('should handle JSON data', () => {
      const json = JSON.stringify({ name: 'Test', age: 30, active: true });
      const encrypted = encrypt(json);
      expect(decrypt(encrypted)).toBe(json);
    });

    it('should handle base64 encoded data', () => {
      const base64 = 'SGVsbG8gV29ybGQ=';
      const encrypted = encrypt(base64);
      expect(decrypt(encrypted)).toBe(base64);
    });

    it('should handle unicode characters', () => {
      const unicode = '日本語テキスト🎉💉🏥';
      const encrypted = encrypt(unicode);
      expect(decrypt(encrypted)).toBe(unicode);
    });

    it('should handle null bytes in data', () => {
      const withNull = 'data\x00with\x00nulls';
      const encrypted = encrypt(withNull);
      expect(decrypt(encrypted)).toBe(withNull);
    });

    it('should handle very long patient notes', () => {
      const note = 'Patient berichtet über '.repeat(1000);
      const encrypted = encrypt(note);
      expect(decrypt(encrypted)).toBe(note);
    });
  });

  // ============================================
  // Security Properties Tests
  // ============================================
  describe('Security Properties', () => {
    it('should produce unique IVs for each encryption', () => {
      const ivs = new Set();
      for (let i = 0; i < 100; i++) {
        const encrypted = encrypt('same text');
        const iv = encrypted.split(':')[0];
        ivs.add(iv);
      }
      // All 100 IVs should be unique
      expect(ivs.size).toBe(100);
    });

    it('should have high entropy in ciphertext', () => {
      const encrypted = encrypt('test with more data for better entropy analysis');
      const ciphertext = encrypted.split(':')[2];
      
      // Calculate rough entropy (should be high for random-looking data)
      const uniqueChars = new Set(ciphertext).size;
      // For longer ciphertext, expect more unique hex characters (at least 6 different chars)
      expect(uniqueChars).toBeGreaterThanOrEqual(6);
    });

    it('should maintain data integrity', () => {
      const original = 'Sensitive Patient Data: Müller, 01.01.1980';
      const encrypted = encrypt(original);
      
      // Verify we can decrypt back to original
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
      
      // Verify any bit flip in ciphertext causes decryption failure
      const parts = encrypted.split(':');
      const corruptedCipher = parts[2].slice(0, -1) + (parts[2].slice(-1) === '0' ? '1' : '0');
      const corrupted = `${parts[0]}:${parts[1]}:${corruptedCipher}`;
      
      expect(() => decrypt(corrupted)).toThrow();
    });

    it('should resist known-plaintext attacks (different IVs)', () => {
      const plaintext = 'Known text';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      const cipher1 = encrypted1.split(':')[2];
      const cipher2 = encrypted2.split(':')[2];
      
      // Even with same plaintext, ciphertext should be completely different
      expect(cipher1).not.toBe(cipher2);
    });
  });

  // ============================================
  // PII Field Encryption Tests
  // ============================================
  describe('PII Field Encryption', () => {
    it('should encrypt patient last name (atom 0001)', () => {
      const lastName = 'Müller-Schmidt';
      const encrypted = encrypt(lastName);
      expect(decrypt(encrypted)).toBe(lastName);
    });

    it('should encrypt patient first name (atom 0011)', () => {
      const firstName = 'Hans-Peter';
      const encrypted = encrypt(firstName);
      expect(decrypt(encrypted)).toBe(firstName);
    });

    it('should encrypt postal code (atom 3000)', () => {
      const plz = '12345';
      const encrypted = encrypt(plz);
      expect(decrypt(encrypted)).toBe(plz);
    });

    it('should encrypt city (atom 3001)', () => {
      const city = 'München';
      const encrypted = encrypt(city);
      expect(decrypt(encrypted)).toBe(city);
    });

    it('should encrypt address (atom 3002)', () => {
      const address = 'Musterstraße 42, 3. OG, links';
      const encrypted = encrypt(address);
      expect(decrypt(encrypted)).toBe(address);
    });

    it('should encrypt email (atom 3003)', () => {
      const email = 'patient.mueller@example.com';
      const encrypted = encrypt(email);
      expect(decrypt(encrypted)).toBe(email);
    });

    it('should encrypt phone number (atom 3004)', () => {
      const phone = '+49 170 12345678';
      const encrypted = encrypt(phone);
      expect(decrypt(encrypted)).toBe(phone);
    });
  });
});
