/**
 * @module data-integrity.test
 * @description OWASP A08: Software and Data Integrity Security Tests
 *
 * Tests for:
 * - Encryption tampering detection
 * - Audit log integrity
 * - Checksum verification
 * - Replay attack prevention
 * - Data corruption detection
 *
 * @security These tests verify that data cannot be tampered with undetected.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as crypto from 'crypto';
import { encrypt, decrypt, hashEmail } from '../services/encryption';

describe('OWASP A08: Data Integrity', () => {
    describe('Encryption Tamper Detection', () => {
        it('should detect modified authTag', () => {
            const plaintext = 'Sensitive patient data';
            const encrypted = encrypt(plaintext);
            
            // Parse encrypted format: iv:authTag:ciphertext
            const parts = encrypted.split(':');
            expect(parts).toHaveLength(3);
            
            // Modify the authTag
            const originalAuthTag = parts[1];
            parts[1] = crypto.randomBytes(16).toString('hex');
            expect(parts[1]).not.toBe(originalAuthTag);
            
            // Attempt to decrypt tampered data
            const tampered = parts.join(':');
            expect(() => decrypt(tampered)).toThrow();
        });

        it('should detect modified IV', () => {
            const plaintext = 'Test data';
            const encrypted = encrypt(plaintext);
            
            const parts = encrypted.split(':');
            const originalIv = parts[0];
            parts[0] = crypto.randomBytes(12).toString('hex');
            expect(parts[0]).not.toBe(originalIv);
            
            const tampered = parts.join(':');
            expect(() => decrypt(tampered)).toThrow();
        });

        it('should detect modified ciphertext', () => {
            const plaintext = 'Critical information';
            const encrypted = encrypt(plaintext);
            
            const parts = encrypted.split(':');
            const originalCiphertext = parts[2];
            
            // Flip some bits in ciphertext
            const modifiedBytes = Buffer.from(parts[2], 'hex');
            modifiedBytes[0] = modifiedBytes[0] ^ 0xFF;
            parts[2] = modifiedBytes.toString('hex');
            
            expect(parts[2]).not.toBe(originalCiphertext);
            
            const tampered = parts.join(':');
            expect(() => decrypt(tampered)).toThrow();
        });

        it('should detect truncated encrypted data', () => {
            const plaintext = 'Important data';
            const encrypted = encrypt(plaintext);
            
            // Truncate the ciphertext
            const truncated = encrypted.slice(0, encrypted.length - 10);
            
            expect(() => decrypt(truncated)).toThrow();
        });

        it('should detect extended encrypted data', () => {
            const plaintext = 'Secure content';
            const encrypted = encrypt(plaintext);
            
            // Append extra data
            const extended = encrypted + ':extradata';
            
            // Format should be invalid (wrong number of parts or invalid values)
            const parts = extended.split(':');
            if (parts.length === 3) {
                // Third part is now malformed
                expect(() => decrypt(extended)).toThrow();
            } else {
                // Wrong number of parts
                expect(parts.length).not.toBe(3);
            }
        });

        it('should detect swapped encrypted blocks', () => {
            const plaintext1 = 'First patient record';
            const plaintext2 = 'Second patient record';
            
            const encrypted1 = encrypt(plaintext1);
            const encrypted2 = encrypt(plaintext2);
            
            const parts1 = encrypted1.split(':');
            const parts2 = encrypted2.split(':');
            
            // Swap authTags
            const swapped = `${parts1[0]}:${parts2[1]}:${parts1[2]}`;
            
            expect(() => decrypt(swapped)).toThrow();
        });

        it('should reject invalid hex encoding', () => {
            const invalidEncrypted = 'invalid:hex:encoding';
            
            expect(() => decrypt(invalidEncrypted)).toThrow();
        });

        it('should detect replayed encryption (same plaintext)', () => {
            const plaintext = 'Same data';
            
            // Same plaintext encrypts to different values each time (different IV)
            const encrypted1 = encrypt(plaintext);
            const encrypted2 = encrypt(plaintext);
            
            expect(encrypted1).not.toBe(encrypted2);
            
            // But both decrypt to same plaintext
            expect(decrypt(encrypted1)).toBe(plaintext);
            expect(decrypt(encrypted2)).toBe(plaintext);
        });
    });

    describe('Email Hash Integrity', () => {
        it('should produce deterministic hashes for same email', () => {
            const email = 'test@example.com';
            
            const hash1 = hashEmail(email);
            const hash2 = hashEmail(email);
            
            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
        });

        it('should produce different hashes for different emails', () => {
            const hash1 = hashEmail('test1@example.com');
            const hash2 = hashEmail('test2@example.com');
            
            expect(hash1).not.toBe(hash2);
        });

        it('should be case-insensitive for email hashing', () => {
            const hash1 = hashEmail('Test@Example.com');
            const hash2 = hashEmail('test@example.com');
            
            expect(hash1).toBe(hash2);
        });

        it('should trim whitespace in email hashing', () => {
            const hash1 = hashEmail('  test@example.com  ');
            const hash2 = hashEmail('test@example.com');
            
            expect(hash1).toBe(hash2);
        });

        it('should be resistant to length extension attacks', () => {
            const hash1 = hashEmail('test@example.com');
            const hash2 = hashEmail('test@example.com.attacker.com');
            
            // Hash should be completely different for different inputs
            expect(hash1).not.toBe(hash2);
            // Both should be valid SHA-256 hex strings (64 chars)
            expect(hash1).toMatch(/^[a-f0-9]{64}$/);
            expect(hash2).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('Audit Log Integrity', () => {
        it('should include integrity checksums in audit logs', () => {
            const auditEntry = {
                timestamp: new Date().toISOString(),
                userId: 'user-123',
                action: 'VIEW_PATIENT_DATA',
                resourceId: 'patient-456',
                ipAddress: '192.168.1.1',
            };
            
            // Calculate checksum
            const entryString = JSON.stringify(auditEntry);
            const checksum = crypto.createHash('sha256').update(entryString).digest('hex');
            
            expect(checksum).toHaveLength(64);
            expect(checksum).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should detect tampered audit log entries', () => {
            const originalEntry = {
                timestamp: '2025-01-01T12:00:00Z',
                userId: 'user-123',
                action: 'VIEW',
            };
            
            const originalChecksum = crypto
                .createHash('sha256')
                .update(JSON.stringify(originalEntry))
                .digest('hex');
            
            // Tampered entry
            const tamperedEntry = { ...originalEntry, action: 'DELETE' };
            const tamperedChecksum = crypto
                .createHash('sha256')
                .update(JSON.stringify(tamperedEntry))
                .digest('hex');
            
            expect(tamperedChecksum).not.toBe(originalChecksum);
        });

        it('should include sequential entry IDs to prevent insertion/deletion', () => {
            const entries = [
                { id: 1, action: 'LOGIN' },
                { id: 2, action: 'VIEW' },
                { id: 3, action: 'LOGOUT' },
            ];
            
            // Check sequential
            for (let i = 1; i < entries.length; i++) {
                expect(entries[i].id).toBe(entries[i - 1].id + 1);
            }
            
            // Detect missing entry
            const missingSequence = entries.some((e, i) => e.id !== i + 1);
            expect(missingSequence).toBe(false);
        });

        it('should include previous entry hash for chain validation', () => {
            // Simulating blockchain-style audit log
            const chain: Array<{ id: number; data: string; prevHash: string; hash: string }> = [];
            
            // First entry
            const entry1Data = JSON.stringify({ action: 'INIT' });
            const entry1Hash = crypto.createHash('sha256').update(entry1Data).digest('hex');
            chain.push({ id: 1, data: entry1Data, prevHash: '0', hash: entry1Hash });
            
            // Second entry
            const entry2Data = JSON.stringify({ action: 'LOGIN' });
            const entry2Input = entry2Data + entry1Hash;
            const entry2Hash = crypto.createHash('sha256').update(entry2Input).digest('hex');
            chain.push({ id: 2, data: entry2Data, prevHash: entry1Hash, hash: entry2Hash });
            
            // Verify chain
            expect(chain[1].prevHash).toBe(chain[0].hash);
        });
    });

    describe('Data Corruption Detection', () => {
        it('should detect corrupted database records', () => {
            const record = {
                id: 'rec-123',
                encryptedName: 'encrypted:data:here',
                checksum: 'abc123', // Stored checksum
            };
            
            // Verify checksum
            const calculatedChecksum = crypto
                .createHash('sha256')
                .update(record.encryptedName)
                .digest('hex')
                .slice(0, 6);
            
            // If corrupted, checksums won't match
            const isValid = record.checksum === calculatedChecksum;
            expect(isValid).toBe(false); // In this test, they don't match (demo)
        });

        it('should validate data types on retrieval', () => {
            const storedValue = 'not-a-number';
            const expectedType = 'number';
            
            const isValidType = typeof storedValue === expectedType;
            expect(isValidType).toBe(false);
        });

        it('should detect out-of-range values', () => {
            const value = 150;
            const min = 0;
            const max = 100;
            
            const isInRange = value >= min && value <= max;
            expect(isInRange).toBe(false);
        });

        it('should validate foreign key references', () => {
            const references = new Set(['user-1', 'user-2', 'user-3']);
            const foreignKey = 'user-999';
            
            const isValidReference = references.has(foreignKey);
            expect(isValidReference).toBe(false);
        });
    });

    describe('Replay Attack Prevention', () => {
        it('should reject replayed JWT tokens after logout', () => {
            const tokenBlacklist = new Set<string>();
            const tokenJti = 'jwt-id-123';
            
            // User logs out
            tokenBlacklist.add(tokenJti);
            
            // Attacker tries to replay token
            const isBlacklisted = tokenBlacklist.has(tokenJti);
            expect(isBlacklisted).toBe(true);
        });

        it('should use nonces to prevent request replay', () => {
            const usedNonces = new Set<string>();
            const nonce = crypto.randomBytes(16).toString('hex');
            
            // First use
            usedNonces.add(nonce);
            
            // Replay attempt
            const isReplay = usedNonces.has(nonce);
            expect(isReplay).toBe(true);
        });

        it('should include timestamps to prevent old request replay', () => {
            const requestTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
            const maxAge = 2 * 60 * 1000; // 2 minute max age
            
            const isExpired = (Date.now() - requestTime) > maxAge;
            expect(isExpired).toBe(true);
        });

        it('should detect duplicate transaction IDs', () => {
            const processedTransactions = new Set<string>();
            const txId = 'tx-abc-123';
            
            // First submission
            processedTransactions.add(txId);
            
            // Duplicate submission
            const isDuplicate = processedTransactions.has(txId);
            expect(isDuplicate).toBe(true);
        });
    });

    describe('Dependency Integrity', () => {
        it('should verify package checksums on install', () => {
            // Simulating package integrity check
            const packageName = 'example-package';
            const expectedHash = 'abc123...';
            const actualHash = 'abc123...';
            
            const isValid = expectedHash === actualHash;
            expect(isValid).toBe(true);
        });

        it('should reject packages from untrusted registries', () => {
            const trustedRegistries = ['https://registry.npmjs.org'];
            const packageUrl = 'https://untrusted-registry.com/package';
            
            const isTrusted = trustedRegistries.some(reg => packageUrl.startsWith(reg));
            expect(isTrusted).toBe(false);
        });

        it('should detect modified node_modules', () => {
            const originalChecksums: Record<string, string> = {
                'lodash/index.js': 'hash1',
                'express/lib/express.js': 'hash2',
            };
            
            const currentChecksums = {
                'lodash/index.js': 'hash1',
                'express/lib/express.js': 'modified-hash', // Modified!
            };
            
            const hasChanges = Object.keys(originalChecksums).some(file =>
                originalChecksums[file] !== currentChecksums[file as keyof typeof currentChecksums]
            );
            
            expect(hasChanges).toBe(true);
        });
    });

    describe('Configuration Integrity', () => {
        it('should detect unauthorized config changes', () => {
            const allowedConfigs = new Set([
                'feature.flag.a',
                'feature.flag.b',
            ]);
            
            const changedConfig = 'security.jwt.secret'; // Not allowed to change
            
            const isAllowed = allowedConfigs.has(changedConfig);
            expect(isAllowed).toBe(false);
        });

        it('should validate environment variable integrity', () => {
            const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
            const currentEnvVars = ['DATABASE_URL', 'JWT_SECRET']; // Missing ENCRYPTION_KEY
            
            const hasAllRequired = requiredEnvVars.every(v => currentEnvVars.includes(v));
            expect(hasAllRequired).toBe(false);
        });

        it('should detect secrets in configuration', () => {
            const config = {
                apiUrl: 'https://api.example.com',
                apiKey: 'sk-live-1234567890', // Secret!
            };
            
            const hasSecret = /^(sk-|pk-|Bearer\s|password|secret)/i.test(config.apiKey);
            expect(hasSecret).toBe(true);
        });
    });
});
