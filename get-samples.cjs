const fs = require('fs');
const path = require('path');

const BASE_DIR = 'd:\\Klaproth Projekte\\DiggAi\\Ananmese\\diggai-anamnese-master';
const TARGET_LOCALES = ['de', 'en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl'];

const samples = {};
for (const locale of TARGET_LOCALES) {
  const file = path.join(BASE_DIR, 'public', 'locales', locale, 'translation.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  samples[locale] = {
    code: locale.toUpperCase(),
    expect_text: json.languageSelect
  };
}

console.log(JSON.stringify(samples, null, 2));
