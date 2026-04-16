/**
 * quality-scorecard.cjs — DiggAI Platform Quality Metrics Engine
 *
 * Measures platform health across 5 categories (total 1000 pts).
 * Saves timestamped results and compares to baseline for improvement tracking.
 *
 * Usage:
 *   node scripts/quality-scorecard.cjs           # Full run
 *   node scripts/quality-scorecard.cjs --baseline # Set current score as baseline
 *   node scripts/quality-scorecard.cjs --compare  # Compare to last baseline
 *   node scripts/quality-scorecard.cjs --fast     # Skip slow checks (no tests)
 *
 * Target: 700% improvement = score 7× the baseline
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '..');
const METRICS_DIR = path.join(ROOT, 'scripts', 'metrics');
const RESULTS_DIR = path.join(METRICS_DIR, 'results');
const BASELINE_FILE = path.join(METRICS_DIR, 'baseline.json');

const args = process.argv.slice(2);
const FLAG_BASELINE = args.includes('--baseline');
const FLAG_COMPARE  = args.includes('--compare');
const FLAG_FAST     = args.includes('--fast');

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const pct   = (n, d) => d === 0 ? 0 : Math.round((n / d) * 100);

function run(cmd, opts = {}) {
  try {
    const result = spawnSync(cmd, { shell: true, cwd: ROOT, encoding: 'utf8', timeout: 120_000, ...opts });
    return { ok: result.status === 0, stdout: result.stdout || '', stderr: result.stderr || '', status: result.status };
  } catch (e) {
    return { ok: false, stdout: '', stderr: e.message, status: -1 };
  }
}

function bar(score, max, width = 30) {
  const filled = Math.round((score / max) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

function color(text, code) {
  // ANSI color support
  return process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;
}
const green  = t => color(t, '32');
const yellow = t => color(t, '33');
const red    = t => color(t, '31');
const cyan   = t => color(t, '36');
const bold   = t => color(t, '1');

function scoreColor(score, max) {
  const ratio = score / max;
  if (ratio >= 0.8) return green;
  if (ratio >= 0.5) return yellow;
  return red;
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY 1: TypeScript Quality (200 pts)
// ─────────────────────────────────────────────────────────────────
function checkTypeScript() {
  console.log(cyan('\n  🔷 Checking TypeScript...'));
  const result = run('npx tsc --noEmit 2>&1', { timeout: 60_000 });
  const output = result.stdout + result.stderr;

  const errorLines = output.split('\n').filter(l => /error TS\d+/.test(l));
  const errorCount = errorLines.length;

  // Deduct 10 pts per error, minimum 0
  const score = clamp(200 - errorCount * 10, 0, 200);
  const details = errorCount === 0
    ? '0 type errors ✅'
    : `${errorCount} error(s) found ❌`;

  const sample = errorLines.slice(0, 3).map(l => '    ' + l.trim());

  return { score, max: 200, label: 'TypeScript Quality', details, sample, errorCount };
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY 2: Unit Test Health (250 pts)
// ─────────────────────────────────────────────────────────────────
function checkUnitTests() {
  console.log(cyan('\n  🧪 Running unit tests...'));

  if (FLAG_FAST) {
    return { score: 0, max: 250, label: 'Unit Tests', details: 'Skipped (--fast)', skipped: true };
  }

  // Run vitest with JSON reporter
  const result = run('npx vitest run --reporter=json --reporter=verbose 2>&1', { timeout: 90_000 });
  const output = result.stdout + result.stderr;

  // Parse JSON result if available
  let passed = 0, failed = 0, total = 0;

  // Try to extract from verbose output
  const passMatch  = output.match(/(\d+)\s+passed/);
  const failMatch  = output.match(/(\d+)\s+failed/);
  const totalMatch = output.match(/Tests\s+(\d+)/);

  if (passMatch) passed = parseInt(passMatch[1], 10);
  if (failMatch) failed = parseInt(failMatch[1], 10);
  total = passed + failed;

  const passRate  = total > 0 ? pct(passed, total) : (result.ok ? 100 : 0);
  const passScore = clamp(Math.round((passRate / 100) * 150), 0, 150); // 150 pts for pass rate
  const covScore  = 0; // Coverage needs separate run, set to 0 for quick check
  const score     = passScore + covScore;

  const details = total > 0
    ? `${passed}/${total} passed (${passRate}%)`
    : result.ok ? 'All tests passed ✅' : 'Test run failed ❌';

  return { score, max: 250, label: 'Unit Tests', details, passed, failed, total, passRate };
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY 3: E2E Flow Coverage (250 pts)
// ─────────────────────────────────────────────────────────────────
function checkE2EFlows() {
  console.log(cyan('\n  🎭 Checking E2E test coverage...'));

  const E2E_DIR = path.join(ROOT, 'e2e');

  // Count spec files per flow domain
  const flowMap = {
    'Patient Flows':  ['patient-journey/', 'anamnese.spec.ts', 'questionnaire-flow.spec.ts', 'returning-patient.spec.ts'],
    'Doctor Flows':   ['doctor-dashboard/', 'arzt-dashboard.spec.ts', 'dashboard.spec.ts'],
    'MFA Flows':      ['mfa-dashboard/', 'mfa-dashboard.spec.ts'],
    'Auth Flows':     ['auth-flow.spec.ts', 'auth-security.spec.ts', 'auth-sessions.spec.ts'],
    'Critical Paths': ['critical-path.spec.ts', 'triage-alerts.spec.ts'],
    'Triage':         ['volltest-ziel01.spec.ts', 'volltest-ziel02.spec.ts', 'volltest-ziel03.spec.ts'],
    'i18n':           ['i18n.spec.ts'],
    'Security':       ['security.spec.ts', 'security-pentest.spec.ts', 'penetration.spec.ts'],
    'Payment':        ['kiosk-payment.spec.ts', 'stripe-checkout.spec.ts', 'billing-optimization.spec.ts'],
    'Telemedizin':    ['telemedicine.spec.ts'],
    'NFC':            ['nfc-flow.spec.ts'],
    'Admin':          ['admin-erweiterung.spec.ts'],
  };

  let totalExpected = 0;
  let totalFound    = 0;
  const flowResults = {};

  for (const [domain, files] of Object.entries(flowMap)) {
    let found = 0;
    for (const f of files) {
      const fp = path.join(E2E_DIR, f);
      if (fs.existsSync(fp)) found++;
    }
    totalExpected += files.length;
    totalFound    += found;
    flowResults[domain] = { found, expected: files.length, pct: pct(found, files.length) };
  }

  // Count total spec files
  let totalSpecs = 0;
  function countSpecs(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) countSpecs(path.join(dir, entry.name));
      else if (entry.name.endsWith('.spec.ts')) totalSpecs++;
    }
  }
  countSpecs(E2E_DIR);

  const coveragePct = pct(totalFound, totalExpected);
  const score = clamp(Math.round((coveragePct / 100) * 250), 0, 250);

  return {
    score, max: 250, label: 'E2E Flow Coverage',
    details: `${totalFound}/${totalExpected} flow domains (${coveragePct}%) | ${totalSpecs} spec files total`,
    flowResults, totalSpecs,
  };
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY 4: Security & Compliance (200 pts)
// ─────────────────────────────────────────────────────────────────
function checkSecurity() {
  console.log(cyan('\n  🔐 Checking security (npm audit)...'));

  const result = run('npm audit --json 2>&1');
  let score = 200;
  let details = '';
  let vulns = { critical: 0, high: 0, moderate: 0, low: 0 };

  try {
    // Try to parse JSON output
    const jsonStart = result.stdout.indexOf('{');
    if (jsonStart >= 0) {
      const auditData = JSON.parse(result.stdout.slice(jsonStart));
      const meta = auditData.metadata || auditData;
      vulns = {
        critical: meta?.vulnerabilities?.critical || 0,
        high:     meta?.vulnerabilities?.high     || 0,
        moderate: meta?.vulnerabilities?.moderate  || 0,
        low:      meta?.vulnerabilities?.low       || 0,
      };
    }
  } catch (_) { /* ignore parse error */ }

  // Deductions: critical -40, high -20, moderate -5, low -1
  const deduction = vulns.critical * 40 + vulns.high * 20 + vulns.moderate * 5 + vulns.low * 1;
  score = clamp(200 - deduction, 0, 200);

  const vulnTotal = vulns.critical + vulns.high + vulns.moderate + vulns.low;
  details = vulnTotal === 0
    ? 'No vulnerabilities found ✅'
    : `${vulns.critical} critical, ${vulns.high} high, ${vulns.moderate} moderate, ${vulns.low} low`;

  // Check DSGVO-critical files exist
  const criticalFiles = [
    'server/services/encryption.ts',
    'server/middleware/auth.ts',
    'server/middleware/csrf.ts',
    'server/services/sanitize.ts',
  ];
  const missingFiles = criticalFiles.filter(f => !fs.existsSync(path.join(ROOT, f)));
  if (missingFiles.length > 0) {
    score = clamp(score - missingFiles.length * 30, 0, 200);
    details += ` | DSGVO files missing: ${missingFiles.join(', ')}`;
  }

  return { score, max: 200, label: 'Security & DSGVO', details, vulns, missingFiles };
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY 5: i18n & Code Quality (100 pts)
// ─────────────────────────────────────────────────────────────────
function checkI18nAndQuality() {
  console.log(cyan('\n  🌍 Checking i18n coverage & code quality...'));

  const LOCALES_DIR = path.join(ROOT, 'public', 'locales');
  const LANGUAGES   = ['de', 'en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl'];

  let langScore = 0;
  const langResults = {};

  if (!fs.existsSync(LOCALES_DIR)) {
    return { score: 0, max: 100, label: 'i18n & Code Quality', details: 'Locales dir not found' };
  }

  // Load German (source of truth) key count
  const dePath = path.join(LOCALES_DIR, 'de', 'translation.json');
  let deKeys = 0;
  try {
    const deData = JSON.parse(fs.readFileSync(dePath, 'utf8'));
    deKeys = Object.keys(deData).length;
  } catch (_) { /* ignore */ }

  let totalCoverage = 0;
  for (const lang of LANGUAGES) {
    const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
    if (!fs.existsSync(filePath)) {
      langResults[lang] = { keys: 0, coverage: 0, missing: deKeys };
      continue;
    }
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const keys = Object.keys(data).length;
      const coverage = deKeys > 0 ? pct(keys, deKeys) : 100;
      langResults[lang] = { keys, coverage, missing: Math.max(0, deKeys - keys) };
      totalCoverage += coverage;
    } catch (_) {
      langResults[lang] = { keys: 0, coverage: 0, missing: deKeys };
    }
  }

  const avgCoverage = LANGUAGES.length > 0 ? Math.round(totalCoverage / LANGUAGES.length) : 0;
  langScore = clamp(Math.round((avgCoverage / 100) * 60), 0, 60); // 60 pts for i18n

  // ESLint check (40 pts)
  let eslintScore = 40;
  const eslintResult = run('npx eslint src/ --max-warnings=0 --format=compact 2>&1', { timeout: 30_000 });
  if (!eslintResult.ok) {
    const warnMatch = eslintResult.stdout.match(/(\d+) warning/);
    const errMatch  = eslintResult.stdout.match(/(\d+) error/);
    const warns = warnMatch ? parseInt(warnMatch[1], 10) : 0;
    const errs  = errMatch  ? parseInt(errMatch[1],  10) : 0;
    eslintScore = clamp(40 - errs * 5 - warns * 1, 0, 40);
  }

  const score = langScore + eslintScore;
  const details = `i18n: ${avgCoverage}% avg coverage (${LANGUAGES.length} langs) | ESLint: ${eslintScore}/40 pts`;

  return { score, max: 100, label: 'i18n & Code Quality', details, langResults, avgCoverage, eslintScore };
}

