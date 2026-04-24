const fs = require('fs');
const path = require('path');

const BASE_DIR = 'd:\\Klaproth Projekte\\DiggAi\\Ananmese\\diggai-anamnese-master';
const BASE_LOCALE = 'de';
const TARGET_LOCALES = ['en', 'ar', 'tr', 'uk', 'es', 'fa', 'it', 'fr', 'pl'];
const ALL_LOCALES = [BASE_LOCALE, ...TARGET_LOCALES];

const DE_DIR = path.join(BASE_DIR, 'public', 'locales', 'de');
const namespaces = fs.readdirSync(DE_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

const out = [];

for (const ns of namespaces) {
  out.push(`\n=== NAMESPACE: ${ns} ===`);
  const baseFile = path.join(DE_DIR, `${ns}.json`);
  const baseTranslations = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
  const baseKeys = Object.keys(baseTranslations);

  for (const locale of TARGET_LOCALES) {
    const targetFile = path.join(BASE_DIR, 'public', 'locales', locale, `${ns}.json`);
    if (!fs.existsSync(targetFile)) {
      out.push(`--- Missing file for ${locale.toUpperCase()}: ${ns}.json ---`);
      continue;
    }

    const targetTranslations = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    const targetKeys = new Set(Object.keys(targetTranslations));
    const missing = baseKeys.filter(key => !targetKeys.has(key));

    out.push(`--- ${locale.toUpperCase()}: ${targetKeys.size} keys (${missing.length} missing) ---`);
    if (missing.length > 0 && missing.length < 50) {
      missing.forEach(key => out.push(`  ${key}`));
    } else if (missing.length >= 50) {
      out.push(`  (${missing.length} keys missing - too many to list)`);
    }
  }
}

fs.writeFileSync(path.join(BASE_DIR, 'sync-check.txt'), out.join('\n'), 'utf8');
console.log('Done! Results written to sync-check.txt');
