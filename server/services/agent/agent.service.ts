import { taskQueue, type AgentTask } from './task.queue';
import { emitAgentTaskUpdate } from '../../socket';

const AGENT_TIMEOUT_MS = 30_000; // 30 Sekunden

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Agent-Timeout nach ${ms / 1000}s: ${label}`)), ms)
        ),
    ]);
}

export interface AgentStatus {
    name: string;
    displayName: string;
    description: string;
    online: boolean;
    busy: boolean;
    tasksCompleted: number;
    tasksFailed: number;
    lastActive?: Date;
}

export interface IAgent {
    name: string;
    displayName: string;
    description: string;
    execute(task: AgentTask): Promise<string>;
}

class AgentService {
    private registry = new Map<string, IAgent>();
    private stats = new Map<string, { completed: number; failed: number; lastActive?: Date }>();

    register(agent: IAgent): void {
        this.registry.set(agent.name, agent);
        this.stats.set(agent.name, { completed: 0, failed: 0 });
        console.log(`[AgentService] Registered agent: ${agent.name}`);
    }

    get(name: string): IAgent | undefined {
        return this.registry.get(name);
    }

    listAgents(): AgentStatus[] {
        return Array.from(this.registry.values()).map(agent => {
            const s = this.stats.get(agent.name) ?? { completed: 0, failed: 0 };
            const runningTasks = taskQueue.list({ status: 'running', agentName: agent.name });
            return {
                name: agent.name,
                displayName: agent.displayName,
                description: agent.description,
                online: true,
                busy: runningTasks.length > 0,
                tasksCompleted: s.completed,
                tasksFailed: s.failed,
                lastActive: s.lastActive,
            };
        });
    }

    async dispatch(agentName: string, task: AgentTask): Promise<void> {
        const agent = this.registry.get(agentName);
        if (!agent) {
            taskQueue.markFailed(task.id, `Agent "${agentName}" not found`);
            return;
        }

        taskQueue.markRunning(task.id);
        emitAgentTaskUpdate({ taskId: task.id, agentName, status: 'running' });

        try {
            const result = await withTimeout(
                agent.execute(task),
                AGENT_TIMEOUT_MS,
                `${agentName}/${task.type}`
            );
            taskQueue.markCompleted(task.id, result);
            emitAgentTaskUpdate({ taskId: task.id, agentName, status: 'completed', result });
            const s = this.stats.get(agentName)!;
            s.completed++;
            s.lastActive = new Date();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);

            // Retry with exponential backoff if retries remain
            if (taskQueue.markForRetry(task.id)) {
                const delay = Math.min(1000 * 2 ** task.retryCount, 15_000);
                console.warn(`[AgentService] Retry ${task.retryCount}/${task.maxRetries} for task ${task.id} in ${delay}ms`);
                setTimeout(() => this.dispatch(agentName, taskQueue.get(task.id) ?? task), delay);
                return;
            }

            taskQueue.markFailed(task.id, msg);
            emitAgentTaskUpdate({ taskId: task.id, agentName, status: 'failed', error: msg });
            const s = this.stats.get(agentName)!;
            s.failed++;
            s.lastActive = new Date();
        }
    }
}

export const agentService = new AgentService();
