/**
 * @file password-policy.test.ts
 * @description Unit Tests für BSI TR-02102 Passwort-Richtlinien
 *
 * Beweist: starke Passwörter werden akzeptiert, schwache abgelehnt.
 */
import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '../utils/password-policy';

describe('password-policy — BSI TR-02102 compliance', () => {

  describe('valid passwords', () => {
    it('accepts a strong password meeting all requirements', () => {
      const result = validatePasswordStrength('Sicher#2024Pass!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts minimum 12-char password with all complexity requirements', () => {
      const result = validatePasswordStrength('Abc1!xyzXYZ@');
      expect(result.valid).toBe(true);
    });

    it('accepts passwords with German umlauts', () => {
      const result = validatePasswordStrength('Straße#42Gültig!');
      expect(result.valid).toBe(true);
    });
  });

  describe('minimum length', () => {
    it('rejects password shorter than 12 characters', () => {
      const result = validatePasswordStrength('Abc1!Short');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('12'))).toBe(true);
    });

    it('rejects 11-character password', () => {
      const result = validatePasswordStrength('Abc1!xxxxxx');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('12'))).toBe(true);
    });

    it('accepts exactly 12-character password', () => {
      const result = validatePasswordStrength('Abc1!xxxxxxx');
      expect(result.valid).toBe(true);
    });
  });

  describe('complexity requirements', () => {
    it('rejects password without uppercase letter', () => {
      const result = validatePasswordStrength('sicher#2024pass!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('großbuchstabe'))).toBe(true);
    });

    it('rejects password without lowercase letter', () => {
      const result = validatePasswordStrength('SICHER#2024PASS!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('kleinbuchstabe'))).toBe(true);
    });

    it('rejects password without digit', () => {
      const result = validatePasswordStrength('SicherPasswort!#');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('zahl'))).toBe(true);
    });

    it('rejects password without special character', () => {
      const result = validatePasswordStrength('Sicher2024PassA');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('sonderzeichen'))).toBe(true);
    });
  });

  describe('forbidden patterns', () => {
    it('rejects password containing "password"', () => {
      const result = validatePasswordStrength('My#Password2024!');
      expect(result.valid).toBe(false);
    });

    it('rejects password containing "passwort"', () => {
      const result = validatePasswordStrength('Mein#Passwort24!');
      expect(result.valid).toBe(false);
    });

    it('rejects password containing "praxis2026"', () => {
      const result = validatePasswordStrength('X#Praxis2026!abc');
      expect(result.valid).toBe(false);
    });
  });

  describe('maximum length and repetition', () => {
    it('rejects password over 128 characters', () => {
      const tooLong = 'Abc1!' + 'x'.repeat(130);
      const result = validatePasswordStrength(tooLong);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('128'))).toBe(true);
    });

    it('rejects password with 8+ repeated characters', () => {
      const result = validatePasswordStrength('Abc1!aaaaaaaa');
      expect(result.valid).toBe(false);
    });
  });

  describe('multiple errors', () => {
    it('returns all errors for a very weak password', () => {
      const result = validatePasswordStrength('short');
      expect(result.valid).toBe(false);
      // Sollte mehrere Fehler zurückgeben (Länge, Großbuchstabe, Ziffer, Sonderzeichen)
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
