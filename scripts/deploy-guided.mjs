#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SITE_ID = process.env.NETLIFY_SITE_ID || '4e24807c-6ea8-482e-8bef-6c688f7172bb';
const AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const isPreview = process.argv.includes('--preview');
const isProd = !isPreview;

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  });
  return result.status ?? 1;
}

console.log('🚀 Netlify Guided Deploy');
console.log(`   Site ID: ${SITE_ID}`);
console.log(`   Mode: ${isProd ? 'production' : 'preview'}`);

if (!existsSync('dist')) {
  console.log('ℹ️  dist/ nicht gefunden – starte Build...');
  const buildStatus = run('npm', ['run', 'build']);
  if (buildStatus !== 0) {
    console.error('❌ Build fehlgeschlagen. Deploy abgebrochen.');
    process.exit(buildStatus);
  }
}

const deployArgs = ['netlify', 'deploy', '--dir=dist', '--site', SITE_ID];
if (isProd) deployArgs.push('--prod');

if (AUTH_TOKEN) {
  console.log('✅ Token gefunden – non-interactive Deploy wird verwendet.');
  const status = run('npx', deployArgs, { NETLIFY_SITE_ID: SITE_ID });
  process.exit(status);
}

console.log('⚠️  Kein NETLIFY_AUTH_TOKEN gesetzt.');
console.log('   Option A (empfohlen, CI-fähig):');
console.log('   - NETLIFY_AUTH_TOKEN als Umgebungsvariable setzen');
console.log('   Option B (lokal, interaktiv):');
console.log('   - npx netlify login');
console.log('   - danach dieses Script erneut ausführen');

const status = run('npx', deployArgs, { NETLIFY_SITE_ID: SITE_ID });
process.exit(status);
