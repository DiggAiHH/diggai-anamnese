#!/usr/bin/env node
/**
 * smoke-test-chrome — Post-Deploy-Verification via Chrome MCP
 *
 * Anker: docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.12
 *
 * Wird nach jedem Production-Deploy aufgerufen (manuell oder per Hook).
 * Verifiziert:
 *   1) https://diggai.de lädt mit HTTP 200
 *   2) Bundle enthält KORREKT diggai-api.fly.dev (nicht api.diggai.de)
 *   3) Console gibt keine kritischen Errors aus
 *   4) /api/health antwortet 200 von der erwarteten URL
 *
 * Stop-Gap: Aktuell nur Trigger-Schicht; eigentliches Browser-Driving
 * passiert in einem Cowork-Chat über Chrome-MCP, weil Node-CLI keinen
 * Browser-Tab öffnen kann. Dieses Skript erzeugt aber die Smoke-Test-
 * Definition und macht curl-basierte Pre-Checks.
 *
 * Verwendung:
 *   node tools/smoke-test-chrome.mjs
 *   node tools/smoke-test-chrome.mjs --json   # für CI
 *
 * Exit-Codes:
 *   0 = alle Checks grün
 *   1 = mindestens ein Check failed
 */

import https from 'node:https';

const FRONTEND_URL = 'https://diggai.de';
const BACKEND_URL = 'https://diggai-api.fly.dev/api/health';
const FORBIDDEN_API_HOSTS = ['api.diggai.de'];
const REQUIRED_API_HOST = 'diggai-api.fly.dev';

function fetch(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 10000 }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () =>
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString('utf8'),
                })
            );
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('timeout'));
        });
    });
}

async function findBundleScripts(html) {
    const scripts = [];
    const re = /<script[^>]+src="([^"]+\.js)"/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        let src = m[1];
        if (src.startsWith('/')) src = FRONTEND_URL + src;
        if (src.startsWith('./')) src = FRONTEND_URL + src.slice(1);
        scripts.push(src);
    }
    return scripts;
}

async function inspectBundle(scriptUrl) {
    const r = await fetch(scriptUrl);
    if (r.status !== 200) {
        return { ok: false, reason: `HTTP ${r.status}` };
    }
    const body = r.body;
    const forbidden = FORBIDDEN_API_HOSTS.filter((h) => body.includes(h));
    const requiredOk = body.includes(REQUIRED_API_HOST);
    return {
        ok: forbidden.length === 0 && requiredOk,
        forbiddenHits: forbidden,
        requiredFound: requiredOk,
        size: body.length,
    };
}

async function main() {
    const json = process.argv.includes('--json');
    const results = {};

    try {
        const front = await fetch(FRONTEND_URL);
        results.frontend = {
            ok: front.status === 200,
            status: front.status,
        };

        if (front.status === 200) {
            const scripts = await findBundleScripts(front.body);
            const indexScripts = scripts.filter((s) => /index-[A-Za-z0-9_-]+\.js$/.test(s));
            const inspected = [];
            for (const s of indexScripts.slice(0, 3)) {
                const insp = await inspectBundle(s);
                inspected.push({ url: s, ...insp });
            }
            results.bundles = inspected;
            results.bundlesAllOk = inspected.length > 0 && inspected.every((b) => b.ok);
        }
    } catch (err) {
        results.frontend = { ok: false, status: 0, error: err.message };
    }

    try {
        const back = await fetch(BACKEND_URL);
        let parsed = null;
        try {
            parsed = JSON.parse(back.body);
        } catch {
            /* ok */
        }
        results.backend = {
            ok: back.status === 200,
            status: back.status,
            db: parsed?.db || 'unknown',
        };
    } catch (err) {
        results.backend = { ok: false, status: 0, error: err.message };
    }

    const allOk =
        results.frontend?.ok &&
        results.backend?.ok &&
        (results.bundlesAllOk !== false);

    if (json) {
        console.log(JSON.stringify({ ...results, allOk }, null, 2));
    } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  DiggAi Smoke-Test (Post-Deploy)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  Frontend ${FRONTEND_URL}: ${results.frontend?.status} ${results.frontend?.ok ? '✓' : '✗'}`);
        if (results.bundles) {
            for (const b of results.bundles) {
                console.log(`  Bundle ${b.url.split('/').pop()}: ${b.ok ? '✓' : '✗'} | size=${b.size} | required=${b.requiredFound} | forbidden=${b.forbiddenHits?.join(',') || 'none'}`);
            }
        }
        console.log(`  Backend ${BACKEND_URL}: ${results.backend?.status} ${results.backend?.ok ? '✓' : '✗'} | db=${results.backend?.db}`);
        console.log('');
        console.log(allOk ? '  ✓ Alle Checks grün' : '  ✗ Mindestens ein Check fehlgeschlagen');
    }

    process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
    console.error('SMOKE-TEST CRASH:', err);
    process.exit(2);
});
