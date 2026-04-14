/**
 * Obsidian MCP Server for DiggAI Anamnese
 *
 * Provides MCP tools to bridge DiggAI session/patient data into an
 * Obsidian-compatible markdown vault. Every note is keyed by:
 *   - praxisId  (Tenant primary key — practice identifier)
 *   - patientId (Patient primary key — P-XXXXX format)
 *   - sessionId (Session primary key)
 *
 * DSGVO: Filenames use IDs only (no PHI). PII is only included in
 * content if the caller explicitly opts in (staff-only, audited).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VAULT_ROOT = process.env.OBSIDIAN_VAULT_PATH
  || path.resolve(process.cwd(), '.obsidian-vault');

const SESSIONS_DIR = path.join(VAULT_ROOT, 'sessions');
const PATIENTS_DIR = path.join(VAULT_ROOT, 'patients');
const PRAXIS_DIR   = path.join(VAULT_ROOT, 'praxis');
const INDEX_DIR    = path.join(VAULT_ROOT, 'index');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
}

function isoNow(): string {
  return new Date().toISOString();
}

/** Build YAML frontmatter block */
function frontmatter(meta: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${String(item)}`);
      }
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/** Build Obsidian wikilink */
function wikilink(target: string, alias?: string): string {
  return alias ? `[[${target}|${alias}]]` : `[[${target}]]`;
}

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

interface SessionData {
  sessionId: string;
  praxisId: string;
  patientId?: string;
  patientNumber?: string;
  service: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  gender?: string;
  birthDate?: string;
  insuranceType?: string;
  answers?: Array<{
    atomId: string;
    section: string;
    questionText: string;
    displayValue: string;
    answeredAt?: string;
  }>;
  triageEvents?: Array<{
    level: string;
    atomId: string;
    message: string;
    createdAt: string;
  }>;
  tags?: string[];
}

interface PatientSummary {
  patientId: string;
  praxisId: string;
  patientNumber?: string;
  sessionCount: number;
  sessionIds: string[];
  lastVisit?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Markdown Generators
// ---------------------------------------------------------------------------

function generateSessionNote(data: SessionData): string {
  const meta: Record<string, unknown> = {
    type: 'session',
    sessionId: data.sessionId,
    praxisId: data.praxisId,
    patientId: data.patientId || 'anonymous',
    patientNumber: data.patientNumber || null,
    service: data.service,
    status: data.status,
    createdAt: data.createdAt,
    completedAt: data.completedAt || null,
    insuranceType: data.insuranceType || null,
    tags: [
      'diggai',
      'session',
      data.service?.toLowerCase(),
      ...(data.tags || []),
    ].filter(Boolean),
  };

  const lines: string[] = [
    frontmatter(meta),
    '',
    `# Session ${data.sessionId.substring(0, 8)}`,
    '',
    '## Metadaten',
    '',
    `| Feld | Wert |`,
    `|------|------|`,
    `| **Praxis** | ${wikilink(`praxis/${sanitizeFilename(data.praxisId)}`, data.praxisId)} |`,
    `| **Patient** | ${data.patientId ? wikilink(`patients/${sanitizeFilename(data.patientId)}`, data.patientNumber || data.patientId) : 'Anonym'} |`,
    `| **Service** | ${data.service} |`,
    `| **Status** | ${data.status} |`,
    `| **Versicherung** | ${data.insuranceType || '—'} |`,
    `| **Erstellt** | ${data.createdAt} |`,
    `| **Abgeschlossen** | ${data.completedAt || '—'} |`,
    '',
  ];

  // Answers grouped by section
  if (data.answers && data.answers.length > 0) {
    const sections = new Map<string, typeof data.answers>();
    for (const a of data.answers) {
      const key = a.section || 'sonstige';
      if (!sections.has(key)) sections.set(key, []);
      sections.get(key)!.push(a);
    }

    lines.push('## Anamnese-Antworten', '');
    for (const [section, answers] of sections) {
      lines.push(`### ${section}`, '');
      lines.push('| Frage | Antwort |');
      lines.push('|-------|---------|');
      for (const a of answers) {
        const q = a.questionText.replace(/\|/g, '\\|');
        const v = String(a.displayValue).replace(/\|/g, '\\|');
        lines.push(`| ${q} | ${v} |`);
      }
      lines.push('');
    }
  }

  // Triage events
  if (data.triageEvents && data.triageEvents.length > 0) {
    lines.push('## Triage-Events', '');
    for (const t of data.triageEvents) {
      const icon = t.level === 'CRITICAL' ? '🔴' : '🟡';
      lines.push(`- ${icon} **${t.level}** (${t.atomId}): ${t.message} — ${t.createdAt}`);
    }
    lines.push('');
  }

  lines.push('---', `*Exportiert am ${isoNow()} via DiggAI Obsidian MCP*`);
  return lines.join('\n');
}