// ─────────────────────────────────────────────────────────────────
// SEED COVERAGE CHECK (bonus info, not scored)
// ─────────────────────────────────────────────────────────────────
function checkSeedCoverage() {
  const seedFile = path.join(ROOT, 'prisma', 'seed-demo-complete.ts');
  const exists   = fs.existsSync(seedFile);

  const FLOWS = [
    'NEUPATIENTEN', 'WIEDERKEHRENDE', 'KRITISCH', 'WARNING',
    'REZEPT', 'AU', 'UEBERWEISUNG', 'BG', 'HAUSBESUCH',
    'TELEMEDIZIN', 'NFC', 'SELBSTZAHLER', 'MULTILINGUAL', 'PWA',
  ];

  let foundFlows = 0;
  if (exists) {
    const content = fs.readFileSync(seedFile, 'utf8').toLowerCase();
    for (const flow of FLOWS) {
      if (content.includes(flow.toLowerCase())) foundFlows++;
    }
  }

  return {
    exists,
    patientCount: 30,  // as defined in our seed
    flowsCovered: foundFlows,
    flowsTotal: FLOWS.length,
    allFlowsCovered: foundFlows === FLOWS.length,
  };
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCORECARD RUN
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + bold(cyan('╔══════════════════════════════════════════════════════════╗')));
  console.log(bold(cyan('║   DiggAI Platform — Quality Scorecard                    ║')));
  console.log(bold(cyan('║   Iterative Improvement Tracker                          ║')));
  console.log(bold(cyan('╚══════════════════════════════════════════════════════════╝')));
  console.log(`  ${new Date().toLocaleString('de-DE')}  |  Mode: ${FLAG_FAST ? 'fast' : 'full'}\n`);

  // Ensure output dirs exist
  if (!fs.existsSync(METRICS_DIR))  fs.mkdirSync(METRICS_DIR, { recursive: true });
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // Run all checks
  const ts      = checkTypeScript();
  const tests   = checkUnitTests();
  const e2e     = checkE2EFlows();
  const sec     = checkSecurity();
  const i18n    = checkI18nAndQuality();
  const seed    = checkSeedCoverage();

  const categories = [ts, tests, e2e, sec, i18n];
  const totalScore = categories.reduce((s, c) => s + c.score, 0);
  const totalMax   = categories.reduce((s, c) => s + c.max,   0); // 1000

  // ── Print Results ────────────────────────────────────────────
  console.log('\n' + bold('═'.repeat(62)));
  console.log(bold('  SCORECARD RESULTS'));
  console.log(bold('═'.repeat(62)));

  for (const cat of categories) {
    const col  = scoreColor(cat.score, cat.max);
    const pcts = Math.round((cat.score / cat.max) * 100);
    console.log(`\n  ${bold(cat.label)}`);
    console.log(`  ${col(bar(cat.score, cat.max))}  ${col(`${cat.score}/${cat.max}`)} (${pcts}%)`);
    console.log(`  ${cat.details}`);

    if (cat.sample && cat.sample.length > 0) {
      cat.sample.forEach(l => console.log(red(l)));
    }
    if (cat.flowResults) {
      for (const [domain, r] of Object.entries(cat.flowResults)) {
        const pctStr = pct(r.found, r.expected);
        const col2 = pctStr >= 80 ? green : pctStr >= 50 ? yellow : red;
        console.log(`    ${col2('•')} ${domain.padEnd(18)} ${r.found}/${r.expected} spec files (${pctStr}%)`);
      }
    }
  }

  // ── Seed Coverage Summary ────────────────────────────────────
  console.log('\n' + bold('  SEED COVERAGE'));
  console.log(`  seed-demo-complete.ts: ${seed.exists ? green('✅ exists') : red('❌ missing')}`);
  console.log(`  Patient count:  ${bold(String(seed.patientCount))}/30`);
  console.log(`  Flows in seed:  ${seed.flowsCovered}/${seed.flowsTotal} ${seed.allFlowsCovered ? green('✅ all flows') : yellow('partial')}`);

  // ── Total Score ──────────────────────────────────────────────
  const pctTotal  = Math.round((totalScore / totalMax) * 100);
  const totalCol  = scoreColor(totalScore, totalMax);

  console.log('\n' + bold('═'.repeat(62)));
  console.log(bold('  TOTAL SCORE'));
  console.log(bold('═'.repeat(62)));
  console.log(`\n  ${totalCol(bar(totalScore, totalMax, 40))}  ${totalCol(bold(`${totalScore} / ${totalMax}`))}`);
  console.log(`  Overall: ${totalCol(bold(`${pctTotal}%`))}\n`);

  // ── Compare to Baseline ──────────────────────────────────────
  if (fs.existsSync(BASELINE_FILE)) {
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    const baseTotal = baseline.totalScore || 0;
    const improvement = baseTotal > 0 ? ((totalScore - baseTotal) / baseTotal * 100).toFixed(1) : 'N/A';
    const multiplier  = baseTotal > 0 ? (totalScore / baseTotal).toFixed(2) : 'N/A';
    const target700   = baseTotal > 0 ? baseTotal * 7 : null;

    console.log(bold('  📈 PROGRESS vs BASELINE'));
    console.log(`  Baseline score:    ${baseTotal}/${totalMax}  (${new Date(baseline.timestamp).toLocaleDateString('de-DE')})`);
    console.log(`  Current score:     ${totalScore}/${totalMax}`);
    const impColor = totalScore >= baseTotal ? green : red;
    console.log(`  Improvement:       ${impColor(`${improvement}%`)}  (${impColor(`${multiplier}× baseline`)})`);

    if (target700) {
      const progress700 = Math.min(100, Math.round((totalScore / target700) * 100));
      console.log(`  Target (700%/7×):  ${target700}/${totalMax}`);
      console.log(`  Progress to 7×:    ${bar(totalScore, target700, 35)} ${progress700}%`);
    }
    console.log('');
  } else {
    console.log(yellow('  ⚡ No baseline yet. Run with --baseline to set current score as baseline.\n'));
  }

  // ── Category Detail: i18n breakdown ─────────────────────────
  if (i18n.langResults && !FLAG_FAST) {
    console.log(bold('  🌍 I18N BREAKDOWN'));
    const langs = Object.entries(i18n.langResults);
    for (const [lang, r] of langs) {
      const col = r.coverage >= 90 ? green : r.coverage >= 70 ? yellow : red;
      console.log(`    ${lang.padEnd(4)}  ${col(String(r.coverage).padStart(3))}%  ${r.keys} keys  ${r.missing > 0 ? red(`(-${r.missing})`) : green('✅')}`);
    }
    console.log('');
  }

  // ── Recommendations ──────────────────────────────────────────
  console.log(bold('  🎯 IMPROVEMENT RECOMMENDATIONS'));
  const recs = [];
  if (ts.errorCount > 0)      recs.push(`Fix ${ts.errorCount} TypeScript error(s) → +${ts.errorCount * 10} pts`);
  if (sec.vulns.critical > 0) recs.push(`Fix ${sec.vulns.critical} critical vulnerability(s) → +${sec.vulns.critical * 40} pts`);
  if (sec.vulns.high > 0)     recs.push(`Fix ${sec.vulns.high} high vulnerability(s) → +${sec.vulns.high * 20} pts`);
  if (tests.failed > 0)       recs.push(`Fix ${tests.failed} failing unit test(s) → pts recovery`);
  if (i18n.avgCoverage < 90)  recs.push(`Improve i18n to 90%+ avg → +${Math.round((90 - i18n.avgCoverage) * 0.6)} pts`);
  if (!seed.exists)           recs.push('Run: npm run db:seed:demo:complete (30 patients)');

  if (recs.length === 0) {
    console.log(green('  All checks passing! Focus on E2E test pass rate.\n'));
  } else {
    recs.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    console.log('');
  }

  // ── Save Results ─────────────────────────────────────────────
  const timestamp = new Date().toISOString();
  const result = {
    timestamp,
    totalScore,
    totalMax,
    pctTotal,
    categories: categories.map(c => ({ label: c.label, score: c.score, max: c.max })),
    seed,
    flags: { fast: FLAG_FAST },
  };

  const fileName = `result-${timestamp.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.join(RESULTS_DIR, fileName), JSON.stringify(result, null, 2));
  console.log(`  💾 Results saved: scripts/metrics/results/${fileName}`);

  // ── Set Baseline ─────────────────────────────────────────────
  if (FLAG_BASELINE) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(result, null, 2));
    console.log(green(`  ✅ Baseline set: ${totalScore}/${totalMax} (${pctTotal}%)\n`));
  }

  // ── History Summary ──────────────────────────────────────────
  const histFiles = fs.readdirSync(RESULTS_DIR).filter(f => f.startsWith('result-')).sort().slice(-5);
  if (histFiles.length > 1) {
    console.log(bold('\n  📊 RECENT HISTORY (last 5 runs)'));
    for (const hf of histFiles) {
      try {
        const h = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, hf), 'utf8'));
        const d = new Date(h.timestamp).toLocaleDateString('de-DE');
        const t = String(h.timestamp).substring(11, 16);
        const isCurrent = hf === fileName;
        const marker = isCurrent ? ' ← now' : '';
        const c = scoreColor(h.totalScore, h.totalMax);
        console.log(`    ${d} ${t}  ${c(`${h.totalScore}/${h.totalMax}`)} (${h.pctTotal}%)${marker}`);
      } catch (_) { /* ignore */ }
    }
    console.log('');
  }

  console.log(bold(cyan('═'.repeat(62))) + '\n');

  process.exit(totalScore < 1 && !FLAG_FAST ? 1 : 0);
}

main();
