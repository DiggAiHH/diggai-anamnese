import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const sourcePath = path.join(workspaceRoot, 'docs', 'CODEX_WEB_FUNCTIONALITY.md');
const exportDir = path.join(workspaceRoot, 'exports', 'product');
const markdownOut = path.join(exportDir, 'codex-web-functionality.md');
const jsonOut = path.join(exportDir, 'codex-web-functionality.json');

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSection(markdown, heading) {
  const pattern = new RegExp(
    `##\\s+${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
    'i',
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : '';
}

function parseListItems(section, listType) {
  const regex = listType === 'ordered' ? /^\d+\.\s+(.*)$/ : /^-\s+(.*)$/;
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(regex);
      return match ? match[1].trim() : null;
    })
    .filter(Boolean);
}

function parseCapabilities(items) {
  return items.map((item) => {
    const match = item.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
    if (match) {
      return { name: match[1].trim(), description: match[2].trim() };
    }

    return { name: item, description: '' };
  });
}

function parseLinks(markdown) {
  const found = new Map();
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match = linkRegex.exec(markdown);

  while (match) {
    const [, label, url] = match;
    if (!found.has(url)) {
      found.set(url, { label: label.trim(), url: url.trim() });
    }
    match = linkRegex.exec(markdown);
  }

  return Array.from(found.values());
}

async function run() {
  const markdown = await readFile(sourcePath, 'utf8');
  const setupSection = extractSection(markdown, 'Setup');
  const capabilitiesSection = extractSection(markdown, 'Functional Capabilities');
  const resourcesSection = extractSection(markdown, 'Resource Links');

  const setupSteps = parseListItems(setupSection, 'ordered');
  const capabilityItems = parseListItems(capabilitiesSection, 'unordered');
  const resourceItems = parseListItems(resourcesSection, 'unordered');

  const payload = {
    product: 'Codex Web',
    exportType: 'functionality-only',
    generatedAt: new Date().toISOString(),
    sourceFile: path.relative(workspaceRoot, sourcePath),
    setupSteps,
    capabilities: parseCapabilities(capabilityItems),
    resources: resourceItems,
    links: parseLinks(markdown),
  };

  await mkdir(exportDir, { recursive: true });
  await writeFile(markdownOut, markdown, 'utf8');
  await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Export written to ${path.relative(workspaceRoot, exportDir)}`);
  console.log(`- ${path.relative(workspaceRoot, markdownOut)}`);
  console.log(`- ${path.relative(workspaceRoot, jsonOut)}`);
}

run().catch((error) => {
  console.error('[export:product] Failed to generate export.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
