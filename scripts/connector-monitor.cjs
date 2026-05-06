#!/usr/bin/env node
/**
 * connector-monitor.cjs — Master-Skript für DiggAi Operations-Connectors
 *
 * Wird von 6 Scheduled Tasks aufgerufen (siehe docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §3.1):
 *   - monitor-diga-verzeichnis  (wöchentlich)
 *   - weekly-regulatory-update  (wöchentlich)
 *   - daily-health-check        (täglich)
 *   - bundle-audit-quarterly    (quartalsweise)
 *   - netlify-token-rotation-reminder (monatlich)
 *   - open-items-progress-snapshot (wöchentlich)
 *
 * Aufruf:
 *   node scripts/connector-monitor.cjs <task-name>
 *
 * Output: schreibt einen Run-Log-Eintrag in memory/runs/YYYY-MM-DD_scheduled_<task>.md
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------
const REPO_ROOT = path.resolve(__dirname, '..');
const RUNS_DIR = path.join(REPO_ROOT, 'memory', 'runs');
const TRACKER_PATH = path.join(REPO_ROOT, '..', '..', 'DiggAi-Open-Items-Tracker.md');

const ENDPOINTS = {
  frontend: 'https://diggai.de',
  netlifyDefault: 'https://diggai-anamnese.netlify.app',
  backend: 'https://diggai-api.fly.dev/api/health',
  legacyHetzner: 'https://api.diggai.de/api/health', // expected to fail
};

const REGULATORY_SOURCES = [
  { name: 'BfArM DiGA', url: 'https://diga.bfarm.de/' },
  { name: 'MDCG Documents', url: 'https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en' },
  { name: 'gematik FHIR', url: 'https://www.gematik.de/' },
];

// ---------------------------------------------------------------------------
// Run-Log Helper
// ---------------------------------------------------------------------------
function pad(n) { return String(n).padStart(2, '0'); }

function nowIso() {
  const d = new Date();
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(offset) / 60));
  const om = pad(Math.abs(offset) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}${sign}${oh}:${om}`;
}

function todayPath(taskName) {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
  return path.join(RUNS_DIR, `${date}_scheduled_${taskName}.md`);
}

function appendRunLog(taskName, entry) {
  const file = todayPath(taskName);
  const header = fs.existsSync(file) ? '\n\n' : '';
  fs.appendFileSync(file, header + entry + '\n', 'utf8');
  console.log(`[connector-monitor] Run-Log -> ${file}`);
}

function buildEntry({ topic, aktion, blocker = '—', fix = '—', ergebnis, out }) {
  return `${nowIso()} | Lauf scheduled-task | ${topic}\n---\n- Aktion: ${aktion}\n- Blocker: ${blocker}\n- Fix: ${fix}\n- Ergebnis: ${ergebnis}\n- Out: ${out}`;
}

// ---------------------------------------------------------------------------
// HTTP Helper (kein npm-Dep)
// ---------------------------------------------------------------------------
function httpGet(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: timeoutMs, rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data, ok: res.statusCode >= 200 && res.statusCode < 400 }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout', ok: false }); });
  });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
async function dailyHealthCheck() {
  const results = {};
  for (const [k, url] of Object.entries(ENDPOINTS)) {
    const r = await httpGet(url, 8000);
    results[k] = { url, status: r.status, ok: r.ok, error: r.error };
  }
  const fronendOk = results.frontend.ok;
  const backendOk = results.backend.ok;
  const allOk = fronendOk && backendOk;

  appendRunLog('daily-health-check', buildEntry({
    topic: 'Daily Health Check',
    aktion: `HTTP-Check: ${Object.keys(ENDPOINTS).length} Endpoints geprüft`,
    blocker: allOk ? '—' : `Down: ${Object.entries(results).filter(([k,v]) => !v.ok).map(([k,v]) => `${k}=${v.status||v.error}`).join(', ')}`,
    fix: allOk ? '—' : 'Manuelles Eingreifen nötig',
    ergebnis: `frontend=${results.frontend.status} backend=${results.backend.status} hetzner-deprecated=${results.legacyHetzner.status}`,
    out: allOk ? 'Live-Strecke grün' : 'Live-Strecke INSTABIL — alert',
  }));
  console.log(JSON.stringify(results, null, 2));
  process.exit(allOk ? 0 : 1);
}

async function weeklyRegulatoryUpdate() {
  const results = [];
  for (const src of REGULATORY_SOURCES) {
    const r = await httpGet(src.url, 15000);
    results.push({ source: src.name, url: src.url, reachable: r.ok, status: r.status, contentLength: r.body ? r.body.length : 0 });
  }
  const reachableCount = results.filter(r => r.reachable).length;
  appendRunLog('weekly-regulatory-update', buildEntry({
    topic: 'Wöchentlicher Regulatorik-Update-Check',
    aktion: `Probing ${REGULATORY_SOURCES.length} Quellen: BfArM/MDCG/gematik`,
    ergebnis: `${reachableCount}/${REGULATORY_SOURCES.length} erreichbar`,
    out: 'Manuelle Inspektion empfohlen für inhaltliche Diff-Analyse (Apify-Step ergänzen sobald MCP-Apify-Key vorhanden)',
  }));
  console.log(JSON.stringify(results, null, 2));
}

async function monitorDiga() {
  // Light-Variante ohne Apify: nur Reachability + Anzahl <a href> Treffer im HTML
  const r = await httpGet('https://diga.bfarm.de/', 15000);
  let anchors = 0;
  if (r.body) {
    const matches = r.body.match(/<a [^>]*href=/gi);
    anchors = matches ? matches.length : 0;
  }
  appendRunLog('monitor-diga-verzeichnis', buildEntry({
    topic: 'DiGA-Verzeichnis-Crawl (Light)',
    aktion: `GET https://diga.bfarm.de/`,
    ergebnis: `status=${r.status} anchors=${anchors}`,
    out: anchors > 50 ? 'Listings-Page erreicht — manuelle Diff-Inspection oder Apify-Upgrade empfohlen' : 'Wenige Links — möglicherweise andere Seitenstruktur',
  }));
}

function bundleAuditQuarterly() {
  const auditScript = path.join(REPO_ROOT, 'scripts', 'bundle-audit.cjs');
  if (!fs.existsSync(auditScript)) {
    appendRunLog('bundle-audit-quarterly', buildEntry({
      topic: 'Quartals-Bundle-Audit',
      aktion: 'bundle-audit.cjs gesucht',
      blocker: `Datei nicht gefunden: ${auditScript}`,
      ergebnis: 'Audit nicht ausgeführt',
      out: 'bundle-audit.cjs muss vorhanden sein (ist es laut Repo)',
    }));
    return;
  }
  // Ausführen via require + capture (statt child_process für Cron-Sicherheit)
  try {
    require(auditScript);
    appendRunLog('bundle-audit-quarterly', buildEntry({
      topic: 'Quartals-Bundle-Audit',
      aktion: 'bundle-audit.cjs geladen + ausgeführt',
      ergebnis: 'siehe Stdout des Audit-Skripts',
      out: 'Bei Treffern in packages/capture/dist/ Engineering eskalieren',
    }));
  } catch (e) {
    appendRunLog('bundle-audit-quarterly', buildEntry({
      topic: 'Quartals-Bundle-Audit',
      aktion: 'bundle-audit.cjs ausgeführt',
      blocker: e.message,
      ergebnis: 'Fehler beim Audit',
      out: 'Audit-Skript prüfen',
    }));
  }
}

function netlifyTokenReminder() {
  appendRunLog('netlify-token-rotation-reminder', buildEntry({
    topic: 'Netlify-Token-Rotation-Reminder',
    aktion: 'Monatlicher Reminder gesetzt',
    ergebnis: 'Token-Alter manuell prüfen — siehe Netlify-Dashboard / .env-Datum',
    out: 'Aktion: bei >30 Tagen Token rotieren (CK)',
  }));
}

function openItemsProgressSnapshot() {
  if (!fs.existsSync(TRACKER_PATH)) {
    appendRunLog('open-items-progress-snapshot', buildEntry({
      topic: 'Open-Items Progress-Snapshot',
      aktion: 'Tracker-Datei lesen',
      blocker: `Nicht gefunden: ${TRACKER_PATH}`,
      ergebnis: 'kein Snapshot',
      out: 'Pfad anpassen falls Tracker verschoben wurde',
    }));
    return;
  }
  const content = fs.readFileSync(TRACKER_PATH, 'utf8');
  // Einfache Heuristik: Zähle "offen" vs "erledigt" / "wartet"
  const offenCount = (content.match(/\| offen \|/g) || []).length;
  const erledigtCount = (content.match(/\| erledigt \|/g) || []).length;
  const wartetCount = (content.match(/\| wartet[^|]*\|/g) || []).length;
  const wrappedCount = (content.match(/\| wrapped[^|]*\|/g) || []).length;
  const total = offenCount + erledigtCount + wartetCount + wrappedCount;
  appendRunLog('open-items-progress-snapshot', buildEntry({
    topic: 'Open-Items Progress-Snapshot',
    aktion: `Tracker geparst: ${TRACKER_PATH}`,
    ergebnis: `total≈${total} offen=${offenCount} erledigt=${erledigtCount} wartet=${wartetCount} wrapped=${wrappedCount}`,
    out: erledigtCount > 0 ? `Fortschritt erkannt (${erledigtCount} erledigt)` : 'Noch keine Items abgehakt — Pareto-3 (A4/A5/A1) anstoßen',
  }));
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
async function main() {
  const task = process.argv[2];
  if (!task) {
    console.error('Usage: node scripts/connector-monitor.cjs <task-name>');
    console.error('Tasks: daily-health-check | weekly-regulatory-update | monitor-diga-verzeichnis | bundle-audit-quarterly | netlify-token-rotation-reminder | open-items-progress-snapshot');
    process.exit(2);
  }
  switch (task) {
    case 'daily-health-check': return dailyHealthCheck();
    case 'weekly-regulatory-update': return weeklyRegulatoryUpdate();
    case 'monitor-diga-verzeichnis': return monitorDiga();
    case 'bundle-audit-quarterly': return bundleAuditQuarterly();
    case 'netlify-token-rotation-reminder': return netlifyTokenReminder();
    case 'open-items-progress-snapshot': return openItemsProgressSnapshot();
    default:
      console.error(`Unknown task: ${task}`);
      process.exit(2);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