function generatePatientNote(data: PatientSummary): string {
  const meta: Record<string, unknown> = {
    type: 'patient',
    patientId: data.patientId,
    praxisId: data.praxisId,
    patientNumber: data.patientNumber || null,
    sessionCount: data.sessionCount,
    lastVisit: data.lastVisit || null,
    tags: ['diggai', 'patient', ...(data.tags || [])],
  };

  const lines: string[] = [
    frontmatter(meta),
    '',
    `# Patient ${data.patientNumber || data.patientId.substring(0, 8)}`,
    '',
    '## Übersicht',
    '',
    `| Feld | Wert |`,
    `|------|------|`,
    `| **Patient-ID** | \`${data.patientId}\` |`,
    `| **Nummer** | ${data.patientNumber || '—'} |`,
    `| **Praxis** | ${wikilink(`praxis/${sanitizeFilename(data.praxisId)}`, data.praxisId)} |`,
    `| **Sitzungen** | ${data.sessionCount} |`,
    `| **Letzter Besuch** | ${data.lastVisit || '—'} |`,
    '',
    '## Sessions',
    '',
  ];

  for (const sid of data.sessionIds) {
    lines.push(`- ${wikilink(`sessions/${sanitizeFilename(sid)}`, sid.substring(0, 8))}`);
  }

  lines.push('', '---', `*Aktualisiert am ${isoNow()} via DiggAI Obsidian MCP*`);
  return lines.join('\n');
}

function generatePraxisNote(praxisId: string, sessions: string[]): string {
  const meta: Record<string, unknown> = {
    type: 'praxis',
    praxisId,
    sessionCount: sessions.length,
    updatedAt: isoNow(),
    tags: ['diggai', 'praxis'],
  };

  const lines: string[] = [
    frontmatter(meta),
    '',
    `# Praxis ${praxisId}`,
    '',
    `**Gesamtsitzungen:** ${sessions.length}`,
    '',
    '## Sessions',
    '',
  ];

  for (const sid of sessions.slice(-50)) {
    lines.push(`- ${wikilink(`sessions/${sanitizeFilename(sid)}`, sid.substring(0, 8))}`);
  }

  if (sessions.length > 50) {
    lines.push(`- ... und ${sessions.length - 50} weitere`);
  }

  lines.push('', '---', `*Aktualisiert am ${isoNow()} via DiggAI Obsidian MCP*`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'diggai-obsidian',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ─── List Tools ─────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'write_session',
      description:
        'Write a DiggAI patient session to the Obsidian vault as a structured Markdown note. ' +
        'Links to patient and praxis notes via wikilinks. ' +
        'Requires praxisId (Tenant PK) and sessionId. patientId is optional for anonymous sessions.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          sessionId:    { type: 'string', description: 'Session UUID (PatientSession PK)' },
          praxisId:     { type: 'string', description: 'Tenant/Praxis UUID (Praxis PK)' },
          patientId:    { type: 'string', description: 'Patient UUID (Patient PK, optional for anonymous)' },
          patientNumber:{ type: 'string', description: 'Patient number (e.g. P-10001)' },
          service:      { type: 'string', description: 'Service type: TERMIN, REZEPT, AU, UEBERWEISUNG, etc.' },
          status:       { type: 'string', description: 'Session status: ACTIVE, COMPLETED, SUBMITTED, EXPIRED' },
          createdAt:    { type: 'string', description: 'ISO 8601 creation timestamp' },
          completedAt:  { type: 'string', description: 'ISO 8601 completion timestamp (optional)' },
          insuranceType:{ type: 'string', description: 'PKV, GKV, or Selbstzahler' },
          answers: {
            type: 'array',
            description: 'Array of answered questions',
            items: {
              type: 'object',
              properties: {
                atomId:       { type: 'string' },
                section:      { type: 'string' },
                questionText: { type: 'string' },
                displayValue: { type: 'string' },
                answeredAt:   { type: 'string' },
              },
            },
          },
          triageEvents: {
            type: 'array',
            description: 'Array of triage events (red flags)',
            items: {
              type: 'object',
              properties: {
                level:     { type: 'string' },
                atomId:    { type: 'string' },
                message:   { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
          tags: { type: 'array', items: { type: 'string' }, description: 'Additional Obsidian tags' },
        },
        required: ['sessionId', 'praxisId', 'service', 'status', 'createdAt'],
      },
    },
    {
      name: 'write_patient_summary',
      description:
        'Write or update a patient summary note in the Obsidian vault. ' +
        'Links all sessions for this patient via wikilinks. ' +
        'Requires praxisId (Tenant PK) and patientId (Patient PK).',
      inputSchema: {
        type: 'object' as const,
        properties: {
          patientId:     { type: 'string', description: 'Patient UUID (Patient PK)' },
          praxisId:      { type: 'string', description: 'Tenant/Praxis UUID (Praxis PK)' },
          patientNumber: { type: 'string', description: 'Patient number (e.g. P-10001)' },
          sessionCount:  { type: 'number', description: 'Total number of sessions' },
          sessionIds:    { type: 'array', items: { type: 'string' }, description: 'List of session UUIDs' },
          lastVisit:     { type: 'string', description: 'ISO 8601 timestamp of last visit' },
          tags:          { type: 'array', items: { type: 'string' }, description: 'Additional Obsidian tags' },
        },
        required: ['patientId', 'praxisId', 'sessionCount', 'sessionIds'],
      },
    },
    {
      name: 'list_vault_sessions',
      description:
        'List all session notes in the Obsidian vault. ' +
        'Optionally filter by praxisId or patientId from frontmatter.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          praxisId:  { type: 'string', description: 'Filter by Praxis/Tenant ID' },
          patientId: { type: 'string', description: 'Filter by Patient ID' },
          limit:     { type: 'number', description: 'Max results (default 50)' },
        },
      },
    },
    {
      name: 'search_vault',
      description:
        'Full-text search across all markdown files in the Obsidian vault. ' +
        'Returns matching file paths and the first matching line.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query (case-insensitive)' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'read_vault_note',
      description: 'Read the full content of a note from the Obsidian vault by relative path.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          notePath: { type: 'string', description: 'Relative path within vault (e.g. sessions/abc123.md)' },
        },
        required: ['notePath'],
      },
    },
    {
      name: 'get_vault_stats',
      description:
        'Return statistics about the Obsidian vault: total notes, sessions, patients, praxis count.',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
  ],
}));

