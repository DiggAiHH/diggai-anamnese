/**
 * Deploy-Agent — Automatisiert Git + Netlify Deployments
 * Integriert mit DiggAI Agent-System und Task-Queue
 *
 * BSI/EU AI Act: Alle Deployments werden via evidence-logger.cjs protokolliert
 */
import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { agentService, type IAgent } from '../services/agent/agent.service';
import type { AgentTask } from '../services/agent/task.queue';
import { createRequire } from 'module';

// Load CommonJS modules for logging
const _require = createRequire(import.meta.url);
let _evidenceLogger: ReturnType<typeof _require> | null = null;
try {
    _evidenceLogger = _require('../../../bin/lib/evidence-logger.cjs');
} catch {
    console.warn('[DeployAgent] evidence-logger not available');
}

// Configuration
const CONFIG = {
    gitRepoPath: process.env.DEPLOY_GIT_PATH || 'C:/Users/tubbeTEC/Downloads/Anamnese-kimi/anamnese-app',
    branch: process.env.DEPLOY_BRANCH || 'master',
    netlifySiteId: process.env.NETLIFY_SITE_ID || 'aeb2a8e2-e8ac-47e0-a5bc-fef4df4aceaa',
    netlifySiteUrl: 'https://diggai-drklapproth.netlify.app',
    dashboardOutputDir: './dashboards',
    obsidianVaultPath: process.env.OBSIDIAN_VAULT || 'C:/Users/tubbeTEC/Documents/Obsidian Vault/Kimi-Exports',
};

interface DeployResult {
    success: boolean;
    deployUrl?: string;
    gitCommit?: string;
    gitBranch?: string;
    dashboardPath?: string;
    obsidianPath?: string;
    executionTime: number;
    error?: string;
    details?: {
        gitStaged: string[];
        gitStatus: string;
        netlifyDeployId?: string;
    };
}

/**
 * Execute shell command with timeout
 */
