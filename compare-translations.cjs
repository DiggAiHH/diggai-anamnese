const fs = require('fs');
const de = JSON.parse(fs.readFileSync('public/locales/de/translation.json','utf8'));
const en = JSON.parse(fs.readFileSync('public/locales/en/translation.json','utf8'));
const uk = JSON.parse(fs.readFileSync('public/locales/uk/translation.json','utf8'));
const tr = JSON.parse(fs.readFileSync('public/locales/tr/translation.json','utf8'));
const ar = JSON.parse(fs.readFileSync('public/locales/ar/translation.json','utf8'));

const deKeys = Object.keys(de);
const enKeys = new Set(Object.keys(en));
const ukKeys = new Set(Object.keys(uk));
const trKeys = new Set(Object.keys(tr));
const arKeys = new Set(Object.keys(ar));

const out = [];
out.push('=== KEY COUNTS ===');
out.push('DE: ' + deKeys.length);
out.push('EN: ' + enKeys.size);
out.push('UK: ' + ukKeys.size);
out.push('TR: ' + trKeys.size);
out.push('AR: ' + arKeys.size);

const missingEN = deKeys.filter(k => !enKeys.has(k));
const missingUK = deKeys.filter(k => !ukKeys.has(k));
const missingTR = deKeys.filter(k => !trKeys.has(k));
const missingAR = deKeys.filter(k => !arKeys.has(k));

out.push('\n=== KEYS IN DE BUT MISSING FROM OTHER LANGUAGES ===');
out.push('\n--- Missing from EN (' + missingEN.length + ' keys) ---');
missingEN.forEach(k => out.push('  ' + k));
out.push('\n--- Missing from UK (' + missingUK.length + ' keys) ---');
missingUK.forEach(k => out.push('  ' + k));
out.push('\n--- Missing from TR (' + missingTR.length + ' keys) ---');
missingTR.forEach(k => out.push('  ' + k));
out.push('\n--- Missing from AR (' + missingAR.length + ' keys) ---');
missingAR.forEach(k => out.push('  ' + k));

// Extra keys
const enExtra = [...enKeys].filter(k => !de.hasOwnProperty(k));
const ukExtra = [...ukKeys].filter(k => !de.hasOwnProperty(k));
const trExtra = [...trKeys].filter(k => !de.hasOwnProperty(k));
const arExtra = [...arKeys].filter(k => !de.hasOwnProperty(k));
out.push('\n=== KEYS IN OTHER LANGS BUT NOT IN DE ===');
if(enExtra.length) out.push('EN extra: ' + JSON.stringify(enExtra));
if(ukExtra.length) out.push('UK extra: ' + JSON.stringify(ukExtra));
if(trExtra.length) out.push('TR extra: ' + JSON.stringify(trExtra));
if(arExtra.length) out.push('AR extra: ' + JSON.stringify(arExtra));
if(!enExtra.length && !ukExtra.length && !trExtra.length && !arExtra.length) out.push('(none)');

// Untranslated values - where value === German value (excluding known proper nouns/brand names)
const skipPattern = /^(Pradaxa|Xarelto|RSV|Port-System|Pollen|System Online|Tetanus|VBG)/;

out.push('\n=== UNTRANSLATED VALUES (value identical to German) ===');

function findUntranslated(lang, langName) {
  const results = [];
  for (const [k, v] of Object.entries(lang)) {
    if (de[k] !== undefined && v === de[k] && !skipPattern.test(k)) {
      results.push(k);
    }
  }
  return results;
}

const untransEN = findUntranslated(en, 'EN');
const untransUK = findUntranslated(uk, 'UK');
const untransTR = findUntranslated(tr, 'TR');
const untransAR = findUntranslated(ar, 'AR');

out.push('\n--- EN untranslated (' + untransEN.length + ') ---');
untransEN.forEach(k => out.push('  "' + k + '": "' + en[k] + '"'));
out.push('\n--- UK untranslated (' + untransUK.length + ') ---');
untransUK.forEach(k => out.push('  "' + k + '": "' + uk[k] + '"'));
out.push('\n--- TR untranslated (' + untransTR.length + ') ---');
untransTR.forEach(k => out.push('  "' + k + '": "' + tr[k] + '"'));
out.push('\n--- AR untranslated (' + untransAR.length + ') ---');
untransAR.forEach(k => out.push('  "' + k + '": "' + ar[k] + '"'));

fs.writeFileSync('translation-comparison.txt', out.join('\n'), 'utf8');
console.log('Done! Results written to translation-comparison.txt');