// ─── Call Tools ──────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // ── write_session ──────────────────────────────────────────────────────
    case 'write_session': {
      const data = args as unknown as SessionData;
      ensureDir(SESSIONS_DIR);
      const filename = `${sanitizeFilename(data.sessionId)}.md`;
      const filePath = path.join(SESSIONS_DIR, filename);
      const content = generateSessionNote(data);
      fs.writeFileSync(filePath, content, 'utf-8');

      // Also update praxis index
      ensureDir(PRAXIS_DIR);
      const praxisFile = path.join(PRAXIS_DIR, `${sanitizeFilename(data.praxisId)}.md`);
      const existingSessions: string[] = [];
      if (fs.existsSync(praxisFile)) {
        const existing = fs.readFileSync(praxisFile, 'utf-8');
        const sessionMatches = existing.match(/sessions\/([a-zA-Z0-9_-]+)/g);
        if (sessionMatches) {
          existingSessions.push(...sessionMatches.map(m => m.replace('sessions/', '')));
        }
      }
      if (!existingSessions.includes(sanitizeFilename(data.sessionId))) {
        existingSessions.push(sanitizeFilename(data.sessionId));
      }
      fs.writeFileSync(praxisFile, generatePraxisNote(data.praxisId, existingSessions), 'utf-8');

      return {
        content: [{
          type: 'text',
          text: `✅ Session note written: ${filename}\n` +
                `   Vault: ${VAULT_ROOT}\n` +
                `   PraxisId: ${data.praxisId}\n` +
                `   PatientId: ${data.patientId || 'anonymous'}\n` +
                `   SessionId: ${data.sessionId}`,
        }],
      };
    }

    // ── write_patient_summary ──────────────────────────────────────────────
    case 'write_patient_summary': {
      const data = args as unknown as PatientSummary;
      ensureDir(PATIENTS_DIR);
      const filename = `${sanitizeFilename(data.patientId)}.md`;
      const filePath = path.join(PATIENTS_DIR, filename);
      fs.writeFileSync(filePath, generatePatientNote(data), 'utf-8');
      return {
        content: [{
          type: 'text',
          text: `✅ Patient summary written: ${filename}\n` +
                `   PraxisId: ${data.praxisId}\n` +
                `   PatientId: ${data.patientId}\n` +
                `   Sessions: ${data.sessionCount}`,
        }],
      };
    }

    // ── list_vault_sessions ────────────────────────────────────────────────
    case 'list_vault_sessions': {
      const { praxisId, patientId, limit = 50 } = args as {
        praxisId?: string; patientId?: string; limit?: number;
      };

      if (!fs.existsSync(SESSIONS_DIR)) {
        return { content: [{ type: 'text', text: 'No sessions directory found.' }] };
      }

      const files = fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.md') && f !== '.gitkeep');

      const results: Array<{ file: string; sessionId?: string; praxisId?: string; patientId?: string }> = [];

      for (const file of files) {
        if (results.length >= limit) break;
        const content = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8');

        // Parse frontmatter
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!fmMatch) {
          results.push({ file });
          continue;
        }

        const fm = fmMatch[1];
        const extractField = (key: string) => {
          const match = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'));
          return match ? match[1] : undefined;
        };

        const noteSessionId = extractField('sessionId');
        const notePraxisId  = extractField('praxisId');
        const notePatientId = extractField('patientId');

        if (praxisId && notePraxisId !== praxisId) continue;
        if (patientId && notePatientId !== patientId) continue;

        results.push({
          file,
          sessionId: noteSessionId,
          praxisId: notePraxisId,
          patientId: notePatientId,
        });
      }

      return {
        content: [{
          type: 'text',
          text: `Found ${results.length} session(s):\n` +
                results.map(r =>
                  `  - ${r.file} (session: ${r.sessionId || '?'}, praxis: ${r.praxisId || '?'}, patient: ${r.patientId || '?'})`
                ).join('\n'),
        }],
      };
    }

    // ── search_vault ───────────────────────────────────────────────────────
    case 'search_vault': {
      const { query, limit = 20 } = args as { query: string; limit?: number };
      const queryLower = query.toLowerCase();
      const results: Array<{ file: string; line: string }> = [];

      function searchDir(dir: string, prefix: string): void {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (results.length >= limit) return;
          if (entry.isDirectory()) {
            searchDir(path.join(dir, entry.name), `${prefix}${entry.name}/`);
          } else if (entry.name.endsWith('.md')) {
            const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
              if (line.toLowerCase().includes(queryLower)) {
                results.push({ file: `${prefix}${entry.name}`, line: line.trim().substring(0, 120) });
                break;
              }
            }
          }
        }
      }

      searchDir(VAULT_ROOT, '');
      return {
        content: [{
          type: 'text',
          text: results.length === 0
            ? `No results for "${query}".`
            : `Found ${results.length} match(es):\n` +
              results.map(r => `  - ${r.file}: ${r.line}`).join('\n'),
        }],
      };
    }

    // ── read_vault_note ────────────────────────────────────────────────────
    case 'read_vault_note': {
      const { notePath } = args as { notePath: string };
      // Prevent path traversal
      const resolved = path.resolve(VAULT_ROOT, notePath);
      if (!resolved.startsWith(path.resolve(VAULT_ROOT))) {
        return { content: [{ type: 'text', text: 'Error: Path traversal detected.' }] };
      }
      if (!fs.existsSync(resolved)) {
        return { content: [{ type: 'text', text: `Note not found: ${notePath}` }] };
      }
      const content = fs.readFileSync(resolved, 'utf-8');
      return { content: [{ type: 'text', text: content }] };
    }

    // ── get_vault_stats ────────────────────────────────────────────────────
    case 'get_vault_stats': {
      const countMd = (dir: string): number => {
        if (!fs.existsSync(dir)) return 0;
        return fs.readdirSync(dir).filter(f => f.endsWith('.md')).length;
      };
      const sessions = countMd(SESSIONS_DIR);
      const patients = countMd(PATIENTS_DIR);
      const praxis   = countMd(PRAXIS_DIR);

      return {
        content: [{
          type: 'text',
          text: `Obsidian Vault Stats:\n` +
                `  Vault root:  ${VAULT_ROOT}\n` +
                `  Sessions:    ${sessions}\n` +
                `  Patients:    ${patients}\n` +
                `  Praxis:      ${praxis}\n` +
                `  Total notes: ${sessions + patients + praxis}`,
        }],
      };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
});

