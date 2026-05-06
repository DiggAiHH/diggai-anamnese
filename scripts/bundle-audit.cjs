#!/usr/bin/env node
/**
 * Bundle-Audit — Class-IIa-Strings im Capture-Build erkennen
 *
 * Anker: DiggAi-Restrukturierungs-Plan v1.0, §6.1 (Static Code Tests)
 *
 * Dieses Skript wird von der CI nach jedem Capture-Build ausgeführt. Es
 * grep't das produzierte JavaScript-Bundle nach Strings, die typischerweise
 * nur in Class-IIa-Code vorkommen. Findet das Skript einen Treffer, schlägt
 * der Build fehl — kein Deploy mit Class-IIa-Code im Capture-Bundle.
 *
 * Verwendung:
 *   node scripts/bundle-audit.cjs              # Default: prüft dist/
 *   node scripts/bundle-audit.cjs dist/        # explizit
 *   AUDIT_STRICT=1 node scripts/bundle-audit.cjs   # auch Wörter wie "alert"
 *
 * Exit-Codes:
 *   0 = sauber, keine verbotenen Strings gefunden
 *   1 = Treffer gefunden, Bundle ist NICHT class-I-konform
 *   2 = Konfigurations-Fehler (z.B. dist/ existiert nicht)
 */

const fs = require('fs');
const path = require('path');

// ── Verbotene Strings — exakte Substring-Matches im minified JS ──────
//
// Strings sind so gewählt, dass sie auch im minified Bundle erhalten bleiben
// (variable Namen werden zwar geminified, aber String-Literals nicht).
// Falsch-positiv-Risiko ist akzeptabel — lieber zu vorsichtig als zu lasch.

const FORBIDDEN_STRINGS_STRICT = [
  // Triage-/Red-Flag-Logik (Bucket A)
  'evaluateAlertRules',
  'red_flag',
  'redFlag',
  'triage_event',
  'triageEvent',
  'TRIAGE_ESCALATION',
  // KI-Engine (Bucket A)
  'aiSummary',
  'ai_summary',
  'aiEngine',
  'TherapySuggestion',
  'icdCodes',
  'aiConfidence',
  'aiPromptHash',
  // Alert-Rule-Engine (Bucket A)
  'AlertSeverity',
  'AlertCategory',
  'CRITICAL_ALERT',
  'EMERGENCY_TRIAGE',
  // Therapy-Plan-Domäne (Bucket A)
  'TherapyMeasure',
  'TherapyStatus',
  'MEDICATION_INTERACTION',
  // Decision-Support-Endpoints (Bucket A Routes)
  '/api/therapy',
  '/api/agents',
];

// In strict mode auch generische Wörter — aber Vorsicht vor Falsch-Positiven
// (z.B. "alert" im Sinne von Browser-alert vs Clinical-Alert).
const FORBIDDEN_STRINGS_VERY_STRICT = [
  'ClinicalAlert',
  'Diagnosis',
  'icd10',
];

// ── Erlaubte Ausnahmen — Auth-Domäne hat „alert" als generisches Wort ──
//
// Wenn ein Treffer in einer dieser Pfad-Substring vorkommt, wird er
// ignoriert. Bevorzugt aber: keine generischen Worte in der Verbots-Liste.

const ALLOWED_PATH_SUBSTRINGS = [
  // hier später bei Bedarf erweitern
];

// ─── Audit-Logik ─────────────────────────────────────────────

function findJsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        out.push(full);
      }
    }
  }
  return out;
}

function auditFile(filePath, forbiddenList) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hits = [];
  for (const needle of forbiddenList) {
    const idx = content.indexOf(needle);
    if (idx !== -1) {
      // Kontext vor + nach dem Treffer (50 Zeichen je Seite)
      const start = Math.max(0, idx - 50);
      const end = Math.min(content.length, idx + needle.length + 50);
      hits.push({
        needle,
        position: idx,
        context: content.slice(start, end).replace(/\s+/g, ' '),
      });
    }
  }
  return hits;
}

function isAllowed(filePath) {
  return ALLOWED_PATH_SUBSTRINGS.some(p => filePath.includes(p));
}

function main() {
  const distDir = process.argv[2] || 'dist';
  const strict = process.env.AUDIT_STRICT === '1';
  const forbidden = strict
    ? [...FORBIDDEN_STRINGS_STRICT, ...FORBIDDEN_STRINGS_VERY_STRICT]
    : FORBIDDEN_STRINGS_STRICT;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DiggAi Bundle-Audit — Class-I-Verifikation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Verzeichnis:    ' + distDir);
  console.log('  Strict-Modus:   ' + (strict ? 'ja' : 'nein'));
  console.log('  Verbotene Begriffe: ' + forbidden.length);
  console.log('');

  if (!fs.existsSync(distDir)) {
    console.error('FEHLER: Verzeichnis ' + distDir + ' existiert nicht.');
    console.error('Bitte erst "npm run build" ausführen.');
    process.exit(2);
  }

  const jsFiles = findJsFiles(distDir);
  if (jsFiles.length === 0) {
    console.error('FEHLER: Keine .js-Dateien in ' + distDir + ' gefunden.');
    process.exit(2);
  }

  console.log('  Geprüfte Dateien: ' + jsFiles.length);
  console.log('');

  let totalHits = 0;
  const violations = [];

  for (const file of jsFiles) {
    if (isAllowed(file)) continue;
    const hits = auditFile(file, forbidden);
    if (hits.length > 0) {
      totalHits += hits.length;
      violations.push({ file: path.relative(distDir, file), hits });
    }
  }

  if (totalHits === 0) {
    console.log('  ✓ Keine verbotenen Strings gefunden.');
    console.log('  ✓ Bundle ist Class-I-konform.');
    console.log('');
    process.exit(0);
  }

  console.log('  ✗ ' + totalHits + ' VERBOTENE STRINGS GEFUNDEN');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TREFFER:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const v of violations) {
    console.log('');
    console.log('  ' + v.file);
    for (const hit of v.hits) {
      console.log('    [' + hit.needle + '] @ Pos ' + hit.position);
      console.log('    Kontext: ...' + hit.context + '...');
    }
  }
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Was tun?');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('  1) Identifiziere die Quell-Datei in src/ oder server/, die den');
  console.log('     verbotenen String enthält.');
  console.log('  2) Verschiebe diesen Code nach packages/suite/ (Class IIa).');
  console.log('  3) Capture importiert ihn nicht mehr.');
  console.log('  4) Re-Build und re-Audit.');
  console.log('');
  console.log('  Falls Fehlalarm: ergänze ALLOWED_PATH_SUBSTRINGS in diesem');
  console.log('  Skript mit Begründung im Code-Kommentar.');
  console.log('');

  process.exit(1);
}

main();
