#!/usr/bin/env node

/**
 * Performance Budget Checker
 * Validates load test results against defined benchmarks
 * 
 * Usage:
 *   node scripts/check-performance-budget.js <summary.json> <benchmarks.yml>
 */

const fs = require('fs');
const yaml = require('js-yaml');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function checkBudget(result, benchmarks) {
  const metrics = result.metrics || {};
  const violations = [];
  const passed = [];

  // Check response times
  const httpDuration = metrics.http_req_duration || {};
  const p95 = httpDuration['p(95)'] || 0;
  const p99 = httpDuration['p(99)'] || 0;
  const p50 = httpDuration.med || 0;

  if (p95 > benchmarks.api_response_time.p95) {
    violations.push({
      metric: 'p95 Response Time',
      value: `${p95.toFixed(2)}ms`,
      threshold: `${benchmarks.api_response_time.p95}ms`,
    });
  } else {
    passed.push({ metric: 'p95 Response Time', value: `${p95.toFixed(2)}ms` });
  }

  if (p99 > benchmarks.api_response_time.p99) {
    violations.push({
      metric: 'p99 Response Time',
      value: `${p99.toFixed(2)}ms`,
      threshold: `${benchmarks.api_response_time.p99}ms`,
    });
  } else {
    passed.push({ metric: 'p99 Response Time', value: `${p99.toFixed(2)}ms` });
  }

  // Check error rate
  const httpFailed = metrics.http_req_failed || {};
  const errorRate = (httpFailed.rate || 0) * 100;
  const maxErrorRate = parseFloat(benchmarks.error_rate.max);

  if (errorRate > maxErrorRate) {
    violations.push({
      metric: 'Error Rate',
      value: `${errorRate.toFixed(3)}%`,
      threshold: `${maxErrorRate}%`,
    });
  } else {
    passed.push({ metric: 'Error Rate', value: `${errorRate.toFixed(3)}%` });
  }

  // Check throughput
  const httpReqs = metrics.http_reqs || {};
  const rps = httpReqs.rate || 0;

  if (rps < benchmarks.throughput.target_rps) {
    violations.push({
      metric: 'Throughput',
      value: `${rps.toFixed(2)} rps`,
      threshold: `${benchmarks.throughput.target_rps} rps`,
    });
  } else {
    passed.push({ metric: 'Throughput', value: `${rps.toFixed(2)} rps` });
  }

  return { violations, passed };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node check-performance-budget.js <summary.json> <benchmarks.yml>');
    process.exit(1);
  }

  const [summaryPath, benchmarksPath] = args;

  let summary;
  let benchmarks;

  try {
    summary = loadJson(summaryPath);
  } catch (error) {
    console.error(`Error loading summary file: ${error.message}`);
    process.exit(1);
  }

  try {
    benchmarks = loadYaml(benchmarksPath);
  } catch (error) {
    console.error(`Error loading benchmarks file: ${error.message}`);
    process.exit(1);
  }

  const { violations, passed } = checkBudget(summary, benchmarks.benchmarks);

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║           Performance Budget Check Results                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (passed.length > 0) {
    console.log(`${colors.green}✓ PASSED:${colors.reset}`);
    passed.forEach(p => {
      console.log(`  ${colors.green}✓${colors.reset} ${p.metric}: ${p.value}`);
    });
    console.log('');
  }

  if (violations.length > 0) {
    console.log(`${colors.red}✗ VIOLATIONS:${colors.reset}`);
    violations.forEach(v => {
      console.log(`  ${colors.red}✗${colors.reset} ${v.metric}: ${v.value} (threshold: ${v.threshold})`);
    });
    console.log('');
    console.log(`${colors.red}Performance budget check FAILED${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✓ All performance budgets met!${colors.reset}`);
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkBudget };
