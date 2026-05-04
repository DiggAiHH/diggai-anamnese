import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const provider = process.env.CMEM_PROVIDER || 'claude';
const claudeModel = process.env.CMEM_MODEL || 'claude-haiku-4-5-20251001';
const supportedProviders = new Set(['claude', 'gemini', 'openrouter']);
const supportedModels = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
]);
const ides = ['claude-code', 'codex-cli', 'copilot-cli'];
const isWindows = process.platform === 'win32';
const env = { ...process.env };
const failed = [];

if (isWindows && !env.PYTHON) {
  const pythonCandidates = [
    'D:\\Python312\\python.exe',
    'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe',
  ];

  const detectedPython = pythonCandidates.find((candidate) => existsSync(candidate));
  if (detectedPython) {
    env.PYTHON = detectedPython;
    console.log(`[claude-mem] Using Python at ${detectedPython}`);
  }
}

if (isWindows) {
  const userProfile = env.USERPROFILE || '';
  const uvCandidates = [
    `${userProfile}\\AppData\\Local\\Microsoft\\WinGet\\Packages\\astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe`,
    `${userProfile}\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\uv-runtime\\uv-0.9.7-win32-x64`,
  ];

  const uvDir = uvCandidates.find((candidate) => existsSync(`${candidate}\\uv.exe`));
  if (uvDir && env.Path && !env.Path.toLowerCase().includes(uvDir.toLowerCase())) {
    env.Path = `${uvDir};${env.Path}`;
    console.log(`[claude-mem] Added uv to PATH from ${uvDir}`);
  }
}

if (!supportedProviders.has(provider)) {
  console.error(
    `Unsupported CMEM_PROVIDER \"${provider}\". Use one of: claude, gemini, openrouter.`
  );
  process.exit(1);
}

if (provider === 'claude' && !supportedModels.has(claudeModel)) {
  console.error(
    `Unsupported CMEM_MODEL \"${claudeModel}\". Use one of: ${Array.from(supportedModels).join(', ')}.`
  );
  process.exit(1);
}

// Force non-interactive mode by piping stdin/stdout/stderr so claude-mem sees non-TTY input.
const baseCommand = [
  '-y',
  'claude-mem',
  'install',
  '--provider',
  provider,
  '--no-auto-start',
];

if (provider === 'claude') {
  baseCommand.push('--model', claudeModel);
}

const hasVisualStudioCompiler = !isWindows || spawnSync('where', ['cl.exe'], { stdio: 'pipe', env }).status === 0;

env.CI = env.CI || '1';

for (const ide of ides) {
  console.log(`\n[claude-mem] Installing for ${ide} with provider=${provider} ...`);

  const args = [...baseCommand, '--ide', ide];
  const command = `npx ${args.join(' ')}`;
  const result = isWindows
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', command], {
        stdio: 'pipe',
        env,
        maxBuffer: 20 * 1024 * 1024,
        encoding: 'utf8',
      })
    : spawnSync('npx', args, {
        stdio: 'pipe',
        env,
        maxBuffer: 20 * 1024 * 1024,
        encoding: 'utf8',
      });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error(`[claude-mem] Failed for ${ide}:`, result.error.message);
    failed.push({ ide, reason: result.error.message, code: 1 });
    continue;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    console.error(`[claude-mem] Installer exited with code ${result.status} for ${ide}.`);
    failed.push({ ide, reason: `installer exit code ${result.status}`, code: result.status });
    continue;
  }
}

if (failed.length > 0) {
  console.error('\n[claude-mem] Completed with failures:');
  for (const entry of failed) {
    console.error(` - ${entry.ide}: ${entry.reason}`);
  }
  if (isWindows && !hasVisualStudioCompiler) {
    console.error(
      '\n[claude-mem] Native build prerequisites are missing: C++ compiler (cl.exe) not found.\n' +
        'Install Visual Studio 2022 Build Tools with \"Desktop development with C++\" (MSVC v143 + Windows SDK).'
    );
  }
  process.exit(1);
}

console.log('\n[claude-mem] Installed for Claude Code, Codex CLI, and Copilot CLI.');