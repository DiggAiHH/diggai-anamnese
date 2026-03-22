#!/usr/bin/env node
/**
 * DiggAI Anamnese Platform - Changelog Automation Script
 * 
 * Generiert CHANGELOG.md automatisch aus:
 * - Merged PRs (mit Labels: feature, fix, security, breaking)
 * - Conventional Commits (feat:, fix:, chore:, docs:, security:)
 * - Breaking Changes (BREAKING CHANGE: in commit message)
 * 
 * Format: Keep a Changelog (https://keepachangelog.com/)
 * 
 * Usage:
 *   node scripts/changelog-automation.mjs
 *   node scripts/changelog-automation.mjs --dry-run
 *   node scripts/changelog-automation.mjs --since-tag v3.0.0
 *   node scripts/changelog-automation.mjs --output CHANGELOG.md
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Konfiguration
const CONFIG = {
  changelogPath: path.join(ROOT_DIR, 'CHANGELOG.md'),
  packageJsonPath: path.join(ROOT_DIR, 'package.json'),
  defaultOutput: path.join(ROOT_DIR, 'CHANGELOG.md'),
  categories: {
    added: { label: 'Added', emoji: '✨', keywords: ['feat', 'feature'] },
    changed: { label: 'Changed', emoji: '🔧', keywords: ['change', 'update', 'refactor'] },
    deprecated: { label: 'Deprecated', emoji: '⚠️', keywords: ['deprecate'] },
    removed: { label: 'Removed', emoji: '🗑️', keywords: ['remove', 'delete'] },
    fixed: { label: 'Fixed', emoji: '🐛', keywords: ['fix', 'bugfix'] },
    security: { label: 'Security', emoji: '🔒', keywords: ['security', 'vuln'] },
    docs: { label: 'Documentation', emoji: '📚', keywords: ['docs', 'doc'] },
    chore: { label: 'Chores', emoji: '🧹', keywords: ['chore', 'ci', 'build'] },
  },
  prLabels: {
    'feature': 'added',
    'enhancement': 'added',
    'feat': 'added',
    'fix': 'fixed',
    'bugfix': 'fixed',
    'bug': 'fixed',
    'security': 'security',
    'breaking': 'changed',
    'breaking change': 'changed',
    'docs': 'docs',
    'documentation': 'docs',
    'chore': 'chore',
    'ci': 'chore',
    'refactor': 'changed',
    'deprecated': 'deprecated',
    'remove': 'removed',
  },
  commitPrefixes: {
    'feat': 'added',
    'feat!': 'changed',
    'fix': 'fixed',
    'fix!': 'changed',
    'docs': 'docs',
    'docs!': 'changed',
    'style': 'chore',
    'refactor': 'changed',
    'refactor!': 'changed',
    'perf': 'changed',
    'perf!': 'changed',
    'test': 'chore',
    'chore': 'chore',
    'chore!': 'changed',
    'ci': 'chore',
    'ci!': 'changed',
    'build': 'chore',
    'build!': 'changed',
    'security': 'security',
  },
};

// Hilfsfunktionen
function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      cwd: ROOT_DIR,
      ...options,
    }).trim();
  } catch (error) {
    if (options.ignoreError) return '';
    console.error(`Command failed: ${command}`);
    console.error(error.stderr || error.message);
    return '';
  }
}

function getPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(CONFIG.packageJsonPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function getLatestTag() {
  return exec('git describe --tags --abbrev=0 2>/dev/null || echo ""', { ignoreError: true });
}

function getLastChangelogVersion() {
  try {
    const content = fs.readFileSync(CONFIG.changelogPath, 'utf-8');
    const match = content.match(/## \[(\d+\.\d+\.\d+)\]/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function parseArguments() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    sinceTag: args.find((_, i) => args[i - 1] === '--since-tag') || null,
    output: args.find((_, i) => args[i - 1] === '--output') || CONFIG.defaultOutput,
    verbose: args.includes('--verbose'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp() {
  console.log(`
DiggAI Changelog Automation

Usage: node scripts/changelog-automation.mjs [options]

Options:
  --dry-run           Zeigt die Änderungen an, ohne Datei zu schreiben
  --since-tag <tag>   Beginnt ab einem bestimmten Tag (default: letzter Tag)
  --output <file>     Ausgabedatei (default: CHANGELOG.md)
  --verbose           Detaillierte Ausgabe
  --help, -h          Zeigt diese Hilfe

Examples:
  node scripts/changelog-automation.mjs
  node scripts/changelog-automation.mjs --dry-run
  node scripts/changelog-automation.mjs --since-tag v3.0.0
`);
}

// Git-Funktionen
function getCommitsSince(sinceRef) {
  const range = sinceRef ? `${sinceRef}..HEAD` : 'HEAD~50';
  const output = exec(`git log ${range} --pretty=format:"%H|%s|%b|%an|%ad" --date=short`);
  
  if (!output) return [];
  
  return output.split('\n').map(line => {
    const [hash, subject, body, author, date] = line.split('|');
    return {
      hash: hash?.slice(0, 7) || '',
      fullHash: hash || '',
      subject: subject || '',
      body: body || '',
      author: author || '',
      date: date || '',
      isBreaking: (subject || '').includes('!') || (body || '').includes('BREAKING CHANGE'),
    };
  });
}

function getMergedPRsSince(sinceRef) {
  // GitHub CLI wird benötigt für PR-Informationen
  const sinceDate = sinceRef 
    ? exec(`git log -1 --format=%ai ${sinceRef}`, { ignoreError: true })
    : exec('git log -50 --format=%ai | tail -1', { ignoreError: true });
  
  if (!sinceDate) return [];
  
  try {
    // Versuche GitHub CLI zu verwenden
    const ghOutput = exec(
      `gh pr list --state merged --search "merged:>${sinceDate.split(' ')[0]}" --json number,title,body,labels,author,mergedAt,mergeCommit --limit 100`,
      { ignoreError: true }
    );
    
    if (ghOutput) {
      return JSON.parse(ghOutput);
    }
  } catch {
    // Fallback: Keine PR-Daten verfügbar
  }
  
  return [];
}

function getPRFromCommitMessage(subject, body = '') {
  // Extrahiert PR-Nummer aus Commit-Message
  const prMatch = subject.match(/\(#(\d+)\)$/) || 
                  body.match(/\(#(\d+)\)/) ||
                  subject.match(/#(\d+)/);
  return prMatch ? parseInt(prMatch[1], 10) : null;
}

function categorizeChange(subject, body = '', labels = []) {
  // Prüfe Labels zuerst
  for (const label of labels) {
    const lowerLabel = label.toLowerCase();
    if (CONFIG.prLabels[lowerLabel]) {
      return CONFIG.prLabels[lowerLabel];
    }
  }
  
  // Prüfe Commit-Prefix
  const prefixMatch = subject.match(/^(\w+)(!?)[(:]/);
  if (prefixMatch) {
    const [, prefix, breaking] = prefixMatch;
    const fullPrefix = breaking ? `${prefix}!` : prefix;
    
    if (CONFIG.commitPrefixes[fullPrefix]) {
      return CONFIG.commitPrefixes[fullPrefix];
    }
    if (CONFIG.commitPrefixes[prefix]) {
      return CONFIG.commitPrefixes[prefix];
    }
  }
  
  // Fallback: Keyword-Matching
  const lowerSubject = subject.toLowerCase();
  for (const [category, config] of Object.entries(CONFIG.categories)) {
    for (const keyword of config.keywords) {
      if (lowerSubject.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'changed'; // Default
}

function extractBreakingChange(subject, body = '') {
  const breakingMatch = body.match(/BREAKING CHANGE:\s*(.+?)(?:\n\n|$)/s);
  if (breakingMatch) {
    return breakingMatch[1].trim();
  }
  
  // Prüfe auf ! im Conventional Commit
  if (subject.includes('!:')) {
    return subject.replace(/^\w+!:\s*/, '').trim();
  }
  
  return null;
}

