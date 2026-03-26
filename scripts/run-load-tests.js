#!/usr/bin/env node

/**
 * Load Test Runner Script
 * 
 * Usage:
 *   node scripts/run-load-tests.js [scenario]
 *   node scripts/run-load-tests.js normal
 *   node scripts/run-load-tests.js peak
 *   node scripts/run-load-tests.js stress
 * 
 * Scenarios: normal, peak, stress, spike, endurance, breakpoint
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCENARIOS = ['normal', 'peak', 'stress', 'spike', 'endurance', 'breakpoint'];
const TESTS_DIR = path.join(__dirname, '..', 'tests', 'load');
const RESULTS_DIR = path.join(TESTS_DIR, 'results');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printBanner() {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        DiggAI Anamnese - Load Test Runner                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
  `);
}

function ensureDirectories() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    log(`Created results directory: ${RESULTS_DIR}`, 'green');
  }
}

function checkK6Installed() {
  try {
    execSync('k6 version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function getTestFiles() {
  const files = fs.readdirSync(TESTS_DIR);
  return files.filter(f => f.endsWith('-load-test.js'));
}

function runTest(testFile, scenario) {
  const testPath = path.join(TESTS_DIR, testFile);
  const testName = path.basename(testFile, '-load-test.js');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = path.join(RESULTS_DIR, `${testName}-${scenario}-${timestamp}.json`);
  const summaryFile = path.join(RESULTS_DIR, `${testName}-${scenario}-${timestamp}-summary.json`);

  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Running: ${testName.toUpperCase()} TEST`, 'bright');
  log(`Scenario: ${scenario}`, 'cyan');
  log(`Output: ${resultFile}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'cyan');

  try {
    const env = {
      ...process.env,
      BASE_URL: process.env.BASE_URL || 'http://localhost:3001/api',
      SCENARIO: scenario,
    };

    const command = `k6 run \
      --env BASE_URL=${env.BASE_URL} \
      --env SCENARIO=${scenario} \
      --out json=${resultFile} \
      --summary-export=${summaryFile} \
      ${testPath}`;

    execSync(command, {
      stdio: 'inherit',
      env,
    });

    log(`\n✓ Test completed successfully`, 'green');
    return { success: true, resultFile, summaryFile };
  } catch (error) {
    log(`\n✗ Test failed`, 'red');
    return { success: false, error: error.message };
  }
}

function generateReport(results) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log('GENERATING REPORT', 'bright');
  log(`${'='.repeat(60)}\n`, 'cyan');

  const reportPath = path.join(RESULTS_DIR, 'REPORT.md');
  const date = new Date().toISOString().split('T')[0];

  let report = `# Load Test Report\n\n`;
  report += `**Date:** ${date}\n\n`;
  report += `## Summary\n\n`;
  report += `| Test | Scenario | Status | Result File |\n`;
  report += `|------|----------|--------|-------------|\n`;

  for (const result of results) {
    const status = result.success ? '✅ Passed' : '❌ Failed';
    const file = result.success ? path.basename(result.resultFile) : 'N/A';
    report += `| ${result.test} | ${result.scenario} | ${status} | ${file} |\n`;
  }

  report += `\n## Details\n\n`;

  for (const result of results) {
    report += `### ${result.test} - ${result.scenario}\n\n`;
    if (result.success) {
      report += `- **Status:** ✅ Passed\n`;
      report += `- **Results:** ${result.resultFile}\n`;
      report += `- **Summary:** ${result.summaryFile}\n`;
    } else {
      report += `- **Status:** ❌ Failed\n`;
      report += `- **Error:** ${result.error}\n`;
    }
    report += `\n`;
  }

  fs.writeFileSync(reportPath, report);
  log(`Report saved to: ${reportPath}`, 'green');
}

function main() {
  printBanner();

  const scenario = process.argv[2] || 'normal';

  if (!SCENARIOS.includes(scenario)) {
    log(`Error: Unknown scenario "${scenario}"`, 'red');
    log(`Available scenarios: ${SCENARIOS.join(', ')}`, 'yellow');
    process.exit(1);
  }

  log(`Selected scenario: ${scenario}`, 'bright');

  if (!checkK6Installed()) {
    log('\n⚠ K6 is not installed!', 'yellow');
    log('Please install K6:', 'yellow');
    log('  - Windows: choco install k6', 'cyan');
    log('  - macOS: brew install k6', 'cyan');
    log('  - Linux: sudo apt install k6', 'cyan');
    log('  - Docker: docker pull grafana/k6', 'cyan');
    process.exit(1);
  }

  log('✓ K6 is installed', 'green');

  ensureDirectories();

  const testFiles = getTestFiles();
  log(`\nFound ${testFiles.length} test files:`, 'bright');
  testFiles.forEach(f => log(`  - ${f}`, 'cyan'));

  const results = [];

  for (const testFile of testFiles) {
    const testName = path.basename(testFile, '-load-test.js');
    const result = runTest(testFile, scenario);
    results.push({
      test: testName,
      scenario,
      ...result,
    });
  }

  generateReport(results);

  log(`\n${'='.repeat(60)}`, 'green');
  log('ALL TESTS COMPLETED', 'bright');
  log(`${'='.repeat(60)}\n`, 'green');

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    log(`⚠ ${failed.length} test(s) failed`, 'yellow');
    process.exit(1);
  } else {
    log('✓ All tests passed!', 'green');
  }
}

if (require.main === module) {
  main();
}

module.exports = { runTest, SCENARIOS };
