const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app/public/locales';
const de = JSON.parse(fs.readFileSync(path.join(dir, 'de/translation.json'), 'utf8'));
const deKeys = Object.keys(de);

const langs = ['it', 'fr', 'pl', 'fa'];
const englishWords = ['the ', ' and ', 'your ', 'with ', ' have ', 'this ', 'that ', 'from ', 'disease', 'disorder', 'please', 'patient'];

for (const lang of langs) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, lang + '/translation.json'), 'utf8'));
    const langKeys = new Set(Object.keys(data));
    
    // Missing keys
    const missing = deKeys.filter(k => !langKeys.has(k));
    
    // English suspects
    let engCount = 0;
    for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string' && v.length > 10) {
            const lower = v.toLowerCase();
            const hits = englishWords.filter(w => lower.includes(w));
            if (hits.length >= 2) engCount++;
        }
    }
    
    console.log(`${lang.toUpperCase()}: ${langKeys.size} keys, ${missing.length} missing from DE, ${engCount} suspected English`);
    if (missing.length > 0) {
        console.log('  Missing samples:', missing.slice(0, 5));
    }
}
