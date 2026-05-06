#!/usr/bin/env node
/**
 * build-tracker-xlsx — DiggAi-Open-Items-Tracker als XLSX bauen
 *
 * Anker: docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §3.3
 *
 * Konvertiert den Markdown-Tracker (DiggAi-Open-Items-Tracker.md) in eine
 * XLSX-Datei mit Filter und Pivot-fähigen Spalten. CK kann die XLSX auf
 * dem Tablet/Smartphone öffnen und Filter setzen, ohne Markdown-Renderer.
 *
 * Verwendung:
 *   npm i -D xlsx          # einmalig
 *   node scripts/build-tracker-xlsx.cjs
 *
 * Output:
 *   ../../DiggAi-Open-Items-Tracker.xlsx (im Workspace-Root)
 *
 * Spalten:
 *   Kategorie | ID | Item | Owner | Status | Block-Effekt | Notiz
 */

'use strict';

const fs = require('fs');
const path = require('path');

let XLSX;
try {
    XLSX = require('xlsx');
} catch (err) {
    console.error('FEHLER: xlsx-Modul nicht installiert.');
    console.error('Lösung: npm install --save-dev xlsx');
    process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, '..');
const TRACKER_MD = path.resolve(REPO_ROOT, '..', '..', 'DiggAi-Open-Items-Tracker.md');
const OUT_XLSX = path.resolve(REPO_ROOT, '..', '..', 'DiggAi-Open-Items-Tracker.xlsx');

if (!fs.existsSync(TRACKER_MD)) {
    console.error(`FEHLER: Tracker nicht gefunden: ${TRACKER_MD}`);
    process.exit(2);
}

const md = fs.readFileSync(TRACKER_MD, 'utf8');

// ── Markdown-Tabellen pro Kategorie parsen ──────────────────────

const KATEGORIEN = {
    'A': 'A. Sofort',
    'B': 'B. Phase-2-Engineering',
    'C': 'C. DB + Sicherheit',
    'D': 'D. MDR-Tech-Doc',
    'E': 'E. ISMS',
    'F': 'F. DiGA-Pfad',
    'G': 'G. Marketing',
    'H': 'H. Bug-Backlog',
    'I': 'I. Compliance laufend',
    'J': 'J. Connector-Operations (NEW)',
};

const items = [];

// Match alle Zeilen die mit | A1 | oder | A2 | ... beginnen
const re = /^\|\s*([A-J]\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/gm;
let m;
while ((m = re.exec(md)) !== null) {
    const id = m[1];
    const cat = id[0];
    items.push({
        Kategorie: KATEGORIEN[cat] || cat,
        ID: id,
        Item: m[2],
        Owner: m[3],
        Status: m[4],
        'Block-Effekt': m[5],
        Notiz: m[6],
    });
}

if (items.length === 0) {
    console.error('FEHLER: Keine Tracker-Zeilen geparst — Markdown-Format unverändert?');
    process.exit(2);
}

console.log(`Geparst: ${items.length} Items`);

// ── XLSX bauen ─────────────────────────────────────────────────

const wb = XLSX.utils.book_new();

// Sheet 1: alle Items
const ws1 = XLSX.utils.json_to_sheet(items);

// Spaltenbreiten setzen
ws1['!cols'] = [
    { wch: 28 },  // Kategorie
    { wch: 6 },   // ID
    { wch: 56 },  // Item
    { wch: 10 },  // Owner
    { wch: 14 },  // Status
    { wch: 28 },  // Block-Effekt
    { wch: 50 },  // Notiz
];

// AutoFilter
ws1['!autofilter'] = { ref: `A1:G${items.length + 1}` };

XLSX.utils.book_append_sheet(wb, ws1, 'Items');

// Sheet 2: Pivot-Vorbereitung — Status-Counts je Kategorie
const pivotMap = new Map();
for (const i of items) {
    const key = `${i.Kategorie}|${i.Status}`;
    pivotMap.set(key, (pivotMap.get(key) || 0) + 1);
}
const pivotRows = [...pivotMap.entries()].map(([k, v]) => {
    const [kat, status] = k.split('|');
    return { Kategorie: kat, Status: status, Anzahl: v };
});
const ws2 = XLSX.utils.json_to_sheet(pivotRows);
ws2['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 8 }];
XLSX.utils.book_append_sheet(wb, ws2, 'Pivot');

// Sheet 3: CK-Pareto-3
const ckPareto = items.filter((i) => ['A1', 'A4', 'A5'].includes(i.ID));
const ws3 = XLSX.utils.json_to_sheet(ckPareto);
ws3['!cols'] = ws1['!cols'];
XLSX.utils.book_append_sheet(wb, ws3, 'CK-Pareto-3');

// Sheet 4: ENG-Top-3
const engTop = items.filter((i) => ['B1', 'B2', 'B4', 'C1'].includes(i.ID));
const ws4 = XLSX.utils.json_to_sheet(engTop);
ws4['!cols'] = ws1['!cols'];
XLSX.utils.book_append_sheet(wb, ws4, 'ENG-Top-Items');

XLSX.writeFile(wb, OUT_XLSX);

console.log(`✓ Geschrieben: ${OUT_XLSX}`);
console.log(`  Items: ${items.length}`);
console.log(`  Sheets: Items, Pivot, CK-Pareto-3, ENG-Top-Items`);
