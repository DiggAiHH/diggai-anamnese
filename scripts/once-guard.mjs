import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const knowledgeRoot = path.join(repoRoot, 'shared', 'knowledge');
const checkpointsRoot = path.join(knowledgeRoot, 'checkpoints');
const registryPath = path.join(knowledgeRoot, 'task-registry.json');
const knowledgeSharePath = path.join(knowledgeRoot, 'knowledge-share.md');

const [command, ...rawArgs] = process.argv.slice(2);

function exitWith(code, message) {
  if (message) {
    console.log(message);
  }
  process.exit(code);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const nextToken = argv[index + 1];
    if (nextToken === undefined || nextToken.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    index += 1;
    if (parsed[key] === undefined) {
      parsed[key] = nextToken;
      continue;
    }

    if (Array.isArray(parsed[key])) {
      parsed[key].push(nextToken);
      continue;
    }

    parsed[key] = [parsed[key], nextToken];
  }

  return parsed;
}

function getStringArg(args, key, fallback = '') {
  const value = args[key];
  if (value === undefined || value === true) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return String(value[value.length - 1]).trim();
  }

  return String(value).trim();
}

function getArrayArg(args, key) {
  const value = args[key];
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (value === true) {
    return [];
  }

  return [String(value).trim()].filter(Boolean);
}

function getNumericArg(args, key, fallback = 0) {
  const value = getStringArg(args, key, '');
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for --${key}: ${value}`);
  }

  return parsed;
}

function ensureKnowledgeStore() {
  fs.mkdirSync(checkpointsRoot, { recursive: true });

  if (!fs.existsSync(knowledgeSharePath)) {
    fs.writeFileSync(knowledgeSharePath, '# Shared Knowledge\n', 'ascii');
  }

  if (!fs.existsSync(registryPath)) {
    fs.writeFileSync(
      registryPath,
      `${JSON.stringify({ version: 1, updatedAt: null, tasks: {} }, null, 2)}\n`,
      'ascii',
    );
  }
}

function newRegistry() {
  return {
    version: 1,
    updatedAt: null,
    tasks: {},
  };
}

function loadRegistry() {
  if (!fs.existsSync(registryPath)) {
    return newRegistry();
  }

  const raw = fs.readFileSync(registryPath, 'utf8').trim();
  if (!raw) {
    return newRegistry();
  }

  const parsed = JSON.parse(raw);
  if (!parsed.tasks || typeof parsed.tasks !== 'object') {
    parsed.tasks = {};
  }

  return parsed;
}

function saveRegistry(registry) {
  registry.updatedAt = new Date().toISOString();
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'ascii');
}

function requireTask(task) {
  if (!task) {
    throw new Error('Option --task is required for this command.');
  }
}

function sanitizeTaskName(task) {
  return task.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function checkpointRelativePath(task) {
  return `shared/knowledge/checkpoints/${sanitizeTaskName(task)}.md`;
}

function checkpointPath(task) {
  return path.join(repoRoot, checkpointRelativePath(task));
}

function resolveRepoPath(entry) {
  if (!entry) {
    return '';
  }

  if (path.isAbsolute(entry)) {
    return entry;
  }

  return path.join(repoRoot, entry);
}

function normalizePaths(paths) {
  return paths
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (path.isAbsolute(entry)) {
        return path.relative(repoRoot, entry).split(path.sep).join('/');
      }

      return entry.split(path.sep).join('/');
    });
}

function resolveBatch(taskEntry, requestedBatch) {
  if (requestedBatch > 0) {
    return requestedBatch;
  }

  if (taskEntry && Number.isInteger(taskEntry.currentBatch)) {
    return taskEntry.currentBatch + 1;
  }

  return 1;
}

function appendCheckpoint({
  task,
  status,
  agent,
  sessionId,
  batch,
  summary,
  done,
  next,
  artifacts,
  notes,
}) {
  const targetPath = checkpointPath(task);
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, `# ${task}\n\n`, 'ascii');
  }

  const lines = [
    `## ${new Date().toISOString().replace('T', ' ').slice(0, 19)} | ${status}`,
    '',
    `- Agent: ${agent}`,
    `- Session: ${sessionId}`,
    `- Batch: ${batch}`,
    `- Summary: ${summary}`,
  ];

  if (done.length > 0) {
    lines.push('', '### Done', ...done.map((item) => `- ${item}`));
  }

  if (next.length > 0) {
    lines.push('', '### Next', ...next.map((item) => `- ${item}`));
  }

  if (artifacts.length > 0) {
    lines.push('', '### Artifacts', ...artifacts.map((item) => `- ${item}`));
  }

  if (notes) {
    lines.push('', '### Notes', notes);
  }

  fs.appendFileSync(targetPath, `${lines.join('\n')}\n\n`, 'ascii');
}

function buildEntry({ task, status, agent, sessionId, batch, summary, next, artifacts }) {
  return {
    status,
    agent,
    sessionId,
    currentBatch: batch,
    updatedAt: new Date().toISOString(),
    summary,
    next,
    artifacts,
    checkpointFile: checkpointRelativePath(task),
  };
}

