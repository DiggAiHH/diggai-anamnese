#!/usr/bin/env node

/**
 * Load Test Report Generator
 * Generates a markdown report from K6 summary JSON files
 * 
 * Usage:
 *   node scripts/generate-load-report.js --api-summary path/to/api.json --output report.md
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-summary') {
      options.apiSummary = args[++i];
    } else if (args[i] === '--dashboard-summary') {
      options.dashboardSummary = args[++i];
    } else if (args[i] === '--output') {
      options.output = args[++i];
    }
  }

  return options;
}

function loadSummary(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

function formatNumber(num) {
  return new Intl.NumberFormat('de-DE').format(num);
}

function checkStatus(value, threshold, type = 'less') {
  if (type === 'less') {
    return value <= threshold ? '✅' : '❌';
  }
  return value >= threshold ? '✅' : '❌';
}

function generateReport(summaries) {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('de-DE');

  let report = `# Load Test Report\n\n`;
  report += `**Date:** ${date} ${time}\n\n`;

  // Executive Summary
  report += `## Executive Summary\n\n`;

  for (const [name, data] of Object.entries(summaries)) {
    if (!data) continue;

    report += `### ${name.toUpperCase()} Test\n\n`;
    
    // Key metrics table
    const metrics = data.metrics || {};
    const httpReqs = metrics.http_reqs || {};
    const httpDuration = metrics.http_req_duration || {};
    const httpFailed = metrics.http_req_failed || {};
    const vusMax = metrics.vus_max || {};

    const totalRequests = httpReqs.count || 0;
    const failedRequests = httpFailed.passes || 0;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    const p95 = httpDuration['p(95)'] || 0;

    report += `| Metric | Value | Target | Status |\n`;
    report += `|--------|-------|--------|--------|\n`;
    report += `| Total Requests | ${formatNumber(totalRequests)} | - | - |\n`;
    report += `| Error Rate | ${errorRate.toFixed(3)}% | < 0.1% | ${checkStatus(errorRate, 0.1)} |\n`;
    report += `| p95 Response | ${formatDuration(p95)} | < 200ms | ${checkStatus(p95, 200)} |\n`;
    report += `| Max VUs | ${vusMax.max || 0} | 1000 | ${checkStatus(vusMax.max || 0, 1000, 'greater')} |\n`;
    report += `\n`;
  }

  // Detailed Metrics
  report += `## Detailed Metrics\n\n`;

  for (const [name, data] of Object.entries(summaries)) {
    if (!data) continue;

    report += `### ${name.toUpperCase()} Test Details\n\n`;

    const metrics = data.metrics || {};
    const httpDuration = metrics.http_req_duration || {};

    report += `#### Response Times\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Min | ${formatDuration(httpDuration.min || 0)} |\n`;
    report += `| Mean | ${formatDuration(httpDuration.avg || 0)} |\n`;
    report += `| Median (p50) | ${formatDuration(httpDuration.med || 0)} |\n`;
    report += `| p90 | ${formatDuration(httpDuration['p(90)'] || 0)} |\n`;
    report += `| p95 | ${formatDuration(httpDuration['p(95)'] || 0)} |\n`;
    report += `| p99 | ${formatDuration(httpDuration['p(99)'] || 0)} |\n`;
    report += `| Max | ${formatDuration(httpDuration.max || 0)} |\n`;
    report += `\n`;

    // Throughput
    const httpReqs = metrics.http_reqs || {};
    report += `#### Throughput\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Requests | ${formatNumber(httpReqs.count || 0)} |\n`;
    report += `| Requests/sec | ${(httpReqs.rate || 0).toFixed(2)}/s |\n`;
    report += `\n`;

    // Virtual Users
    const vus = metrics.vus || {};
    const vusMax = metrics.vus_max || {};
    report += `#### Virtual Users\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Min VUs | ${vus.min || 0} |\n`;
    report += `| Max VUs | ${vusMax.max || 0} |\n`;
    report += `\n`;

    // Errors
    const errors = metrics.errors || {};
    if (errors.count > 0) {
      report += `#### Errors\n\n`;
      report += `| Metric | Value |\n`;
      report += `|--------|-------|\n`;
      report += `| Error Count | ${formatNumber(errors.count || 0)} |\n`;
      report += `| Error Rate | ${((errors.rate || 0) * 100).toFixed(3)}% |\n`;
      report += `\n`;
    }

    // Test state
    report += `#### Test State\n\n`;
    report += `- **State:** ${data.state || 'unknown'}\n`;
    if (data.testRunDuration) {
      report += `- **Duration:** ${formatDuration(data.testRunDuration * 1000)}\n`;
    }
    report += `\n`;
  }

  // Recommendations
  report += `## Recommendations\n\n`;

  let allPassed = true;
  for (const [name, data] of Object.entries(summaries)) {
    if (!data) continue;

    const metrics = data.metrics || {};
    const httpDuration = metrics.http_req_duration || {};
    const httpFailed = metrics.http_req_failed || {};

    const p95 = httpDuration['p(95)'] || 0;
    const errorRate = (httpFailed.rate || 0) * 100;

    if (p95 > 200 || errorRate > 0.1) {
      allPassed = false;
      report += `### ${name.toUpperCase()} Issues\n\n`;
      
      if (p95 > 200) {
        report += `- ⚠️ p95 response time (${formatDuration(p95)}) exceeds target (200ms)\n`;
        report += `  - Consider database query optimization\n`;
        report += `  - Review connection pool configuration\n`;
        report += `  - Enable response caching\n`;
      }
      
      if (errorRate > 0.1) {
        report += `- ⚠️ Error rate (${errorRate.toFixed(3)}%) exceeds target (0.1%)\n`;
        report += `  - Review error logs for root cause\n`;
        report += `  - Check database connection limits\n`;
        report += `  - Verify resource availability\n`;
      }
      
      report += `\n`;
    }
  }

  if (allPassed) {
    report += `✅ All performance targets met!\n\n`;
    report += `The system is ready for the expected load.\n`;
  } else {
    report += `⚠️ Some performance targets were not met.\n\n`;
    report += `Please review the recommendations above before going live.\n`;
  }

  return report;
}

function main() {
  const args = parseArgs();

  if (!args.apiSummary && !args.dashboardSummary) {
    console.log('Usage: node generate-load-report.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --api-summary <path>        Path to API test summary JSON');
    console.log('  --dashboard-summary <path>  Path to Dashboard test summary JSON');
    console.log('  --output <path>             Output report file path');
    process.exit(1);
  }

  const summaries = {};

  if (args.apiSummary) {
    summaries.api = loadSummary(args.apiSummary);
  }

  if (args.dashboardSummary) {
    summaries.dashboard = loadSummary(args.dashboardSummary);
  }

  const report = generateReport(summaries);

  if (args.output) {
    fs.writeFileSync(args.output, report);
    console.log(`Report written to: ${args.output}`);
  } else {
    console.log(report);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateReport, loadSummary };
