const fs = require('fs');
const path = require('path');

const BASE_LOCALE = 'de';
const TARGET_LOCALES = ['en', 'ar', 'tr', 'uk', 'es', 'fa', 'it', 'fr', 'pl', 'ru', 'ro', 'bg'];
const ALL_LOCALES = [BASE_LOCALE, ...TARGET_LOCALES];

function localePath(locale) {
  return path.join('public', 'locales', locale, 'translation.json');
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

out.push('\n=== KEYS IN OTHER LANGS BUT NOT IN DE ===');
let hasExtraKeys = false;
for (const locale of TARGET_LOCALES) {
  const extra = [...localeKeySets[locale]].filter((key) => !Object.prototype.hasOwnProperty.call(baseTranslations, key));
  if (extra.length > 0) {
    hasExtraKeys = true;
    out.push(`${locale.toUpperCase()} extra: ${JSON.stringify(extra)}`);
  }
}
if (!hasExtraKeys) {
  out.push('(none)');
}

const skipPattern = /^(Pradaxa|Xarelto|RSV|Port-System|Pollen|System Online|Tetanus|VBG)$/;
out.push('\n=== UNTRANSLATED VALUES (value identical to German) ===');

function findUntranslated(locale) {
  const results = [];
  const localeTranslations = translations[locale];

  for (const [key, value] of Object.entries(localeTranslations)) {
    if (
      baseTranslations[key] !== undefined
      && value === baseTranslations[key]
      && !skipPattern.test(key)
    ) {
      results.push(key);
    }
  }

  return results;
}

for (const locale of TARGET_LOCALES) {
  const untranslated = findUntranslated(locale);
  out.push(`\n--- ${locale.toUpperCase()} untranslated (${untranslated.length}) ---`);
  untranslated.forEach((key) => out.push(`  "${key}": "${translations[locale][key]}"`));
}

fs.writeFileSync('translation-comparison.txt', out.join('\n'), 'utf8');
console.log('Done! Results written to translation-comparison.txt');
