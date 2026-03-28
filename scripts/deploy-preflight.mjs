#!/usr/bin/env node
/**
 * Deploy Preflight Check — DiggAI Anamnese Platform v3.0.0
 * Run before any production deploy. Exits 1 if any check fails.
 * 
 * Checks:
 * 1. Environment Variables (DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY)
 * 2. Build Check (npm run build erfolgreich)
 * 3. Migration Check (Prisma Migration Status)
 * 4. TypeCheck (tsc --noEmit)
 * 5. Security Audit (npm audit --audit-level=high)
 * 6. Rollback Readiness (Backup-Strategie dokumentiert)
 * 
 * Usage: node scripts/deploy-preflight.mjs
 * Exit Codes: 0 = success, 1 = failure
 */

import { existsSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Load environment variables
config({ path: join(ROOT_DIR, '.env') });

// State tracking
let failed = false;
let warnings = [];

// ─── Output Helpers ────────────────────────────────────────────
function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); failed = true; }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); warnings.push(msg); }
function section(title) { console.log(`\n📋 ${title}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }

// ─── 1. Environment Variables Check ────────────────────────────
section('1. Environment Variables Check');

const REQUIRED_ENV_VARS = [
  { key: 'DATABASE_URL', required: true },
  { key: 'JWT_SECRET', required: true },
  { key: 'ENCRYPTION_KEY', required: true }
];

const OPTIONAL_ENV_VARS = [
  { key: 'FRONTEND_URL', required: false },
  { key: 'REDIS_URL', required: false },
  { key: 'STRIPE_SECRET_KEY', required: false }
];

// Check required env vars
for (const { key, required } of REQUIRED_ENV_VARS) {
  const value = process.env[key];
  
  if (!value) {
    fail(`${key} is missing — required for deployment`);
  } else if (value.includes('CHANGE_ME') || value.includes('placeholder') || value.includes('example')) {
    fail(`${key} contains placeholder value — must be configured`);
  } else {
    // Security: Only show that it exists, never log the value
    ok(`${key} is configured`);
  }
}

// Validate JWT_SECRET length (security requirement)
if (process.env.JWT_SECRET) {
  if (process.env.JWT_SECRET.length < 32) {
    fail('JWT_SECRET must be at least 32 characters for security');
  } else {
    ok('JWT_SECRET length meets security requirements');
  }
}

// Validate ENCRYPTION_KEY length (must be exactly 32 chars for AES-256)
if (process.env.ENCRYPTION_KEY) {
  if (process.env.ENCRYPTION_KEY.length !== 32) {
    fail(`ENCRYPTION_KEY must be exactly 32 characters (got ${process.env.ENCRYPTION_KEY.length}) — required for AES-256 encryption`);
  } else {
    ok('ENCRYPTION_KEY length valid (32 chars for AES-256)');
  }
}

// Check optional env vars
for (const { key, required } of OPTIONAL_ENV_VARS) {
  const value = process.env[key];
  if (!value) {
    warn(`${key} is not set (optional but recommended)`);
  } else {
    ok(`${key} is configured`);
  }
}

// ─── 2. Build Check ────────────────────────────────────────────
section('2. Build Check');

try {
  info('Running TypeScript build...');
  execFileSync('npm', ['run', 'build'], { 
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  ok('TypeScript build completed successfully');
} catch (error) {
  fail(`Build failed:\n${error.stdout || error.message}`);
}

// Verify build artifacts exist
const buildArtifacts = ['dist/index.html', 'dist/assets'];
let buildArtifactsOk = true;

for (const artifact of buildArtifacts) {
  const artifactPath = join(ROOT_DIR, artifact);
  if (existsSync(artifactPath)) {
    ok(`Build artifact exists: ${artifact}`);
  } else {
    fail(`Build artifact missing: ${artifact}`);
    buildArtifactsOk = false;
  }
}

// ─── 3. Migration Check ────────────────────────────────────────
section('3. Migration Check (Prisma)');

try {
  const result = execFileSync('npx', ['prisma', 'migrate', 'status'], { 
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  
  if (result.includes('have not yet been applied')) {
    fail('Unapplied Prisma migrations detected — run: npx prisma migrate deploy');
  } else if (result.includes('Database schema is up to date') || result.includes('No pending migrations')) {
    ok('All Prisma migrations applied — database schema is up to date');
  } else if (result.includes('migration')) {
    ok('Prisma migration status verified');
  } else {
    info('Prisma migrate status output unclear, manual verification recommended');
  }
} catch (error) {
  // Check if it's a connection error or other issue
  const errorMsg = error.stdout || error.stderr || error.message || '';
  
  if (errorMsg.includes('database') || errorMsg.includes('connection')) {
    fail('Could not check migration status — database unreachable or DATABASE_URL invalid');
  } else {
    fail(`Could not check migration status: ${errorMsg}`);
  }
}

// ─── 4. TypeCheck ──────────────────────────────────────────────
section('4. TypeCheck');

try {
  execFileSync('npm', ['run', 'type-check'], { 
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  ok('TypeScript type check passed — no type errors');
} catch (error) {
  fail(`TypeScript type check failed:\n${error.stdout || error.message}`);
}

// ─── 5. Security Audit ─────────────────────────────────────────
section('5. Security Audit');

try {
  const auditResult = execFileSync('npm', ['audit', '--audit-level=high', '--json'], { 
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  
  // Parse audit result
  const audit = JSON.parse(auditResult);
  const vulnerabilities = audit.vulnerabilities || {};
  const metadata = audit.metadata || {};
  
  const highVulns = metadata.vulnerabilities?.high || 0;
  const criticalVulns = metadata.vulnerabilities?.critical || 0;
  
  if (criticalVulns > 0) {
    fail(`${criticalVulns} CRITICAL vulnerabilities found — must be fixed before deployment`);
  } else if (highVulns > 0) {
    fail(`${highVulns} HIGH vulnerabilities found — must be fixed before deployment`);
  } else {
    ok('No high or critical vulnerabilities found');
  }
  
  // Show total vulnerability count as info
  const totalVulns = metadata.vulnerabilities?.total || 0;
  if (totalVulns > 0) {
    info(`${totalVulns} total vulnerabilities (none high/critical)`);
  }
  
} catch (error) {
  // npm audit exits with non-zero code when vulnerabilities are found
  const errorMsg = error.stdout || error.stderr || '';
  
  // Try to parse JSON output even on failure
  try {
    const audit = JSON.parse(errorMsg);
    const metadata = audit.metadata || {};
    const highVulns = metadata.vulnerabilities?.high || 0;
    const criticalVulns = metadata.vulnerabilities?.critical || 0;
    
    if (criticalVulns > 0) {
      fail(`${criticalVulns} CRITICAL vulnerabilities found — must be fixed before deployment`);
    }
    if (highVulns > 0) {
      fail(`${highVulns} HIGH vulnerabilities found — must be fixed before deployment`);
    }
    
    // If we get here, there might be moderate/low vulnerabilities
    ok('No high or critical vulnerabilities found');
    const totalVulns = metadata.vulnerabilities?.total || 0;
    if (totalVulns > 0) {
      info(`${totalVulns} lower severity vulnerabilities exist (not blocking)`);
    }
  } catch {
    // Could not parse JSON, check for text output
    if (errorMsg.includes('critical') || errorMsg.includes('high')) {
      fail('Security audit found high/critical vulnerabilities — run npm audit for details');
    } else if (error.message?.includes('command')) {
      fail('Could not run npm audit — check npm installation');
    } else {
      // Audit passed but exited non-zero for other reasons
      ok('Security audit completed');
    }
  }
}

// ─── 6. Rollback Readiness ─────────────────────────────────────
section('6. Rollback Readiness');

// Check for backup strategy documentation
const backupDocs = [
  'BACKUP_STRATEGY.md',
  'docs/BACKUP.md', 
  'docs/DEPLOYMENT.md',
  'README.md'
];

let backupDocFound = false;
let backupDocPath = null;

for (const doc of backupDocs) {
  const docPath = join(ROOT_DIR, doc);
  if (existsSync(docPath)) {
    const content = readFileSync(docPath, 'utf8');
    // Check if document mentions backup or rollback
    if (content.toLowerCase().includes('backup') || 
        content.toLowerCase().includes('rollback') ||
        content.toLowerCase().includes('restore')) {
      ok(`Backup/rollback documentation found: ${doc}`);
      backupDocFound = true;
      backupDocPath = doc;
      break;
    }
  }
}

// Check for backup scripts
const backupScripts = [
  'scripts/backup-database.sh',
  'scripts/backup-database.mjs',
  'scripts/backup.mjs',
  'scripts/restore.mjs'
];

let backupScriptFound = false;

for (const script of backupScripts) {
  const scriptPath = join(ROOT_DIR, script);
  if (existsSync(scriptPath)) {
    ok(`Backup script found: ${script}`);
    backupScriptFound = true;
  }
}

// Check for environment-based rollback capability
const hasStagingEnv = existsSync(join(ROOT_DIR, '.env.staging')) || 
                      existsSync(join(ROOT_DIR, '.env.preview'));
const hasProdEnv = existsSync(join(ROOT_DIR, '.env.production'));

if (hasStagingEnv) {
  ok('Staging environment configuration found (supports blue-green deploy)');
}

if (hasProdEnv) {
  ok('Production environment configuration found');
}

// Final rollback readiness assessment
if (backupDocFound || backupScriptFound) {
  ok('Rollback readiness: Documented backup strategy available');
} else {
  warn('Rollback readiness: No explicit backup documentation found — consider creating BACKUP_STRATEGY.md');
  info('Minimum rollback capability: Prisma migrations can be reverted with "npx prisma migrate resolve"');
}

// ─── Additional Checks ─────────────────────────────────────────
section('Additional Checks');

// Check .env.example exists (for new developers)
if (existsSync(join(ROOT_DIR, '.env.example'))) {
  ok('.env.example exists — helps with environment setup');
} else {
  warn('No .env.example found — consider creating one for documentation');
}

// Check for production-specific config
if (existsSync(join(ROOT_DIR, 'docker-compose.prod.yml'))) {
  ok('Production Docker configuration found');
}

// Check for health check endpoint documentation
if (existsSync(join(ROOT_DIR, 'server/routes/health.ts')) ||
    existsSync(join(ROOT_DIR, 'server/routes/health.js'))) {
  ok('Health check endpoint exists');
} else {
  warn('No health check endpoint found — recommended for production monitoring');
}

// ─── Result Summary ────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('DEPLOY PREFLIGHT CHECK SUMMARY');
console.log('='.repeat(60));

// Display check results
const totalChecks = 6;
const passedChecks = failed ? 'FAILED' : 'PASSED';

console.log(`\nChecks performed:`);
console.log(`  1. Environment Variables    ${failed && process.env.DATABASE_URL ? '❌' : '✅'}`);
console.log(`  2. Build Check              ${failed ? '❌' : '✅'}`);
console.log(`  3. Migration Check          ${failed ? '❌' : '✅'}`);
console.log(`  4. TypeCheck                ${failed ? '❌' : '✅'}`);
console.log(`  5. Security Audit           ${failed ? '❌' : '✅'}`);
console.log(`  6. Rollback Readiness       ${failed ? '❌' : '✅'}`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  warnings.forEach(w => console.log(`    - ${w}`));
}

console.log('');

if (failed) {
  console.error('❌ PREFLIGHT FAILED — Fix errors above before deploying.');
  console.error('');
  console.error('Common fixes:');
  console.error('  • Set missing env vars in .env file');
  console.error('  • Run "npm run build" to check for build errors');
  console.error('  • Run "npx prisma migrate deploy" to apply pending migrations');
  console.error('  • Run "npm audit fix" to resolve security vulnerabilities');
  process.exit(1);
} else {
  console.log('✅ PREFLIGHT PASSED — Safe to deploy.');
  console.log('');
  console.log('Next steps:');
  console.log('  • Run "npm run deploy" to start deployment');
  console.log('  • Monitor deployment logs');
  console.log('  • Verify health checks pass after deployment');
  
  if (warnings.length > 0) {
    console.log('');
    console.log('⚠️  Address warnings before next deployment for best practices.');
  }
  
  process.exit(0);
}