function printStatus(taskEntry, task) {
  console.log(JSON.stringify(taskEntry, null, 2));

  const targetPath = checkpointPath(task);
  if (fs.existsSync(targetPath)) {
    console.log('\n--- CHECKPOINT ---');
    console.log(fs.readFileSync(targetPath, 'utf8').trimEnd());
  }
}

try {
  ensureKnowledgeStore();

  const args = parseArgs(rawArgs);
  const task = getStringArg(args, 'task');
  const agent = getStringArg(args, 'agent', 'copilot');
  const sessionId = getStringArg(args, 'session', getStringArg(args, 'sessionId'));
  const batch = getNumericArg(args, 'batch', 0);
  const summary = getStringArg(args, 'summary');
  const notes = getStringArg(args, 'notes');
  const done = getArrayArg(args, 'done');
  const next = getArrayArg(args, 'next');
  const artifacts = normalizePaths([...getArrayArg(args, 'artifacts'), ...getArrayArg(args, 'files')]);
  const targetPath = getStringArg(args, 'targetPath');
  const normalizedTargetPath = targetPath ? normalizePaths([targetPath])[0] ?? '' : '';

  const registry = loadRegistry();
  const taskEntry = task ? registry.tasks[task] ?? null : null;

  switch (command) {
    case 'precheck': {
      requireTask(task);
      if (targetPath && fs.existsSync(resolveRepoPath(targetPath))) {
        exitWith(4, `[ARTIFACT_EXISTS] ${task} | path=${normalizedTargetPath || targetPath}`);
      }

      if (!taskEntry) {
        exitWith(0, `[FREE] ${task}`);
      }

      if (taskEntry.status === 'in_progress') {
        exitWith(2, `[IN_PROGRESS] ${task} | agent=${taskEntry.agent} | session=${taskEntry.sessionId}`);
      }

      if (taskEntry.status === 'completed') {
        const artifactSuffix = Array.isArray(taskEntry.artifacts) && taskEntry.artifacts.length > 0
          ? `\nArtifacts: ${taskEntry.artifacts.join(', ')}`
          : '';
        exitWith(3, `[COMPLETED] ${task}${artifactSuffix}`);
      }

      exitWith(0, `[KNOWN] ${task} | status=${taskEntry.status}`);
    }

    case 'claim': {
      requireTask(task);
      if (!sessionId) {
        throw new Error('Option --session is required for claim.');
      }

      const resolvedBatch = resolveBatch(taskEntry, batch);
      registry.tasks[task] = buildEntry({
        task,
        status: 'in_progress',
        agent,
        sessionId,
        batch: resolvedBatch,
        summary: taskEntry?.summary ?? '',
        next: Array.isArray(taskEntry?.next) ? taskEntry.next : [],
        artifacts: Array.isArray(taskEntry?.artifacts) ? taskEntry.artifacts : [],
      });
      saveRegistry(registry);
      exitWith(0, `Claimed ${task} for ${agent} (${sessionId}).\nCheckpoint file: ${checkpointRelativePath(task)}`);
    }

    case 'checkpoint': {
      requireTask(task);
      if (!summary) {
        throw new Error('Option --summary is required for checkpoint.');
      }

      const resolvedSessionId = sessionId || taskEntry?.sessionId;
      if (!resolvedSessionId) {
        throw new Error('Option --session is required for checkpoint when no existing task entry exists.');
      }

      const resolvedBatch = resolveBatch(taskEntry, batch);
      appendCheckpoint({
        task,
        status: 'in_progress',
        agent,
        sessionId: resolvedSessionId,
        batch: resolvedBatch,
        summary,
        done,
        next,
        artifacts,
        notes,
      });

      registry.tasks[task] = buildEntry({
        task,
        status: 'in_progress',
        agent,
        sessionId: resolvedSessionId,
        batch: resolvedBatch,
        summary,
        next,
        artifacts,
      });
      saveRegistry(registry);
      exitWith(0, `Checkpoint saved for ${task}.\n${checkpointRelativePath(task)}`);
    }

    case 'complete': {
      requireTask(task);
      if (!summary) {
        throw new Error('Option --summary is required for complete.');
      }

      const resolvedSessionId = sessionId || taskEntry?.sessionId;
      if (!resolvedSessionId) {
        throw new Error('Option --session is required for complete when no existing task entry exists.');
      }

      const resolvedBatch = resolveBatch(taskEntry, batch);
      appendCheckpoint({
        task,
        status: 'completed',
        agent,
        sessionId: resolvedSessionId,
        batch: resolvedBatch,
        summary,
        done,
        next,
        artifacts,
        notes,
      });

      registry.tasks[task] = buildEntry({
        task,
        status: 'completed',
        agent,
        sessionId: resolvedSessionId,
        batch: resolvedBatch,
        summary,
        next,
        artifacts,
      });
      saveRegistry(registry);
      exitWith(0, `Completed ${task}.\n${checkpointRelativePath(task)}`);
    }

    case 'status': {
      if (!task) {
        console.log(JSON.stringify(registry, null, 2));
        process.exit(0);
      }

      requireTask(task);
      if (!taskEntry) {
        exitWith(1, `No registry entry for task '${task}'.`);
      }

      printStatus(taskEntry, task);
      process.exit(0);
    }

    default:
      throw new Error(`Unsupported command: ${command ?? '<missing>'}`);
  }
}
catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}