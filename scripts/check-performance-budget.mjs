#!/usr/bin/env node
/**
 * Performance Budget Checker
 * 
 * Validates build output against performance budgets.
 * Fails the build if any budget is exceeded.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUDGET_FILE = path.join(__dirname, '..', 'performance-budget.json');
const DIST_PATH = path.join(__dirname, '..', 'dist', 'assets');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function main() {
  console.log(`${colors.blue}🔍 Checking performance budget...${colors.reset}\n`);

  // Load budget config
  if (!fs.existsSync(BUDGET_FILE)) {
    console.error(`${colors.red}❌ Performance budget file not found: ${BUDGET_FILE}${colors.reset}`);
    process.exit(1);
  }

  const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));

  // Check if dist exists
  if (!fs.existsSync(DIST_PATH)) {
    console.error(`${colors.red}❌ Dist folder not found: ${DIST_PATH}${colors.reset}`);
    console.log('   Run npm run build first.');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_PATH);
  const jsFiles = files.filter(f => f.endsWith('.js'));

  let totalSize = 0;
  let violations = [];
  let passed = [];

  // Check each JS file
  for (const file of jsFiles) {
    const stats = fs.statSync(path.join(DIST_PATH, file));
    const size = stats.size;
    totalSize += size;

    // Check initial chunk size
    if (file.includes('index') || file.includes('entry')) {
      if (size > budget.bundle.initial) {
        violations.push({
          file,
          size,
          limit: budget.bundle.initial,
          type: 'initial chunk',
        });
      } else {
        passed.push({
          file,
          size,
          limit: budget.bundle.initial,
          type: 'initial chunk',
        });
      }
    }

    // Check lazy chunk size
    if (file.startsWith('vendor-') || file.startsWith('feature-')) {
      if (size > budget.bundle.lazy) {
        violations.push({
          file,
          size,
          limit: budget.bundle.lazy,
          type: 'lazy chunk',
        });
      } else {
        passed.push({
          file,
          size,
          limit: budget.bundle.lazy,
          type: 'lazy chunk',
        });
      }
    }
  }

  // Check total size
  if (totalSize > budget.bundle.total) {
    violations.push({
      file: 'Total bundle',
      size: totalSize,
      limit: budget.bundle.total,
      type: 'total',
    });
  }

  // Report results
  console.log(`${colors.blue}📦 Bundle Analysis:${colors.reset}\n`);

  console.log(`Total Size: ${formatBytes(totalSize)} / ${formatBytes(budget.bundle.total)}`);
  console.log(`JS Files: ${jsFiles.length}\n`);

  if (passed.length > 0) {
    console.log(`${colors.green}✅ Passed:${colors.reset}`);
    for (const item of passed) {
      const percentage = ((item.size / item.limit) * 100).toFixed(1);
      console.log(`   ${item.file}: ${formatBytes(item.size)} (${percentage}% of ${formatBytes(item.limit)} limit)`);
    }
    console.log('');
  }

  if (violations.length > 0) {
    console.log(`${colors.red}❌ Budget Violations:${colors.reset}`);
    for (const v of violations) {
      const overBy = v.size - v.limit;
      const percentage = ((v.size / v.limit) * 100).toFixed(1);
      console.log(`   ${v.file}: ${formatBytes(v.size)} (${percentage}% of limit, ${formatBytes(overBy)} over)`);
    }
    console.log('');
    console.log(`${colors.red}❌ Performance budget check failed${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All performance budgets passed!${colors.reset}`);
    process.exit(0);
  }
}

main();