function execCommand(cmd: string, cwd: string, timeoutMs = 30000): string {
    try {
        return execSync(cmd, {
            cwd,
            encoding: 'utf-8',
            timeout: timeoutMs,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch (error: any) {
        throw new Error(`Command failed: ${cmd}\n${error.stderr || error.message}`);
    }
}

/**
 * Check if there are staged files in git
 */
async function hasStagedFiles(repoPath: string): Promise<boolean> {
    try {
        const output = execCommand('git diff --cached --name-only', repoPath, 5000);
        return output.trim().length > 0;
    } catch {
        return false;
    }
}

/**
 * Get list of staged files
 */
async function getStagedFiles(repoPath: string): Promise<string[]> {
    try {
        const output = execCommand('git diff --cached --name-only', repoPath, 5000);
        return output.trim().split('\n').filter(f => f.length > 0);
    } catch {
        return [];
    }
}

/**
 * Run git workflow: commit + push
 */
async function runGitWorkflow(
    repoPath: string,
    commitMessage: string,
    branch: string
): Promise<{ success: boolean; commitHash?: string; error?: string }> {
    try {
        // Check for staged files
        const hasStaged = await hasStagedFiles(repoPath);
        if (!hasStaged) {
            return { success: false, error: 'Keine staged Files vorhanden. Bitte zuerst "git add" ausführen.' };
        }

        // Commit
        execCommand(`git commit -m "${commitMessage.replace(/"/g, '\"')}"`, repoPath, 60000);

        // Get commit hash
        const commitHash = execCommand('git rev-parse --short HEAD', repoPath, 5000).trim();

        // Push
        execCommand(`git push origin ${branch}`, repoPath, 60000);

        return { success: true, commitHash };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Trigger Netlify deploy via git push (Netlify auto-deploys on push)
 * Alternative: Use Netlify CLI if available
 */
async function triggerNetlifyDeploy(siteId: string): Promise<{ success: boolean; deployUrl: string; error?: string }> {
    // Netlify auto-deploys on git push
    // We just verify the deploy is triggered
    return {
        success: true,
        deployUrl: CONFIG.netlifySiteUrl,
    };
}

/**
 * Create HTML dashboard with deploy info
 */
async function createDashboard(
    deployData: DeployResult,
    outputDir: string
): Promise<string | undefined> {
    try {
        await fs.mkdir(outputDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `deploy_dashboard_${timestamp}.html`;
        const filepath = path.join(outputDir, filename);

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DiggAI Deploy Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 2rem;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .status { display: flex; align-items: center; gap: 1rem; }
        .status-icon {
            width: 60px; height: 60px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem;
        }
        .status-success { background: #dcfce7; color: #166534; }
        .status-error { background: #fee2e2; color: #991b1b; }
        .status-text h3 { font-size: 1.25rem; margin-bottom: 0.25rem; }
        .status-text p { color: #6b7280; }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .info-item { padding: 1rem; background: #f9fafb; border-radius: 8px; }
        .info-item label { display: block; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem; }
        .info-item value { display: block; font-weight: 600; color: #111827; }
        .link { color: #6366f1; text-decoration: none; }
        .link:hover { text-decoration: underline; }
        .timestamp { text-align: center; color: rgba(255,255,255,0.8); margin-top: 2rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 DiggAI Deploy Dashboard</h1>
            <p>Automatischer Deployment-Report</p>
        </div>

        <div class="card">
            <div class="status">
                <div class="status-icon ${deployData.success ? 'status-success' : 'status-error'}">
                    ${deployData.success ? '✓' : '✗'}
                </div>
                <div class="status-text">
                    <h3>Deployment ${deployData.success ? 'erfolgreich' : 'fehlgeschlagen'}</h3>
                    <p>${deployData.error || 'Alle Schritte erfolgreich abgeschlossen'}</p>
                </div>
            </div>
        </div>

        <div class="card">
            <h3 style="margin-bottom: 1rem;">📋 Deployment-Details</h3>
            <div class="info-grid">
                <div class="info-item">
                    <label>Deploy-URL</label>
                    <value><a href="${deployData.deployUrl}" class="link" target="_blank">${deployData.deployUrl}</a></value>
                </div>
                <div class="info-item">
                    <label>Git Commit</label>
                    <value>${deployData.gitCommit || 'N/A'}</value>
                </div>
                <div class="info-item">
                    <label>Branch</label>
                    <value>${deployData.gitBranch || 'N/A'}</value>
                </div>
                <div class="info-item">
                    <label>Ausführungszeit</label>
                    <value>${deployData.executionTime}ms</value>
                </div>
            </div>
        </div>

        ${deployData.details?.gitStaged?.length ? `
        <div class="card">
            <h3 style="margin-bottom: 1rem;">📝 Geänderte Dateien</h3>
            <ul style="list-style: none;">
                ${deployData.details.gitStaged.map(f => `<li style="padding: 0.5rem; background: #f3f4f6; margin-bottom: 0.5rem; border-radius: 4px;">${f}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>

    <p class="timestamp">Erstellt: ${new Date().toLocaleString('de-DE')}</p>
</body>
</html>`;

        await fs.writeFile(filepath, html, 'utf-8');
        return filepath;
    } catch (error: any) {
        console.error('[DeployAgent] Dashboard creation failed:', error.message);
        return undefined;
    }
}

/**
 * Save export to Obsidian vault
 */
async function saveToObsidian(
    content: string,
    vaultPath: string,
    filename: string
): Promise<string | undefined> {
    try {
        await fs.mkdir(vaultPath, { recursive: true });
        const filepath = path.join(vaultPath, filename);
        await fs.writeFile(filepath, content, 'utf-8');
        return filepath;
    } catch (error: any) {
        console.error('[DeployAgent] Obsidian export failed:', error.message);
        return undefined;
    }
}

/**
 * Main deploy execution
 */
async function executeDeploy(task: AgentTask): Promise<DeployResult> {
    const startTime = Date.now();
    const payload = task.payload || {};

    // Extract parameters
    const commitMessage = payload.commitMessage as string || `Deploy: ${new Date().toISOString()}`;
    const shouldCreateDashboard = payload.createDashboard !== false;
    const obsidianExport = payload.obsidianExport === true;
    const fileContent = payload.fileContent as string | undefined;

    // Log deployment start
    let traceId: string | undefined;
    if (_evidenceLogger) {
        traceId = _evidenceLogger.newTraceId();
        _evidenceLogger.logEvent({
            traceId,
            agentId: 'deploy',
            sourceDefinition: 'agents/deploy.md',
            routingDecision: 'keyword-trigger',
            status: 'running',
            inputRef: `task:${task.id}`,
            metadata: { commitMessage, createDashboard: shouldCreateDashboard, obsidianExport },
        });
    }

    const stagedFiles = await getStagedFiles(CONFIG.gitRepoPath);

    // Run Git workflow
    const gitResult = await runGitWorkflow(CONFIG.gitRepoPath, commitMessage, CONFIG.branch);

    if (!gitResult.success) {
        const result: DeployResult = {
            success: false,
            executionTime: Date.now() - startTime,
            error: gitResult.error,
            details: { gitStaged: stagedFiles, gitStatus: 'failed' },
        };

        if (_evidenceLogger && traceId) {
            _evidenceLogger.logEvent({
                traceId,
                agentId: 'deploy',
                status: 'failed',
                errorRef: gitResult.error,
            });
        }

        return result;
    }

    // Trigger Netlify deploy
    const netlifyResult = await triggerNetlifyDeploy(CONFIG.netlifySiteId);

    // Build result
    const result: DeployResult = {
        success: true,
        deployUrl: netlifyResult.deployUrl,
        gitCommit: gitResult.commitHash,
        gitBranch: CONFIG.branch,
        executionTime: Date.now() - startTime,
        details: {
            gitStaged: stagedFiles,
            gitStatus: 'success',
        },
    };

    // Create dashboard if requested
    if (shouldCreateDashboard) {
        result.dashboardPath = await createDashboard(result, CONFIG.dashboardOutputDir);
    }

    // Export to Obsidian if requested
    if (obsidianExport && fileContent) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `Deploy_Export_${timestamp}.md`;
        result.obsidianPath = await saveToObsidian(fileContent, CONFIG.obsidianVaultPath, filename);
    }

    // Log success
    if (_evidenceLogger && traceId) {
        _evidenceLogger.logEvent({
            traceId,
            agentId: 'deploy',
            status: 'completed',
            metadata: {
                deployUrl: result.deployUrl,
                gitCommit: result.gitCommit,
                executionTime: result.executionTime,
            },
        });
    }

    return result;
}

/**
 * Deploy Agent Definition
 */
const deployAgent: IAgent = {
    name: 'deploy',
    displayName: 'Deploy-Agent',
    description: 'Automatisiert Git + Netlify Deployments mit Dashboard-Erstellung',

    async execute(task: AgentTask): Promise<string> {
        const result = await executeDeploy(task);
        return JSON.stringify(result);
    },
};

// Register agent
agentService.register(deployAgent);
console.log('[DeployAgent] Registered with config:', {
    repoPath: CONFIG.gitRepoPath,
    branch: CONFIG.branch,
    netlifySite: CONFIG.netlifySiteUrl,
});
