#!/usr/bin/env node
/**
 * Knowledge Harness · DiggAi
 * Aggregiert memory/runs, memory/audits und shared/knowledge in EINEN Index.
 *
 * Usage:
 *   node scripts/harness/knowledge-harness.mjs
 *   node scripts/harness/knowledge-harness.mjs --latest 10
 *   node scripts/harness/knowledge-harness.mjs --findings
 *   node scripts/harness/knowledge-harness.mjs --since 7d
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const RUNS_DIR = path.join(ROOT, 'memory', 'runs');
const AUDITS_DIR = path.join(ROOT, 'memory', 'audits');
const KNOWLEDGE_DIR = path.join(ROOT, 'shared', 'knowledge');
const OUTPUT = path.join(KNOWLEDGE_DIR, 'KNOWLEDGE_INDEX.md');

// ─── CLI-Args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? null : args[i + 1];
};

const latestN = value('--latest') ? parseInt(value('--latest'), 10) : null;
const onlyFindings = flag('--findings');
const since = value('--since'); // e.g. "7d", "24h"

// ─── Helpers ────────────────────────────────────────────────────────────
async function safeReaddir(dir) {
    try { return await fs.readdir(dir); } catch { return []; }
}

async function readMd(filepath) {
    try { return await fs.readFile(filepath, 'utf8'); } catch { return ''; }
}

function parseSince(sinceStr) {
    if (!sinceStr) return null;
    const m = sinceStr.match(/^(\d+)([dhm])$/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const ms = unit === 'd' ? 86400e3 : unit === 'h' ? 3600e3 : 60e3;
    return Date.now() - n * ms;
}

const sinceTs = parseSince(since);

function summarizeRun(content, fname) {
    // Extract: header, Aktion, Blocker, Fix, Ergebnis, Out
    const lines = content.split('\n');
    const header = lines[0]?.trim() ?? fname;
    const get = (key) => {
        const line = lines.find(l => l.trim().startsWith(`- ${key}:`));
        return line ? line.replace(`- ${key}:`, '').trim() : '—';
    };
    return {
        file: fname,
        header,
        aktion: get('Aktion'),
        blocker: get('Blocker'),
        ergebnis: get('Ergebnis'),
        out: get('Out'),
    };
}

function extractFindings(auditContent) {
    // Parse Findings: ### F-XX · Title
    const findings = [];
    const re = /^### (F-\d+)\s*·\s*(.+)$/gm;
    let m;
    while ((m = re.exec(auditContent))) {
        findings.push({ id: m[1], title: m[2].trim() });
    }
    return findings;
}

// ─── Aggregation ────────────────────────────────────────────────────────
async function loadRuns() {
    const files = (await safeReaddir(RUNS_DIR))
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse(); // newest first (filename starts with date)

    const runs = [];
    for (const f of files) {
        const stat = await fs.stat(path.join(RUNS_DIR, f));
        if (sinceTs && stat.mtimeMs < sinceTs) continue;
        const content = await readMd(path.join(RUNS_DIR, f));
        runs.push(summarizeRun(content, f));
        if (latestN && runs.length >= latestN) break;
    }
    return runs;
}

async function loadAudits() {
    const files = (await safeReaddir(AUDITS_DIR))
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse();
    const audits = [];
    for (const f of files) {
        const content = await readMd(path.join(AUDITS_DIR, f));
        audits.push({
            file: f,
            findings: extractFindings(content),
        });
    }
    return audits;
}

async function loadKnowledge() {
    const files = (await safeReaddir(KNOWLEDGE_DIR))
        .filter(f => f.endsWith('.md') && f !== 'KNOWLEDGE_INDEX.md');
    return files;
}

// ─── Render ─────────────────────────────────────────────────────────────
function renderIndex({ runs, audits, knowledgeFiles }) {
    const now = new Date().toISOString();
    const totalFindings = audits.reduce((sum, a) => sum + a.findings.length, 0);

    let md = `# Knowledge Index · DiggAi\n\n`;
    md += `**Auto-generated:** ${now}\n`;
    md += `**Source:** \`scripts/harness/knowledge-harness.mjs\` (NICHT manuell editieren)\n\n`;
    md += `---\n\n`;

    md += `## Übersicht\n\n`;
    md += `- **${runs.length}** Run-Logs${latestN ? ` (limit ${latestN})` : ''}${sinceTs ? ` seit ${since}` : ''}\n`;
    md += `- **${audits.length}** Audit-Reports mit **${totalFindings}** Findings\n`;
    md += `- **${knowledgeFiles.length}** Knowledge-Docs in \`shared/knowledge/\`\n\n`;

    if (!onlyFindings) {
        md += `---\n\n## Letzte Runs\n\n`;
        for (const r of runs) {
            md += `### ${r.header}\n`;
            md += `\`memory/runs/${r.file}\`\n\n`;
            md += `- **Ergebnis:** ${r.ergebnis}\n`;
            if (r.blocker !== '—') md += `- **Blocker:** ${r.blocker}\n`;
            md += `- **Out:** ${r.out}\n\n`;
        }
    }

    md += `---\n\n## Offene Audit-Findings\n\n`;
    for (const a of audits) {
        if (a.findings.length === 0) continue;
        md += `### \`${a.file}\`\n`;
        for (const f of a.findings) {
            md += `- **${f.id}** · ${f.title}\n`;
        }
        md += `\n`;
    }

    if (!onlyFindings) {
        md += `---\n\n## Knowledge-Docs\n\n`;
        for (const f of knowledgeFiles.sort()) {
            md += `- [\`shared/knowledge/${f}\`](${f})\n`;
        }
    }

    md += `\n---\n\n_Re-run with: \`node scripts/harness/knowledge-harness.mjs\`_\n`;
    return md;
}

// ─── Main ───────────────────────────────────────────────────────────────
(async () => {
    const [runs, audits, knowledgeFiles] = await Promise.all([
        loadRuns(),
        loadAudits(),
        loadKnowledge(),
    ]);

    const md = renderIndex({ runs, audits, knowledgeFiles });
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
    await fs.writeFile(OUTPUT, md, 'utf8');

    console.log(`✅ Knowledge index written: ${path.relative(ROOT, OUTPUT)}`);
    console.log(`   Runs: ${runs.length}  Audits: ${audits.length}  Findings: ${audits.reduce((s,a)=>s+a.findings.length,0)}`);
})().catch(err => {
    console.error('❌ Knowledge Harness failed:', err);
    process.exit(1);
});
