/**
 * Tests for German PII Detection Patterns
 */

import { describe, it, expect } from 'vitest';
import {
  detectGermanPII,
  containsGermanPII,
  redactGermanPII,
  getPIISummary,
  isLikelyRealName,
  isLikelyBirthdate,
  isLikelyPhoneNumber,
} from '../german-pii-patterns';

describe('German PII Detection', () => {
  describe('Name Detection', () => {
    it('should detect simple German names', () => {
      const text = 'Ich heiße Hans Müller';
      const results = detectGermanPII(text);
      const names = results.filter(r => r.type === 'NAME');
      expect(names).toHaveLength(1);
      expect(names[0].value).toBe('Hans Müller');
      expect(names[0].confidence).toBe('high');
    });

    it('should detect hyphenated names', () => {
      const text = 'Anna-Marie Schmidt ist hier';
      const results = detectGermanPII(text);
      const names = results.filter(r => r.type === 'NAME');
      expect(names.length).toBeGreaterThan(0);
    });

    it('should detect names with umlauts', () => {
      const text = 'Hans Müller und Jürgen Köhler';
      const results = detectGermanPII(text);
      const names = results.filter(r => r.type === 'NAME');
      expect(names.length).toBeGreaterThan(0);
    });

    it('should detect names with von/van prefix', () => {
      const text = 'Peter von der Lippe';
      const results = detectGermanPII(text);
      const names = results.filter(r => r.type === 'NAME');
      expect(names.length).toBeGreaterThan(0);
    });

    it('should not detect single words as names', () => {
      const text = 'Ich gehe zur Bank';
      const results = detectGermanPII(text);
      const names = results.filter(r => r.type === 'NAME');
      expect(names).toHaveLength(0);
    });
  });

  describe('Birthdate Detection', () => {
    it('should detect German date format DD.MM.YYYY', () => {
      const text = 'geboren am 15.03.1985';
      const results = detectGermanPII(text);
      const dates = results.filter(r => r.type === 'BIRTHDATE');
      expect(dates.length).toBeGreaterThan(0);
      expect(dates[0].value).toContain('15.03.1985');
    });

    it('should detect date with context keywords', () => {
      const text = 'Mein Geburtsdatum ist 01.01.1990';
      const results = detectGermanPII(text);
      const dates = results.filter(r => r.type === 'BIRTHDATE');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should validate reasonable birth years', () => {
      const futureDate = 'geboren am 15.03.2050';
      const results = detectGermanPII(futureDate);
      const dates = results.filter(r => r.type === 'BIRTHDATE');
      expect(dates.every(d => d.confidence === 'low')).toBe(true);
    });
  });

  describe('Phone Number Detection', () => {
    it('should detect German mobile numbers', () => {
      const text = 'Mein Handy: 0170 1234567';
      const results = detectGermanPII(text);
      const phones = results.filter(r => r.type === 'PHONE');
      expect(phones.length).toBeGreaterThan(0);
    });

    it('should detect international format', () => {
      const text = 'Tel: +49 170 1234567';
      const results = detectGermanPII(text);
      const phones = results.filter(r => r.type === 'PHONE');
      expect(phones.length).toBeGreaterThan(0);
    });

    it('should detect landline numbers', () => {
      const text = 'Festnetz: 030 12345678';
      const results = detectGermanPII(text);
      const phones = results.filter(r => r.type === 'PHONE');
      expect(phones.length).toBeGreaterThan(0);
    });
  });

  describe('Email Detection', () => {
    it('should detect email addresses', () => {
      const text = 'Meine E-Mail: max.mustermann@example.de';
      const results = detectGermanPII(text);
      const emails = results.filter(r => r.type === 'EMAIL');
      expect(emails).toHaveLength(1);
      expect(emails[0].value).toBe('max.mustermann@example.de');
    });
  });

  describe('Address Detection', () => {
    it('should detect postal codes', () => {
      const text = '12345 Berlin';
      const results = detectGermanPII(text);
      const plz = results.filter(r => r.type === 'POSTAL_CODE');
      expect(plz.length).toBeGreaterThan(0);
      expect(plz[0].value).toBe('12345');
    });

    it('should validate German PLZ ranges', () => {
      const text = '00000 Berlin';
      const results = detectGermanPII(text);
      const plz = results.filter(r => r.type === 'POSTAL_CODE');
      expect(plz).toHaveLength(0);
    });

    it('should detect major German cities', () => {
      const text = 'Wohnhaft in München';
      const results = detectGermanPII(text);
      const cities = results.filter(r => r.type === 'CITY');
      expect(cities.length).toBeGreaterThan(0);
    });
  });

  describe('Helper Functions', () => {
    describe('containsGermanPII', () => {
      it('should return true when PII present', () => {
        expect(containsGermanPII('Hans Müller')).toBe(true);
        expect(containsGermanPII('max@test.de')).toBe(true);
      });

      it('should return false when no PII present', () => {
        expect(containsGermanPII('Guten Tag, wie geht es Ihnen?')).toBe(false);
      });
    });

    describe('redactGermanPII', () => {
      it('should replace PII with type markers', () => {
        const text = 'Hans Müller wohnt in Berlin';
        const redacted = redactGermanPII(text);
        expect(redacted).toContain('[NAME]');
        expect(redacted).toContain('[CITY]');
        expect(redacted).not.toContain('Hans Müller');
      });
    });

    describe('getPIISummary', () => {
      it('should count PII types correctly', () => {
        const text = 'Hans Müller, 15.03.1985, Berlin, max@test.de';
        const summary = getPIISummary(text);
        expect(summary.NAME).toBeGreaterThanOrEqual(1);
        expect(summary.BIRTHDATE).toBeGreaterThanOrEqual(1);
        expect(summary.CITY).toBeGreaterThanOrEqual(1);
        expect(summary.EMAIL).toBeGreaterThanOrEqual(1);
      });
    });

    describe('isLikelyPhoneNumber', () => {
      it('should validate German mobile prefixes', () => {
        expect(isLikelyPhoneNumber('0170 1234567')).toBe(true);
        expect(isLikelyPhoneNumber('0151 23456789')).toBe(true);
      });

      it('should reject too short numbers', () => {
        expect(isLikelyPhoneNumber('123')).toBe(false);
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed PII in voice transcription', () => {
      const transcription = `
        Guten Tag, ich bin Hans Müller, geboren am 15. März 1985.
        Ich wohne in der Musterstraße 12, 12345 Berlin.
        Meine Telefonnummer ist 0170 1234567.
      `;
      
      const results = detectGermanPII(transcription);
      
      expect(results.some(r => r.type === 'NAME')).toBe(true);
      expect(results.some(r => r.type === 'BIRTHDATE')).toBe(true);
      expect(results.some(r => r.type === 'POSTAL_CODE')).toBe(true);
      expect(results.some(r => r.type === 'CITY')).toBe(true);
      expect(results.some(r => r.type === 'PHONE')).toBe(true);
    });
  });
});