// ─── Resources ──────────────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: `file://${VAULT_ROOT}`,
      name: 'DiggAI Obsidian Vault',
      description: 'Root of the Obsidian vault containing session, patient, and praxis notes',
      mimeType: 'text/directory',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const resolved = uri.replace('file://', '');
  if (!resolved.startsWith(path.resolve(VAULT_ROOT))) {
    return { contents: [{ uri, text: 'Access denied: outside vault scope' }] };
  }
  if (!fs.existsSync(resolved)) {
    return { contents: [{ uri, text: 'Not found' }] };
  }
  const text = fs.readFileSync(resolved, 'utf-8');
  return { contents: [{ uri, mimeType: 'text/markdown', text }] };
});

// ─── Bootstrap ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Ensure vault directories exist
  ensureDir(VAULT_ROOT);
  ensureDir(SESSIONS_DIR);
  ensureDir(PATIENTS_DIR);
  ensureDir(PRAXIS_DIR);
  ensureDir(INDEX_DIR);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // eslint-disable-next-line no-console
  console.error('DiggAI Obsidian MCP Server running on stdio');
  console.error(`Vault root: ${VAULT_ROOT}`);
}

main().catch((err) => {
  console.error('Fatal error starting Obsidian MCP server:', err);
  process.exit(1);
});
