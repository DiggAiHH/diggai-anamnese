#!/usr/bin/env node
/**
 * Translation Audit Script for DiggAI Anamnese App
 * Compares all language translation files against the German (de) reference.
 * Reports: missing keys, orphaned keys, untranslated entries, empty values.
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');
const REFERENCE_LANG = 'de';
const LANGUAGES = ['en', 'ar', 'tr', 'uk', 'es', 'fa', 'fr', 'it', 'pl'];

// Keys that are expected to remain identical across languages
// (proper nouns, medical abbreviations, codes, measurement formats, drug names, etc.)
const SKIP_IDENTICAL_PATTERNS = [
  // Pure numbers or number ranges
  /^\d[\d\s.,–\-]*$/,
  // Measurement values like "200-500 Meter" — will differ by translation of unit
  // Single-char or very short keys
  /^.{0,2}$/,
  // Known abbreviations/codes that stay the same
  /^(OK|PDF|QR-Code|BMI|EKG|MRT|CT|HbA1c|TSH|CRP|INR|PTT|GOT|GPT|GGT|AP|LDH|CK|BNP|PSA|GFR|HBA1C)$/i,
  // Drug names that are international
  /^(ASS|Clopidogrel|Marcumar|Heparin|Metformin|Ramipril|Amlodipin|Bisoprolol|Simvastatin|Atorvastatin|Pantoprazol|Omeprazol|L-Thyroxin|Insulin|Ibuprofen|Diclofenac|Metamizol|Paracetamol|Prednisolon|Cortison|Metoprolol)$/i,
  // Medical terms that are Latin/international
  /^(Aneurysma|Asthma|Diabetes|Hepatitis|Psoriasis|Myom|Endometriose|Cannabis|Disposition)$/i,
  // Entries that are just emoji + number pattern
  /^[⭐⚠📱🔒🏥💊🩺]+$/,
];

// Additional specific keys to skip (they're the same in German source = value)
const SKIP_IDENTICAL_KEYS = new Set([
  'Aneurysma',
  'Asthma',
  'Cannabis',
  'Disposition',
  'Endometriose',
  'Hepatitis',
  'Myom',
  'Psoriasis',
]);

function shouldSkipIdenticalCheck(key, deValue, langValue) {
  // If the value is very short (1-3 chars), likely a symbol or abbreviation
  if (langValue.length <= 3) return true;
  
  // If key matches skip patterns
  for (const pattern of SKIP_IDENTICAL_PATTERNS) {
    if (pattern.test(key)) return true;
  }
  
  // If key is in the explicit skip set
  if (SKIP_IDENTICAL_KEYS.has(key)) return true;
  
  // If the value is purely numeric (possibly with units that don't change)
  if (/^[\d.,–\-<>\s°%]+$/.test(langValue)) return true;
  
  // If key contains only special characters / emojis
  if (/^[^\w\s]+$/.test(key)) return true;
  
  return false;
}

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading ${filePath}: ${err.message}`);
    return null;
  }
}

function auditLanguage(deTrans, langTrans, lang) {
  const deKeys = Object.keys(deTrans);
  const langKeys = Object.keys(langTrans);
  const deKeySet = new Set(deKeys);
  const langKeySet = new Set(langKeys);

  const missing = deKeys.filter(k => !langKeySet.has(k));
  const orphaned = langKeys.filter(k => !deKeySet.has(k));
  const empty = langKeys.filter(k => langTrans[k] === '');
  
  // Find untranslated entries (value identical to German)
  const untranslated = [];
  for (const key of deKeys) {
    if (!langKeySet.has(key)) continue;
    const deVal = deTrans[key];
    const langVal = langTrans[key];
    if (deVal === langVal && !shouldSkipIdenticalCheck(key, deVal, langVal)) {
      untranslated.push(key);
    }
  }

  // Check for duplicate keys (JSON.parse keeps last one, so we check raw file)
  const duplicates = findDuplicateKeys(lang);

  return { lang, missing, orphaned, empty, untranslated, duplicates, totalKeys: langKeys.length };
}

function findDuplicateKeys(lang) {
  const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const keyRegex = /^\s*"([^"]+)"\s*:/gm;
  const seen = new Map();
  const duplicates = [];
  let match;
  while ((match = keyRegex.exec(raw)) !== null) {
    const key = match[1];
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.set(key, true);
    }
  }
  return duplicates;
}

function main() {
  // Load reference
  const deFilePath = path.join(LOCALES_DIR, REFERENCE_LANG, 'translation.json');
  const deTrans = loadJson(deFilePath);
  if (!deTrans) {
    console.error('Failed to load German reference file. Aborting.');
    process.exit(1);
  }
  const deKeyCount = Object.keys(deTrans).length;
  console.log(`\n=== DiggAI Anamnese Translation Audit ===`);
  console.log(`Reference: DE with ${deKeyCount} keys\n`);

  // Check DE for duplicates too
  const deDuplicates = findDuplicateKeys(REFERENCE_LANG);
  if (deDuplicates.length > 0) {
    console.log(`⚠ DE reference has ${deDuplicates.length} duplicate key(s): ${deDuplicates.join(', ')}`);
  }

  const results = [];
  for (const lang of LANGUAGES) {
    const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
    const langTrans = loadJson(filePath);
    if (!langTrans) {
      console.error(`Skipping ${lang} — failed to load`);
      continue;
    }
    const result = auditLanguage(deTrans, langTrans, lang);
    results.push(result);
  }

  // Summary table
  console.log('┌──────┬────────────┬─────────────┬──────────┬──────────────┬───────┬────────────┐');
  console.log('│ Lang │ Total Keys │ Missing(DE) │ Orphaned │ Untranslated │ Empty │ Duplicates │');
  console.log('├──────┼────────────┼─────────────┼──────────┼──────────────┼───────┼────────────┤');
  for (const r of results) {
    const lang = r.lang.padEnd(4);
    const total = String(r.totalKeys).padStart(10);
    const miss = String(r.missing.length).padStart(11);
    const orph = String(r.orphaned.length).padStart(8);
    const untrans = String(r.untranslated.length).padStart(12);
    const emp = String(r.empty.length).padStart(5);
    const dupes = String(r.duplicates.length).padStart(10);
    console.log(`│ ${lang} │${total} │${miss} │${orph} │${untrans} │${emp} │${dupes} │`);
  }
  console.log('└──────┴────────────┴─────────────┴──────────┴──────────────┴───────┴────────────┘');

  // Detailed reports per language
  for (const r of results) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`DETAILS: ${r.lang.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);

    if (r.missing.length > 0) {
      console.log(`\n--- Missing Keys (${r.missing.length}) ---`);
      for (const k of r.missing) {
        console.log(`  MISSING: "${k}"`);
      }
    } else {
      console.log('\n✓ No missing keys');
    }

    if (r.orphaned.length > 0) {
      console.log(`\n--- Orphaned Keys (${r.orphaned.length}) ---`);
      for (const k of r.orphaned) {
        console.log(`  ORPHAN: "${k}"`);
      }
    } else {
      console.log('✓ No orphaned keys');
    }

    if (r.untranslated.length > 0) {
      console.log(`\n--- Untranslated / Identical to DE (${r.untranslated.length}) ---`);
      for (const k of r.untranslated) {
        console.log(`  UNTRANS: "${k}"`);
      }
    } else {
      console.log('✓ No untranslated entries detected');
    }

    if (r.empty.length > 0) {
      console.log(`\n--- Empty Values (${r.empty.length}) ---`);
      for (const k of r.empty) {
        console.log(`  EMPTY: "${k}"`);
      }
    } else {
      console.log('✓ No empty values');
    }

    if (r.duplicates.length > 0) {
      console.log(`\n--- Duplicate Keys (${r.duplicates.length}) ---`);
      for (const k of r.duplicates) {
        console.log(`  DUPE: "${k}"`);
      }
    } else {
      console.log('✓ No duplicate keys');
    }
  }

  // Write JSON report
  const reportPath = path.join(__dirname, '..', 'translation-audit-results.json');
  const jsonReport = {
    timestamp: new Date().toISOString(),
    referenceLanguage: REFERENCE_LANG,
    referenceKeyCount: deKeyCount,
    deDuplicates,
    languages: results.map(r => ({
      lang: r.lang,
      totalKeys: r.totalKeys,
      missingCount: r.missing.length,
      missingKeys: r.missing,
      orphanedCount: r.orphaned.length,
      orphanedKeys: r.orphaned,
      untranslatedCount: r.untranslated.length,
      untranslatedKeys: r.untranslated,
      emptyCount: r.empty.length,
      emptyKeys: r.empty,
      duplicateCount: r.duplicates.length,
      duplicateKeys: r.duplicates,
    })),
  };
  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
  console.log(`\n\nJSON report saved to: ${reportPath}`);
}

main();
