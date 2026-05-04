#!/usr/bin/env node
/**
 * Deploy Harness — Pre-Deploy-Gate für DiggAi
 *
 * Hält Builds an, die bekannte kritische Findings haben würden.
 * Exit-Code != 0 → blockiert CI/Deploy.
 *
 * Usage:
 *   node scripts/harness/deploy-harness.mjs
 *   node scripts/harness/deploy-harness.mjs --skip cert
 *   node scripts/harness/deploy-harness.mjs --json
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tls from 'node:tls';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const skip = (name) => args.includes(`--skip`) && args[args.indexOf('--skip') + 1] === name;
const json = args.includes('--json');

const checks = [];
const log = (sym, name, msg) => {
    if (!json) console.log(`${sym} ${name}: ${msg}`);
    checks.push({ name, ok: sym === '✅', message: msg });
};

// ─── Check 1: Cert von api.diggai.de ────────────────────────────────────
async function checkCert(host, minDays = 14) {
    return new Promise((resolve) => {
        const socket = tls.connect({ host, port: 443, servername: host }, () => {
            const cert = socket.getPeerCertificate();
            socket.end();
            if (!cert || !cert.valid_to) return resolve({ ok: false, msg: 'no cert returned' });
            const daysLeft = Math.floor((new Date(cert.valid_to) - Date.now()) / 86400e3);
            resolve({
                ok: daysLeft >= minDays,
                msg: `${daysLeft}d remaining (subject: ${cert.subject?.CN ?? '?'})`,
            });
        });
        socket.on('error', (err) => resolve({ ok: false, msg: err.message }));
        socket.setTimeout(8000, () => { socket.destroy(); resolve({ ok: false, msg: 'timeout' }); });
    });
}

if (!skip('cert')) {
    for (const host of ['diggai.de', 'api.diggai.de']) {
        const r = await checkCert(host);
        log(r.ok ? '✅' : '❌', `cert:${host}`, r.msg);
    }
}

// ─── Check 2: Keine Google-Fonts in index.html ──────────────────────────
{
    const idx = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8').catch(() => '');
    const bad = idx.match(/fonts\.(googleapis|gstatic)\.com/g);
    if (bad) log('❌', 'index.html:fonts', `enthält noch ${bad.length}x Google-Font-Referenzen`);
    else log('✅', 'index.html:fonts', 'keine externen Google-Fonts');
}

// ─── Check 3: robots.txt + sitemap.xml ──────────────────────────────────
for (const f of ['public/robots.txt', 'public/sitemap.xml']) {
    try {
        await fs.access(path.join(ROOT, f));
        log('✅', `file:${f}`, 'vorhanden');
    } catch {
        log('❌', `file:${f}`, 'FEHLT');
    }
}

// ─── Check 4: Manifest theme_color != #3b82f6 ───────────────────────────
{
    try {
        const m = JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'manifest.json'), 'utf8'));
        if ((m.theme_color || '').toLowerCase() === '#3b82f6') {
            log('❌', 'manifest:theme_color', 'noch Tailwind-Default #3b82f6');
        } else {
            log('✅', 'manifest:theme_color', m.theme_color);
        }
        if (m.orientation === 'portrait-primary') {
            log('❌', 'manifest:orientation', 'erzwingt Portrait — auf "any" ändern');
        } else {
            log('✅', 'manifest:orientation', m.orientation || 'unset');
        }
    } catch (e) {
        log('❌', 'manifest', `nicht lesbar: ${e.message}`);
    }
}

// ─── Check 5: og:url & og:image ─────────────────────────────────────────
{
    const idx = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8').catch(() => '');
    if (/og:url"\s+content="https:\/\/diggai\.de"/.test(idx)) {
        log('✅', 'og:url', 'auf diggai.de');
    } else {
        log('❌', 'og:url', 'falsch oder fehlt');
    }
    if (/og:image"\s+content="https?:\/\//.test(idx)) {
        log('✅', 'og:image', 'gesetzt');
    } else {
        log('❌', 'og:image', 'fehlt');
    }
}

// ─── Check 6: Pflicht-Env-Vars (nur in CI/Production) ──────────────────
if (process.env.NODE_ENV === 'production' || process.env.CI) {
    const required = {
        DATABASE_URL: (v) => v && v.startsWith('postgres'),
        JWT_SECRET: (v) => v && v.length >= 32,
        ENCRYPTION_KEY: (v) => v && v.length === 32,
    };
    for (const [k, validator] of Object.entries(required)) {
        const ok = validator(process.env[k]);
        log(ok ? '✅' : '❌', `env:${k}`, ok ? 'gültig' : 'fehlt oder ungültig');
    }
}

// ─── Output ─────────────────────────────────────────────────────────────
const failed = checks.filter(c => !c.ok);
const summary = {
    total: checks.length,
    failed: failed.length,
    ok: failed.length === 0,
    checks,
};

if (json) {
    console.log(JSON.stringify(summary, null, 2));
} else {
    console.log('');
    if (summary.ok) {
        console.log(`✅ Deploy Harness GREEN — ${checks.length}/${checks.length} checks passed`);
    } else {
        console.log(`❌ Deploy Harness RED — ${failed.length}/${checks.length} checks FAILED:`);
        for (const c of failed) console.log(`   • ${c.name}: ${c.message}`);
    }
}

process.exit(summary.ok ? 0 : 1);
