#!/usr/bin/env node
/**
 * setup-postgres-roles.cjs — Postgres-Rollen-Aktivierung für Class-I-Defense-in-Depth
 *
 * Anker: docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.6
 * Adressiert Open-Items-Tracker C1 ("Postgres-Rollen einrichten")
 *
 * Was tut das Skript:
 *   Wendet prisma/sql/01_postgres_roles.sql gegen die DATABASE_URL an. Im
 *   Default-Modus dry-run-only (zeigt SQL, ohne auszuführen). Mit --apply
 *   führt es die SQL-Statements aus. Mit --verify prüft es nur den
 *   Ist-Stand (welche Rollen + Rechte existieren).
 *
 * Verwendung:
 *   node scripts/setup-postgres-roles.cjs              # default: dry-run
 *   node scripts/setup-postgres-roles.cjs --apply      # tatsächlich anwenden
 *   node scripts/setup-postgres-roles.cjs --verify     # nur Ist-Stand
 *
 * Voraussetzungen:
 *   - DATABASE_URL in .env (Postgres-Connection-String)
 *   - prisma/sql/01_postgres_roles.sql existiert
 *   - npm-Paket pg installiert (transitive über @prisma/client, oder manuell)
 *
 * SECURITY:
 *   --apply erstellt Rollen mit eigenen Passwörtern. Diese MÜSSEN als
 *   Fly-Secrets gesetzt werden (CAPTURE_DB_PASSWORD, SUITE_DB_PASSWORD,
 *   OWNER_DB_PASSWORD), bevor die Anwendung mit den neuen Rollen läuft.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SQL_FILE = path.join(REPO_ROOT, 'prisma', 'sql', '01_postgres_roles.sql');

function loadEnv() {
    const envPath = path.join(REPO_ROOT, '.env');
    if (!fs.existsSync(envPath)) return {};
    const env = {};
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)$/);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return env;
}

const args = process.argv.slice(2);
const mode = args.includes('--apply') ? 'apply' : args.includes('--verify') ? 'verify' : 'dry-run';
const env = { ...loadEnv(), ...process.env };
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
    console.error('FEHLER: DATABASE_URL nicht gesetzt (.env oder ENV)');
    process.exit(2);
}

if (!fs.existsSync(SQL_FILE)) {
    console.error(`FEHLER: SQL-File nicht gefunden: ${SQL_FILE}`);
    console.error('Erwarte prisma/sql/01_postgres_roles.sql aus Phase-1a-Compliance-Toolkit');
    process.exit(2);
}

const sql = fs.readFileSync(SQL_FILE, 'utf8');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  DiggAi Postgres-Rollen Setup (Class-I-Defense-in-Depth)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Modus:        ${mode}`);
console.log(`  SQL-File:     ${path.relative(REPO_ROOT, SQL_FILE)}`);
console.log(`  DB-URL:       ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
console.log('');

if (mode === 'dry-run') {
    console.log('  ── SQL Preview (würde ausgeführt mit --apply) ──');
    console.log('');
    console.log(sql.split('\n').slice(0, 60).join('\n'));
    if (sql.split('\n').length > 60) {
        console.log(`  ... (${sql.split('\n').length - 60} weitere Zeilen)`);
    }
    console.log('');
    console.log('  Erneut starten mit --apply für tatsächliche Ausführung');
    console.log('  oder --verify für Ist-Stand-Check.');
    process.exit(0);
}

// Apply / Verify benötigen pg-Package
let Client;
try {
    Client = require('pg').Client;
} catch {
    console.error('FEHLER: pg-Modul nicht installiert.');
    console.error('Lösung: npm install pg @types/pg --save-dev');
    process.exit(2);
}

(async () => {
    const client = new Client({ connectionString: databaseUrl });
    try {
        await client.connect();

        if (mode === 'verify') {
            const { rows } = await client.query(`
                SELECT rolname, rolcanlogin, rolsuper
                FROM pg_roles
                WHERE rolname IN ('diggai_capture', 'diggai_suite', 'diggai_owner')
                ORDER BY rolname
            `);
            console.log('  Vorhandene DiggAi-Rollen:');
            if (rows.length === 0) {
                console.log('    (keine — Setup muss noch ausgeführt werden)');
                process.exit(1);
            }
            for (const r of rows) {
                console.log(`    ${r.rolname.padEnd(20)} login=${r.rolcanlogin} super=${r.rolsuper}`);
            }

            const { rows: privs } = await client.query(`
                SELECT grantee, table_name, privilege_type
                FROM information_schema.role_table_grants
                WHERE grantee LIKE 'diggai_%'
                ORDER BY grantee, table_name, privilege_type
                LIMIT 50
            `);
            console.log('');
            console.log('  Tabellen-Rechte (erste 50):');
            for (const p of privs) {
                console.log(`    ${p.grantee.padEnd(20)} ${p.privilege_type.padEnd(10)} ${p.table_name}`);
            }
            process.exit(0);
        }

        // mode === 'apply'
        console.log('  Wende SQL an...');
        await client.query(sql);
        console.log('  ✓ SQL erfolgreich angewendet.');
        console.log('');
        console.log('  NÄCHSTE SCHRITTE:');
        console.log('    1) Passwörter für die drei Rollen in einem sicheren Vault generieren');
        console.log('    2) Fly-Secrets setzen:');
        console.log('       flyctl secrets set CAPTURE_DB_PASSWORD=...');
        console.log('       flyctl secrets set SUITE_DB_PASSWORD=...');
        console.log('       flyctl secrets set OWNER_DB_PASSWORD=...');
        console.log('    3) Application code updaten, dass je nach Build (capture/suite) die richtige Rolle verwendet wird');
        console.log('    4) Integration-Test: Capture-Rolle darf nicht in TherapyPlan/ClinicalAlert/AISummary schreiben');
        process.exit(0);
    } catch (err) {
        console.error('FEHLER:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
})();