function cleanSubject(subject) {
  // Entferne Conventional Commit Prefix
  return subject
    .replace(/^(\w+)(!?)[(:]\s*/, '')
    .replace(/\s*\(#\d+\)$/, '')
    .trim();
}

// Changelog-Generierung
function generateChangelogEntry(version, date, changes) {
  const sections = [];
  
  sections.push(`## [${version}] - ${date}`);
  sections.push('');
  
  // Sortiere nach Kategorien
  const categoryOrder = ['added', 'changed', 'deprecated', 'removed', 'fixed', 'security', 'docs', 'chore'];
  
  for (const category of categoryOrder) {
    const changesInCategory = changes.filter(c => c.category === category);
    if (changesInCategory.length === 0) continue;
    
    const config = CONFIG.categories[category];
    sections.push(`### ${config.emoji} ${config.label}`);
    sections.push('');
    
    for (const change of changesInCategory) {
      let line = `- ${change.message}`;
      
      if (change.prNumber) {
        line += ` (#${change.prNumber})`;
      }
      
      if (change.author && change.author !== 'GitHub Action') {
        line += ` @${change.author}`;
      }
      
      sections.push(line);
      
      // Füge Breaking Change Details hinzu
      if (change.breakingDetail) {
        sections.push(`  - **BREAKING CHANGE:** ${change.breakingDetail}`);
      }
    }
    
    sections.push('');
  }
  
  return sections.join('\n');
}

function collectChanges(sinceTag, prs, commits) {
  const changes = [];
  const processedPRs = new Set();
  
  // Verarbeite PRs zuerst (höhere Priorität)
  for (const pr of prs) {
    const prNumber = pr.number;
    if (processedPRs.has(prNumber)) continue;
    
    const labels = pr.labels?.map(l => l.name) || [];
    const category = categorizeChange(pr.title, pr.body, labels);
    const isBreaking = labels.some(l => 
      ['breaking', 'breaking change', 'major'].includes(l.toLowerCase())
    );
    
    changes.push({
      category,
      message: cleanSubject(pr.title),
      prNumber,
      author: pr.author?.login || '',
      date: pr.mergedAt?.split('T')[0] || '',
      isBreaking,
      breakingDetail: isBreaking ? extractBreakingChange(pr.title, pr.body) : null,
    });
    
    processedPRs.add(prNumber);
  }
  
  // Verarbeite Commits ohne PR
  for (const commit of commits) {
    const prNumber = getPRFromCommitMessage(commit.subject, commit.body);
    
    // Überspringe, wenn bereits durch PR verarbeitet
    if (prNumber && processedPRs.has(prNumber)) continue;
    
    // Überspringe Merge-Commits ohne relevante Änderungen
    if (commit.subject.startsWith('Merge branch') || 
        commit.subject.startsWith('Merge pull request')) {
      continue;
    }
    
    const category = categorizeChange(commit.subject, commit.body);
    
    changes.push({
      category,
      message: cleanSubject(commit.subject),
      prNumber,
      author: commit.author,
      date: commit.date,
      isBreaking: commit.isBreaking,
      breakingDetail: extractBreakingChange(commit.subject, commit.body),
    });
  }
  
  return changes;
}

function createInitialChangelog() {
  return `# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

`;
}

function updateChangelog(outputPath, newEntry) {
  let content;
  
  try {
    content = fs.readFileSync(outputPath, 'utf-8');
  } catch {
    content = createInitialChangelog();
  }
  
  // Prüfe, ob [Unreleased] existiert
  if (!content.includes('## [Unreleased]')) {
    content = content.replace(
      /^(# Changelog.*\n)/,
      '$1\n## [Unreleased]\n\n'
    );
  }
  
  // Füge neuen Eintrag nach [Unreleased] ein
  const unreleasedPattern = /(## \[Unreleased\]\n)/;
  content = content.replace(unreleasedPattern, `$1\n${newEntry}\n`);
  
  return content;
}

// Hauptfunktion
async function main() {
  const args = parseArguments();
  
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log('🔍 DiggAI Changelog Automation\n');
  
  const version = getPackageVersion();
  const latestTag = args.sinceTag || getLatestTag() || '';
  const lastChangelogVersion = getLastChangelogVersion();
  
  if (args.verbose) {
    console.log(`📦 Package Version: ${version}`);
    console.log(`🏷️  Latest Tag: ${latestTag || 'none'}`);
    console.log(`📝 Last Changelog: ${lastChangelogVersion || 'none'}`);
    console.log('');
  }
  
  // Prüfe auf neue Version
  if (lastChangelogVersion === version && !args.sinceTag) {
    console.log(`⚠️  Version ${version} existiert bereits im Changelog.`);
    console.log('   Verwende --since-tag um trotzdem zu generieren.');
    console.log('   Führe "npm version" aus für eine neue Version.');
  }
  
  // Sammle Daten
  console.log(`📜 Sammle Commits seit ${latestTag || 'letzten 50 Commits'}...`);
  const commits = getCommitsSince(latestTag);
  console.log(`   ${commits.length} Commits gefunden`);
  
  console.log('🔀 Sammle merged PRs...');
  const prs = getMergedPRsSince(latestTag);
  console.log(`   ${prs.length} PRs gefunden`);
  
  if (commits.length === 0 && prs.length === 0) {
    console.log('\n✅ Keine Änderungen gefunden.');
    process.exit(0);
  }
  
  // Generiere Changelog-Eintrag
  const today = new Date().toISOString().split('T')[0];
  const changes = collectChanges(latestTag, prs, commits);
  
  if (changes.length === 0) {
    console.log('\n✅ Keine relevanten Änderungen gefunden.');
    process.exit(0);
  }
  
  console.log(`\n📝 ${changes.length} Änderungen kategorisiert:`);
  const categoryCounts = {};
  for (const change of changes) {
    categoryCounts[change.category] = (categoryCounts[change.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(categoryCounts)) {
    const emoji = CONFIG.categories[cat]?.emoji || '';
    console.log(`   ${emoji} ${cat}: ${count}`);
  }
  
  const newEntry = generateChangelogEntry(version, today, changes);
  
  if (args.verbose) {
    console.log('\n--- Generierter Eintrag ---\n');
    console.log(newEntry);
    console.log('---\n');
  }
  
  if (args.dryRun) {
    console.log('\n📋 DRY RUN - Keine Datei wurde geschrieben.');
    console.log('\nGenerierter Eintrag:\n');
    console.log(newEntry);
  } else {
    const updatedContent = updateChangelog(args.output, newEntry);
    fs.writeFileSync(args.output, updatedContent, 'utf-8');
    console.log(`\n✅ Changelog aktualisiert: ${args.output}`);
    console.log(`   Version: ${version}`);
    console.log(`   Änderungen: ${changes.length}`);
  }
  
  // GitHub Actions Output
  if (process.env.GITHUB_OUTPUT) {
    const output = `version=${version}\nchanges_count=${changes.length}\nhas_breaking=${changes.some(c => c.isBreaking) ? 'true' : 'false'}`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
  }
}

main().catch(error => {
  console.error('❌ Fehler:', error.message);
  if (process.env.CI) {
    process.exit(1);
  }
});
