#!/usr/bin/env node
/**
 * Browser Harness — Wrapper um die Playwright Audit-Suite
 *
 * Usage:
 *   node scripts/harness/browser-harness.mjs --url https://diggai.de
 *   node scripts/harness/browser-harness.mjs --url https://staging.diggai.de --report
 *   node scripts/harness/browser-harness.mjs --tag dsgvo
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const value = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const flag = (n) => args.includes(n);

const url = value('--url') || 'https://diggai.de';
const tag = value('--tag'); // e.g. "dsgvo"
const writeReport = flag('--report');

const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: url,
    PLAYWRIGHT_USE_EXISTING_SERVER: 'true', // gegen Live-URL → kein lokaler Dev-Server
};

const grepArg = tag ? ['--grep', `@${tag}`] : [];
const playwrightArgs = [
    'playwright', 'test',
    'e2e/harness/diggai-public-audit.spec.ts',
    '--reporter=list,json',
    ...grepArg,
];

console.log(`🔎 Browser Harness gegen ${url}${tag ? ` (tag @${tag})` : ''}`);
const child = spawn('npx', playwrightArgs, {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
});

let stdout = '';
let stderr = '';
child.stdout.on('data', (d) => { stdout += d.toString(); process.stdout.write(d); });
child.stderr.on('data', (d) => { stderr += d.toString(); process.stderr.write(d); });

child.on('close', async (code) => {
    if (writeReport) {
        const host = new URL(url).host.replace(/[:.]/g, '_');
        const date = new Date().toISOString().slice(0, 10);
        const outPath = path.join(ROOT, 'memory', 'audits', `${date}_${host}_browser-harness.json`);
        await fs.mkdir(path.dirname(outPath), { recursive: true });

        const reportSrc = path.join(ROOT, 'test-results', 'report.json');
        let report = null;
        try { report = JSON.parse(await fs.readFile(reportSrc, 'utf8')); } catch {}

        await fs.writeFile(outPath, JSON.stringify({
            target: url,
            tag,
            exitCode: code,
            timestamp: new Date().toISOString(),
            stdout: stdout.slice(-4000),
            stderr: stderr.slice(-2000),
            playwrightReport: report,
        }, null, 2), 'utf8');
        console.log(`📄 Report: ${path.relative(ROOT, outPath)}`);
    }
    process.exit(code ?? 1);
});
