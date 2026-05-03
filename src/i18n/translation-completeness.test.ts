import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TARGET_LOCALES = ['de', 'en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl'] as const;

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const keys: string[] = [];

  for (const [key, nested] of entries) {
    const current = prefix ? `${prefix}.${key}` : key;
    keys.push(current);

    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      keys.push(...flattenKeys(nested, current));
    }
  }

  return keys;
}

function readLocaleJson(rootDir: string, locale: string): Record<string, unknown> {
  const filePath = join(rootDir, 'public', 'locales', locale, 'translation.json');
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

describe('i18n translation completeness', () => {
  const rootDir = join(__dirname, '..', '..');
  const deLocale = readLocaleJson(rootDir, 'de');
  const baselineKeys = new Set(flattenKeys(deLocale));

  it('all target locales contain every key from German source-of-truth', () => {
    for (const locale of TARGET_LOCALES) {
      const localeJson = readLocaleJson(rootDir, locale);
      const localeKeys = new Set(flattenKeys(localeJson));
      const missing = Array.from(baselineKeys).filter((key) => !localeKeys.has(key));

      expect(
        missing,
        `Missing keys in locale "${locale}":\n${missing.slice(0, 25).join('\n')}`,
      ).toEqual([]);
    }
  });

  it('critical consent/start keys exist in all target locales', () => {
    const required = [
      'consent.signature_hint',
      'consent.error_checkboxes',
      'consent.submit',
      'service.start_cta',
    ];

    for (const locale of TARGET_LOCALES) {
      const localeJson = readLocaleJson(rootDir, locale);
      for (const key of required) {
        expect(localeJson[key], `Missing required key "${key}" in locale "${locale}"`).toBeTruthy();
      }
    }
  });
});
