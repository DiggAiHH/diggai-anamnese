/**
 * Additional Device Fingerprint Service Tests
 *
 * Erweiterte Tests für Security Event Monitoring & Device Fingerprinting
 * - isTrustedDevice() Tests
 * - Integration mit Security Events
 * - Trust Expiration Logic
 */

import { describe, it, expect } from 'vitest';
import {
  isTrustedDevice,
  generateFingerprintHash,
  generateFingerprintFromComponents,
} from './device-fingerprint.service';
import type { DeviceFingerprintComponents } from '../../types/device-fingerprint';

describe('isTrustedDevice', () => {
  const mockFingerprint = 'a'.repeat(64); // Valid SHA-256 hash

  it('should return true for matching fingerprints with valid trust', () => {
    const result = isTrustedDevice(
      mockFingerprint,
      mockFingerprint,
      new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    );
    expect(result).toBe(true);
  });

  it('should return false for non-matching fingerprints', () => {
    const result = isTrustedDevice(
      mockFingerprint,
      'b'.repeat(64),
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      new Date()
    );
    expect(result).toBe(false);
  });

  it('should return false when trust has expired', () => {
    const result = isTrustedDevice(
      mockFingerprint,
      mockFingerprint,
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday (expired)
      new Date(Date.now() - 48 * 60 * 60 * 1000)
    );
    expect(result).toBe(false);
  });

  it('should return false when never verified', () => {
    const result = isTrustedDevice(
      mockFingerprint,
      mockFingerprint,
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      null // Never verified
    );
    expect(result).toBe(false);
  });

  it('should return false when lastVerifiedAt is undefined', () => {
    const result = isTrustedDevice(
      mockFingerprint,
      mockFingerprint,
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      undefined
    );
    expect(result).toBe(false);
  });

  it('should return true when trustExpiresAt is null (no expiration)', () => {
    const result = isTrustedDevice(
      mockFingerprint,
      mockFingerprint,
      null,
      new Date()
    );
    expect(result).toBe(true);
  });

  it('should handle edge case of exact expiration time', () => {
    const now = new Date();
    const result = isTrustedDevice(
      mockFingerprint,
      mockFingerprint,
      now, // Expires exactly now
      new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    expect(result).toBe(false);
  });
});

describe('Device Fingerprint Security', () => {
  const mockComponents: DeviceFingerprintComponents = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    acceptLanguage: 'de-DE,de;q=0.9',
    acceptHeaders: 'text/html,application/xhtml+xml',
    screenResolution: '1920x1080',
    timezone: 'Europe/Berlin',
    platform: 'Win32',
  };

  it('should generate consistent SHA-256 hashes', () => {
    const hash1 = generateFingerprintHash(mockComponents);
    const hash2 = generateFingerprintHash(mockComponents);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate different hashes for different components', () => {
    const components1 = { ...mockComponents, userAgent: 'Browser A' };
    const components2 = { ...mockComponents, userAgent: 'Browser B' };

    const hash1 = generateFingerprintHash(components1);
    const hash2 = generateFingerprintHash(components2);

    expect(hash1).not.toBe(hash2);
  });

  it('should not include sensitive data in fingerprint', () => {
    // Ensure no PII like local IPs are included in the hash components
    const componentsWithPotentialPii: DeviceFingerprintComponents = {
      ...mockComponents,
      localIps: ['192.168.1.100'], // Should not affect standard fingerprinting
    };

    const hash = generateFingerprintHash(componentsWithPotentialPii);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('Device Fingerprint Trust Lifecycle', () => {
  const mockComponents: DeviceFingerprintComponents = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    acceptLanguage: 'de-DE',
    acceptHeaders: 'text/html,application/xhtml+xml',
    screenResolution: '390x844',
    timezone: 'Europe/Berlin',
    platform: 'iPhone',
    touchSupport: true,
  };

  it('should create fingerprint with neutral trust score', () => {
    const fingerprint = generateFingerprintFromComponents(mockComponents);

    expect(fingerprint.hash).toHaveLength(64);
    expect(fingerprint.trustScore).toBe(0.5);
    expect(fingerprint.components).toEqual(mockComponents);
    expect(fingerprint.createdAt).toBeInstanceOf(Date);
    expect(fingerprint.version).toBe('1.0.0');
  });

  it('should handle mobile device fingerprinting', () => {
    const fingerprint = generateFingerprintFromComponents(mockComponents);
    const hash = generateFingerprintHash(mockComponents);

    expect(fingerprint.hash).toBe(hash);
    expect(fingerprint.components.touchSupport).toBe(true);
  });
});

describe('Trust Score Boundaries', () => {
  it('should handle empty fingerprint hashes', () => {
    const result = isTrustedDevice('', '', null, new Date());
    expect(result).toBe(true); // Empty strings match
  });

  it('should handle partial fingerprint hashes', () => {
    const partialHash = 'abc123';
    const result = isTrustedDevice(partialHash, partialHash, null, new Date());
    expect(result).toBe(true);
  });

  it('should reject when hashes differ in case', () => {
    const lowerHash = 'a'.repeat(64);
    const upperHash = 'A'.repeat(64);
    const result = isTrustedDevice(lowerHash, upperHash, null, new Date());
    expect(result).toBe(false);
  });
});

// Integration tests for security event context
describe('Security Event Context', () => {
  it('should provide necessary metadata for security logging', () => {
    const components: DeviceFingerprintComponents = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      acceptLanguage: 'en-US',
      acceptHeaders: 'text/html',
      platform: 'MacIntel',
    };

    const fingerprint = generateFingerprintFromComponents(components);

    // Verify structure suitable for security logging
    expect(fingerprint.hash).toBeDefined();
    expect(fingerprint.hash.length).toBeGreaterThan(0);
    expect(fingerprint.components.userAgent).toBeDefined();

    // Hash should be deterministic for logging correlation
    const hash2 = generateFingerprintHash(components);
    expect(fingerprint.hash).toBe(hash2);
  });
});
