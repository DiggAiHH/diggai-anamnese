const fs = require('fs');
const path = require('path');

const BASE_DIR = 'd:\\Klaproth Projekte\\DiggAi\\Ananmese\\diggai-anamnese-master';
const TARGET_LOCALES = ['ar', 'en', 'tr', 'uk', 'es', 'fa', 'it', 'fr', 'pl', 'de'];

for (const locale of TARGET_LOCALES) {
  const file = path.join(BASE_DIR, 'public', 'locales', locale, 'translation.json');
  if (!fs.existsSync(file)) continue;

  const content = fs.readFileSync(file, 'utf8');
  // Simple check for duplicate keys by regex or manual parsing
  const lines = content.split('\n');
  const seen = new Set();
  const duplicates = [];

  for (const line of lines) {
    const match = line.match(/^\s*"([^"]+)"\s*:/);
    if (match) {
      const key = match[1];
      if (seen.has(key)) {
        duplicates.push(key);
      }
      seen.add(key);
    }
  }

  if (duplicates.length > 0) {
    console.log(`Duplicate keys in ${locale}:`, duplicates);
    // Cleanup: Parse JSON and rewrite it (this will naturally resolve duplicates by taking the last one)
    try {
      const json = JSON.parse(content);
      fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
      console.log(`Cleaned up ${locale}`);
    } catch (e) {
      console.error(`Error parsing ${locale}:`, e);
    }
  }
}
