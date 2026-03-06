import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface AgentTask {
    id: string;
    type: string;
    agentName: string;
    description: string;
    payload: Record<string, unknown>;
    priority: TaskPriority;
    status: TaskStatus;
    result?: string;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    retryCount: number;
    maxRetries: number;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1,
};

class TaskQueue extends EventEmitter {
    private tasks = new Map<string, AgentTask>();

    enqueue(params: {
        type: string;
        agentName: string;
        description: string;
        payload?: Record<string, unknown>;
        priority?: TaskPriority;
        maxRetries?: number;
    }): AgentTask {
        const task: AgentTask = {
            id: randomUUID(),
            type: params.type,
            agentName: params.agentName,
            description: params.description,
            payload: params.payload ?? {},
            priority: params.priority ?? 'normal',
            status: 'queued',
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: params.maxRetries ?? 2,
        };
        this.tasks.set(task.id, task);
        this.emit('task:created', task);
        return task;
    }

    get(id: string): AgentTask | undefined {
        return this.tasks.get(id);
    }

    list(filter?: { status?: TaskStatus; agentName?: string }): AgentTask[] {
        const all = Array.from(this.tasks.values());
        let result = all;
        if (filter?.status) result = result.filter(t => t.status === filter.status);
        if (filter?.agentName) result = result.filter(t => t.agentName === filter.agentName);
        return result.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
    }

    markRunning(id: string): void {
        const task = this.tasks.get(id);
        if (!task) return;
        task.status = 'running';
        task.startedAt = new Date();
        this.emit('task:started', task);
    }

    markCompleted(id: string, result: string): void {
        const task = this.tasks.get(id);
        if (!task) return;
        task.status = 'completed';
        task.result = result;
        task.completedAt = new Date();
        this.emit('task:completed', task);
    }

    markFailed(id: string, error: string): void {
        const task = this.tasks.get(id);
        if (!task) return;
        task.status = 'failed';
        task.error = error;
        task.completedAt = new Date();
        this.emit('task:failed', task);
    }

    /** Resets a failed task back to queued for retry. Returns false if max retries exceeded. */
    markForRetry(id: string): boolean {
        const task = this.tasks.get(id);
        if (!task || task.retryCount >= task.maxRetries) return false;
        task.retryCount++;
        task.status = 'queued';
        task.error = undefined;
        task.startedAt = undefined;
        task.completedAt = undefined;
        this.emit('task:retry', task);
        return true;
    }

    metrics() {
        const all = Array.from(this.tasks.values());
        return {
            total: all.length,
            queued: all.filter(t => t.status === 'queued').length,
            running: all.filter(t => t.status === 'running').length,
            completed: all.filter(t => t.status === 'completed').length,
            failed: all.filter(t => t.status === 'failed').length,
        };
    }
}

export const taskQueue = new TaskQueue();
