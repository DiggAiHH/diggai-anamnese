const fs = require('fs');
const path = require('path');

const BASE_DIR = 'd:\\Klaproth Projekte\\DiggAi\\Ananmese\\diggai-anamnese-master';
const BASE_LOCALE = 'de';
const TARGET_LOCALES = ['en', 'ar', 'tr', 'uk', 'es', 'fa', 'it', 'fr', 'pl', 'ru', 'ro', 'bg'];
const ALL_LOCALES = [BASE_LOCALE, ...TARGET_LOCALES];

function localePath(locale) {
  return path.join(BASE_DIR, 'public', 'locales', locale, 'translation.json');
}

function readLocale(locale) {
  const file = localePath(locale);
  if (!fs.existsSync(file)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

const translations = Object.fromEntries(
  ALL_LOCALES.map((locale) => [locale, readLocale(locale)]),
);

const baseTranslations = translations[BASE_LOCALE];
const baseKeys = Object.keys(baseTranslations);
const localeKeySets = Object.fromEntries(
  ALL_LOCALES.map((locale) => [locale, new Set(Object.keys(translations[locale]))]),
);

const out = [];
out.push('=== KEY COUNTS ===');
for (const locale of ALL_LOCALES) {
  out.push(`${locale.toUpperCase()}: ${localeKeySets[locale].size}`);
}

out.push('\n=== KEYS IN DE BUT MISSING FROM OTHER LANGUAGES ===');
for (const locale of TARGET_LOCALES) {
  const missing = baseKeys.filter((key) => !localeKeySets[locale].has(key));
  out.push(`\n--- Missing from ${locale.toUpperCase()} (${missing.length} keys) ---`);
  missing.forEach((key) => out.push(`  ${key}`));
}

fs.writeFileSync('d:\\Klaproth Projekte\\DiggAi\\Ananmese\\diggai-anamnese-master\\translation-comparison-new.txt', out.join('\n'), 'utf8');
console.log('Done! Results written to translation-comparison-new.txt');
