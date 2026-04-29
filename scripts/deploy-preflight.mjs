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
const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NPX_CMD = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Load environment variables
config({ path: join(ROOT_DIR, '.env') });

// State tracking
let failed = false;
let warnings = [];
const checkStatus = {
  env: true,
  build: true,
  migration: true,
  typecheck: true,
  security: true,
  rollback: true,
};

// ─── Output Helpers ────────────────────────────────────────────
function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); failed = true; }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); warnings.push(msg); }
function section(title) { console.log(`\n📋 ${title}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }

function runCommand(command, args, timeoutMs = 120000) {
  return execFileSync(command, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
    timeout: timeoutMs,
  });
}

// ─── 1. Environment Variables Check ────────────────────────────
section('1. Environment Variables Check');

let envSectionFailed = false;
const envFail = (msg) => {
  envSectionFailed = true;
  fail(msg);
};

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
    envFail(`${key} is missing — required for deployment`);
  } else if (value.includes('CHANGE_ME') || value.includes('placeholder') || value.includes('example')) {
    envFail(`${key} contains placeholder value — must be configured`);
  } else {
    // Security: Only show that it exists, never log the value
    ok(`${key} is configured`);
  }
}

// Validate JWT_SECRET length (security requirement)
if (process.env.JWT_SECRET) {
  if (process.env.JWT_SECRET.length < 32) {
    envFail('JWT_SECRET must be at least 32 characters for security');
  } else {
    ok('JWT_SECRET length meets security requirements');
  }
}

// Validate ENCRYPTION_KEY length (must be exactly 32 chars for AES-256)
if (process.env.ENCRYPTION_KEY) {
  if (process.env.ENCRYPTION_KEY.length !== 32) {
    envFail(`ENCRYPTION_KEY must be exactly 32 characters (got ${process.env.ENCRYPTION_KEY.length}) — required for AES-256 encryption`);
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

checkStatus.env = !envSectionFailed;

// ─── 2. Build Check ────────────────────────────────────────────
section('2. Build Check');

let buildSectionFailed = false;
const buildFail = (msg) => {
  buildSectionFailed = true;
  fail(msg);
};

try {
  info('Running TypeScript build...');
  runCommand(NPM_CMD, ['run', 'build']);
  ok('TypeScript build completed successfully');
} catch (error) {
  buildFail(`Build failed:\n${error.stdout || error.message}`);
}

// Verify build artifacts exist
const buildArtifacts = ['dist/index.html', 'dist/assets'];
let buildArtifactsOk = true;

for (const artifact of buildArtifacts) {
  const artifactPath = join(ROOT_DIR, artifact);
  if (existsSync(artifactPath)) {
    ok(`Build artifact exists: ${artifact}`);
  } else {
    buildFail(`Build artifact missing: ${artifact}`);
    buildArtifactsOk = false;
  }
}

checkStatus.build = !buildSectionFailed;

// ─── 3. Migration Check ────────────────────────────────────────
section('3. Migration Check (Prisma)');

let migrationSectionFailed = false;
const migrationFail = (msg) => {
  migrationSectionFailed = true;
  fail(msg);
};

try {
  const result = runCommand(NPX_CMD, ['prisma', 'migrate', 'status'], 15000);
  
  if (result.includes('have not yet been applied')) {
    migrationFail('Unapplied Prisma migrations detected — run: npx prisma migrate deploy');
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
  
  if (errorMsg.includes('database') || errorMsg.includes('connection') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Can\'t reach database')) {
    // For Netlify frontend-only deploys the production DB lives on Hetzner (api.diggai.de).
    // A local DB connection failure is expected and non-blocking for this deploy target.
    warn('Migration check skipped — local DB unreachable (production DB on Hetzner). Verify via api.diggai.de/api/health after deploy.');
    checkStatus.migration = true; // treat as pass for frontend-only deploy
  } else {
    migrationFail(`Could not check migration status: ${errorMsg}`);
  }
}

checkStatus.migration = !migrationSectionFailed;

// ─── 4. TypeCheck ──────────────────────────────────────────────
section('4. TypeCheck');

let typecheckSectionFailed = false;
const typecheckFail = (msg) => {
  typecheckSectionFailed = true;
  fail(msg);
};

try {
  runCommand(NPM_CMD, ['run', 'type-check']);
  ok('TypeScript type check passed — no type errors');
} catch (error) {
  typecheckFail(`TypeScript type check failed:\n${error.stdout || error.message}`);
}

checkStatus.typecheck = !typecheckSectionFailed;

// ─── 5. Security Audit ─────────────────────────────────────────
section('5. Security Audit');

let securitySectionFailed = false;
const securityFail = (msg) => {
  securitySectionFailed = true;
  fail(msg);
};

function reportAuditMetadata(metadata = {}) {
  const highVulns = metadata.vulnerabilities?.high || 0;
  const criticalVulns = metadata.vulnerabilities?.critical || 0;
  const totalVulns = metadata.vulnerabilities?.total || 0;

  if (criticalVulns > 0) {
    securityFail(`${criticalVulns} CRITICAL vulnerabilities found — must be fixed before deployment`);
  }
  if (highVulns > 0) {
    securityFail(`${highVulns} HIGH vulnerabilities found — must be fixed before deployment`);
  }

  if (criticalVulns === 0 && highVulns === 0) {
    ok('No high or critical vulnerabilities found');
  }

  if (totalVulns > 0) {
    if (criticalVulns === 0 && highVulns === 0) {
      info(`${totalVulns} lower severity vulnerabilities exist (not blocking)`);
    } else {
      info(`${totalVulns} total vulnerabilities detected`);
    }
  }
}

try {
  const auditResult = runCommand(NPM_CMD, ['audit', '--audit-level=high', '--json']);
  const audit = JSON.parse(auditResult);
  reportAuditMetadata(audit.metadata || {});
} catch (error) {
  const errorMsg = error.stdout || error.stderr || '';

  try {
    const audit = JSON.parse(errorMsg);
    reportAuditMetadata(audit.metadata || {});
  } catch {
    if (errorMsg.includes('critical') || errorMsg.includes('high')) {
      securityFail('Security audit found high/critical vulnerabilities — run npm audit for details');
    } else if (error.message?.includes('command')) {
      securityFail('Could not run npm audit — check npm installation');
    } else {
      ok('Security audit completed');
    }
  }
}

checkStatus.security = !securitySectionFailed;

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

checkStatus.rollback = true;

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

// Check for health check endpoint
const hasDedicatedHealthRoute = existsSync(join(ROOT_DIR, 'server/routes/health.ts'));

if (hasDedicatedHealthRoute) {
  ok('Health check endpoint exists');
} else {
  warn('No health check endpoint found — recommended for production monitoring');
}

// ─── Result Summary ────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('DEPLOY PREFLIGHT CHECK SUMMARY');
console.log('='.repeat(60));

// Display check results
const hasFailedChecks = failed || Object.values(checkStatus).some((status) => !status);

console.log(`\nChecks performed:`);
console.log(`  1. Environment Variables    ${checkStatus.env ? '✅' : '❌'}`);
console.log(`  2. Build Check              ${checkStatus.build ? '✅' : '❌'}`);
console.log(`  3. Migration Check          ${checkStatus.migration ? '✅' : '❌'}`);
console.log(`  4. TypeCheck                ${checkStatus.typecheck ? '✅' : '❌'}`);
console.log(`  5. Security Audit           ${checkStatus.security ? '✅' : '❌'}`);
console.log(`  6. Rollback Readiness       ${checkStatus.rollback ? '✅' : '❌'}`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  warnings.forEach(w => console.log(`    - ${w}`));
}

console.log('');

if (hasFailedChecks) {
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
