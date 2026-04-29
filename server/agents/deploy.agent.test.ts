import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentTask } from '../services/agent/task.queue';

// Mock dependencies BEFORE importing the agent
vi.mock('child_process', () => ({
    execSync: vi.fn(),
    spawn: vi.fn(),
    default: { execSync: vi.fn(), spawn: vi.fn() },
}));

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        promises: {
            ...(actual.promises || {}),
            mkdir: vi.fn(),
            writeFile: vi.fn(),
        },
    };
});

// Import agent to trigger side-effect registration (AFTER mocks are defined)
import './deploy.agent';

describe('DeployAgent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should have correct agent metadata', async () => {
        // Agent is registered via side-effect import
        const { agentService } = await import('../services/agent/agent.service');

        const deployAgent = agentService.get('deploy');
        expect(deployAgent).toBeDefined();
        expect(deployAgent?.name).toBe('deploy');
        expect(deployAgent?.displayName).toBe('Deploy-Agent');
    });

    it('should return error when no staged files', async () => {
        const { execSync } = await import('child_process');
        const mockExecSync = vi.mocked(execSync);

        // Mock no staged files
        mockExecSync.mockImplementation((cmd: string) => {
            if (cmd.includes('diff --cached')) {
                return '';
            }
            return '';
        });

        const { agentService } = await import('../services/agent/agent.service');
        const deployAgent = agentService.get('deploy');
        expect(deployAgent).toBeDefined();

        const task: AgentTask = {
            id: 'test-task-1',
            type: 'deploy',
            agentName: 'deploy',
            description: 'Test deployment',
            payload: {
                commitMessage: 'Test commit',
            },
            status: 'queued',
            priority: 'normal',
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3,
        };

        const result = await deployAgent!.execute(task);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(false);
        expect(parsed.error).toContain('Keine staged Files');
    });

    it('should create dashboard when createDashboard is true', async () => {
        const childProcess = await import('child_process');
        const { mkdir, writeFile } = await import('fs').then(m => m.promises);
        const mockMkdir = vi.mocked(mkdir);
        const mockWriteFile = vi.mocked(writeFile);

        // Override execSync directly on the module (ESM live binding)
        const origExecSync = childProcess.execSync;
        const mockExecSync = vi.fn((cmd: string) => {
            if (cmd.includes('diff --cached')) {
                return 'src/file.ts\n';
            }
            if (cmd.includes('rev-parse')) {
                return 'abc123\n';
            }
            return '';
        }) as any;
        childProcess.execSync = mockExecSync;

        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);

        const { agentService } = await import('../services/agent/agent.service');
        const deployAgent = agentService.get('deploy');
        expect(deployAgent).toBeDefined();

        const task: AgentTask = {
            id: 'test-task-2',
            type: 'deploy',
            agentName: 'deploy',
            description: 'Test deployment with dashboard',
            payload: {
                commitMessage: 'Test commit',
                createDashboard: true,
            },
            status: 'queued',
            priority: 'normal',
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3,
        };

        const result = await deployAgent!.execute(task);
        const parsed = JSON.parse(result);

        expect(parsed.success).toBe(true);
        expect(parsed.dashboardPath).toBeDefined();
        expect(mockMkdir).toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalled();

        // Restore original execSync
        childProcess.execSync = origExecSync;
    });

    it('should include execution time in result', async () => {
        const { execSync } = await import('child_process');
        const mockExecSync = vi.mocked(execSync);

        mockExecSync.mockImplementation((cmd: string) => {
            if (cmd.includes('diff --cached')) {
                return '';
            }
            return '';
        });

        const { agentService } = await import('../services/agent/agent.service');
        const deployAgent = agentService.get('deploy');

        const task: AgentTask = {
            id: 'test-task-3',
            type: 'deploy',
            agentName: 'deploy',
            description: 'Test timing',
            payload: {},
            status: 'queued',
            priority: 'normal',
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3,
        };

        const startTime = Date.now();
        const result = await deployAgent!.execute(task);
        const endTime = Date.now();

        const parsed = JSON.parse(result);
        expect(parsed.executionTime).toBeDefined();
        expect(parsed.executionTime).toBeGreaterThanOrEqual(0);
        expect(parsed.executionTime).toBeLessThanOrEqual(endTime - startTime + 100);
    });
});

describe('DeployAgent API', () => {
    it('should list deploy agent in agent service', async () => {
        const { agentService } = await import('../services/agent/agent.service');
        const agents = agentService.listAgents();

        const deployAgent = agents.find(a => a.name === 'deploy');
        expect(deployAgent).toBeDefined();
        expect(deployAgent?.online).toBe(true);
    });
});
