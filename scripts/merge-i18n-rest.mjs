import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'public', 'locales');

function mergeLocale(lang, translations) {
  const filePath = join(localesDir, lang, 'translation.json');
  const existing = JSON.parse(readFileSync(filePath, 'utf-8'));

  let added = 0;
  for (const [key, value] of Object.entries(translations)) {
    if (!(key in existing)) {
      existing[key] = value;
      added++;
    }
  }

  // Sort keys by German locale
  const sorted = {};
  for (const k of Object.keys(existing).sort((a, b) => a.localeCompare(b, 'de'))) {
    sorted[k] = existing[k];
  }

  writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  console.log(`${lang}: added ${added} keys (total: ${Object.keys(sorted).length})`);
}

const langs = ['ar', 'tr', 'uk'];
for (const lang of langs) {
  const translations = JSON.parse(
    readFileSync(join(__dirname, `translations-${lang}.json`), 'utf-8')
  );
  mergeLocale(lang, translations);
}

console.log('AR + TR + UK done.');
