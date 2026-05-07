#!/usr/bin/env node
/**
 * marketing-audit.cjs — Marketing-Text-Audit für Class-I-Risiko-Prävention
 *
 * Anker: docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.10 (Custom-Skills)
 * Adressiert Open-Items-Tracker G1 ("Marketing-Texte gegen Zweckbestimmung prüfen")
 * Adressiert CLAUDE.md Regulatory Guard (Verbots-Wortliste)
 *
 * Was tut das Skript:
 *   Greppt alle user-facing Strings (i18n-locales, README, package.json description,
 *   marketing-Pages, Landing-Inhalte, AGB, Impressum) gegen die Capture-Verbots-
 *   Wortliste. Findet Treffer, listet Fundstellen mit Kontext, schlägt Korrekturen
 *   vor. Bricht den Build NICHT — ist als Audit-Reporter konzipiert, nicht als Gate.
 *
 * Verwendung:
 *   node scripts/marketing-audit.cjs                # Default-Scope
 *   node scripts/marketing-audit.cjs --json         # für CI / Tooling-Integration
 *   node scripts/marketing-audit.cjs --strict       # auch ergänzende Wortliste
 *
 * Exit-Codes:
 *   0 = sauber, keine Verbots-Wörter im Marketing-Scope
 *   1 = Treffer gefunden (informational, keine Build-Fail)
 *   2 = Konfigurations-Fehler
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

// ── Verbotene Wörter (aus CLAUDE.md Regulatory Guard) ────────────

const FORBIDDEN_TERMS_BASE = [
    'Diagnose', 'diagnose',
    'Verdacht', 'verdacht',
    'hindeuten',
    'Notfall-Erkennung', 'Notfall', 'notfall',
    'Risiko', 'risiko', 'Risikobewertung', 'Risk-Score',
    'lebensrettend', 'rettet Leben',
    'Triage', 'triage', 'KI-Triage',
    'Krankheit', 'krankheit',
    'Therapie', 'therapie', 'Therapieempfehlung',
    'Behandlung', 'behandlung',
    'klinische Entscheidungsunterstützung', 'clinical decision support',
    'Herzinfarkt-Verdacht',
    'akut', 'kritisch', 'lebensbedrohlich',
];

const FORBIDDEN_TERMS_STRICT = [
    'medizinische Bewertung', 'medical assessment',
    'erkennt Notfall', 'detects emergency',
    'Diagnose-Hinweis', 'diagnostic hint',
    'Symptom-Bewertung', 'symptom assessment',
];

// ── Erlaubte Kontexte (False-Positive-Vermeidung) ────────────────

const ALLOWED_CONTEXTS = [
    // Workflow-Sätze die "Notfall" als Hinweis enthalten dürfen
    'im Notfall an die 112',
    'in case of emergency call 112',
    'in einem Notfall',
    // Wir machen explizite Negativ-Aussagen — die müssen die Wörter enthalten
    'KEINE Diagnose',
    'keine Diagnose',
    'kein Risiko',
    'no diagnosis',
    'no medical recommendation',
    // Audit-Kontexte
    'Bundle-Audit',
    'Audit-Log',
    // G1 (2026-05-07): Pflicht-Sicherheitshinweise (BGB §630e / MDR Anhang I §23.4m)
    // Diese Strings MÜSSEN erhalten bleiben — sie sind keine Class-IIa-Merkmale
    // sondern gesetzlich vorgeschriebene Notfall-Weiterleitungen.
    'Bitte wählen Sie 112',
    'Bitte rufen Sie sofort 112',
    'den Notruf 112',
    'Notruf wählen',
    'umgehend den Notruf',
    'Telefonseelsorge',
    'wenden Sie sich sofort an das Praxispersonal',
    'call 112 immediately',
    'call emergency services immediately',
    // Anamnese-Historieerfassung (retrospektive Fragen — kein klinisches Assessment)
    'Wann war der Herzinfarkt',
    'ärztlich abklären',      // neutrale Empfehlung, keine Diagnose-Aussage
    'seek medical evaluation', // same in EN
    // Staff-interne UI-Labels (nicht patient-facing marketing)
    'TriageEngine',
    'triage.agent',
    'Eingangs-Routing',
    // DiggAI ist keine X-Plattform (Negativ-Aussage erlaubt das Wort)
    'erkennt keine Notfälle',
    'reine Anmelde-Plattform',
    // G1 Redaktionelle Suite-Marker — Zeilen die explizit als Suite-Feature markiert wurden
    'DECISION_SUPPORT_ENABLED',   // Feature-Flag-Referenz = korrekte Abgrenzung
    '_(Suite)_',                  // Inline-Markdown-Marker für Suite-only Inhalte
    '· Suite',                    // Tabellen-/Abschnitts-Marker
    '| Suite',                    // Tabellen-Marker
    // Triage-Regeln-Tabelle ist Suite-Dokumentation
    'ACS (Herzinfarkt-Verdacht)',
    'Klinische Triage-Regeln',
    'Triage: Suite',              // Architektur-Tabelle mit Suite-Marker
    'Dashboard, Triage)',         // Interne Verzeichnis-Struktur-Kommentar
    'Fragebogen, Dashboard',      // Interne Verzeichnis-Struktur-Kommentar
];

// ── Scope: welche Files wir scannen ──────────────────────────────

const SCOPE_DIRS = [
    'public/locales',           // i18n-Übersetzungen (alle 10 Sprachen)
    'docs/marketing',           // falls vorhanden
    'docs/landing',
];

const SCOPE_FILES = [
    'README.md',
    'package.json',             // description-Feld
    'public/index.html',
    'public/manifest.webmanifest',
    'netlify.toml',
];

// ── Helpers ──────────────────────────────────────────────────────

function isAllowed(line) {
    return ALLOWED_CONTEXTS.some((c) => line.includes(c));
}

function findMatches(content, terms, filePath) {
    const lines = content.split('\n');
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isAllowed(line)) continue;
        for (const term of terms) {
            const idx = line.indexOf(term);
            if (idx !== -1) {
                hits.push({
                    file: filePath,
                    line: i + 1,
                    column: idx + 1,
                    term,
                    context: line.trim().slice(0, 200),
                });
            }
        }
    }
    return hits;
}

function walkDir(dir, exts) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop();
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                stack.push(full);
            } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
                results.push(full);
            }
        }
    }
    return results;
}

function suggestFix(term) {
    const map = {
        'Diagnose': 'Erfassung / Eingangs-Routing',
        'diagnose': 'Erfassung',
        'Verdacht': 'Eingabe',
        'Notfall-Erkennung': 'Workflow-Hinweis: bei akuten Beschwerden Praxis ansprechen, im Notfall 112',
        'Risiko': 'Eingabe / Hinweis',
        'lebensrettend': 'workflow-unterstützend',
        'rettet Leben': 'unterstützt den Praxis-Workflow',
        'Triage': 'Eingangs-Routing',
        'triage': 'eingangs-routing',
        'Therapie': 'Behandlungs-Termin (workflow-Sprache)',
        'Behandlung': 'Sprechstunden-Termin',
        'klinische Entscheidungsunterstützung': 'Daten-Erfassung für die Praxis',
    };
    return map[term] || `umformulieren auf workflow-Sprache, ohne klinische Aussage`;
}

// ── Main ─────────────────────────────────────────────────────────

function main() {
    const json = process.argv.includes('--json');
    const strict = process.argv.includes('--strict');
    const terms = strict ? [...FORBIDDEN_TERMS_BASE, ...FORBIDDEN_TERMS_STRICT] : FORBIDDEN_TERMS_BASE;

    const allFiles = [];
    for (const dir of SCOPE_DIRS) {
        const full = path.join(REPO_ROOT, dir);
        allFiles.push(...walkDir(full, ['.json', '.md', '.html', '.txt', '.toml']));
    }
    for (const file of SCOPE_FILES) {
        const full = path.join(REPO_ROOT, file);
        if (fs.existsSync(full)) allFiles.push(full);
    }

    const allHits = [];
    let scanned = 0;
    for (const file of allFiles) {
        scanned++;
        try {
            const content = fs.readFileSync(file, 'utf8');
            const hits = findMatches(content, terms, path.relative(REPO_ROOT, file));
            allHits.push(...hits);
        } catch {
            /* ignorieren */
        }
    }

    if (json) {
        console.log(JSON.stringify({ scanned, hits: allHits, strict }, null, 2));
    } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  DiggAi Marketing-Text-Audit (Class-I-Schutz)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`  Scope: ${SCOPE_DIRS.length} Verzeichnisse + ${SCOPE_FILES.length} Einzelfiles`);
        console.log(`  Strict-Modus: ${strict ? 'ja' : 'nein'}`);
        console.log(`  Verbotene Begriffe: ${terms.length}`);
        console.log(`  Geprüfte Dateien: ${scanned}`);
        console.log('');

        if (allHits.length === 0) {
            console.log('  ✓ Keine Verbots-Wörter im Marketing-Scope.');
            console.log('  ✓ Marketing-Texte sind aktuell Capture-Class-I-konform.');
            console.log('');
            process.exit(0);
        }

        console.log(`  ⚠ ${allHits.length} TREFFER GEFUNDEN`);
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        for (const h of allHits) {
            console.log(`  ${h.file}:${h.line}:${h.column}  [${h.term}]`);
            console.log(`    Kontext: ${h.context}`);
            console.log(`    Vorschlag: ${suggestFix(h.term)}`);
            console.log('');
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Hinweis: Marketing-Audit ist kein Build-Gate.');
        console.log('  Treffer als Empfehlungen lesen und vor Release korrigieren.');
        console.log('  Vor Marketing-Release / Anwalts-Versand auf 0 Treffer reduzieren.');
        console.log('');

        process.exit(1);
    }
}

main();
