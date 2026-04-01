/**
 * Remote E2E runner — lädt .env.e2e bevor Playwright startet,
 * damit PLAYWRIGHT_BASE_URL beim Auswerten von playwright.config.ts bereits gesetzt ist.
 *
 * Nutzung: node e2e/run-remote.mjs [playwright-args...]
 * Oder via npm: npm run test:e2e:remote
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(__dirname, '..', '.env.e2e');

const result = config({ path: envFile });
if (result.error) {
    console.error(`[run-remote] Fehler beim Laden von .env.e2e: ${result.error.message}`);
    console.error('[run-remote] Bitte .env.e2e anlegen (Vorlage: .env.e2e ist bereits vorhanden).');
    process.exit(1);
}

console.log(`[run-remote] Geladen: ${envFile}`);
console.log(`[run-remote] Ziel-Frontend : ${process.env.PLAYWRIGHT_BASE_URL}`);
console.log(`[run-remote] Ziel-API      : ${process.env.PLAYWRIGHT_API_URL}`);

// Extra args aus der CLI (z.B. --headed, --debug, --grep "Login")
const extraArgs = process.argv.slice(2);

const playwrightArgs = [
    'test',
    'e2e/auth-flow.spec.ts',
    '--project=chromium',
    '--reporter=list',
    ...extraArgs,
];

const isWin = process.platform === 'win32';
const pw = isWin ? 'npx.cmd' : 'npx';

const child = spawnSync(pw, ['playwright', ...playwrightArgs], {
    stdio: 'inherit',
    env: process.env,
    shell: isWin,
    cwd: resolve(__dirname, '..'),
});

process.exit(child.status ?? 1);
